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

// Helper: OpenAI-compatible streaming (Zhipu, Mistral)
async function* streamOpenAICompatResponse(
  url: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  systemPrompt: string
): AsyncGenerator<string> {
  const messagesWithSystemPrompt = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: messagesWithSystemPrompt, stream: true }),
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.text();
    console.error("API Error Body:", errorBody);
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        if (data.trim() === '[DONE]') return;
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

  // Unified streaming response generator
  public async *generateStreamingResponse(
    messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    const userMessages = messages.map(m => ({ role: m.role, content: m.content }));
    const systemPrompt = this.getSystemPrompt();

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

        const response = await fetch(googleUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: googleMessages }),
        });

        if (!response.ok || !response.body) throw new Error(`API Error: ${response.status} ${response.statusText}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

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
              } catch (e) { console.error('Error parsing Google stream:', e); }
            }
          }
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
  }

  // Quiz generation (Google Gemma only for now)
  public async generateQuiz(conversation: Conversation): Promise<StudySession> {
    if (!this.settings.googleApiKey) {
      throw new Error('Google API key must be configured to generate quizzes.');
    }

    const conversationText = conversation.messages
      .map(m => `${m.role === 'user' ? 'Q:' : 'A:'} ${m.content}`)
      .join('\n\n');

    const prompt = `
Based on the following conversation, create a multiple-choice quiz with 5 questions to test understanding.

Conversation:
---
${conversationText.slice(0, 6000)}
---

Format the output as a single JSON object with a "questions" array.
Each question must include: "question" (string), "options" (array of 4 strings), "answer" (the correct string), and "explanation" (string).
Return ONLY valid JSON. No markdown or extra text.
`;

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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error('Invalid response from API when generating quiz.');

    try {
      const cleanText = textResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanText);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Quiz JSON missing questions array.');
      }

      const questions: QuizQuestion[] = parsed.questions.map((q: any) => ({
        id: generateId(),
        question: q.question,
        options: q.options,
        correctAnswer: q.options.indexOf(q.answer),
        explanation: q.explanation,
      }));

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
      throw new Error("Could not generate a valid quiz from the conversation.");
    }
  }
}

export const aiService = new AiService();
