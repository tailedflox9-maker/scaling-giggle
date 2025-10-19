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
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-2xl mx-auto space-y-8">
            
            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-[var(--color-card)] rounded-2xl flex items-center justify-center p-5 border border-[var(--color-border)]">
                <img
                  src="/white-logo.png"
                  alt="AI Tutor"
                  className="w-full h-full object-contain opacity-90"
                />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">
                Welcome to AI Tutor
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
                Your intelligent learning companion powered by advanced AI
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 text-center hover:border-[var(--color-text-secondary)] transition-colors">
                <div className="text-2xl mb-2">🎓</div>
                <div className="text-xs font-medium text-[var(--color-text-primary)]">Expert Tutor</div>
              </div>
              
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 text-center hover:border-[var(--color-text-secondary)] transition-colors">
                <div className="text-2xl mb-2">💡</div>
                <div className="text-xs font-medium text-[var(--color-text-primary)]">Smart Quizzes</div>
              </div>
              
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 text-center hover:border-[var(--color-text-secondary)] transition-colors">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-xs font-medium text-[var(--color-text-primary)]">Flowcharts</div>
              </div>

              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 text-center hover:border-[var(--color-text-secondary)] transition-colors">
                <div className="text-2xl mb-2">📝</div>
                <div className="text-xs font-medium text-[var(--color-text-primary)]">Smart Notes</div>
              </div>
            </div>

            {/* Good to Know - Minimalistic */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-5 text-left">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                Good to Know
              </h3>
              <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-start gap-2">
                  <span className="text-[var(--color-text-primary)] mt-0.5">•</span>
                  <p><strong className="text-[var(--color-text-primary)]">4 Tutor Modes:</strong> Standard, Exam Coach, Mentor, Creative</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--color-text-primary)] mt-0.5">•</span>
                  <p><strong className="text-[var(--color-text-primary)]">Multiple AI Models:</strong> Gemma, ZhipuAI, Mistral, Codestral</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--color-text-primary)] mt-0.5">•</span>
                  <p><strong className="text-[var(--color-text-primary)]">Offline Support:</strong> Install as PWA for offline access</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--color-text-primary)] mt-0.5">•</span>
                  <p><strong className="text-[var(--color-text-primary)]">Privacy First:</strong> All data stays on your device</p>
                </div>
              </div>
            </div>

            {/* Start Tip */}
            <p className="text-xs text-[var(--color-text-secondary)]">
              Click <strong className="text-[var(--color-text-primary)]">"New chat"</strong> in the sidebar to begin
            </p>

            {/* API Key Warning */}
            {!hasApiKey && (
              <div className="p-3 bg-[var(--color-card)] border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-400">
                  ⚠️ Configure your API key in settings first
                </p>
              </div>
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
