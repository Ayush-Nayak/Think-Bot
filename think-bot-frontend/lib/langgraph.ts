import { Client } from "@langchain/langgraph-sdk";
import type { ThinkBotSession } from "./session";

export type AgentName =
  | "clarify_with_user"
  | "planner_agent"
  | "researcher_agent"
  | "synthesis_agent"
  | "writer_agent"
  | "critic_agent"
  | "finalizer"
  | "__start__"
  | "__end__";

export interface ChatMessage {
  id: string;
  role: "human" | "ai";
  content: string;
  isStreaming?: boolean;
}

export interface StreamEvent {
  type: "message_chunk" | "agent_update" | "notion_saved" | "error" | "done";
  messageId?: string;
  chunk?: string;
  agentName?: AgentName;
  error?: string;
}

let _client: Client | null = null;
let _session: ThinkBotSession | null = null;

export function initClient(session: ThinkBotSession): Client {
  _session = session;
  _client = new Client({
    apiUrl: session.deploymentUrl,
    ...(session.langsmithApiKey ? { apiKey: session.langsmithApiKey } : {}),
  });
  return _client;
}

export function getClient(): Client {
  if (!_client) throw new Error("LangGraph client not initialized.");
  return _client;
}

export async function createThread(): Promise<string> {
  const client = getClient();
  const thread = await client.threads.create();
  return thread.thread_id;
}

function extractContent(msg: any): string {
  if (!msg) return "";
  const content = msg.content ?? "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c?.type === "text")
      .map((c: any) => c.text ?? "")
      .join("");
  }
  return "";
}

function isAIMessage(msg: any): boolean {
  if (!msg) return false;
  const t = msg.type ?? msg.role ?? "";
  return t === "ai" || t === "AIMessage" || t === "AIMessageChunk" || t === "assistant";
}

export async function* streamResearch(
  threadId: string,
  message: string
): AsyncGenerator<StreamEvent> {
  if (!_session) throw new Error("Session not set.");

  const client = getClient();
  const aiMessageId = `ai_${Date.now()}`;

  try {
    const stream = client.runs.stream(
      threadId,
      _session.assistantId,
      {
        input: { messages: [{ role: "human", content: message }] },
        config: {
          configurable: {
            groq_api_key:      _session.groqApiKey,
            tavily_api_key:     _session.tavilyApiKey,
            notion_token:       _session.notionToken,
            notion_database_id: _session.notionDatabaseId,
            ...(_session.langsmithApiKey
              ? { langsmith_api_key: _session.langsmithApiKey }
              : {}),
          },
        },
        streamMode: "updates" as any,
      }
    );

    let lastContent = "";

    for await (const chunk of stream) {
      const event = chunk.event as string;
      const data  = chunk.data  as any;

      if (event === "updates" && data && typeof data === "object") {
        for (const nodeName of Object.keys(data)) {
          if (nodeName === "__start__" || nodeName === "__end__") continue;

          yield { type: "agent_update", agentName: nodeName as AgentName };

          // Pull AI messages out of this node's state update
          const msgs: any[] = data[nodeName]?.messages ?? [];
          for (const msg of msgs) {
            if (!isAIMessage(msg)) continue;
            const content = extractContent(msg);
            if (content && content !== lastContent) {
              lastContent = content;
              yield { type: "message_chunk", messageId: aiMessageId, chunk: content };
            }
          }

          if (nodeName === "finalizer") {
            yield { type: "notion_saved" };
          }
        }
      }

      // Safety net: grab last AI message from final state
      if (event === "values" && data?.messages) {
        const msgs: any[] = data.messages;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (isAIMessage(msgs[i])) {
            const content = extractContent(msgs[i]);
            if (content && content !== lastContent) {
              lastContent = content;
              yield { type: "message_chunk", messageId: aiMessageId, chunk: content };
            }
            break;
          }
        }
      }
    }

    yield { type: "done", messageId: aiMessageId };
  } catch (err: any) {
    yield { type: "error", error: err?.message ?? "Unknown stream error." };
  }
}
