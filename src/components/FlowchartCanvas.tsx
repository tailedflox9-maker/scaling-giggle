// src/components/FlowchartCanvas.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Minus, Move, MousePointer, Hand, Trash2, Edit2, Save, Download, Maximize2, Info } from 'lucide-react';
import { FlowchartNode, FlowchartEdge, NodeType, FlowchartViewport } from '../types/flowchart';
import { Tooltip } from './Tooltip'; // Assuming you add a simple Tooltip component (see below)

interface FlowchartCanvasProps {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  onNodesChange: (nodes: FlowchartNode[]) => void;
  onEdgesChange: (edges: FlowchartEdge[]) => void;
  readOnly?: boolean;
  title?: string;
  onSave?: () => void;
  onExport?: () => void;
}

const nodeTypeStyles: Record<NodeType, { 
  bg: string; 
  border: string; 
  gradient: string;
  shape: string;
}> = {
  start: { 
    bg: 'from-green-500 to-green-600', 
    border: '#16a34a', 
    gradient: 'from-green-500/90 to-green-600/90',
    shape: 'rounded-full' 
  },
  end: { 
    bg: 'from-red-500 to-red-600', 
    border: '#dc2626', 
    gradient: 'from-red-500/90 to-red-600/90',
    shape: 'rounded-full' 
  },
  process: { 
    bg: 'from-blue-500 to-blue-600', 
    border: '#2563eb', 
    gradient: 'from-blue-500/90 to-blue-600/90',
    shape: 'rounded-xl' 
  },
  decision: { 
    bg: 'from-amber-500 to-amber-600', 
    border: '#d97706', 
    gradient: 'from-amber-500/90 to-amber-600/90',
    shape: 'diamond' 
  },
  topic: { 
    bg: 'from-purple-500 to-purple-600', 
    border: '#7c3aed', 
    gradient: 'from-purple-500/90 to-purple-600/90',
    shape: 'rounded-xl' 
  },
  concept: { 
    bg: 'from-cyan-500 to-cyan-600', 
    border: '#0891b2', 
    gradient: 'from-cyan-500/90 to-cyan-600/90',
    shape: 'rounded-xl' 
  },
};

export function FlowchartCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  readOnly = false,
  title,
  onSave,
  onExport,
}: FlowchartCanvasProps) {
  const [viewport, setViewport] = useState<FlowchartViewport>({ x: 0, y: 0, zoom: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [showDescription, setShowDescription] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(3, prev.zoom * delta)),
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - viewport.x) / viewport.zoom,
      y: (screenY - rect.top - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    
    const canvas = e.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDragStart({ x, y });
    
    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
    }
  }, [readOnly, tool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart) return;

    const canvas = e.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x, y });
    } else if (draggingNodeId) {
      const node = nodes.find(n => n.id === draggingNodeId);
      if (node) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        onNodesChange(
          nodes.map(n =>
            n.id === draggingNodeId
              ? { ...n, position: { x: canvasPos.x, y: canvasPos.y } }
              : n
          )
        );
      }
    }
  }, [dragStart, isPanning, draggingNodeId, nodes, onNodesChange, screenToCanvas]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setDragStart(null);
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readOnly || tool === 'pan') return;
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
  }, [readOnly, tool]);

  const handleNodeDoubleClick = useCallback((node: FlowchartNode) => {
    if (readOnly) return;
    setEditingNodeId(node.id);
    setEditingLabel(node.label);
  }, [readOnly]);

  const handleNodeHover = useCallback((nodeId: string) => {
    setShowDescription(nodeId);
  }, []);

  const handleNodeLeave = useCallback(() => {
    setShowDescription(null);
  }, []);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId || readOnly) return;
    onNodesChange(nodes.filter(n => n.id !== selectedNodeId));
    onEdgesChange(edges.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, readOnly, nodes, edges, onNodesChange, onEdgesChange]);

  const handleSaveEdit = useCallback(() => {
    if (!editingNodeId) return;
    onNodesChange(
      nodes.map(n =>
        n.id === editingNodeId ? { ...n, label: editingLabel } : n
      )
    );
    setEditingNodeId(null);
    setEditingLabel('');
  }, [editingNodeId, editingLabel, nodes, onNodesChange]);

  const zoomIn = () => setViewport(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }));
  const zoomOut = () => setViewport(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  const resetView = () => setViewport({ x: 0, y: 0, zoom: 1 });

  const renderNode = (node: FlowchartNode) => {
    const style = nodeTypeStyles[node.type];
    const isSelected = selectedNodeId === node.id;
    const isEditing = editingNodeId === node.id;
    const hoveredNode = nodes.find(n => n.id === showDescription);
    const hasDescription = node.description && node.description.trim();
    
    const x = node.position.x * viewport.zoom + viewport.x;
    const y = node.position.y * viewport.zoom + viewport.y;

    return (
      <div
        key={node.id}
        className={`absolute transition-all duration-300 ease-out group ${
          isSelected 
            ? 'ring-4 ring-[var(--color-accent-bg)]/30 scale-105 shadow-2xl shadow-black/50' 
            : 'hover:scale-105 hover:shadow-xl hover:shadow-black/30'
        }`}
        style={{
          left: x,
          top: y,
          transform: 'translate(-50%, -50%)',
          minWidth: '140px',
          maxWidth: '220px',
          zIndex: isSelected ? 10 : 1,
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        onDoubleClick={() => handleNodeDoubleClick(node)}
        onMouseEnter={() => handleNodeHover(node.id)}
        onMouseLeave={handleNodeLeave}
      >
        <div
          className={`relative px-4 py-3 text-white font-semibold text-center shadow-lg backdrop-blur-md border-2 overflow-hidden ${
            node.type === 'decision' ? 'transform rotate-45 w-24 h-24 flex items-center justify-center' : `${style.shape} ${style.bg}`
          }`}
          style={{
            background: `linear-gradient(135deg, ${style.gradient}, ${style.bg})`,
            borderColor: style.border,
            boxShadow: 
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), ' +
              '0 2px 4px -1px rgba(0, 0, 0, 0.06), ' +
              'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {node.type === 'decision' && (
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/90 to-amber-600/90 rounded-full transform -rotate-45" />
          )}
          <div className={`${node.type === 'decision' ? 'transform -rotate-45 w-full h-full flex items-center justify-center' : ''}`}>
            {isEditing ? (
              <input
                type="text"
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') {
                    setEditingNodeId(null);
                    setEditingLabel('');
                  }
                }}
                className="w-full bg-white/20 text-white text-center border-none outline-none rounded px-2 py-1 text-sm font-semibold"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm leading-tight block truncate px-1">{node.label}</span>
            )}
            {hasDescription && (
              <Tooltip 
                content={node.description!} 
                visible={showDescription === node.id}
                className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--color-card)]/90 text-[var(--color-text-secondary)] rounded-full flex items-center justify-center hover:bg-[var(--color-accent-bg)]"
              >
                <Info className="w-3 h-3" />
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEdge = (edge: FlowchartEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;

    const x1 = sourceNode.position.x * viewport.zoom + viewport.x;
    const y1 = sourceNode.position.y * viewport.zoom + viewport.y;
    const x2 = targetNode.position.x * viewport.zoom + viewport.x;
    const y2 = targetNode.position.y * viewport.zoom + viewport.y;

    // Curved path using cubic Bézier for smoother curves
    const cpX1 = x1 + (x2 - x1) * 0.25;
    const cpY1 = y1 + (y2 - y1) * 0.25;
    const cpX2 = x2 - (x2 - x1) * 0.25;
    const cpY2 = y2 - (y2 - y1) * 0.25;
    const pathD = `M ${x1} ${y1} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x2} ${y2}`;

    return (
      <g key={edge.id} className="transition-all duration-300 group">
        <defs>
          <marker
            id={`arrowhead-${edge.id}`}
            markerWidth="12"
            markerHeight="12"
            refX="11"
            refY="6"
            orient="auto"
          >
            <polygon points="0 0, 12 6, 0 12" fill="url(#arrowGradient)" />
          </marker>
          <linearGradient id={`arrowGradient-${edge.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
        </defs>
        <path
          d={pathD}
          stroke="url(#edgeGradient)"
          strokeWidth="3"
          fill="none"
          markerEnd={`url(#arrowhead-${edge.id})`}
          className="group-hover:stroke-[var(--color-accent-bg)] group-hover:stroke-width-4"
        />
        {edge.label && (
          <text
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2 - 10}
            fill="[var(--color-text-secondary)]"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            className="pointer-events-none drop-shadow-sm"
          >
            {edge.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[var(--color-bg)] to-[var(--color-sidebar)]/50">
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-4 bg-[var(--color-card)]/80 backdrop-blur-md border-b border-[var(--color-border)]/50 shadow-lg">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] bg-gradient-to-r from-[var(--color-accent-bg)] to-[var(--color-accent-bg)]/80 bg-clip-text text-transparent">
            {title || 'Flowchart'}
          </h2>
          <span className="text-xs text-[var(--color-text-secondary)] px-3 py-1 bg-[var(--color-border)]/50 rounded-full">
            {nodes.length} nodes • {edges.length} connections
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              <button
                onClick={() => setTool('select')}
                className={`p-2.5 rounded-xl transition-all duration-200 shadow-sm ${
                  tool === 'select'
                    ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-text)] shadow-md' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] hover:shadow-md hover:text-[var(--color-text-primary)]'
                }`}
                title="Select Tool"
              >
                <MousePointer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('pan')}
                className={`p-2.5 rounded-xl transition-all duration-200 shadow-sm ${
                  tool === 'pan'
                    ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-text)] shadow-md' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] hover:shadow-md hover:text-[var(--color-text-primary)]'
                }`}
                title="Pan Tool"
              >
                <Hand className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-[var(--color-border)]/50" />
            </>
          )}
          
          <button
            onClick={zoomOut}
            className="p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--color-text-primary)] font-mono min-w-[4rem] text-center">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          {!readOnly && (
            <>
              <div className="w-px h-6 bg-[var(--color-border)]/50" />
              {selectedNodeId && (
                <button
                  onClick={handleDeleteNode}
                  className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Delete Node"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {onSave && (
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--color-accent-bg)] to-[var(--color-accent-bg)]/80 text-[var(--color-accent-text)] rounded-xl hover:from-[var(--color-accent-bg-hover)] shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              )}
            </>
          )}
          
          {onExport && (
            <button
              onClick={onExport}
              className="p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              title="Export JSON"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMiAxMkgyTDEyIDJMMTIgMTJaIiBzdHJva2U9IiM5Q0E0QUIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+'), auto] active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(156, 163, 175, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(156, 163, 175, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: `${25 * viewport.zoom}px ${25 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x % (25 * viewport.zoom)}px ${viewport.y % (25 * viewport.zoom)}px`,
          }}
        />

        {/* SVG for curved edges */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>
          </defs>
          {edges.map(renderEdge)}
        </svg>

        {/* Nodes */}
        {nodes.map(renderNode)}
      </div>
    </div>
  );
}
