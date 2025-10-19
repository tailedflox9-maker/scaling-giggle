// src/components/FlowchartView.tsx
import React from 'react';
import { FlowchartCanvas } from './FlowchartCanvas';
import { Flowchart } from '../types/flowchart';

interface FlowchartViewProps {
  flowchart: Flowchart | null;
  onSave?: (flowchart: Flowchart) => void;
  onExport?: (flowchart: Flowchart) => void;
}

export function FlowchartView({ flowchart, onSave, onExport }: FlowchartViewProps) {
  if (!flowchart) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-[var(--color-card)] rounded-2xl flex items-center justify-center p-4 border border-[var(--color-border)]">
              <img
                src="/white-logo.png"
                alt="AI Tutor"
                className="w-full h-full object-contain opacity-50"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Select a Flowchart
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Choose a flowchart from the sidebar to visualize your learning path
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
              <div className="text-2xl mb-2">🎨</div>
              <div className="text-xs font-medium text-[var(--color-text-primary)] mb-1">Visual Learning</div>
              <div className="text-xs text-[var(--color-text-secondary)]">See concepts connected</div>
            </div>
            
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
              <div className="text-2xl mb-2">🔄</div>
              <div className="text-xs font-medium text-[var(--color-text-primary)] mb-1">Interactive</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Zoom, pan, and edit</div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 text-left space-y-2">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text-primary)]">💡 Generate:</strong> Click the flowchart icon in chat to auto-generate from conversations
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              <strong className="text-[var(--color-text-primary)]">🖱️ Controls:</strong> Scroll to zoom, drag to pan, double-click nodes to edit
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle save - pass the updated flowchart to parent
  const handleSave = () => {
    if (onSave) {
      onSave(flowchart);
    }
  };

  // Handle export - pass the flowchart to parent
  const handleExport = () => {
    if (onExport) {
      onExport(flowchart);
    }
  };

  // Handle node changes - update local state and trigger save
  const handleNodesChange = (nodes: typeof flowchart.nodes) => {
    const updatedFlowchart = {
      ...flowchart,
      nodes,
      updatedAt: new Date()
    };
    if (onSave) {
      onSave(updatedFlowchart);
    }
  };

  // Handle edge changes - update local state and trigger save
  const handleEdgesChange = (edges: typeof flowchart.edges) => {
    const updatedFlowchart = {
      ...flowchart,
      edges,
      updatedAt: new Date()
    };
    if (onSave) {
      onSave(updatedFlowchart);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <FlowchartCanvas
        nodes={flowchart.nodes}
        edges={flowchart.edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        title={flowchart.title}
        onSave={handleSave}
        onExport={handleExport}
      />
    </div>
  );
}
