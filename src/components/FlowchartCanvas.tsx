// src/components/FlowchartCanvas.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Minus, Move, MousePointer, Hand, Trash2, Edit2, Save, Download, Maximize2, Zap, Layers, Target } from 'lucide-react';
import { FlowchartNode, FlowchartEdge, NodeType, FlowchartViewport } from '../types/flowchart';

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
  shape: string; 
  icon: React.ReactNode;
  gradient: string;
  shadow: string;
}> = {
  start: { 
    bg: '#10b981', 
    border: '#059669', 
    shape: 'rounded-full', 
    icon: <Zap className="w-4 h-4" />,
    gradient: 'from-green-400 to-green-600',
    shadow: 'shadow-lg shadow-green-500/30'
  },
  end: { 
    bg: '#ef4444', 
    border: '#dc2626', 
    shape: 'rounded-full', 
    icon: <Target className="w-4 h-4" />,
    gradient: 'from-red-400 to-red-600',
    shadow: 'shadow-lg shadow-red-500/30'
  },
  process: { 
    bg: '#3b82f6', 
    border: '#2563eb', 
    shape: 'rounded-xl', 
    icon: <Layers className="w-4 h-4" />,
    gradient: 'from-blue-400 to-blue-600',
    shadow: 'shadow-lg shadow-blue-500/30'
  },
  decision: { 
    bg: '#f59e0b', 
    border: '#d97706', 
    shape: 'diamond', 
    icon: null,
    gradient: 'from-amber-400 to-amber-600',
    shadow: 'shadow-lg shadow-amber-500/30'
  },
  topic: { 
    bg: '#8b5cf6', 
    border: '#7c3aed', 
    shape: 'rounded-xl', 
    icon: null,
    gradient: 'from-purple-400 to-purple-600',
    shadow: 'shadow-lg shadow-purple-500/30'
  },
  concept: { 
    bg: '#06b6d4', 
    border: '#0891b2', 
    shape: 'rounded-xl', 
    icon: null,
    gradient: 'from-cyan-400 to-cyan-600',
    shadow: 'shadow-lg shadow-cyan-500/30'
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

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
    const isHovered = hoveredNodeId === node.id;
    
    const x = node.position.x * viewport.zoom + viewport.x;
    const y = node.position.y * viewport.zoom + viewport.y;
    const scale = viewport.zoom;

    return (
      <div
        key={node.id}
        className={`absolute cursor-move transition-all duration-300 ${isSelected ? 'z-10' : 'z-0'}`}
        style={{
          left: x,
          top: y,
          transform: `translate(-50%, -50%) scale(${isSelected ? 1.05 : isHovered ? 1.02 : 1})`,
          minWidth: '140px',
          maxWidth: '220px',
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        onDoubleClick={() => handleNodeDoubleClick(node)}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        <div
          className={`relative px-4 py-3 text-white font-semibold text-center shadow-xl backdrop-blur-sm ${style.shadow} ${style.shape} bg-gradient-to-br ${style.gradient} border-2 ${isSelected ? 'ring-4 ring-white/50' : ''}`}
          style={{
            borderColor: style.border,
            transform: node.type === 'decision' ? 'rotate(45deg)' : 'none',
          }}
        >
          {/* Glow effect for selected nodes */}
          {isSelected && (
            <div className="absolute inset-0 rounded-inherit bg-white/20 blur-md -z-10"></div>
          )}
          
          <div className={node.type === 'decision' ? 'transform -rotate-45' : ''}>
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
                className="w-full bg-white/20 text-white text-center border-none outline-none rounded px-2 py-1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center justify-center gap-2">
                {style.icon}
                <span className="text-sm font-medium">{node.label}</span>
              </div>
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

    // Calculate control points for a curved path
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dr = Math.sqrt(dx * dx + dy * dy);
    const offsetX = dy * 0.2;
    const offsetY = -dx * 0.2;

    return (
      <g key={edge.id}>
        <defs>
          <marker
            id={`arrowhead-${edge.id}`}
            markerWidth="12"
            markerHeight="12"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon 
              points="0 0, 10 3, 0 6" 
              fill="#9ca3af" 
              className="filter drop-shadow-sm"
            />
          </marker>
          
          {/* Gradient for the edge */}
          <linearGradient id={`edge-gradient-${edge.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        {/* Curved path with gradient */}
        <path
          d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + offsetX} ${(y1 + y2) / 2 + offsetY} ${x2} ${y2}`}
          stroke={`url(#edge-gradient-${edge.id})`}
          strokeWidth="2.5"
          fill="none"
          markerEnd={`url(#arrowhead-${edge.id})`}
          className={edge.style?.animated ? 'animate-pulse' : ''}
          strokeLinecap="round"
        />
        
        {/* Label background */}
        {edge.label && (
          <>
            <rect
              x={(x1 + x2) / 2 - 20}
              y={(y1 + y2) / 2 - 10}
              width="40"
              height="20"
              rx="4"
              fill="rgba(31, 41, 55, 0.8)"
              className="filter drop-shadow-sm"
            />
            <text
              x={(x1 + x2) / 2}
              y={(y1 + y2) / 2 + 4}
              fill="#d1d5db"
              fontSize="12"
              textAnchor="middle"
              className="pointer-events-none font-medium"
            >
              {edge.label}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 shadow-xl">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">{title || 'Flowchart'}</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-300 font-medium">
              {nodes.length} nodes
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                onClick={() => setTool('select')}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  tool === 'select'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                title="Select Tool"
              >
                <MousePointer className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTool('pan')}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  tool === 'pan'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                title="Pan Tool"
              >
                <Hand className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-600 mx-1"></div>
            </>
          )}
          
          <div className="flex items-center gap-1 bg-gray-700/50 rounded-xl p-1">
            <button
              onClick={zoomOut}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-all duration-200"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-300 min-w-[4rem] text-center font-medium">
              {Math.round(viewport.zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-all duration-200"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={resetView}
            className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all duration-200"
            title="Reset View"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          
          {!readOnly && (
            <>
              <div className="w-px h-6 bg-gray-600 mx-1"></div>
              {selectedNodeId && (
                <button
                  onClick={handleDeleteNode}
                  className="p-2.5 text-red-400 hover:bg-red-900/30 rounded-xl transition-all duration-200"
                  title="Delete Node"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              {onSave && (
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700-blue-800 hover:to transition-all duration-200 font-medium shadow-lg shadow-blue-600/30"
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
              className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all duration-200"
              title="Export"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Enhanced Grid Background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: `${40 * viewport.zoom}px ${40 * viewport.zoom}px, ${20 * viewport.zoom}px ${20 * viewport.zoom}px, ${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        />

        {/* SVG for edges with enhanced rendering */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Add a subtle glow filter for edges */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#glow)">
            {edges.map(renderEdge)}
          </g>
        </svg>

        {/* Nodes */}
        {nodes.map(renderNode)}
      </div>
    </div>
  );
}
