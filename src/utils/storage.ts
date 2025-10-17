import { Conversation, APISettings, Note, TutorMode } from '../types';

const CONVERSATIONS_KEY = 'ai-tutor-conversations';
const SETTINGS_KEY = 'ai-tutor-settings';
const NOTES_KEY = 'ai-tutor-notes';

const defaultSettings: APISettings = {
  googleApiKey: '',
  zhipuApiKey: '',
  mistralApiKey: '',
  selectedModel: 'google',
  selectedTutorMode: 'standard', // Default tutor mode
};

export const storageUtils = {
  getConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  },

  saveConversations(conversations: Conversation[]): void {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  },

  getSettings(): APISettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return defaultSettings;
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  },

  saveSettings(settings: APISettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  getNotes(): Note[] {
    try {
      const stored = localStorage.getItem(NOTES_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      }));
    } catch (error) {
      console.error('Error loading notes:', error);
      return [];
    }
  },

  saveNotes(notes: Note[]): void {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  },

  clearAllData(): void {
    localStorage.removeItem(CONVERSATIONS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(NOTES_KEY);
  }
};
