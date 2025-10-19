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
          <div className="text-center max-w-3xl mx-auto">
            {/* Logo with gradient background */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center p-4 shadow-2xl animate-fade-in-up">
                <img
                  src="/white-logo.png"
                  alt="AI Tutor Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary)] mb-3 animate-fade-in-up">
              Welcome to AI Tutor
            </h1>
            
            {/* Subheading */}
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-8 max-w-xl mx-auto leading-relaxed animate-fade-in-up">
              Your intelligent learning companion powered by advanced AI. Get instant help, master concepts, and accelerate your learning journey.
            </p>

            {/* Feature highlights - 2x2 grid on mobile, 4 columns on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 animate-fade-in-up">
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-blue-500/50 transition-all duration-200 hover:shadow-lg">
                <div className="text-2xl sm:text-3xl mb-2">🎓</div>
                <div className="font-semibold text-[var(--color-text-primary)] text-sm mb-1">Expert Tutor</div>
                <div className="text-[var(--color-text-secondary)] text-xs leading-relaxed">Personalized explanations</div>
              </div>
              
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-purple-500/50 transition-all duration-200 hover:shadow-lg">
                <div className="text-2xl sm:text-3xl mb-2">💡</div>
                <div className="font-semibold text-[var(--color-text-primary)] text-sm mb-1">Smart Quizzes</div>
                <div className="text-[var(--color-text-secondary)] text-xs leading-relaxed">Auto-generated tests</div>
              </div>
              
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-green-500/50 transition-all duration-200 hover:shadow-lg">
                <div className="text-2xl sm:text-3xl mb-2">📊</div>
                <div className="font-semibold text-[var(--color-text-primary)] text-sm mb-1">Flowcharts</div>
                <div className="text-[var(--color-text-secondary)] text-xs leading-relaxed">Visual concept maps</div>
              </div>

              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-yellow-500/50 transition-all duration-200 hover:shadow-lg">
                <div className="text-2xl sm:text-3xl mb-2">📝</div>
                <div className="font-semibold text-[var(--color-text-primary)] text-sm mb-1">Smart Notes</div>
                <div className="text-[var(--color-text-secondary)] text-xs leading-relaxed">Save key insights</div>
              </div>
            </div>

            {/* Good to know section */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 mb-6 text-left animate-fade-in-up">
              <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <span className="text-xl">✨</span>
                Good to Know
              </h3>
              <div className="space-y-3 text-xs sm:text-sm text-[var(--color-text-secondary)]">
                <div className="flex items-start gap-3">
                  <span className="text-blue-400 font-bold flex-shrink-0">→</span>
                  <p className="leading-relaxed">
                    <strong className="text-[var(--color-text-primary)]">4 Tutor Modes:</strong> Switch between Standard, Exam Coach, Friendly Mentor, or Creative Guide in settings
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-400 font-bold flex-shrink-0">→</span>
                  <p className="leading-relaxed">
                    <strong className="text-[var(--color-text-primary)]">Multiple AI Models:</strong> Choose from Gemma, ZhipuAI, Mistral, or Codestral for different tasks
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-400 font-bold flex-shrink-0">→</span>
                  <p className="leading-relaxed">
                    <strong className="text-[var(--color-text-primary)]">Offline Support:</strong> Install as PWA to access your saved conversations anytime
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-yellow-400 font-bold flex-shrink-0">→</span>
                  <p className="leading-relaxed">
                    <strong className="text-[var(--color-text-primary)]">Privacy First:</strong> All your data stays on your device—no cloud storage
                  </p>
                </div>
              </div>
            </div>

            {/* Getting started tip */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-4 animate-fade-in-up">
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                💡 <strong className="text-[var(--color-text-primary)]">Pro Tip:</strong> Click <strong>"New chat"</strong> in the sidebar or simply start typing below to begin your learning session!
              </p>
            </div>

            {!hasApiKey && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg animate-fade-in-up">
                <p className="text-sm text-red-400 flex items-center justify-center gap-2">
                  <span className="text-lg">⚠️</span>
                  Please configure your API key in settings to get started
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
