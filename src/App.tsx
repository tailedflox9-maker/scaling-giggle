// src/App.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { NoteView } from './components/NoteView';
import { FlowchartView } from './components/FlowchartView';
import { InstallPrompt } from './components/InstallPrompt';
import { SettingsModal } from './components/SettingsModal';
import { QuizModal } from './components/QuizModal';
import { Notification } from './components/Notification';
import { ModeSuggestionBanner } from './components/ModeSuggestionBanner';
import { Conversation, Message, APISettings, Note, StudySession, Flowchart, TutorMode } from './types';
import { generateId } from './utils/helpers';
import { generateSmartTitle } from './services/titleGenerator';
import { usePWA } from './hooks/usePWA';
import { Menu } from 'lucide-react';
import { storageUtils } from './utils/storage';
import { aiService } from './services/aiService';
import { generateFlowchartFromConversation } from './services/flowchartGenerator';
import { detectBestMode, shouldSuggestMode } from './services/modeDetection';

type ActiveView = 'chat' | 'note' | 'flowchart';

interface NotificationState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

function App() {
  // --- STATE INITIALIZATION ---
  const [conversations, setConversations] = useState<Conversation[]>(() => storageUtils.getConversations());
  const [notes, setNotes] = useState<Note[]>(() => storageUtils.getNotes());
  const [flowcharts, setFlowcharts] = useState<Flowchart[]>(() => storageUtils.getFlowcharts());
  const [settings, setSettings] = useState<APISettings>(() => storageUtils.getSettings());
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [currentFlowchartId, setCurrentFlowchartId] = useState<string | null>(null);
  const [sidebarFolded, setSidebarFolded] = useState(() => {
    const stored = localStorage.getItem('ai-tutor-sidebar-folded');
    return stored ? JSON.parse(stored) : false;
  });
  
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [isFlowchartLoading, setIsFlowchartLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  
  // Notification state
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    type: 'success'
  });

  // Mode suggestion state
  const [modeSuggestion, setModeSuggestion] = useState<{
    mode: TutorMode;
    show: boolean;
  } | null>(null);
  
  // Use AbortController for proper cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const { isInstallable, isInstalled, installApp, dismissInstallPrompt } = usePWA();
  
  // Helper function to show notifications
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };
  
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

  // Debounced save to prevent too frequent writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      storageUtils.saveConversations(conversations);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [conversations]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      storageUtils.saveNotes(notes);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [notes]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      storageUtils.saveFlowcharts(flowcharts);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [flowcharts]);

  useEffect(() => { 
    localStorage.setItem('ai-tutor-sidebar-folded', JSON.stringify(sidebarFolded)); 
  }, [sidebarFolded]);

  // Close quiz modal and mode suggestion when conversation changes
  useEffect(() => {
    setIsQuizModalOpen(false);
    setStudySession(null);
    setModeSuggestion(null);
  }, [currentConversationId]);

  // --- MEMOS ---
  const currentConversation = useMemo(() => 
    conversations.find(c => c.id === currentConversationId), 
    [conversations, currentConversationId]
  );
  
  const currentNote = useMemo(() => 
    notes.find(n => n.id === currentNoteId), 
    [notes, currentNoteId]
  );

  const currentFlowchart = useMemo(() => 
    flowcharts.find(f => f.id === currentFlowchartId), 
    [flowcharts, currentFlowchartId]
  );
  
  const hasApiKey = !!(settings.googleApiKey || settings.zhipuApiKey || settings.mistralApiKey);
  
  // --- GENERAL HANDLERS ---
  const handleSelectConversation = (id: string | null) => {
    setActiveView('chat');
    setCurrentConversationId(id);
    setCurrentNoteId(null);
    setCurrentFlowchartId(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleSelectNote = (id: string | null) => {
    setActiveView('note');
    setCurrentNoteId(id);
    setCurrentConversationId(null);
    setCurrentFlowchartId(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleSelectFlowchart = (id: string | null) => {
    setActiveView('flowchart');
    setCurrentFlowchartId(id);
    setCurrentNoteId(null);
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
      showNotification('Please set your API key in the settings first.', 'error');
      return;
    }

    const userMessage: Message = { 
      id: generateId(), 
      content, 
      role: 'user', 
      timestamp: new Date() 
    };

    let conversationToUpdate: Conversation;
    const existingConversation = conversations.find(c => c.id === currentConversationId);

    if (activeView !== 'chat' || !existingConversation) {
      // Generate smart title (with AI if available)
      const initialTitle = await generateSmartTitle(
        content,
        settings,
        (aiTitle) => {
          // Update title once AI generates a better one
          setConversations(prev => prev.map(c =>
            c.id === conversationToUpdate.id
              ? { ...c, title: aiTitle }
              : c
          ));
        }
      );

      conversationToUpdate = {
        id: generateId(),
        title: initialTitle,
        messages: [userMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations(prev => [conversationToUpdate, ...prev]);
      handleSelectConversation(conversationToUpdate.id);

      // ✨ Smart mode detection on first message of new conversation
      const detection = detectBestMode(content);
      if (shouldSuggestMode(detection, settings.selectedTutorMode)) {
        setModeSuggestion({
          mode: detection.suggestedMode,
          show: true
        });
      }
    } else {
      // ✨ Smart mode detection on first message of existing empty conversation
      let titleToUse = existingConversation.title;
      
      if (existingConversation.messages.length === 0) {
        titleToUse = await generateSmartTitle(
          content,
          settings,
          (aiTitle) => {
            setConversations(prev => prev.map(c =>
              c.id === existingConversation.id
                ? { ...c, title: aiTitle }
                : c
            ));
          }
        );

        const detection = detectBestMode(content);
        if (shouldSuggestMode(detection, settings.selectedTutorMode)) {
          setModeSuggestion({
            mode: detection.suggestedMode,
            show: true
          });
        }
      }

      conversationToUpdate = {
        ...existingConversation,
        title: titleToUse,
        messages: [...existingConversation.messages, userMessage],
        updatedAt: new Date(),
      };
      setConversations(prev => prev.map(c => 
        c.id === conversationToUpdate.id ? conversationToUpdate : c
      ));
    }

    setIsChatLoading(true);
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const assistantMessage: Message = { 
        id: generateId(), 
        content: '', 
        role: 'assistant', 
        timestamp: new Date(), 
        model: settings.selectedModel 
      };
      setStreamingMessage(assistantMessage);

      let fullResponse = '';
      const messagesForApi = conversationToUpdate.messages.map(m => ({ 
        role: m.role, 
        content: m.content 
      }));

      for await (const chunk of aiService.generateStreamingResponse(messagesForApi)) {
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
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
      // Don't show error if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Message generation was cancelled');
        showNotification('Message generation stopped', 'success');
      } else {
        console.error('Error sending message:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        showNotification(`Failed to send message: ${errorMsg}`, 'error');
        
        const errorMessage: Message = { 
          id: generateId(), 
          content: `Sorry, an error occurred. Error: ${errorMsg}`, 
          role: 'assistant', 
          timestamp: new Date() 
        };
        setConversations(prev => prev.map(conv =>
          conv.id === conversationToUpdate.id
            ? { ...conv, messages: [...conv.messages, errorMessage] }
            : conv
        ));
      }
    } finally {
      setStreamingMessage(null);
      setIsChatLoading(false);
      abortControllerRef.current = null;
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
      showNotification('Cannot regenerate this message', 'error');
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
    abortControllerRef.current = new AbortController();

    try {
      const assistantMessage: Message = { 
        id: generateId(), 
        content: '', 
        role: 'assistant', 
        timestamp: new Date(), 
        model: settings.selectedModel 
      };
      setStreamingMessage(assistantMessage);

      let fullResponse = '';
      for await (const chunk of aiService.generateStreamingResponse(messagesForApi)) {
        if (abortControllerRef.current?.signal.aborted) break;
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
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Error regenerating response:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        showNotification(`Failed to regenerate: ${errorMsg}`, 'error');
        
        const errorMessage: Message = { 
          id: generateId(), 
          content: `Sorry, an error occurred while regenerating. Error: ${errorMsg}`, 
          role: 'assistant', 
          timestamp: new Date() 
        };
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, messages: [...history, errorMessage] } 
            : conv
        ));
      }
    } finally {
      setStreamingMessage(null);
      setIsChatLoading(false);
      abortControllerRef.current = null;
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
      title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      content, 
      createdAt: new Date(), 
      updatedAt: new Date(), 
      sourceConversationId: currentConversationId,
    };
    setNotes(prev => [newNote, ...prev]);
    showNotification('Note saved successfully!', 'success');
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
      showNotification('Quiz generated successfully!', 'success');
    } catch (error) {
      console.error(error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate quiz';
      showNotification(errorMsg, 'error');
    } finally {
      setIsQuizLoading(false);
    }
  };

  // --- FLOWCHART HANDLERS ---
  const handleGenerateFlowchart = async () => {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (!conversation) return;

    setIsFlowchartLoading(true);
    try {
      const flowchart = await generateFlowchartFromConversation(conversation);
      setFlowcharts(prev => [flowchart, ...prev]);
      handleSelectFlowchart(flowchart.id);
      showNotification('Flowchart generated successfully!', 'success');
    } catch (error) {
      console.error(error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate flowchart';
      showNotification(errorMsg, 'error');
    } finally {
      setIsFlowchartLoading(false);
    }
  };

  const handleSaveFlowchart = (flowchart: Flowchart) => {
    setFlowcharts(prev => {
      const index = prev.findIndex(f => f.id === flowchart.id);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...flowchart, updatedAt: new Date() };
        return updated;
      } else {
        return [{ ...flowchart, updatedAt: new Date() }, ...prev];
      }
    });
    showNotification('Flowchart saved successfully', 'success');
  };

  const handleExportFlowchart = (flowchart: Flowchart) => {
    try {
      const exportData = {
        title: flowchart.title,
        description: flowchart.description || '',
        createdAt: flowchart.createdAt,
        updatedAt: flowchart.updatedAt,
        stats: {
          totalNodes: flowchart.nodes.length,
          totalConnections: flowchart.edges.length,
          nodeTypes: {
            start: flowchart.nodes.filter(n => n.type === 'start').length,
            end: flowchart.nodes.filter(n => n.type === 'end').length,
            topic: flowchart.nodes.filter(n => n.type === 'topic').length,
            concept: flowchart.nodes.filter(n => n.type === 'concept').length,
            decision: flowchart.nodes.filter(n => n.type === 'decision').length,
            process: flowchart.nodes.filter(n => n.type === 'process').length,
          }
        },
        nodes: flowchart.nodes.map(node => ({
          id: node.id,
          type: node.type,
          label: node.label,
          description: node.description || '',
          position: {
            x: node.position.x,
            y: node.position.y
          }
        })),
        connections: flowchart.edges.map(edge => ({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          relationship: edge.label || 'connected to'
        }))
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      const fileName = `${flowchart.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification(`Flowchart exported as ${fileName}`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export flowchart', 'error');
    }
  };

  const handleDeleteFlowchart = (id: string) => {
    setFlowcharts(prev => prev.filter(f => f.id !== id));
    if (currentFlowchartId === id) {
      setCurrentFlowchartId(null);
      setActiveView('chat');
    }
  };
  
  // --- MODE SUGGESTION HANDLERS ---
  const handleAcceptModeSuggestion = async () => {
    if (!modeSuggestion) return;
    
    const newMode = modeSuggestion.mode;
    
    // Get friendly mode name
    const modeNames: Record<TutorMode, string> = {
      standard: 'Standard Tutor',
      exam: 'Exam Coach',
      mentor: 'Friendly Mentor',
      creative: 'Creative Guide'
    };
    
    // Switch mode first
    handleTutorModeChange(newMode);
    setModeSuggestion(null);
    
    // Show notification
    showNotification(`Switched to ${modeNames[newMode]} mode! Regenerating response...`, 'success');
    
    // Auto-regenerate the last assistant message if it exists
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation && conversation.messages.length > 0) {
      // Find the last assistant message
      const lastAssistantMessage = [...conversation.messages].reverse().find(m => m.role === 'assistant');
      
      if (lastAssistantMessage) {
        // Wait a bit for the mode to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Trigger regeneration
        handleRegenerateResponse(lastAssistantMessage.id);
      }
    }
  };

  const handleDismissModeSuggestion = () => {
    setModeSuggestion(null);
  };
  
  // --- OTHER HANDLERS ---
  const handleModelChange = (model: 'google' | 'zhipu' | 'mistral-small' | 'mistral-codestral') => {
    const newSettings = { ...settings, selectedModel: model };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
  };

  const handleTutorModeChange = (mode: TutorMode) => {
    const newSettings = { ...settings, selectedTutorMode: mode };
    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => 
      (c.id === id ? { ...c, title: newTitle, updatedAt: new Date() } : c)
    ));
  };

  const handleTogglePinConversation = (id: string) => {
    setConversations(prev => prev.map(c => 
      (c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: new Date() } : c)
    ));
  };

  const handleSaveSettings = (newSettings: APISettings) => {
    const oldMode = settings.selectedTutorMode;
    const newMode = newSettings.selectedTutorMode;

    setSettings(newSettings);
    storageUtils.saveSettings(newSettings);
    setSettingsOpen(false);

    // If tutor mode was changed, regenerate the last response
    if (oldMode !== newMode) {
      const modeNames: Record<TutorMode, string> = {
        standard: 'Standard Tutor',
        exam: 'Exam Coach',
        mentor: 'Friendly Mentor',
        creative: 'Creative Guide'
      };
      showNotification(`Switched to ${modeNames[newMode]} mode. Regenerating response...`, 'success');

      const conversation = conversations.find(c => c.id === currentConversationId);
      if (conversation && conversation.messages.length > 0) {
        const lastAssistantMessage = [...conversation.messages].reverse().find(
          (msg) => msg.role === 'assistant'
        );
        
        if (lastAssistantMessage) {
          // Use a timeout to ensure settings state propagates before API call
          setTimeout(() => {
            handleRegenerateResponse(lastAssistantMessage.id);
          }, 100);
        }
      }
    }
  };

  const handleInstallApp = async () => { 
    if (await installApp()) {
      console.log('App installed');
      showNotification('App installed successfully!', 'success');
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      showNotification('Generation stopped', 'success');
    }
  };

  const sortedNotes = useMemo(() => 
    [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), 
    [notes]
  );

  const sortedFlowcharts = useMemo(() => 
    [...flowcharts].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ), 
    [flowcharts]
  );

  return (
    <div className="app-container">
      {/* Notification */}
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}
      
      {sidebarOpen && window.innerWidth < 1024 && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        conversations={sortedConversations}
        notes={sortedNotes}
        flowcharts={sortedFlowcharts}
        activeView={activeView}
        currentConversationId={currentConversationId}
        currentNoteId={currentNoteId}
        currentFlowchartId={currentFlowchartId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onSelectNote={handleSelectNote}
        onSelectFlowchart={handleSelectFlowchart}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        onDeleteNote={handleDeleteNote}
        onDeleteFlowchart={handleDeleteFlowchart}
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
          <>
            {/* Mode suggestion banner */}
            {modeSuggestion?.show && (
              <div className="py-2">
                <ModeSuggestionBanner
                  suggestedMode={modeSuggestion.mode}
                  onAccept={handleAcceptModeSuggestion}
                  onDismiss={handleDismissModeSuggestion}
                />
              </div>
            )}
            
            <ChatArea
              conversation={currentConversation}
              onSendMessage={handleSendMessage}
              onNewConversation={handleNewConversation}
              isLoading={isChatLoading}
              isQuizLoading={isQuizLoading}
              isFlowchartLoading={isFlowchartLoading}
              streamingMessage={streamingMessage}
              hasApiKey={hasApiKey}
              onStopGenerating={handleStopGenerating}
              onSaveAsNote={handleSaveAsNote}
              onGenerateQuiz={handleGenerateQuiz}
              onGenerateFlowchart={handleGenerateFlowchart}
              onEditMessage={handleEditMessage}
              onRegenerateResponse={handleRegenerateResponse}
            />
          </>
        ) : activeView === 'note' ? (
          <NoteView note={currentNote} />
        ) : (
          <FlowchartView 
            flowchart={currentFlowchart}
            onSave={handleSaveFlowchart}
            onExport={handleExportFlowchart}
          />
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
      {isInstallable && !isInstalled && ( 
        <InstallPrompt onInstall={handleInstallApp} onDismiss={dismissInstallPrompt} /> 
      )}
    </div>
  );
}

export default App;
