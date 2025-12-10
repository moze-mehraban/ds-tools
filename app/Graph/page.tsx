'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Activity, Layers, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, GitCommit, ChevronDown, ChevronUp, Network, MousePointer2, Share2, Play
} from 'lucide-react';

// --- Types ---

interface GraphNode {
  id: string;
  label: string; // The value displayed
  x: number;
  y: number;
}

interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
}

// Animation Step
interface AnimationStep {
    activeNodes: string[]; // Nodes to highlight (Yellow/Visiting)
    visitedNodes: Set<string>; // Nodes already finished (Green)
    activeEdges: string[]; // Edges being traversed
    description: string;
}

// --- ALGORITHMS ---

// 1. BFS
const generateBFSSteps = (nodes: GraphNode[], edges: GraphEdge[], startNodeId: string): AnimationStep[] => {
    const steps: AnimationStep[] = [];
    const adj = new Map<string, string[]>();
    
    // Build Adjacency List
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
        if(adj.has(e.source)) adj.get(e.source)!.push(e.target);
    });

    const queue: string[] = [startNodeId];
    const visited = new Set<string>();
    visited.add(startNodeId);

    // Initial Step
    steps.push({
        activeNodes: [startNodeId],
        visitedNodes: new Set(),
        activeEdges: [],
        description: `Start BFS from Node ${nodes.find(n => n.id === startNodeId)?.label}`
    });

    while(queue.length > 0) {
        const curr = queue.shift()!;
        const currentVisited = new Set(visited); 
        
        const neighbors = adj.get(curr) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
                
                const edgeId = edges.find(e => e.source === curr && e.target === neighbor)?.id || '';
                
                steps.push({
                    activeNodes: [neighbor], 
                    visitedNodes: new Set(currentVisited), 
                    activeEdges: [edgeId],
                    description: `Visited ${nodes.find(n => n.id === neighbor)?.label}`
                });
                
                currentVisited.add(neighbor);
            }
        }
    }
    
    steps.push({
        activeNodes: [],
        visitedNodes: new Set(visited),
        activeEdges: [],
        description: 'BFS Complete'
    });

    return steps;
};

// 2. DFS
const generateDFSSteps = (nodes: GraphNode[], edges: GraphEdge[], startNodeId: string): AnimationStep[] => {
    const steps: AnimationStep[] = [];
    const adj = new Map<string, string[]>();
    
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
        if(adj.has(e.source)) adj.get(e.source)!.push(e.target);
    });

    const visited = new Set<string>();

    const dfs = (curr: string) => {
        visited.add(curr);
        
        steps.push({
            activeNodes: [curr],
            visitedNodes: new Set(visited),
            activeEdges: [],
            description: `DFS Visiting ${nodes.find(n => n.id === curr)?.label}`
        });

        const neighbors = adj.get(curr) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                const edgeId = edges.find(e => e.source === curr && e.target === neighbor)?.id || '';
                steps.push({
                    activeNodes: [curr, neighbor],
                    visitedNodes: new Set(visited),
                    activeEdges: [edgeId],
                    description: `Traversing to ${nodes.find(n => n.id === neighbor)?.label}`
                });
                
                dfs(neighbor);
                
                steps.push({
                    activeNodes: [curr],
                    visitedNodes: new Set(visited),
                    activeEdges: [],
                    description: `Backtracked to ${nodes.find(n => n.id === curr)?.label}`
                });
            }
        }
    };

    dfs(startNodeId);
    
    steps.push({
        activeNodes: [],
        visitedNodes: new Set(visited),
        activeEdges: [],
        description: 'DFS Complete'
    });

    return steps;
};

// Helper: Calculate adjusted line coordinates so arrows don't hide behind circles
const getAdjustedEdge = (x1: number, y1: number, x2: number, y2: number, radius: number = 30) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    // Shorten the line by the radius at both ends
    const startX = x1 + radius * Math.cos(angle);
    const startY = y1 + radius * Math.sin(angle);
    const endX = x2 - radius * Math.cos(angle);
    const endY = y2 - radius * Math.sin(angle);
    return { x1: startX, y1: startY, x2: endX, y2: endY };
};


export default function GraphVisualizer() {
  const router = useRouter();
  
  // Data State
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [nodeCounter, setNodeCounter] = useState(1);
  
  // Interaction State
  const [mode, setMode] = useState<'MOVE' | 'CONNECT' | 'DELETE'>('MOVE');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  
  // Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStep, setAnimationStep] = useState<AnimationStep | null>(null);
  const [animSpeed, setAnimSpeed] = useState<'normal' | 'slow' | 'verySlow'>('normal');
  
  // Viewport
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Status
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');

  const speedConfig = {
    normal: 600,
    slow: 1200,
    verySlow: 2000
  };

  // --- Actions ---

  const showToast = (type: 'neutral' | 'success' | 'error', msg: string) => {
      setStatusType(type);
      setStatusMessage(msg);
      if (!isAnimating) setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleAddNode = () => {
      const id = `node-${nodeCounter}`;
      const centerX = (-transform.x + 400) / transform.scale;
      const centerY = (-transform.y + 300) / transform.scale;
      
      const newNode: GraphNode = {
          id,
          label: nodeCounter.toString(),
          x: centerX + (Math.random() * 100 - 50),
          y: centerY + (Math.random() * 100 - 50)
      };
      
      setNodes([...nodes, newNode]);
      setNodeCounter(prev => prev + 1);
      showToast('success', `Added Node ${nodeCounter}`);
  };

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
      e.stopPropagation(); 
      
      if (mode === 'DELETE') {
          setNodes(nodes.filter(n => n.id !== id));
          setEdges(edges.filter(e => e.source !== id && e.target !== id));
          if (selectedNodeId === id) setSelectedNodeId(null);
          return;
      }

      if (mode === 'CONNECT') {
          if (!connectSourceId) {
              setConnectSourceId(id);
              showToast('neutral', 'Select target node...');
          } else {
              if (connectSourceId === id) {
                  setConnectSourceId(null); 
                  return;
              }
              const exists = edges.some(e => e.source === connectSourceId && e.target === id);
              if (!exists) {
                  setEdges([...edges, {
                      id: `edge-${connectSourceId}-${id}`,
                      source: connectSourceId,
                      target: id
                  }]);
                  showToast('success', 'Edge Created');
              }
              setConnectSourceId(null);
          }
          return;
      }

      setSelectedNodeId(id === selectedNodeId ? null : id);
  };

  const runAlgorithm = (type: 'BFS' | 'DFS') => {
      if (!selectedNodeId) {
          showToast('error', 'Select a start node first!');
          return;
      }
      if (nodes.length === 0) return;

      const steps = type === 'BFS' 
        ? generateBFSSteps(nodes, edges, selectedNodeId)
        : generateDFSSteps(nodes, edges, selectedNodeId);

      setIsAnimating(true);
      let i = 0;
      
      const interval = setInterval(() => {
          if (i >= steps.length) {
              clearInterval(interval);
              setIsAnimating(false);
              showToast('success', `${type} Finished`);
              return;
          }
          
          setAnimationStep(steps[i]);
          setStatusMessage(steps[i].description);
          i++;
      }, speedConfig[animSpeed]);
  };

  const handleClear = () => {
      setNodes([]);
      setEdges([]);
      setNodeCounter(1);
      setAnimationStep(null);
      setSelectedNodeId(null);
  };

  // --- Handlers for Canvas ---
  const handleWheel = (e: React.WheelEvent) => {
      const scaleAdjustment = -e.deltaY * 0.001;
      setTransform(prev => ({ ...prev, scale: Math.min(3, Math.max(0.1, prev.scale + scaleAdjustment)) }));
  };
  
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (!e.altKey) return; 
      
      setIsDraggingCanvas(true);
      dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingCanvas) return;
      setTransform(prev => ({ ...prev, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }));
  };
  const handleCanvasMouseUp = () => setIsDraggingCanvas(false);

  const updateNodePosition = (id: string, newPos: { x: number, y: number }) => {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, x: newPos.x, y: newPos.y } : n));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
      
      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 relative">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    Graph Algorithms
                </h1>
                <p className="text-xs text-slate-500 font-medium">BFS & DFS Visualizer</p>
            </div>
            
            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg ml-4">
                {(['MOVE', 'CONNECT', 'DELETE'] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => { setMode(m); setConnectSourceId(null); }}
                        className={`
                            px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1
                            ${mode === m 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }
                        `}
                    >
                        {m === 'MOVE' && <MousePointer2 size={14}/>}
                        {m === 'CONNECT' && <Share2 size={14}/>}
                        {m === 'DELETE' && <Trash2 size={14}/>}
                        {m}
                    </button>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
            <button onClick={handleAddNode} disabled={isAnimating} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm transition whitespace-nowrap flex items-center gap-1 disabled:bg-slate-400">
                <Plus size={16}/> Add Node
            </button>
            <div className="w-px h-8 bg-slate-300 mx-2"></div>
            <button onClick={() => runAlgorithm('BFS')} disabled={isAnimating || !selectedNodeId} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm transition whitespace-nowrap disabled:bg-slate-400">Run BFS</button>
            <button onClick={() => runAlgorithm('DFS')} disabled={isAnimating || !selectedNodeId} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm transition whitespace-nowrap disabled:bg-slate-400">Run DFS</button>
            <button onClick={handleClear} disabled={isAnimating} className="p-2 text-slate-400 hover:bg-slate-200 rounded-md"><RefreshCw size={18}/></button>
          </div>
        </div>
      </header>

      {/* --- CANVAS --- */}
      <main 
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isDraggingCanvas ? 'cursor-grabbing' : 'cursor-default'}`}
        onWheel={handleWheel} 
        onMouseDown={handleCanvasMouseDown} 
        onMouseMove={handleCanvasMouseMove} 
        onMouseUp={handleCanvasMouseUp} 
        onMouseLeave={handleCanvasMouseUp}
      >
        {nodes.length === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                <Network size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty Graph</p>
                <p className="text-sm">Add nodes to start.</p>
             </div>
        )}

        <div className="absolute top-0 left-0 w-full h-full origin-center will-change-transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transition: isDraggingCanvas ? 'none' : 'transform 0.1s ease-out' }}>
            <div className="relative w-full h-full">
                
                {/* 1. EDGES */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    <AnimatePresence>
                        {edges.map(edge => {
                            const source = nodes.find(n => n.id === edge.source);
                            const target = nodes.find(n => n.id === edge.target);
                            if (!source || !target) return null;

                            // Calculate adjusted coordinates to touch edge of circle
                            // Circle radius = 28 (w-14 = 56px / 2) + 2px border ~ 30px safety
                            const { x1, y1, x2, y2 } = getAdjustedEdge(source.x, source.y, target.x, target.y, 32);

                            const isTraversed = animationStep?.activeEdges.includes(edge.id);
                            
                            return (
                                <motion.line
                                    key={edge.id}
                                    x1={x1} y1={y1}
                                    x2={x2} y2={y2}
                                    stroke={isTraversed ? '#f59e0b' : '#cbd5e1'} // Amber if traversed, Slate if not
                                    strokeWidth={isTraversed ? 4 : 2}
                                    markerEnd="url(#arrowhead)"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                />
                            );
                        })}
                    </AnimatePresence>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                        </marker>
                    </defs>
                </svg>

                {/* 2. NODES */}
                {nodes.map(node => {
                    const isSelected = node.id === selectedNodeId;
                    const isSource = node.id === connectSourceId;
                    
                    // Animation State
                    let animBg = 'bg-white border-slate-600 text-slate-800';
                    let scale = 1;

                    if (animationStep) {
                        if (animationStep.visitedNodes.has(node.id)) {
                            animBg = 'bg-green-100 border-green-600 text-green-800'; // Visited
                        }
                        if (animationStep.activeNodes.includes(node.id)) {
                            animBg = 'bg-amber-200 border-amber-600 text-amber-900 shadow-xl'; // Active
                            scale = 1.2;
                        }
                    }

                    // Selection Overrides
                    if (isSelected) {
                        animBg += ' ring-4 ring-indigo-400 ring-opacity-50 border-indigo-600';
                    }
                    if (isSource) {
                        animBg += ' ring-4 ring-emerald-400 ring-opacity-50 border-emerald-600 border-dashed';
                    }

                    return (
                        <motion.div
                            key={node.id}
                            drag
                            dragMomentum={false}
                            // Stop propagation to prevent canvas drag AND updates position
                            onMouseDown={(e) => e.stopPropagation()} 
                            onDrag={(e, info) => {
                                // Update internal state immediately for smooth edge rendering
                                updateNodePosition(node.id, { x: node.x + info.delta.x, y: node.y + info.delta.y });
                            }}
                            onClick={(e: any) => handleNodeClick(node.id, e)}
                            initial={{ scale: 0 }}
                            animate={{ scale }}
                            className={`absolute w-14 h-14 -ml-7 -mt-7 rounded-full border-2 flex items-center justify-center font-bold text-lg cursor-grab active:cursor-grabbing shadow-sm z-10 ${animBg}`}
                            style={{ x: node.x, y: node.y }} // Framer motion controls position via style prop directly for perf
                        >
                            {node.label}
                        </motion.div>
                    );
                })}

            </div>
        </div>
      </main>

      {/* --- Footer Controls --- */}
      <div className="fixed bottom-6 right-6 flex flex-row items-center gap-1 bg-white p-1.5 rounded-lg shadow-lg border border-slate-200 z-50">
         <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={20} /></button>
         <button onClick={() => setTransform({x:0, y:0, scale:1})} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Maximize size={20} /></button>
         <button onClick={() => setTransform(p => ({...p, scale: Math.min(3, p.scale + 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={20} /></button>
      </div>

      {/* --- Helper Text --- */}
      <div className="fixed bottom-6 left-6 bg-white/90 p-3 rounded-lg shadow border border-slate-200 text-xs text-slate-600 z-50 pointer-events-none">
          <p className="font-bold mb-1">Controls:</p>
          <ul className="list-disc pl-4 space-y-1">
              <li><strong>Move Mode:</strong> Drag nodes to rearrange.</li>
              <li><strong>Pan Canvas:</strong> Alt + Drag on background.</li>
              <li><strong>Connect Mode:</strong> Click Node A then Node B.</li>
              <li><strong>Delete Mode:</strong> Click a node to remove it.</li>
              <li>Select a node to set as <strong>Start Node</strong> for algorithms.</li>
          </ul>
      </div>

      {/* --- Status Toast --- */}
      {statusMessage && (
         <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 border transition-all duration-300 ${statusType === 'error' ? 'bg-red-900 border-red-800 text-white' : ''} ${statusType === 'success' ? 'bg-green-900 border-green-800 text-white' : ''} ${statusType === 'neutral' ? 'bg-slate-800 border-slate-700 text-white animate-pulse' : ''}`}>
            {statusType === 'error' && <AlertCircle size={18} className="text-red-400" />} {statusType === 'success' && <Play size={18} className="text-green-400 fill-current" />} {statusType === 'neutral' && <Play size={18} className="text-blue-400 fill-current" />}
            <span className="font-medium tracking-wide text-sm">{statusMessage}</span>
         </div>
      )}
    </div>
  );
}