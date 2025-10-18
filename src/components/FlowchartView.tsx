// src/components/FlowchartView.tsx
import React, { useState } from 'react';
import { FlowchartCanvas } from './FlowchartCanvas';
import { Flowchart } from '../types/flowchart';
import { Lightbulb, Sparkles, ArrowRight, Zap } from 'lucide-react';

interface FlowchartViewProps {
  flowchart: Flowchart | null;
  onSave?: (flowchart: Flowchart) => void;
  onExport?: (flowchart: Flowchart) => void;
}

export function FlowchartView({ flowchart, onSave, onExport }: FlowchartViewProps) {
  if (!flowchart) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center max-w-md w-full px-4">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
            <Sparkles className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Select a Flowchart
          </h2>
          <p className="text-base text-gray-300 opacity-80 mb-8">
            Choose a flowchart from the sidebar to visualize your learning path
          </p>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-left shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-white mb-2">Pro Tip:</p>
                <p>Generate flowcharts from your conversations to create visual learning maps!</p>
                <div className="mt-4 flex items-center gap-2 text-blue-400">
                  <span>Try it now</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Visualize your knowledge</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
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
