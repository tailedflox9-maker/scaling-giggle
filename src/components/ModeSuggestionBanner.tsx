// src/components/ModeSuggestionBanner.tsx
import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { TutorMode } from '../types';
import { getModeSuggestionMessage } from '../services/modeDetection';

interface ModeSuggestionBannerProps {
  suggestedMode: TutorMode;
  onAccept: () => void;
  onDismiss: () => void;
}

export function ModeSuggestionBanner({
  suggestedMode,
  onAccept,
  onDismiss
}: ModeSuggestionBannerProps) {
  const message = getModeSuggestionMessage(suggestedMode);
  
  return (
    <div className="mx-auto max-w-3xl px-4 py-2 animate-slide-up">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-3 flex items-center gap-3 shadow-sm">
        <div className="flex-shrink-0 w-8 h-8 bg-[var(--color-bg)] rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {message}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onAccept}
            className="interactive-button px-3 py-1.5 text-xs font-semibold bg-[var(--color-accent-bg)] hover:bg-[var(--color-accent-bg-hover)] text-[var(--color-accent-text)] rounded-lg transition-colors touch-target"
          >
            Switch
          </button>
          <button
            onClick={onDismiss}
            className="interactive-button p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] rounded-lg transition-colors touch-target"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
