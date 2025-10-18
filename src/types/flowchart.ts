// src/types/flowchart.ts
export type NodeType = 'start' | 'process' | 'decision' | 'end' | 'topic' | 'concept';

export interface FlowchartNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  position: { x: number; y: number };
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}

export interface FlowchartEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: {
    strokeColor?: string;
    strokeWidth?: number;
    animated?: boolean;
  };
}

export interface Flowchart {
  id: string;
  title: string;
  description?: string;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  createdAt: Date;
  updatedAt: Date;
  sourceConversationId?: string;
  thumbnail?: string;
}

export interface FlowchartViewport {
  x: number;
  y: number;
  zoom: number;
}
