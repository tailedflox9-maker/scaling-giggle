// src/components/ChatArea.tsx

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Conversation, Message } from '../types';

interface ChatAreaProps {
  conversation: Conversation | undefined;
  onSendMessage: (message: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
  isQuizLoading: boolean;
  isFlowchartLoading: boolean;
  streamingMessage?: Message | null;
  hasApiKey: boolean;
  onStopGenerating: () => void;
  onSaveAsNote: (content: string) => void;
  onGenerateQuiz: () => void;
  onGenerateFlowchart: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateResponse?: (messageId: string) => void;
}

export function ChatArea({
  conversation,
  onSendMessage,
  onNewConversation,
  isLoading,
  isQuizLoading,
  isFlowchartLoading,
  streamingMessage,
  hasApiKey,
  onStopGenerating,
  onSaveAsNote,
  onGenerateQuiz,
  onGenerateFlowchart,
  onEditMessage,
  onRegenerateResponse,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const allMessages = useMemo(() =>
    streamingMessage ? [...(conversation?.messages || []), streamingMessage] : conversation?.messages || [],
    [conversation?.messages, streamingMessage]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [allMessages.length, streamingMessage?.content, scrollToBottom]);

  const canGenerateQuiz = conversation && conversation.messages.length > 2;
  const canGenerateFlowchart = conversation && conversation.messages.length > 1;

  // State 1: No conversation is selected at all. Show the main welcome screen.
  if (!conversation) {
    return (
      <div className="chat-area">
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="text-center max-w-2xl mx-auto">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[var(--color-card)] rounded-2xl flex items-center justify-center p-4 shadow-xl">
                <img
                  src="/white-logo.png"
                  alt="AI Tutor Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] mb-4">
              Welcome to AI Tutor
            </h1>
            
            {/* Subheading */}
            <p className="text-base sm:text-lg text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">
              Your personal AI learning companion. Get instant help with homework, study for exams, or explore new topics.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-sm">
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
                <div className="text-2xl mb-2">🎓</div>
                <div className="font-semibold text-[var(--color-text-primary)] mb-1">Learn Anything</div>
                <div className="text-[var(--color-text-secondary)] text-xs">Get explanations on any subject</div>
              </div>
              
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
                <div className="text-2xl mb-2">💡</div>
                <div className="font-semibold text-[var(--color-text-primary)] mb-1">Practice Quizzes</div>
                <div className="text-[var(--color-text-secondary)] text-xs">Test your knowledge</div>
              </div>
              
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-semibold text-[var(--color-text-primary)] mb-1">Visual Learning</div>
                <div className="text-[var(--color-text-secondary)] text-xs">Generate flowcharts</div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={onNewConversation}
              disabled={!hasApiKey}
              className="interactive-button inline-flex items-center gap-3 px-8 py-4 bg-[var(--color-accent-bg)] hover:bg-[var(--color-accent-bg-hover)] text-[var(--color-accent-text)] rounded-xl font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Start New Chat
            </button>

            {!hasApiKey && (
              <p className="mt-4 text-sm text-red-400">
                Please configure your API key in settings to get started
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State 2: A conversation is selected (either new and empty, or with messages).
  return (
    <div className="chat-area">
      <div
        ref={chatMessagesRef}
        className="chat-messages scroll-container"
      >
        <div className="chat-messages-container h-full">
          {allMessages.length === 0 ? (
            // State 2a: The selected conversation is empty.
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-4">
                 <div className="mb-4 flex justify-center">
                  <img
                    src="/white-logo.png"
                    alt="AI Tutor Logo"
                    className="w-20 h-20 sm:w-24 sm:h-24"
                  />
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-[var(--color-text-primary)] mb-3">
                  {conversation.title}
                </h2>
                <p className="text-lg text-[var(--color-text-secondary)]">
                  Ready to learn? Ask your first question below.
                </p>
              </div>
            </div>
          ) : (
            // State 2b: The conversation has messages.
            <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
              {allMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={streamingMessage?.id === message.id}
                  onSaveAsNote={onSaveAsNote}
                  onEditMessage={onEditMessage}
                  onRegenerateResponse={onRegenerateResponse}
                />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
        </div>
      </div>

      <div className="chat-input-container mobile-chat-area">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          isQuizLoading={isQuizLoading}
          isFlowchartLoading={isFlowchartLoading}
          disabled={!hasApiKey}
          onStopGenerating={onStopGenerating}
          onGenerateQuiz={onGenerateQuiz}
          onGenerateFlowchart={onGenerateFlowchart}
          canGenerateQuiz={!!canGenerateQuiz}
          canGenerateFlowchart={!!canGenerateFlowchart}
        />
      </div>
    </div>
  );
}
