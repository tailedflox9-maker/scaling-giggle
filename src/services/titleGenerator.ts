// src/services/titleGenerator.ts
import { APISettings } from '../types';

/**
 * Generates a concise, descriptive title for a conversation using AI
 */
export async function generateConversationTitleAI(
  firstMessage: string,
  settings: APISettings
): Promise<string> {
  // Fallback to simple extraction if no API key
  if (!settings.googleApiKey && !settings.zhipuApiKey && !settings.mistralApiKey) {
    return generateConversationTitleSimple(firstMessage);
  }

  const prompt = `Generate a concise, descriptive title (max 60 characters) for a conversation that starts with this question:

"${firstMessage.slice(0, 300)}"

Requirements:
- Maximum 60 characters
- Capture the main topic/question
- No quotes around the title
- Be specific and clear
- Use title case

Return ONLY the title, nothing else.`;

  try {
    // Use Google Gemini for fastest response
    if (settings.googleApiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (title && title.length > 0 && title.length <= 80) {
          return title;
        }
      }
    }
  } catch (error) {
    console.error('Error generating AI title:', error);
  }

  // Fallback to simple extraction
  return generateConversationTitleSimple(firstMessage);
}

/**
 * Simple fallback title generation without AI
 */
function generateConversationTitleSimple(firstMessage: string): string {
  const maxLength = 80;
  
  // Clean up the message
  let cleaned = firstMessage.trim().replace(/\n+/g, ' ');
  
  // Try to extract the main question/topic
  // Look for question patterns
  const questionMatch = cleaned.match(/^(what|how|why|when|where|who|can|could|should|would|is|are|do|does|explain|tell me|help me)[^.?!]*[.?!]?/i);
  
  if (questionMatch) {
    cleaned = questionMatch[0].trim();
  }
  
  // Remove common filler words from the start
  cleaned = cleaned.replace(/^(hi|hello|hey|please|can you|could you|i need|i want to)\s+/i, '');
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Truncate if too long
  if (cleaned.length > maxLength) {
    // Try to break at a word boundary
    const truncated = cleaned.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.slice(0, lastSpace).trim() + '...';
    }
    
    return truncated.trim() + '...';
  }
  
  return cleaned;
}

/**
 * Generate title with optional AI enhancement
 * This is async but returns immediately with a simple title,
 * then updates with AI title if available
 */
export async function generateSmartTitle(
  firstMessage: string,
  settings: APISettings,
  onTitleGenerated?: (title: string) => void
): Promise<string> {
  // Return simple title immediately
  const simpleTitle = generateConversationTitleSimple(firstMessage);
  
  // Try to generate AI title in background
  if (settings.googleApiKey || settings.zhipuApiKey || settings.mistralApiKey) {
    generateConversationTitleAI(firstMessage, settings)
      .then(aiTitle => {
        if (onTitleGenerated && aiTitle !== simpleTitle) {
          onTitleGenerated(aiTitle);
        }
      })
      .catch(err => {
        console.error('Background title generation failed:', err);
      });
  }
  
  return simpleTitle;
}
