import { APISettings, Conversation, StudySession, QuizQuestion, TutorMode } from '../types';
import { generateId } from '../utils/helpers';

// Persona prompts for tutors
const tutorPrompts: Record<TutorMode, string> = {
  standard: `You are an expert AI Tutor named 'Tutor'. Your primary goal is to help users understand complex topics through clear, patient, and encouraging guidance. Follow these principles strictly:
1. Socratic Method: Do not just provide direct answers. Instead, ask guiding questions to help the user arrive at the solution themselves.
2. Simplify Concepts: Break down complex subjects into smaller, digestible parts. Use simple language, analogies, and real-world examples to make concepts relatable.
3. Encouraging Tone: Maintain a positive, patient, and supportive tone at all times.
4. Clear Explanations: When you must provide an explanation or a code example, ensure it is thoroughly commented and explained step-by-step.
5. Stay Focused: Politely steer the conversation back to the educational topic if the user strays.`,

  exam: `You are a no-nonsense AI Exam Coach. Your purpose is to prepare the user for a test. You are direct, efficient, and focused on results.
1. Focus on Key Concepts: Prioritize formulas, definitions, and facts most likely to appear on exams.
2. Provide Practice Problems: Actively create practice questions and short-answer drills.
3. Concise Answers: Be direct. Avoid long philosophical explanations.
4. Identify Weaknesses: Give immediate feedback and short explanations when answers are wrong.
5. Time Management: Emphasize speed and accuracy.`,

  mentor: `You are a Friendly AI Mentor. You are casual, relatable, and motivating.
1. Relatable Analogies: Use simple analogies and real-life examples.
2. Constant Encouragement: Cheer the student on ("You're doing great!").
3. Casual Tone: Be conversational, use emojis if needed.
4. Focus on the 'Why': Explain the real-world relevance of topics.
5. Growth Mindset: Treat mistakes as learning opportunities.`,

  creative: `You are a Creative AI Guide. You help with brainstorming, writing, and imaginative thinking.
1. Brainstorming Partner: Offer many starting points and "what if" scenarios.
2. Ask Open-Ended Questions: Encourage exploration.
3. Sensory Details: Guide the user to think about sights, sounds, smells, etc.
4. Constructive Feedback: Focus on positives before suggesting improvements.
5. Creative Constraints: Suggest fun challenges to spark ideas.`
};

// Helper: OpenAI-compatible streaming with timeout
async function* streamOpenAICompatResponse(
  url: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string,
  timeout: number = 30000
): AsyncGenerator<string> {
  const messagesWithSystemPrompt = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages: messagesWithSystemPrompt, stream: true }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("API Error Body:", errorBody);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (data === '[DONE]') return;
            
            try {
              const json = JSON.parse(data);
              const chunk = json.choices?.[0]?.delta?.content;
              if (chunk) yield chunk;
            } catch (e) {
              console.error('Error parsing stream chunk:', e, 'Raw data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

class AiService {
  private settings: APISettings = {
    googleApiKey: '',
    zhipuApiKey: '',
    mistralApiKey: '',
    selectedModel: 'google',
    selectedTutorMode: 'standard',
  };

  public updateSettings(newSettings: APISettings) {
    this.settings = newSettings;
  }

  private getSystemPrompt(): string {
    return tutorPrompts[this.settings.selectedTutorMode] || tutorPrompts.standard;
  }

  // NEW: Method specifically for flowchart generation that ALWAYS uses Google Gemini 2.5 Flash
  public async *generateFlowchartResponse(
    messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    if (!this.settings.googleApiKey) {
      throw new Error('Google API key not set. Flowchart generation requires Google API.');
    }

    if (!messages || messages.length === 0) {
      throw new Error('No messages provided');
    }

    const userMessages = messages.map(m => ({ role: m.role, content: m.content }));
    
    // Use minimal system prompt for flowchart generation
    const systemPrompt = 'You are a helpful assistant that generates flowcharts in JSON format.';

    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?key=${this.settings.googleApiKey}&alt=sse`;

    // Prepend system prompt + user messages (Gemini-compatible)
    const googleMessages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will follow this role.' }] },
      ...userMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for flowchart

    try {
      const response = await fetch(googleUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: googleMessages }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Google API Error: ${response.status} - ${errorBody}`);
      }

      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.substring(6));
                const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunk) yield chunk;
              } catch (e) { 
                console.error('Error parsing Google stream:', e); 
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Flowchart generation timed out');
      }
      throw error;
    }
  }

  // Unified streaming response generator with error handling
  public async *generateStreamingResponse(
    messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    if (!messages || messages.length === 0) {
      throw new Error('No messages provided');
    }

    const userMessages = messages.map(m => ({ role: m.role, content: m.content }));
    const systemPrompt = this.getSystemPrompt();

    try {
      switch (this.settings.selectedModel) {
        case 'google': {
          if (!this.settings.googleApiKey) throw new Error('Google API key not set');
          
          const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:streamGenerateContent?key=${this.settings.googleApiKey}&alt=sse`;

          // Prepend system prompt + user messages (Gemma-compatible)
          const googleMessages = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood. I will follow this role.' }] },
            ...userMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          ];

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const response = await fetch(googleUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: googleMessages }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorBody = await response.text();
              throw new Error(`Google API Error: ${response.status} - ${errorBody}`);
            }

            if (!response.body) throw new Error('Response body is null');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const json = JSON.parse(line.substring(6));
                      const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (chunk) yield chunk;
                    } catch (e) { 
                      console.error('Error parsing Google stream:', e); 
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }
          } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
              throw new Error('Request timed out');
            }
            throw error;
          }
          break;
        }

        case 'zhipu':
          if (!this.settings.zhipuApiKey) throw new Error('ZhipuAI API key not set');
          yield* streamOpenAICompatResponse(
            'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            this.settings.zhipuApiKey,
            'glm-4.5-flash',
            userMessages,
            systemPrompt
          );
          break;

        case 'mistral-small':
          if (!this.settings.mistralApiKey) throw new Error('Mistral API key not set');
          yield* streamOpenAICompatResponse(
            'https://api.mistral.ai/v1/chat/completions',
            this.settings.mistralApiKey,
            'mistral-small-latest',
            userMessages,
            systemPrompt
          );
          break;

        case 'mistral-codestral':
          if (!this.settings.mistralApiKey) throw new Error('Mistral API key not set for Codestral');
          yield* streamOpenAICompatResponse(
            'https://api.mistral.ai/v1/chat/completions',
            this.settings.mistralApiKey,
            'codestral-latest',
            userMessages,
            systemPrompt
          );
          break;

        default:
          throw new Error('Invalid model selected or API key not set.');
      }
    } catch (error) {
      console.error('Error in generateStreamingResponse:', error);
      throw error;
    }
  }

  // Quiz generation with better error handling
  public async generateQuiz(conversation: Conversation): Promise<StudySession> {
    if (!this.settings.googleApiKey) {
      throw new Error('Google API key must be configured to generate quizzes.');
    }

    if (!conversation.messages || conversation.messages.length < 2) {
      throw new Error('Conversation must have at least 2 messages to generate a quiz.');
    }

    const conversationText = conversation.messages
      .map(m => `${m.role === 'user' ? 'Q:' : 'A:'} ${m.content}`)
      .join('\n\n');

    const prompt = `Based on the following conversation, create a multiple-choice quiz with 5 questions to test understanding of the key concepts discussed.

Conversation:
---
${conversationText.slice(0, 6000)}
---

IMPORTANT INSTRUCTIONS:
1. Create exactly 5 multiple-choice questions
2. Each question must have exactly 4 options
3. One option must be the correct answer
4. Include a brief explanation for each answer

OUTPUT FORMAT - Return ONLY this JSON structure with no extra text, no markdown, no code blocks:

{
  "questions": [
    {
      "question": "What is the main concept discussed?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option B",
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Generate the quiz now:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${this.settings.googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: prompt }] },
              { role: 'model', parts: [{ text: 'Understood. I will return only JSON.' }] }
            ],
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) {
        throw new Error('Invalid response from API when generating quiz.');
      }

      try {
        const cleanText = textResponse
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        const parsed = JSON.parse(cleanText);

        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          throw new Error('Quiz JSON missing questions array.');
        }

        if (parsed.questions.length === 0) {
          throw new Error('No questions generated. Try a longer conversation.');
        }

        const questions: QuizQuestion[] = parsed.questions.map((q: any, index: number) => {
          if (!q.question || !q.options || !Array.isArray(q.options) || !q.answer || !q.explanation) {
            throw new Error(`Invalid question format at index ${index}`);
          }

          const correctIndex = q.options.indexOf(q.answer);
          if (correctIndex === -1) {
            throw new Error(`Correct answer not found in options at index ${index}`);
          }

          return {
            id: generateId(),
            question: q.question,
            options: q.options,
            correctAnswer: correctIndex,
            explanation: q.explanation,
          };
        });

        return {
          id: generateId(),
          conversationId: conversation.id,
          questions,
          currentQuestionIndex: 0,
          score: 0,
          totalQuestions: questions.length,
          isCompleted: false,
          createdAt: new Date(),
        };
      } catch (error) {
        console.error("Failed to parse quiz JSON:", error, "Raw response:", textResponse);
        throw new Error("Could not generate a valid quiz from the conversation. Please try again.");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Quiz generation timed out. Please try again.');
      }
      throw error;
    }
  }
}

export const aiService = new AiService();
