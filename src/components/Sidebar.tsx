import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, MessageSquare, Settings, Trash2, X, ChevronLeft, ChevronRight,
  Sparkles, Brain, Cloud, Terminal, Search, Pin, Edit, Book, GitBranch
} from 'lucide-react';
import { Conversation, Note, Flowchart } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  notes: Note[];
  flowcharts: Flowchart[];
  activeView: 'chat' | 'note' | 'flowchart';
  currentConversationId: string | null;
  currentNoteId: string | null;
  currentFlowchartId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string | null) => void;
  onSelectNote: (id: string | null) => void;
  onSelectFlowchart: (id: string | null) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteFlowchart: (id: string) => void;
  onOpenSettings: () => void;
  settings: { selectedModel: string };
  onModelChange: (model: any) => void;
  onCloseSidebar: () => void;
  isSidebarOpen: boolean;
  isFolded?: boolean;
  onToggleFold?: () => void;
}

export function Sidebar({
  conversations,
  notes,
  flowcharts,
  activeView,
  currentConversationId,
  currentNoteId,
  currentFlowchartId,
  onNewConversation,
  onSelectConversation,
  onSelectNote,
  onSelectFlowchart,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  onDeleteNote,
  onDeleteFlowchart,
  onOpenSettings,
  settings,
  onModelChange,
  onCloseSidebar,
  isFolded = false,
  onToggleFold,
  isSidebarOpen
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [view, setView] = useState<'chats' | 'notes' | 'flowcharts'>('chats');

  // Sync view with activeView prop
  useEffect(() => {
    if (activeView === 'chat') {
      setView('chats');
    } else if (activeView === 'note') {
      setView('notes');
    } else if (activeView === 'flowchart') {
      setView('flowcharts');
    }
  }, [activeView]);

  const models = [
    { id: 'google', icon: Sparkles, name: 'Gemma' },
    { id: 'zhipu', icon: Brain, name: 'ZhipuAI' },
    { id: 'mistral-small', icon: Cloud, name: 'Mistral' },
    { id: 'mistral-codestral', icon: Terminal, name: 'Codestral' },
  ];

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    return sortedConversations.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedConversations, searchQuery]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notes, searchQuery]);

  const filteredFlowcharts = useMemo(() => {
    return flowcharts.filter(f =>
      f.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [flowcharts, searchQuery]);

  const handleStartEditing = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingTitle('');
    }
  };

  const handleViewChange = (newView: 'chats' | 'notes' | 'flowcharts') => {
    setView(newView);
    setSearchQuery('');
    
    if (newView === 'chats') {
      const conversationToSelect = sortedConversations.length > 0 ? sortedConversations[0].id : null;
      onSelectConversation(conversationToSelect);
    } else if (newView === 'notes') {
      onSelectNote(null);
    } else if (newView === 'flowcharts') {
      onSelectFlowchart(null);
    }
  };

  const sidebarClasses = `bg-[var(--color-sidebar)] flex flex-col h-full border-r border-[var(--color-border)] sidebar transition-all duration-300 ease-in-out fixed lg:static z-50 ${isSidebarOpen ? 'sidebar-open' : 'hidden lg:flex'} ${isFolded ? 'w-14' : 'w-64'}`;

  return (
    <aside className={sidebarClasses}>
      {/* Header */}
      <div className="p-2 border-b border-[var(--color-border)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {!isFolded && (
            <a 
              href="https://tanmay-kalbande.github.io/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2.5 group px-2"
            >
              <img src="/white-logo.png" alt="Logo" className="w-6 h-6" />
              <h1 className="text-lg font-semibold text-[var(--color-text-primary)] group-hover:opacity-80 transition-opacity">
                AI Tutor
              </h1>
            </a>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            {onToggleFold && (
              <button
                onClick={onToggleFold}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] rounded-lg transition-colors hidden lg:block"
                title={isFolded ? 'Expand' : 'Collapse'}
              >
                {isFolded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={onCloseSidebar}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] rounded-lg transition-colors lg:hidden"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <button
          onClick={onNewConversation}
          className={`w-full flex items-center ${isFolded ? 'justify-center' : 'justify-start'} gap-2 px-3 py-2 bg-[var(--color-accent-bg)] hover:bg-[var(--color-accent-bg-hover)] rounded-lg transition-colors text-[var(--color-accent-text)] shadow-sm font-semibold`}
        >
          <Plus className="w-4 h-4" />
          {!isFolded && <span>New chat</span>}
        </button>
      </div>

      {/* Model Selector - Only show when in chat view */}
      {view === 'chats' && (
        <div className="p-2 border-b border-[var(--color-border)]">
          {isFolded ? (
            <div className="space-y-2">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => onModelChange(model.id as any)}
                  className={`w-full flex justify-center items-center p-2 rounded-lg transition-all duration-200 border ${
                    settings.selectedModel === model.id
                      ? 'bg-[var(--color-card)] border-[var(--color-border)] text-white'
                      : 'bg-transparent border-transparent hover:bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-white'
                  }`}
                  title={model.name}
                >
                  <model.icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider px-1">
                AI Model
              </p>
              <div className="grid grid-cols-2 gap-2">
                {models.map(model => (
                  <button
                    key={model.id}
                    onClick={() => onModelChange(model.id as any)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 border transform hover:scale-105 active:scale-100 ${
                      settings.selectedModel === model.id
                        ? 'bg-[var(--color-card)] border-[var(--color-border)] text-white scale-105'
                        : 'bg-transparent border-transparent hover:bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-white'
                    }`}
                    title={model.name}
                  >
                    <model.icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{model.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col">
        {/* Search Bar */}
        {!isFolded && (
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${view}...`}
              className="w-full bg-[var(--color-card)] border border-transparent focus:border-[var(--color-border)] rounded-lg pl-9 pr-3 py-1.5 text-sm placeholder:text-[var(--color-text-placeholder)] focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Chats List */}
        {view === 'chats' && (
          <div className="space-y-1">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`group relative flex items-center gap-2 ${isFolded ? 'justify-center p-2.5' : 'p-2'} rounded-lg cursor-pointer transition-colors ${
                    activeView === 'chat' && currentConversationId === conversation.id
                      ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]'
                      : 'hover:bg-[var(--color-card)] text-[var(--color-text-primary)]'
                  }`}
                  title={conversation.title}
                >
                  {isFolded ? (
                    <div className="relative">
                      <MessageSquare className="w-5 h-5" />
                      {conversation.isPinned && (
                        <Pin className="w-2.5 h-2.5 absolute -top-1 -right-1 text-yellow-400" />
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="relative flex-shrink-0">
                        <MessageSquare className="w-4 h-4" />
                        {conversation.isPinned && (
                          <Pin className="w-2.5 h-2.5 absolute -top-1 -right-1 text-yellow-400" />
                        )}
                      </div>
                      
                      {editingId === conversation.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="flex-1 text-sm font-medium bg-transparent border-b border-[var(--color-border)] focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex-1 min-w-0 text-sm font-medium truncate">
                          {conversation.title}
                        </div>
                      )}
                      
                      <div className="absolute inset-y-0 right-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                        <div className="flex items-center pl-8 pr-1.5 h-full bg-gradient-to-l from-[var(--color-card)] to-transparent">
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); onTogglePinConversation(conversation.id); }}
                              className={`p-1 rounded ${ currentConversationId === conversation.id ? 'hover:bg-black/10' : 'hover:bg-[var(--color-border)]' }`}
                              title={conversation.isPinned ? 'Unpin' : 'Pin'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStartEditing(conversation); }}
                              className={`p-1 rounded ${ currentConversationId === conversation.id ? 'hover:bg-black/10' : 'hover:bg-[var(--color-border)]' }`}
                              title="Rename"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteConversation(conversation.id); }}
                              className={`p-1 rounded ${ currentConversationId === conversation.id ? 'hover:bg-black/10 text-red-400' : 'hover:bg-red-900/30 text-red-400' }`}
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : searchQuery ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] opacity-50 mb-3" />
                <p className="text-sm text-[var(--color-text-secondary)]">No chats found</p>
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] opacity-50 mb-3" />
                <p className="text-sm text-[var(--color-text-secondary)]">No conversations yet</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">Start a new chat to begin!</p>
              </div>
            )}
          </div>
        )}

        {/* Notes List */}
        {view === 'notes' && !isFolded && (
          <div className="space-y-1">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`group p-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeView === 'note' && currentNoteId === note.id
                      ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]'
                      : 'hover:bg-[var(--color-card)] text-[var(--color-text-primary)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Book className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="flex-1 text-sm font-semibold truncate">{note.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-900/30 text-red-400 flex-shrink-0"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs opacity-70 mt-1 line-clamp-2 pl-6">{note.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 px-4">
                <Book className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] opacity-50 mb-3" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {searchQuery ? 'No notes found' : 'No notes yet'}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                    Save messages as notes to keep them!
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Flowcharts List */}
        {view === 'flowcharts' && !isFolded && (
          <div className="space-y-1">
            {filteredFlowcharts.length > 0 ? (
              filteredFlowcharts.map((flowchart) => (
                <div
                  key={flowchart.id}
                  onClick={() => onSelectFlowchart(flowchart.id)}
                  className={`group p-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeView === 'flowchart' && currentFlowchartId === flowchart.id
                      ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]'
                      : 'hover:bg-[var(--color-card)] text-[var(--color-text-primary)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <GitBranch className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-sm font-semibold truncate">{flowchart.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFlowchart(flowchart.id);
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-900/30 text-red-400 flex-shrink-0"
                      title="Delete flowchart"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs opacity-70 mt-1 pl-6">
                    {flowchart.nodes.length} nodes • {flowchart.edges.length} connections
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 px-4">
                <GitBranch className="w-12 h-12 mx-auto text-[var(--color-text-secondary)] opacity-50 mb-3" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {searchQuery ? 'No flowcharts found' : 'No flowcharts yet'}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                    Generate flowcharts from conversations!
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Folded state message for notes/flowcharts */}
        {isFolded && (view === 'notes' || view === 'flowcharts') && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              {view === 'notes' ? (
                <Book className="w-8 h-8 mx-auto text-[var(--color-text-secondary)] opacity-50 mb-2" />
              ) : (
                <GitBranch className="w-8 h-8 mx-auto text-[var(--color-text-secondary)] opacity-50 mb-2" />
              )}
              <p className="text-xs text-[var(--color-text-secondary)]">
                Expand sidebar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-2 border-t border-[var(--color-border)]">
        <div className={`${isFolded ? 'space-y-1 flex flex-col' : 'grid grid-cols-3 gap-1'}`}>
          <button
            onClick={() => handleViewChange('chats')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${
              view === 'chats' 
                ? 'text-[var(--color-text-primary)] bg-[var(--color-card)]' 
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)]'
            }`}
            title="Chats"
          >
            <MessageSquare className="w-5 h-5" />
            {!isFolded && <span className="text-xs font-semibold">Chats</span>}
          </button>
          <button
            onClick={() => handleViewChange('notes')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${
              view === 'notes' 
                ? 'text-[var(--color-text-primary)] bg-[var(--color-card)]' 
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)]'
            }`}
            title="Notes"
          >
            <Book className="w-5 h-5" />
            {!isFolded && <span className="text-xs font-semibold">Notes</span>}
          </button>
          <button
            onClick={() => handleViewChange('flowcharts')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${
              view === 'flowcharts' 
                ? 'text-[var(--color-text-primary)] bg-[var(--color-card)]' 
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)]'
            }`}
            title="Flowcharts"
          >
            <GitBranch className="w-5 h-5" />
            {!isFolded && <span className="text-xs font-semibold">Flows</span>}
          </button>
        </div>
        {!isFolded && (
          <div className="mt-2 text-center">
            <a
              href="https://tanmay-kalbande.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Developed by Tanmay Kalbande
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
