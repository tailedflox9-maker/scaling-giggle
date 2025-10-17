import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { NoteView } from './components/NoteView';
import { InstallPrompt } from './components/InstallPrompt';
import { SettingsModal } from './components/SettingsModal';
import { QuizModal } from './components/QuizModal';
import { Conversation, Message, APISettings, Note, StudySession } from './types';
import { generateId, generateConversationTitle } from './utils/helpers';
import { usePWA } from './hooks/usePWA';
import { Menu } from 'lucide-react';
import { storageUtils } from './utils/storage';
import { aiService } from './services/aiService';

type ActiveView = 'chat' | 'note';

function App() {
  // --- STATE INITIALIZATION ---
  const [conversations, setConversations] = useState<Conversation[]>(() => storageUtils.getConversations());
  const [notes, setNotes] = useState<Note[]>(() => storageUtils.getNotes());
  const [settings, setSettings] = useState<APISettings>(() => storageUtils.getSettings());
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [sidebarFolded, setSidebarFolded] = useState(() => JSON.parse(localStorage.getItem('ai-tutor-sidebar-folded') || 'false'));
  
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const stopStreamingRef = useRef(false);

  const { isInstallable, isInstalled, installApp, dismissInstallPrompt } = usePWA();
  
  // --- EFFECTS ---
  useEffect(() => {
    const initialConversations = storageUtils.getConversations();
    if (initialConversations.length > 0) {
      const sorted = [...initialConversations].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      setCurrentConversationId(sorted[0].id);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    aiService.updateSettings(settings);
  }, [settings]);

  useEffect(() => { storageUtils.saveConversations(conversations); }, [conversations]);
  useEffect(() => { storageUtils.saveNotes(notes); }, [notes]);
  useEffect(() => { localStorage.setItem('ai-tutor-sidebar-folded', JSON.stringify(sidebarFolded)); }, [sidebarFolded]);

  // --- MEMOS ---
  const currentConversation = useMemo(() => conversations.find(c => c.id === currentConversationId), [conversations, currentConversationId]);
  const currentNote = useMemo(() => notes.find(n => n.id === currentNoteId), [notes, currentNoteId]);
  const hasApiKey = !!(settings.googleApiKey || settings.zhipuApiKey || settings.mistralApiKey);
  
  // --- GENERAL HANDLERS ---
  const handleSelectConversation = (id: string) => {
    setActiveView('chat');
    setCurrentConversationId(id);
    setCurrentNoteId(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };
  const handleSelectNote = (id: string | null) => {
    setActiveView('note');
    setCurrentNoteId(id);
    setCurrentConversationId(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // --- CHAT HANDLERS ---
  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: generateId(), 
      title: 'New Chat', 
      messages: [], 
      createdAt: new Date(), 
      updatedAt: new Date(),
    };
    setConversations(prev => [newConversation, ...prev]);
    handleSelectConversation(newConversation.id);
  };

  const handleSendMessage = async (content: string) => {
    if (!hasApiKey) {
      alert('Please set your API key in the settings first.');
      return;
    }

    const userMessage: Message = { id: generateId(), content, role: 'user', timestamp: new Date() };

    let conversationToUpdate: Conversation;
    const existingConversation = conversations.find(c => c.id === currentConversationId);

    if (activeView === 'note' || !existingConversation) {
      conversationToUpdate = {
        id: generateId(),
        title: generateConversationTitle(content),
        messages: [userMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations(prev => [conversationToUpdate, ...prev]);
      handleSelectConversation(conversationToUpdate.id);
    } else {
      conversationToUpdate = {
        ...existingConversation,
        title: existingConversation.messages.length === 0 
               ? generateConversationTitle(content) 
               : existingConversation.title,
        messages: [...existingConversation.messages, userMessage],
        updatedAt: new Date(),
      };
      setConversations(prev => prev.map(c => c.id === conversationToUpdate.id ? conversationToUpdate : c));
    }

    setIsChatLoading(true);
    stopStreamingRef.current = false;

    try {
      const assistantMessage: Message = { id: generateId(), content: '', role: 'assistant', timestamp: new Date(), model: settings.selectedModel };
      setStreamingMessage(assistantMessage);

      let fullResponse = '';
      const messagesForApi = conversationToUpdate.messages.map(m => ({ role: m.role, content: m.content }));

      for await (const chunk of aiService.generateStreamingResponse(messagesForApi)) {
        if (stopStreamingRef.current) break;
        fullResponse += chunk;
        setStreamingMessage(prev => (prev ? { ...prev, content: fullResponse } : null));
      }

      const finalAssistantMessage: Message = { ...assistantMessage, content: fullResponse };
      
      setConversations(prev => prev.map(conv =>
        conv.id === conversationToUpdate.id
          ? { ...conv, messages: [...conv.messages, finalAssistantMessage], updatedAt: new Date() }
          : conv
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = { id: generateId(), content: `Sorry, an error occurred. Error: ${error instanceof Error ? error.message : 'Unknown error'}`, role: 'assistant', timestamp: new Date() };
      setConversations(prev => prev.map(conv =>
        conv.id === conversationToUpdate.id
          ? { ...conv, messages: [...conv.messages, errorMessage] }
          : conv
      ));
    } finally {
      setStreamingMessage(null);
      setIsChatLoading(false);
      stopStreamingRef.current = false;
    }
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversationId) {
        return {
          ...conv,
          messages: conv.messages.map(msg =>
            msg.id === messageId ? { ...msg, content: newContent } : msg
          ),
          updatedAt: new Date(),
        };
      }
      return conv;
    }));
  };

  const handleRegenerateResponse = async (messageId: string) => {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (!conversation) return;

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || conversation.messages[messageIndex].role !== 'assistant') return;

    const history = conversation.messages.slice(0, messageIndex);
    if (history.length === 0 || history[history.length - 1].role !== 'user') {
        console.error("Cannot regenerate without a preceding user message.");
        return;
    }
    const messagesForApi = history.map(m => ({ role: m.role, content: m.content }));

    setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
            return { ...conv, messages: history, updatedAt: new Date() };
        }
        return conv;
    }));

    setIsChatLoading(true);
    stopStreamingRef.current = false;

    try {
        const assistantMessage: Message = { id: generateId(), content: '', role: 'assistant', timestamp: new Date(), model: settings.selectedModel };
        setStreamingMessage(assistantMessage);

        let fullResponse = '';
        for await (const chunk of aiService.generateStreamingResponse(messagesForApi)) {
            if (stopStreamingRef.current) break;
            fullResponse += chunk;
            setStreamingMessage(prev => prev ? { ...prev, content: fullResponse } : null);
        }

        const finalAssistantMessage: Message = { ...assistantMessage, content: fullResponse };
        
        setConversations(prev => prev.map(conv => 
            conv.id === currentConversationId 
            ? { ...conv, messages: [...history, finalAssistantMessage], updatedAt: new Date() } 
            : conv
        ));
    } catch (error) {
        console.error('Error regenerating response:', error);
        const errorMessage: Message = { id: generateId(), content: `Sorry, an error occurred while regenerating. Error: ${error instanceof Error ? error.message : 'Unknown error'}`, role: 'assistant', timestamp: new Date() };
        setConversations(prev => prev.map(conv => 
            conv.id === currentConversationId 
            ? { ...conv, messages: [...history, errorMessage] } 
            : conv
        ));
    } finally {
        setStreamingMessage(null);
        setIsChatLoading(false);
        stopStreamingRef.current = false;
    }
  };
  
  const sortedConversations = useMemo(() => [...conversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }), [conversations]);

  const handleDeleteConversation = (id: string) => {
    const remaining = conversations.filter(c => c.id !== id);
    setConversations(remaining);
    if (currentConversationId === id) {
      const newId = remaining.length > 0 ? sortedConversations.filter(c => c.id !== id)[0]?.id : null;
      setCurrentConversationId(newId);
      if (!newId) setActiveView('chat');
    }
  };
  
  // --- NOTE & QUIZ HANDLERS ---
  const handleSaveAsNote = (content: string) => {
    if (!currentConversationId) return;
    const newNote: Note = {
      id: generateId(), 
      title: generateConversationTitle(content), 
      content, 
      createdAt: new Date(), 
      updatedAt: new Date(), 
      sourceConversationId: currentConversationId,
    };
    setNotes(prev => [newNote, ...prev]);
    alert("Note saved!");
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if(currentNoteId === id) {
      setCurrentNoteId(null);
      setActiveView('chat');
    }
  };

  const handleGenerateQuiz = async () => {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (!conversation) return;

    setIsQuizLoading(true);
    try {
      const session = await aiService.generateQuiz(conversation);
      setStudySession(session);
      setIsQuizModalOpen(true);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to generate quiz.');
    } finally {
      setIsQuizLoading(false);
    }
  };
  
  // --- OTHER HANDLERS ---
  const handleModelChange = (model: 'google' | 'zhipu' | 'mistral-small' | 'mistral-codestral') => {
    const newSettings = { ...settings, selectedModel: model };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
  };
  const handleRenameConversation = (id: string, newTitle: string) => setConversations(prev => prev.map(c => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date() } : c)));
  const handleTogglePinConversation = (id: string) => setConversations(prev => prev.map(c => (c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: new Date() } : c)));
  const handleSaveSettings = (newSettings: APISettings) => { setSettings(newSettings); storageUtils.saveSettings(newSettings); setSettingsOpen(false); };
  const handleInstallApp = async () => { if (await installApp()) console.log('App installed'); };
  const handleStopGenerating = () => stopStreamingRef.current = true;

  const sortedNotes = useMemo(() => [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [notes]);

  return (
    <div className="app-container">
      {sidebarOpen && window.innerWidth < 1024 && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        conversations={sortedConversations}
        notes={sortedNotes}
        activeView={activeView}
        currentConversationId={currentConversationId}
        currentNoteId={currentNoteId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onSelectNote={handleSelectNote}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        onDeleteNote={handleDeleteNote}
        onOpenSettings={() => setSettingsOpen(true)}
        settings={settings}
        onModelChange={handleModelChange}
        onCloseSidebar={() => setSidebarOpen(false)}
        isFolded={sidebarFolded}
        onToggleFold={() => setSidebarFolded(!sidebarFolded)}
        isSidebarOpen={sidebarOpen}
      />
      <div className="main-content">
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="mobile-menu-button interactive-button p-2.5 bg-[var(--color-card)] rounded-lg shadow-md hover:bg-[var(--color-border)] transition-colors lg:hidden" 
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6 text-[var(--color-text-secondary)]" />
          </button>
        )}
        {activeView === 'chat' ? (
          <ChatArea
            conversation={currentConversation}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            isQuizLoading={isQuizLoading}
            streamingMessage={streamingMessage}
            hasApiKey={hasApiKey}
            onStopGenerating={handleStopGenerating}
            onSaveAsNote={handleSaveAsNote}
            onGenerateQuiz={handleGenerateQuiz}
            onEditMessage={handleEditMessage}
            onRegenerateResponse={handleRegenerateResponse}
          />
        ) : (
          <NoteView note={currentNote} />
        )}
      </div>
      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        settings={settings} 
        onSaveSettings={handleSaveSettings} 
      />
      <QuizModal 
        isOpen={isQuizModalOpen} 
        onClose={() => setIsQuizModalOpen(false)} 
        session={studySession} 
      />
      {isInstallable && !isInstalled && ( <InstallPrompt onInstall={handleInstallApp} onDismiss={dismissInstallPrompt} /> )}
    </div>
  );
}

export default App;
