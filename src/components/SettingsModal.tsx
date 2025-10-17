import React, { useState } from 'react';
import { X, Settings, Key, Download, Upload, Shield, Database, Eye, EyeOff, HelpCircle, Trash2, BookUser } from 'lucide-react';
import { APISettings, TutorMode } from '../types';
import { storageUtils } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: APISettings;
  onSaveSettings: (settings: APISettings) => void;
}

const apiInfo = {
  google: { name: 'Google AI', url: 'https://aistudio.google.com/app/apikey' },
  zhipu: { name: 'ZhipuAI', url: 'https://open.bigmodel.cn/' },
  mistral: { name: 'Mistral', url: 'https://console.mistral.ai/api-keys' },
};

const tutorModes = [
    { id: 'standard', name: 'Standard Tutor', description: 'Neutral, explains clearly, step-by-step.', emoji: '📘' },
    { id: 'exam', name: 'Exam Coach', description: 'Focus on practice questions & quick answers.', emoji: '🎓' },
    { id: 'mentor', name: 'Friendly Mentor', description: 'Casual, motivating, makes analogies.', emoji: '🧑‍🏫' },
    { id: 'creative', name: 'Creative Guide', description: 'Helps with essays, storytelling, ideas.', emoji: '✍️' },
];

type ActiveTab = 'general' | 'keys' | 'data';

export function SettingsModal({ isOpen, onClose, settings, onSaveSettings }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<APISettings>(settings);
  const [visibleApis, setVisibleApis] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const toggleApiVisibility = (id: string) => {
    setVisibleApis(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
  };
  
  const handleTutorModeChange = (modeId: TutorMode) => {
    setLocalSettings(prev => ({...prev, selectedTutorMode: modeId}));
  };

  const handleExportData = () => {
    const data = {
      conversations: storageUtils.getConversations(),
      notes: storageUtils.getNotes(),
      settings: storageUtils.getSettings(),
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-tutor-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.conversations) storageUtils.saveConversations(data.conversations);
        if (data.notes) storageUtils.saveNotes(data.notes);
        if (data.settings) {
          setLocalSettings(data.settings);
          storageUtils.saveSettings(data.settings);
        }
        alert('Data imported successfully! The app will now reload.');
        window.location.reload();
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Failed to import data.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to delete all conversations and settings? This action cannot be undone.')) {
      storageUtils.clearAllData();
      alert('All data has been cleared. The app will now reload.');
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  const TabButton = ({ id, label, Icon }: { id: ActiveTab; label: string; Icon: React.ElementType }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-semibold transition-colors rounded-lg ${
        activeTab === id ? 'bg-[var(--color-card)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[var(--color-sidebar)] border border-[var(--color-border)] rounded-lg shadow-2xl flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-bold">Settings</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-card)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="p-3 grid grid-cols-3 gap-2 border-b border-[var(--color-border)]">
          <TabButton id="general" label="General" Icon={BookUser} />
          <TabButton id="keys" label="API Keys" Icon={Shield} />
          <TabButton id="data" label="Data" Icon={Database} />
        </div>
        
        {/* Content */}
        <div className="p-6 min-h-[24rem] max-h-[60vh] overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Tutor Mode
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tutorModes.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => handleTutorModeChange(mode.id as TutorMode)}
                    className={`p-4 border rounded-lg text-left transition-all duration-200 ${localSettings.selectedTutorMode === mode.id ? 'bg-[var(--color-card)] border-blue-500 ring-2 ring-blue-500/50' : 'bg-transparent border-[var(--color-border)] hover:bg-[var(--color-card)] hover:border-gray-600'}`}
                  >
                    <p className="text-lg">{mode.emoji} <span className="font-semibold">{mode.name}</span></p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{mode.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="space-y-4 animate-fadeIn">
              {Object.keys(apiInfo).map(key => {
                const id = key as keyof typeof apiInfo;
                const apiKeyId = `${id}ApiKey` as keyof APISettings;
                return (
                  <div key={id}>
                    <label htmlFor={apiKeyId} className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
                      {apiInfo[id].name} API Key
                      <a href={apiInfo[id].url} target="_blank" rel="noopener noreferrer" title={`Get ${apiInfo[id].name} key`}>
                        <HelpCircle className="w-3.5 h-3.5 text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)]" />
                      </a>
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[var(--color-text-secondary)] absolute top-1/2 left-3 -translate-y-1/2" />
                      <input
                        id={apiKeyId}
                        type={visibleApis[id] ? 'text' : 'password'}
                        value={localSettings[apiKeyId]}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, [apiKeyId]: e.target.value }))}
                        placeholder={`${apiInfo[id].name} key`}
                        className="w-full pl-9 pr-10 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card)] focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors"
                      />
                      <button type="button" onClick={() => toggleApiVisibility(id)} className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                        {visibleApis[id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="font-semibold mb-2">Import / Export</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleExportData} className="flex items-center justify-center gap-2 p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-card)] transition-colors"> <Download className="w-4 h-4"/> Export</button>
                  <button onClick={triggerFileInput} className="flex items-center justify-center gap-2 p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-card)] transition-colors"> <Upload className="w-4 h-4"/> Import</button>
                  <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden"/>
                </div>
              </div>
               <div>
                <h3 className="font-semibold mb-2 text-red-400">Danger Zone</h3>
                <button onClick={handleClearData} className="w-full flex items-center justify-center gap-2 p-3 border border-red-500/30 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/40 hover:text-red-300 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Clear All Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
          <button onClick={onClose} className="px-6 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-card)] rounded-lg transition-colors font-semibold">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-[var(--color-accent-bg)] text-[var(--color-accent-text)] rounded-lg hover:bg-[var(--color-accent-bg-hover)] transition-colors font-semibold">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
