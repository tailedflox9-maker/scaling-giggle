// src/components/FlowchartView.tsx
import React, { useState } from 'react';
import { FlowchartCanvas } from './FlowchartCanvas';
import { Flowchart } from '../types/flowchart';
import { Lightbulb, Sparkles } from 'lucide-react';

interface FlowchartViewProps {
  flowchart: Flowchart | null;
  onSave?: (flowchart: Flowchart) => void;
  onExport?: (flowchart: Flowchart) => void;
}

export function FlowchartView({ flowchart, onSave, onExport }: FlowchartViewProps) {
  if (!flowchart) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full px-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-2 sm:mb-4">
            Select a Flowchart
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] opacity-80 mb-6">
            Choose a flowchart from the sidebar to visualize your learning path
          </p>
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4 text-left">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-text-secondary)]">
                <p className="font-semibold text-[var(--color-text-primary)] mb-1">Pro Tip:</p>
                <p>Generate flowcharts from your conversations to create visual learning maps!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <FlowchartCanvas
        nodes={flowchart.nodes}
        edges={flowchart.edges}
        onNodesChange={(nodes) => {
          if (onSave) {
            onSave({ ...flowchart, nodes, updatedAt: new Date() });
          }
        }}
        onEdgesChange={(edges) => {
          if (onSave) {
            onSave({ ...flowchart, edges, updatedAt: new Date() });
          }
        }}
        title={flowchart.title}
        onSave={onSave ? () => onSave(flowchart) : undefined}
        onExport={onExport ? () => onExport(flowchart) : undefined}
      />
    </div>
  );
}
