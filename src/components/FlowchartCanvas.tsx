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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Detect mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    // Add padding (reduce for mobile)
    const padding = isMobile ? 80 : 200;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Calculate flowchart dimensions
    const flowchartWidth = maxX - minX;
    const flowchartHeight = maxY - minY;

    // Calculate zoom to fit content
    let zoom = 1;
    if (flowchartWidth > 0 && flowchartHeight > 0) {
      const zoomX = canvasWidth / flowchartWidth;
      const zoomY = canvasHeight / flowchartHeight;
      zoom = Math.min(zoomX, zoomY, 1.5); // Cap at 1.5x
    }

    // Center offset
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const offsetX = canvasWidth / 2 - centerX * zoom;
    const offsetY = canvasHeight / 2 - centerY * zoom;

    setViewport({
      x: offsetX,
      y: offsetY,
      zoom: Math.max(0.5, zoom)
    });
  }, [nodes, isMobile]);

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
      zoom: Math.max(0.3, Math.min(3, prev.zoom * delta)),
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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (readOnly || e.touches.length > 1) return;
    
    const canvas = e.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    
    setDragStart({ x, y });
    setIsPanning(true);
  }, [readOnly]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStart || e.touches.length > 1) return;
    e.preventDefault();

    const canvas = e.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x, y });
    }
  }, [dragStart, isPanning]);

  const handleTouchEnd = useCallback(() => {
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
  const zoomOut = () => setViewport(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom / 1.2) }));
  const resetView = () => centerFlowchart();

  // Generate curved path between two points
  const generateCurvedPath = (x1: number, y1: number, x2: number, y2: number): string => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const curvature = 0.3;
    const controlPointOffset = distance * curvature;
    const isVertical = Math.abs(dy) > Math.abs(dx);
    
    if (isVertical) {
      const cx1 = x1;
      const cy1 = y1 + controlPointOffset;
      const cx2 = x2;
      const cy2 = y2 - controlPointOffset;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    } else {
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

    // Responsive sizing - smaller on mobile
    let minWidth = '100px';
    let maxWidth = '180px';
    let fontSize = 'text-sm';
    let padding = 'px-3 py-2';

    if (isMobile) {
      minWidth = '70px';
      maxWidth = '120px';
      fontSize = 'text-xs';
      padding = 'px-2 py-1';
    }

    if (node.type === 'start' || node.type === 'end') {
      minWidth = isMobile ? '85px' : '120px';
      maxWidth = isMobile ? '130px' : '200px';
    }

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
          className={`relative ${padding} font-semibold text-center border ${style.shape} ${isSelected ? 'ring-2 ring-[var(--color-accent-bg)]' : ''}`}
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
                className={`w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] text-center border border-[var(--color-border)] outline-none rounded px-2 py-1 ${fontSize}`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`${fontSize} font-medium`}>{node.label}</span>
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

    const pathData = generateCurvedPath(x1, y1, x2, y2);
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
        
        <path
          d={pathData}
          stroke="rgba(42, 42, 42, 0.6)"
          strokeWidth="3"
          fill="none"
          className={edge.style?.animated ? 'animate-pulse' : ''}
        />
        
        <path
          d={pathData}
          stroke="#A0A0A"
          strokeWidth="2"
          fill="none"
          markerEnd={`url(#arrowhead-${edge.id})`}
          className={edge.style?.animated ? 'animate-pulse' : ''}
        />
        
        {edge.label && (
          <g>
            {(() => {
              const textLength = edge.label.length;
              const rectWidth = Math.max(textLength * (isMobile ? 6 : 8) + 16, 60);
              const rectHeight = isMobile ? 24 : 28;
              
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
                    fontSize={isMobile ? "11" : "13"}
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
      {/* Toolbar - Responsive */}
      <div className="flex items-center justify-between p-3 bg-[var(--color-sidebar)] border-b border-[var(--color-border)] flex-wrap gap-2 md:gap-y-0 gap-y-2">
        <div className="flex items-center gap-2 w-full md:w-auto order-1 min-w-0">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] truncate flex-1 md:flex-none">{title || 'Flowchart'}</h2>
          <span className="text-xs text-[var(--color-text-secondary)] px-2 py-1 bg-[var(--color-card)] rounded whitespace-nowrap flex-shrink-0">
            {nodes.length} nodes
          </span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end w-full md:w-auto order-3 sm:order-2">
          {!readOnly && (
            <>
              <button
                onClick={() => setTool('select')}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
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
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  tool === 'pan'
                    ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-text)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)]'
                }`}
                title="Pan Tool"
              >
                <Hand className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-[var(--color-border)] hidden md:block" />
            </>
          )}
          
          <button
            onClick={zoomOut}
            className="p-1.5 sm:p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xs text-[var(--color-text-secondary)] min-w-[3rem] text-center">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 sm:p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 sm:p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
            title="Center View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          {!readOnly && (
            <>
              <div className="w-px h-5 bg-[var(--color-border)] hidden md:block" />
              {selectedNodeId && (
                <button
                  onClick={handleDeleteNode}
                  className="p-1.5 sm:p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
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
              className="p-1.5 sm:p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] rounded-lg transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas - Responsive */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
