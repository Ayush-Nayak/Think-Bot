"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageRendererProps {
  content: string;
  isStreaming?: boolean;
}

export default function MessageRenderer({ content, isStreaming }: MessageRendererProps) {
  return (
    <div className="prose-tb">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children, ...props }) {
            return (
              <pre {...props} style={{ position: "relative" }}>
                {children}
              </pre>
            );
          },
          code({ className, children, ...props }) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="inline-block w-1.5 h-4 ml-0.5 animate-blink"
          style={{ background: "var(--accent)", verticalAlign: "text-bottom", borderRadius: 1 }}
        />
      )}
    </div>
  );
}
