/**
 * Session-only key management.
 * All keys live in sessionStorage — destroyed when the tab closes.
 * Nothing is ever sent to our servers.
 */

export interface ThinkBotSession {
  deploymentUrl:    string;
  assistantId:      string;
  groqApiKey:       string;
  tavilyApiKey:     string;
  notionToken:      string;
  notionDatabaseId: string;
  langsmithApiKey?: string;
}

const SESSION_KEY = "thinkbot_session";

export function saveSession(data: ThinkBotSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function loadSession(): ThinkBotSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ThinkBotSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem(SESSION_KEY);
}
