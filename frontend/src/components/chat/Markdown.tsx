'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { CodeBlock } from './CodeBlock';

interface MarkdownProps {
  content: string;
}

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const value = String(children ?? '');
    const isBlock = value.includes('\n') || Boolean(match);
    if (!isBlock) {
      return (
        <code
          className="rounded-md bg-[#F5F5F7] px-1.5 py-0.5 font-mono text-[0.85em] text-[#1D1D1F]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock language={match?.[1] ?? 'text'} value={value} />;
  },
  p({ children }) {
    return <p className="mb-3 leading-7 last:mb-0">{children}</p>;
  },
  h1({ children }) {
    return (
      <h1 className="mb-3 mt-4 text-2xl font-semibold tracking-tight text-[#1D1D1F]">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="mb-3 mt-4 text-xl font-semibold tracking-tight text-[#1D1D1F]">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="mb-2 mt-3 text-lg font-semibold tracking-tight text-[#1D1D1F]">
        {children}
      </h3>
    );
  },
  ul({ children }) {
    return <ul className="mb-3 list-disc space-y-1 pl-6 leading-7">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-3 list-decimal space-y-1 pl-6 leading-7">{children}</ol>;
  },
  li({ children }) {
    return <li className="marker:text-[#9b9ba3]">{children}</li>;
  },
  a({ children, href }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[#00CCFF] underline decoration-[#00CCFF]/40 underline-offset-4 transition hover:decoration-[#00CCFF]"
      >
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-3 border-l-2 border-[#00CCFF] bg-[#F5F5F7] px-4 py-2 italic text-[#3a3a40]">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto rounded-xl border border-[#EAEAEC]">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-[#F5F5F7] text-[#1D1D1F]">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="border-b border-[#EAEAEC] px-4 py-2 font-semibold">{children}</th>
    );
  },
  td({ children }) {
    return <td className="border-b border-[#F0F0F2] px-4 py-2">{children}</td>;
  },
  hr() {
    return <hr className="my-4 border-t border-[#EAEAEC]" />;
  },
};

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="text-[#1D1D1F]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
