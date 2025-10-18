import { Conversation, APISettings, Note, Flowchart } from '../types';

const CONVERSATIONS_KEY = 'ai-tutor-conversations';
const SETTINGS_KEY = 'ai-tutor-settings';
const NOTES_KEY = 'ai-tutor-notes';
const FLOWCHARTS_KEY = 'ai-tutor-flowcharts';

const defaultSettings: APISettings = {
  googleApiKey: '',
  zhipuApiKey: '',
  mistralApiKey: '',
  selectedModel: 'google',
  selectedTutorMode: 'standard',
};

// Helper function to safely parse dates
function parseDate(dateValue: any): Date {
  if (!dateValue) return new Date();
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export const storageUtils = {
  getConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        console.error('Invalid conversations format');
        return [];
      }

      return parsed.map((conv: any) => ({
        ...conv,
        createdAt: parseDate(conv.createdAt),
        updatedAt: parseDate(conv.updatedAt),
        messages: Array.isArray(conv.messages) ? conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: parseDate(msg.timestamp),
        })) : [],
      }));
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Clear corrupted data
      localStorage.removeItem(CONVERSATIONS_KEY);
      return [];
    }
  },

  saveConversations(conversations: Conversation[]): void {
    try {
      if (!Array.isArray(conversations)) {
        console.error('Invalid conversations data');
        return;
      }
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversations:', error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please delete some conversations.');
      }
    }
  },

  getSettings(): APISettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return defaultSettings;
      
      const parsed = JSON.parse(stored);
      // Ensure all required fields exist
      return {
        googleApiKey: parsed.googleApiKey || '',
        zhipuApiKey: parsed.zhipuApiKey || '',
        mistralApiKey: parsed.mistralApiKey || '',
        selectedModel: parsed.selectedModel || 'google',
        selectedTutorMode: parsed.selectedTutorMode || 'standard',
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      localStorage.removeItem(SETTINGS_KEY);
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
      if (!Array.isArray(parsed)) {
        console.error('Invalid notes format');
        return [];
      }

      return parsed.map((note: any) => ({
        ...note,
        createdAt: parseDate(note.createdAt),
        updatedAt: parseDate(note.updatedAt),
      }));
    } catch (error) {
      console.error('Error loading notes:', error);
      localStorage.removeItem(NOTES_KEY);
      return [];
    }
  },

  saveNotes(notes: Note[]): void {
    try {
      if (!Array.isArray(notes)) {
        console.error('Invalid notes data');
        return;
      }
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please delete some notes.');
      }
    }
  },

  getFlowcharts(): Flowchart[] {
    try {
      const stored = localStorage.getItem(FLOWCHARTS_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        console.error('Invalid flowcharts format');
        return [];
      }

      return parsed.map((chart: any) => ({
        ...chart,
        createdAt: parseDate(chart.createdAt),
        updatedAt: parseDate(chart.updatedAt),
      }));
    } catch (error) {
      console.error('Error loading flowcharts:', error);
      localStorage.removeItem(FLOWCHARTS_KEY);
      return [];
    }
  },

  saveFlowcharts(flowcharts: Flowchart[]): void {
    try {
      if (!Array.isArray(flowcharts)) {
        console.error('Invalid flowcharts data');
        return;
      }
      localStorage.setItem(FLOWCHARTS_KEY, JSON.stringify(flowcharts));
    } catch (error) {
      console.error('Error saving flowcharts:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please delete some flowcharts.');
      }
    }
  },

  clearAllData(): void {
    try {
      localStorage.removeItem(CONVERSATIONS_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(NOTES_KEY);
      localStorage.removeItem(FLOWCHARTS_KEY);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
};
