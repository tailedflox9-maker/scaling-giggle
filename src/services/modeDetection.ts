// src/services/modeDetection.ts
import { TutorMode } from '../types';

interface ModeDetectionResult {
  suggestedMode: TutorMode;
  confidence: number; // 0-1
  reason: string;
}

// Keywords for each mode
const MODE_KEYWORDS = {
  exam: [
    'exam', 'test', 'quiz', 'prepare', 'study for', 'practice questions',
    'mock test', 'revision', 'assessment', 'midterm', 'final', 'preparation'
  ],
  mentor: [
    'homework', 'stuck', 'help me', 'confused', 'don\'t understand',
    'struggling', 'hard to', 'difficult', 'explain like', 'eli5',
    'simple terms', 'basics', 'beginner'
  ],
  creative: [
    'write', 'story', 'essay', 'creative', 'poem', 'article', 'blog',
    'brainstorm', 'ideas', 'imagine', 'fiction', 'narrative', 'draft',
    'compose', 'script', 'dialogue'
  ],
  standard: [
    'learn', 'understand', 'explain', 'how does', 'what is', 'why',
    'teach me', 'tell me about', 'concept', 'theory'
  ]
};

/**
 * Analyzes user's first message to suggest the best tutor mode
 */
export function detectBestMode(userMessage: string): ModeDetectionResult {
  const message = userMessage.toLowerCase().trim();
  
  // Skip detection for very short messages
  if (message.length < 10) {
    return {
      suggestedMode: 'standard',
      confidence: 0.3,
      reason: 'Message too short to detect intent'
    };
  }
  
  // Score each mode
  const scores: Record<TutorMode, number> = {
    standard: 0,
    exam: 0,
    mentor: 0,
    creative: 0
  };
  
  // Count keyword matches
  for (const [mode, keywords] of Object.entries(MODE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        scores[mode as TutorMode] += 1;
      }
    }
  }
  
  // Find mode with highest score
  let bestMode: TutorMode = 'standard';
  let maxScore = scores.standard;
  
  for (const [mode, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestMode = mode as TutorMode;
    }
  }
  
  // Calculate confidence (0-1)
  const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalMatches > 0 ? maxScore / totalMatches : 0.3;
  
  // Generate reason
  const reasons: Record<TutorMode, string> = {
    exam: 'Detected test preparation keywords',
    mentor: 'Detected help-seeking language',
    creative: 'Detected creative writing intent',
    standard: 'General learning question detected'
  };
  
  return {
    suggestedMode: bestMode,
    confidence,
    reason: reasons[bestMode]
  };
}

/**
 * Checks if we should show mode suggestion to user
 */
export function shouldSuggestMode(
  detectionResult: ModeDetectionResult,
  currentMode: TutorMode
): boolean {
  // Don't suggest if already using the detected mode
  if (detectionResult.suggestedMode === currentMode) {
    return false;
  }
  
  // Don't suggest if it's just defaulting to standard
  if (detectionResult.suggestedMode === 'standard' && currentMode === 'standard') {
    return false;
  }
  
  // Only suggest if confidence is high enough
  return detectionResult.confidence >= 0.5;
}

/**
 * Get friendly suggestion message for UI
 */
export function getModeSuggestionMessage(mode: TutorMode): string {
  const messages: Record<TutorMode, string> = {
    exam: '🎓 Want exam-focused quick answers? Try Exam Coach mode!',
    mentor: '🧑‍🏫 Need patient step-by-step help? Try Friendly Mentor mode!',
    creative: '✍️ Working on creative writing? Try Creative Guide mode!',
    standard: '📘 Want structured learning? Try Standard Tutor mode!'
  };
  
  return messages[mode];
}
