import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Smile, Sparkles, Copy, Check, Edit2, RefreshCcw, Save, X, Bookmark, Download } from 'lucide-react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateResponse?: (messageId: string) => void;
  onSaveAsNote?: (content: string) => void;
}

const modelNames = {
  google: "Gemma",
  zhipu: "Zhipu",
  'mistral-small': "Misty",
  'mistral-codestral': "Cody",
};

// Memoized code block component to prevent unnecessary re-renders
const CodeBlock = React.memo(({ language, children }: { language: string; children: string; }) => {
  const [copied, setCopied] = useState(false);
  const codeContent = String(children).replace(/\n$/, '');
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeContent]);

  return (
    <div className="relative my-2 text-sm will-change-transform">
      <div className="absolute right-2 top-2 flex items-center gap-2 z-10">
        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="interactive-button p-1.5 bg-gray-800 rounded hover:bg-gray-700 text-gray-300 transition-colors touch-target"
          title={'Copy code'}
        >
          {copied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        className="!bg-[#121212] rounded-md !p-4 !pt-8"
      >
        {codeContent}
      </SyntaxHighlighter>
    </div>
  );
});

// Memoized streaming indicator to prevent layout shifts
const StreamingIndicator = React.memo(() => (
  <span className="inline-flex items-center ml-1">
    <span className="w-2 h-2 bg-[var(--color-text-placeholder)] rounded-full animate-pulse" />
  </span>
));

// Memoized action buttons to prevent unnecessary re-renders
const ActionButtons = React.memo(({ isUser, onRegenerate, onEdit, onCopy, onSaveNote, onExport, copied, noteSaved }: {
  isUser: boolean;
  onRegenerate?: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onSaveNote: () => void;
  onExport: () => void;
  copied: boolean;
  noteSaved: boolean;
}) => (
  <div className="absolute -bottom-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
    <div className="flex gap-1 p-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-sm">
      {!isUser && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="interactive-button text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded hover:bg-[var(--color-border)] touch-target"
          title={'Regenerate response'}
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      )}
      {!isUser && (
        <button
          onClick={onSaveNote}
          className={`interactive-button transition-colors p-1 rounded hover:bg-[var(--color-border)] touch-target ${noteSaved ? 'text-blue-400' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          title={'Save as Note'}
        >
          <Bookmark className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onEdit}
        className="interactive-button text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded hover:bg-[var(--color-border)] touch-target"
        title={'Edit message'}
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={onCopy}
        className="interactive-button text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded hover:bg-[var(--color-border)] touch-target"
        title={'Copy message'}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
      {!isUser && (
        <button
          onClick={onExport}
          className="interactive-button text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded hover:bg-[var(--color-border)] touch-target"
          title={'Export as Markdown'}
        >
          <Download className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
));

export function MessageBubble({
  message,
  isStreaming = false,
  onEditMessage,
  onRegenerateResponse,
  onSaveAsNote,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isEditing, setIsEditing] = useState(message.isEditing || false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout>();

  // Memoize display model to prevent unnecessary recalculations
  const displayModel = useMemo(() => {
    if (isUser || !message.model) return undefined;
    return modelNames[message.model] || modelNames['google'];
  }, [isUser, message.model]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [message.content]);
  
  const handleSaveNote = useCallback(() => {
    if (onSaveAsNote) {
      onSaveAsNote(message.content);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500); // Visual feedback for 2.5s
    }
  }, [message.content, onSaveAsNote]);

  const handleExport = useCallback(() => {
    const blob = new Blob([message.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-tutor-response-${message.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [message.content, message.id]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditContent(message.content);
  }, [message.content]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() !== message.content && onEditMessage) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  }, [editContent, message.content, message.id, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent(message.content);
  }, [message.content]);

  const handleRegenerate = useCallback(() => {
    if (onRegenerateResponse) {
      onRegenerateResponse(message.id);
    }
  }, [message.id, onRegenerateResponse]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, editContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Memoize markdown components to prevent re-creation on every render
  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      if (!inline && match) {
        return (
          <CodeBlock
            language={match[1]}
            children={String(children)}
          />
        );
      } else {
        return (
          <code className="bg-[var(--color-bg)] px-1.5 py-0.5 rounded text-sm" {...props}>
            {children}
          </code>
        );
      }
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

  return (
    <div
      className={`message-wrapper flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'} group transition-all duration-200 ease-out will-change-transform`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-card)]">
          <Sparkles className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </div>
      )}
      
      <div className="message-bubble relative bg-[var(--color-card)] p-3 sm:p-4 rounded-xl min-h-[3rem] flex flex-col">
        {!isUser && displayModel && (
          <div className="text-xs text-[var(--color-text-secondary)] mb-2 font-medium tracking-wide">
            {displayModel}
          </div>
        )}
        
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-w-72 min-h-[120px] p-3 border border-[var(--color-border)] rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--color-bg)] text-[var(--color-text-primary)] font-normal"
              placeholder={'Edit your message...'}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelEdit}
                className="interactive-button flex items-center gap-1 px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm touch-target"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="interactive-button flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium touch-target"
                disabled={editContent.trim() === message.content || !editContent.trim()}
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-placeholder)]">
              Press Ctrl+Enter to save, Escape to cancel
            </p>
          </div>
        ) : (
          <div className={`prose prose-invert prose-base max-w-none leading-relaxed flex-1 ${isUser ? 'font-semibold' : 'font-normal'}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && <StreamingIndicator />}
          </div>
        )}
        
        {!isEditing && !isStreaming && message.content.length > 0 && onEditMessage && (
          <ActionButtons
            isUser={isUser}
            onRegenerate={onRegenerateResponse ? handleRegenerate : undefined}
            onEdit={handleEdit}
            onCopy={handleCopy}
            onSaveNote={handleSaveNote}
            onExport={handleExport}
            copied={copied}
            noteSaved={noteSaved}
          />
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-card)]">
          <Smile className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </div>
      )}
    </div>
  );
}
