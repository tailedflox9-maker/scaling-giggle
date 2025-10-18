// src/components/FlowchartCanvas.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Minus, Move, MousePointer, Hand, Trash2, Edit2, Save, Download, Maximize2 } from 'lucide-react';
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
  textColor: string;
  borderWidth: string;
  shadow: string;
}> = {
  start: { 
    bg: '#1F1F1F', 
    border: '#FFFFFF', 
    shape: 'rounded-full', 
    textColor: '#FFFFFF',
    borderWidth: '2px',
    shadow: '0 0 12px rgba(255, 255, 255, 0.3)'
  },
  end: { 
    bg: '#1F1F1F', 
    border: '#FFFFFF', 
    shape: 'rounded-full', 
    textColor: '#FFFFFF',
    borderWidth: '2px',
    shadow: '0 0 12px rgba(255, 255, 255, 0.3)'
  },
  process: { 
    bg: 'var(--color-card)', 
    border: 'var(--color-border)', 
    shape: 'rounded-lg', 
    textColor: 'var(--color-text-primary)',
    borderWidth: '2px',
    shadow: 'none'
  },
  decision: { 
    bg: '#1F1F1F', 
    border: '#F0F0F0', 
    shape: 'diamond', 
    textColor: '#F0F0F0',
    borderWidth: '2px',
    shadow: '0 0 8px rgba(240, 240, 240, 0.25)'
  },
  topic: { 
    bg: '#141414', 
    border: '#A0A0A', 
    shape: 'rounded-lg', 
    textColor: '#FFFFFF',
    borderWidth: '2px',
    shadow: '0 0 6px rgba(160, 160, 160, 0.2)'
  },
  concept: { 
    bg: 'var(--color-card)', 
    border: 'var(--color-border)', 
    shape: 'rounded-lg', 
    textColor: 'var(--color-text-secondary)',
    borderWidth: '1.5px',
    shadow: 'none'
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
  const [tool, setTool] = useState<'select' | 'pan'>('pan');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate bounding box and center flowchart on load
  const centerFlowchart = useCallback(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

    // Find bounding box of all nodes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y);
    });

    // Add padding
    const padding = 200;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Calculate center offset with zoom 1
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const offsetX = canvasWidth / 2 - centerX;
    const offsetY = canvasHeight / 2 - centerY;

    setViewport({
      x: offsetX,
      y: offsetY,
      zoom: 1
    });
  }, [nodes]);

  // Center on initial load
  useEffect(() => {
    if (!isInitialized && nodes.length > 0) {
      setTimeout(() => {
        centerFlowchart();
        setIsInitialized(true);
      }, 100);
    }
  }, [nodes, isInitialized, centerFlowchart]);

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
  const resetView = () => centerFlowchart();

  // Generate curved path between two points
  const generateCurvedPath = (x1: number, y1: number, x2: number, y2: number): string => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate control points for smoother curves
    const curvature = 0.3;
    const controlPointOffset = distance * curvature;
    
    // Determine if connection is more vertical or horizontal
    const isVertical = Math.abs(dy) > Math.abs(dx);
    
    if (isVertical) {
      // Vertical connection - control points offset horizontally
      const cx1 = x1;
      const cy1 = y1 + controlPointOffset;
      const cx2 = x2;
      const cy2 = y2 - controlPointOffset;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    } else {
      // Horizontal connection - control points offset vertically
      const cx1 = x1 + controlPointOffset;
      const cy1 = y1;
      const cx2 = x2 - controlPointOffset;
      const cy2 = y2;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }
  };

  const renderNode = (node: FlowchartNode) => {
    const style = nodeTypeStyles[node.type];
    const isSelected = selectedNodeId === node.id;
    const isEditing = editingNodeId === node.id;
    const isHovered = hoveredNodeId === node.id;
    
    const x = node.position.x * viewport.zoom + viewport.x;
    const y = node.position.y * viewport.zoom + viewport.y;

    // Adjust size based on node type
    const minWidth = node.type === 'start' || node.type === 'end' ? '120px' : '100px';
    const maxWidth = node.type === 'start' || node.type === 'end' ? '200px' : '180px';

    return (
      <div
        key={node.id}
        className={`absolute cursor-move transition-all duration-200 ${isSelected ? 'z-10' : 'z-0'}`}
        style={{
          left: x,
          top: y,
          transform: `translate(-50%, -50%) scale(${isSelected ? 1.05 : isHovered ? 1.02 : 1})`,
          minWidth,
          maxWidth,
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        onDoubleClick={() => handleNodeDoubleClick(node)}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        <div
          className={`relative px-3 py-2 font-semibold text-center border ${style.shape} ${isSelected ? 'ring-2 ring-[var(--color-accent-bg)]' : ''}`}
          style={{
            backgroundColor: style.bg,
            borderColor: style.border,
            borderWidth: style.borderWidth,
            color: style.textColor,
            transform: node.type === 'decision' ? 'rotate(45deg)' : 'none',
            boxShadow: style.shadow,
          }}
        >
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
                className="w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] text-center border border-[var(--color-border)] outline-none rounded px-2 py-1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm font-medium">{node.label}</span>
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

    // Generate curved path
    const pathData = generateCurvedPath(x1, y1, x2, y2);

    // Calculate position for label (approximate midpoint of curve)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return (
      <g key={edge.id}>
        <defs>
          <marker
            id={`arrowhead-${edge.id}`}
            markerWidth="3"
            markerHeight="3"
            refX="2.5"
            refY="1.5"
            orient="auto"
          >
            <polygon 
              points="0 0, 3 1.5, 0 3" 
              fill="#A0A0A"
            />
          </marker>
        </defs>
        
        {/* Shadow path for depth */}
        <path
          d={pathData}
          stroke="rgba(42, 42, 42, 0.6)"
          strokeWidth="3"
          fill="none"
          className={edge.style?.animated ? 'animate-pulse' : ''}
        />
        
        {/* Main path */}
        <path
          d={pathData}
          stroke="#A0A0A"
          strokeWidth="2"
          fill="none"
          markerEnd={`url(#arrowhead-${edge.id})`}
          className={edge.style?.animated ? 'animate-pulse' : ''}
        />
        
        {/* Edge label with background */}
        {edge.label && (
          <g>
            {(() => {
              const textLength = edge.label.length;
              const rectWidth = Math.max(textLength * 8 + 16, 60);
              const rectHeight = 28;
              
              return (
                <>
                  <rect
                    x={midX - rectWidth / 2}
                    y={midY - rectHeight / 2}
                    width={rectWidth}
                    height={rectHeight}
                    fill="#141414"
                    stroke="#2A2A2A"
                    strokeWidth="1.5"
                    rx="6"
                  />
                  <text
                    x={midX}
                    y={midY + 5}
                    fill="#FFFFFF"
                    fontSize="13"
                    fontWeight="600"
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                  >
                    {edge.label}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] flex-wrap gap-y-2 sm:flex-nowrap">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title || 'Flowchart'}</h2>
          <span className="text-xs text-[var(--color-text-secondary)] px-2 py-1 bg-[var(--color-card)] rounded">
            {nodes.length} nodes
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          {!readOnly && (
            <>
              <button
                onClick={() => setTool('select')}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'select'
                    ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)]'
                }`}
                title="Select Tool"
              >
                <MousePointer className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('pan')}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'pan'
                    ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)]'
                }`}
                title="Pan Tool"
              >
                <Hand className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-[var(--color-border)]" />
            </>
          )}
          
          <button
            onClick={zoomOut}
            className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--color-text-secondary)] min-w-[4rem] text-center">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
            title="Center View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          {!readOnly && (
            <>
              <div className="w-px h-6 bg-[var(--color-border)]" />
              {selectedNodeId && (
                <button
                  onClick={handleDeleteNode}
                  className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete Node"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          
          {onExport && (
            <button
              onClick={onExport}
              className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(var(--color-border) 1px, transparent 1px),
              linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        />

        {/* SVG for edges */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          {edges.map(renderEdge)}
        </svg>

        {/* Nodes */}
        {nodes.map(renderNode)}
      </div>
    </div>
  );
}
