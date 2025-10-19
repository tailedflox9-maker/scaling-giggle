import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Note } from '../types';
import { formatDate } from '../utils/helpers';

interface NoteViewProps {
  note: Note | null;
}

const CodeBlock = React.memo(({ language, children }: { language: string; children: string; }) => {
  const codeContent = String(children).replace(/\n$/, '');
  return (
    <SyntaxHighlighter
      style={vscDarkPlus}
      language={language}
      PreTag="div"
      className="!bg-[#121212] rounded-md !p-4"
    >
      {codeContent}
    </SyntaxHighlighter>
  );
});

export function NoteView({ note }: NoteViewProps) {
  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <CodeBlock language={match[1]} children={String(children)} />
      ) : (
        <code className="bg-[var(--color-bg)] px-1.5 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="border-collapse border border-[var(--color-border)] w-full">
            {children}
          </table>
        </div>
      );
    },
    th({ children }: any) {
      return (
        <th className="border border-[var(--color-border)] p-2 bg-[var(--color-sidebar)] font-semibold">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return <td className="border border-[var(--color-border)] p-2">{children}</td>;
    },
  }), []);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-[var(--color-card)] rounded-2xl flex items-center justify-center p-4 border border-[var(--color-border)]">
              <img
                src="/white-logo.png"
                alt="AI Tutor"
                className="w-full h-full object-contain opacity-50"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Select a note to view
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Choose a note from the sidebar to get started
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-xs font-medium text-[var(--color-text-primary)] mb-1">Save Messages</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Bookmark important answers</div>
            </div>
            
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-xs font-medium text-[var(--color-text-primary)] mb-1">Quick Search</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Find notes instantly</div>
            </div>
          </div>

          {/* Tip */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 text-left">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text-primary)]">💡 How to save:</strong> Hover over any AI response and click the bookmark icon to save it as a note
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-bg)] overflow-y-auto scroll-container">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-[var(--color-border)]">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-2 sm:mb-3 leading-tight">
            {note.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
            <span>
              Saved on: {formatDate(note.createdAt)}
            </span>
            {note.sourceConversationId && (
              <span className="px-2 py-1 bg-[var(--color-card)] rounded-full text-xs">
                From Chat
              </span>
            )}
          </div>
        </div>

        <article className="prose prose-invert prose-base sm:prose-lg max-w-none leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {note.content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
