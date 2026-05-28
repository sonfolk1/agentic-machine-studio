import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

/**
 * Slim, dark-themed Markdown renderer used for assistant bubbles.
 * Wires GFM (tables, strikethrough) + highlight.js for fenced code blocks.
 */
export const Markdown: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  return (
    <div className="prose-as">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          p: ({ children }) => (
            <p className="text-[13.5px] leading-relaxed text-ink-100 my-1.5">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                if (href) window.api?.app?.openExternal?.(href);
              }}
              className="text-accent-soft underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 text-[13.5px] text-ink-100 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 text-[13.5px] text-ink-100 space-y-0.5">{children}</ol>,
          h1: ({ children }) => <h1 className="text-[18px] font-semibold mt-3 mb-1 text-ink-100">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[16px] font-semibold mt-3 mb-1 text-ink-100">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[14.5px] font-semibold mt-2 mb-0.5 text-ink-100">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/40 pl-3 my-2 text-ink-200 italic">{children}</blockquote>
          ),
          code({ inline, className, children, ...props }: any) {
            const code = String(children).replace(/\n$/, '');
            if (inline) {
              return (
                <code className="px-1 py-0.5 rounded bg-ink-800/80 border border-white/[0.05] font-mono text-[12px] text-accent-soft">
                  {code}
                </code>
              );
            }
            const lang = /language-(\w+)/.exec(className || '')?.[1];
            return (
              <div className="my-2 rounded-md border border-white/[0.05] bg-ink-950 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-400 border-b border-white/[0.04] bg-ink-900/60">
                  <span>{lang || 'code'}</span>
                  <button
                    className="text-ink-400 hover:text-ink-100 transition-colors"
                    onClick={() => navigator.clipboard?.writeText(code)}
                    title="Copy"
                  >
                    Copy
                  </button>
                </div>
                <pre className="px-3 py-2 text-[12px] leading-relaxed overflow-x-auto">
                  <code className={className} {...props}>{children}</code>
                </pre>
              </div>
            );
          },
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="text-[12.5px] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="px-2 py-1 border border-white/[0.06] text-left text-ink-200">{children}</th>,
          td: ({ children }) => <td className="px-2 py-1 border border-white/[0.06] text-ink-100">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
