'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Search, Activity, Play, Layers, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, GitFork, ChevronDown, ChevronUp, X,
  Network
} from 'lucide-react';

// --- Types ---

// Internal Logic Structure (LCRS - Left Child, Right Sibling)
// This matches the Python "HeapNode" logic
interface PairingNode {
  id: string;
  value: number;
  child: PairingNode | null;   // Equivalent to leftChild
  sibling: PairingNode | null; // Equivalent to nextSibling
}

// Visual Structure (N-ary Tree)
// Used only for rendering the layout
interface VisualNodeData {
    id: string;
    value: number;
    children: VisualNodeData[];
    width: number; // For layout calculation
}

interface VisualNode {
  id: string;
  value: number;
  x: number;
  y: number;
  isRoot: boolean;
  isSelected: boolean;
}

interface VisualEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// --- PAIRING HEAP LOGIC (Ported from Python) ---

const generateId = () => 'ph-' + Math.random().toString(36).substr(2, 9);

const createNode = (value: number): PairingNode => ({
    id: generateId(),
    value,
    child: null,
    sibling: null
});

// Helper: Deep Clone to prevent mutation of React state in-place
// This fixes the issue where the view doesn't update when root remains the same
const cloneHeap = (node: PairingNode | null): PairingNode | null => {
    if (!node) return null;
    return {
        ...node,
        child: cloneHeap(node.child),
        sibling: cloneHeap(node.sibling)
    };
};

// Corresponds to 'merge_nodes(A, B)' in Python
const mergeNodes = (A: PairingNode | null, B: PairingNode | null): PairingNode | null => {
    if (!A) return B;
    if (!B) return A;
    
    if (A.value < B.value) {
        // A becomes parent of B
        // Python: B.nextSibling = A.leftChild; A.leftChild = B
        B.sibling = A.child;
        A.child = B;
        return A;
    } else {
        // B becomes parent of A
        // Python: A.nextSibling = B.leftChild; B.leftChild = A
        A.sibling = B.child;
        B.child = A;
        return B;
    }
};

// Corresponds to 'two_pass_merge(node)' in Python
const twoPassMerge = (node: PairingNode | null): PairingNode | null => {
    if (!node || !node.sibling) {
        return node;
    }
    
    const A = node;
    const B = node.sibling;
    const newNode = node.sibling.sibling;
    
    A.sibling = null;
    B.sibling = null;
    
    // Recursive merge: merge(merge(A, B), two_pass_merge(rest))
    return mergeNodes(mergeNodes(A, B), twoPassMerge(newNode));
};

// Insert Logic
const insert = (root: PairingNode | null, value: number): PairingNode => {
    const newNode = createNode(value);
    return mergeNodes(root, newNode)!;
};

// Delete Min Logic
const deleteMin = (root: PairingNode | null): { newRoot: PairingNode | null, minVal: number | null } => {
    if (!root) return { newRoot: null, minVal: null };
    
    const minVal = root.value;
    const newRoot = twoPassMerge(root.child);
    
    return { newRoot, minVal };
};

// Helper: Convert LCRS to N-ary Tree for Visualization
// This flattens the "sibling" chain into a "children" array
const lcrsToVisual = (node: PairingNode): VisualNodeData => {
    const children: VisualNodeData[] = [];
    let curr = node.child;
    while (curr) {
        children.push(lcrsToVisual(curr));
        curr = curr.sibling;
    }
    return { id: node.id, value: node.value, children, width: 0 };
};

// --- LAYOUT ENGINE (N-ary Tree) ---
// Calculates X, Y for a variable number of children
const calculateLayout = (
    root: PairingNode | null, 
    selectedId: string | null
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    if (!root) return { nodes: [], edges: [] };

    const visualRoot = lcrsToVisual(root);
    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];

    const NODE_SIZE = 50;
    const X_GAP = 20;
    const Y_GAP = 80;

    // 1. Measure Widths (Post-Order)
    const measure = (node: VisualNodeData) => {
        if (node.children.length === 0) {
            node.width = NODE_SIZE + X_GAP;
            return;
        }
        let w = 0;
        node.children.forEach(c => {
            measure(c);
            w += c.width;
        });
        node.width = w;
    };
    measure(visualRoot);

    // 2. Assign Coordinates (Pre-Order)
    // We center the entire tree around x=0 initially
    const startX = -(visualRoot.width / 2);

    // We need to capture edges. 
    // Let's modify assign to push edges connecting parent to child.
    const assignWithEdges = (node: VisualNodeData, x: number, y: number, parentX: number | null, parentY: number | null, isRoot: boolean) => {
        let myCenterX = 0;
        let currentChildX = x;
        const childCenters: number[] = [];

        // Recursively place children
        if (node.children.length > 0) {
             node.children.forEach(c => {
                const cCenter = assignWithEdges(c, currentChildX, y + Y_GAP, null, null, false); // Pass null first to get center
                childCenters.push(cCenter);
                currentChildX += c.width;
            });
            myCenterX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
        } else {
            myCenterX = x + node.width / 2;
        }

        // Now push node
        nodes.push({
            id: node.id,
            value: node.value,
            x: myCenterX,
            y,
            isRoot,
            isSelected: node.id === selectedId
        });

        // Push edge from parent (if exists)
        if (parentX !== null && parentY !== null) {
            edges.push({
                id: `${node.id}-parent`,
                x1: parentX,
                y1: parentY,
                x2: myCenterX,
                y2: y
            });
        }

        // Now that we know OUR center, we need to update the edges pointing TO our children
        if (node.children.length > 0) {
            node.children.forEach((c, i) => {
               const childCenterX = childCenters[i];
               edges.push({
                   id: `${node.id}-${c.id}`,
                   x1: myCenterX, y1: y,
                   x2: childCenterX, y2: y + Y_GAP
               });
            });
        }

        return myCenterX;
    };

    assignWithEdges(visualRoot, startX, 50, null, null, true);

    return { nodes, edges };
};


export default function PairingHeapSimulator() {
  const router = useRouter();
  const [heap, setHeap] = useState<PairingNode | null>(null);
  
  // UI State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(true);
  
  // Viewport State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Animation State (Simplified for structure updates)
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');

  // Layout
  const { nodes: visualNodes, edges: visualEdges } = useMemo(() => {
    return calculateLayout(heap, selectedId);
  }, [heap, selectedId]);

  // Actions
  const showToast = (type: 'neutral' | 'success' | 'error', msg: string) => {
      setStatusType(type);
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleInsert = () => {
      if (!newValue) return;
      const val = parseInt(newValue);
      if (isNaN(val)) return;

      // FIX: Clone the heap before modification to ensure React detects state change
      const currentHeap = cloneHeap(heap);
      const newHeap = insert(currentHeap, val);
      
      setHeap(newHeap); 
      setNewValue('');
      showToast('success', `Inserted ${val}`);
  };

  const handleDeleteMin = () => {
      if (!heap) return;
      // FIX: Clone here as well to be safe, though delete usually creates new root ref
      const currentHeap = cloneHeap(heap);
      const { newRoot, minVal } = deleteMin(currentHeap);
      setHeap(newRoot);
      setSelectedId(null);
      showToast('neutral', `Deleted Min: ${minVal}`);
  };

  const handleClear = () => {
      setHeap(null);
      setSelectedId(null);
      setTransform({ x: 0, y: 0, scale: 1 });
  }

  // Viewport Handlers
  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const scaleAdjustment = -e.deltaY * 0.001;
      setTransform(prev => ({ ...prev, scale: Math.min(3, Math.max(0.1, prev.scale + scaleAdjustment)) }));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      setTransform(prev => ({ ...prev, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }));
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^-?\d*$/.test(val)) setNewValue(val);
  };

  // Stats
  const selectedNode = selectedId ? visualNodes.find(n => n.id === selectedId) : null;
  // Count children of selected node directly from heap structure? 
  // It's recursive in LCRS. Let's just show basic info.

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
      
      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 relative">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Pairing Heap <span className="text-xs bg-indigo-100 text-indigo-700 px-2 rounded-full border border-indigo-200">Multi-way Tree</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
            <input type="text" placeholder="Num" value={newValue} onChange={handleNumberInput} onKeyDown={e => e.key === 'Enter' && handleInsert()} className="px-3 py-2 rounded-md border border-slate-300 w-20 outline-none text-black" maxLength={5}/>
            <button onClick={handleInsert} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-bold shadow-sm transition"><Plus size={16}/></button>
            <div className="w-px h-8 bg-slate-300 mx-1"></div>
            <button onClick={handleDeleteMin} disabled={!heap} className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-md text-sm font-bold shadow-sm transition flex items-center gap-1">
               <Trash2 size={16}/> Delete Min
            </button>
            <button onClick={handleClear} className="p-2 text-slate-400 hover:bg-slate-200 rounded-md"><RefreshCw size={18}/></button>
          </div>
        </div>
      </header>

      {/* --- CANVAS --- */}
      <main 
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        {!heap && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                <Network size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty Pairing Heap</p>
                <p className="text-sm">Root is Min. Insert nodes to build tree.</p>
             </div>
        )}

        <div className="absolute top-0 left-0 w-full h-full origin-center will-change-transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
            <div className="absolute top-1/2 left-1/2 w-0 h-0">
                <div className="relative">
                    {/* SVG Lines */}
                    <svg className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] pointer-events-none z-0 overflow-visible">
                        <AnimatePresence>
                            {visualEdges.map(edge => (
                                <motion.line
                                    key={edge.id}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ x1: 5000 + edge.x1, y1: 5000 + edge.y1, x2: 5000 + edge.x2, y2: 5000 + edge.y2, pathLength: 1, opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    stroke="#cbd5e1" strokeWidth="2"
                                />
                            ))}
                        </AnimatePresence>
                    </svg>

                    {/* Nodes */}
                    <AnimatePresence>
                        {visualNodes.map(node => {
                            // Colors based on Python code logic: Root=Red, Rest=Blue
                            let bg = node.isRoot ? 'bg-rose-500 border-rose-700 text-white' : 'bg-blue-100 border-blue-300 text-blue-900';
                            let scale = 1;
                            let zIndex = 10;

                            if (node.isSelected) {
                                bg += ' ring-4 ring-indigo-400 ring-opacity-50 scale-110';
                                scale = 1.2;
                                zIndex = 50;
                            }

                            return (
                                <motion.div
                                    key={node.id}
                                    layout // Magic layout animation
                                    initial={{ scale: 0, opacity: 0, x: node.x, y: node.y - 50 }}
                                    animate={{ x: node.x, y: node.y, scale, opacity: 1, zIndex }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                                    className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center font-bold text-lg cursor-pointer shadow-sm ${bg}`}
                                >
                                    {node.value}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
      </main>

      {/* --- Zoom Controls --- */}
      <div className="fixed bottom-6 right-6 flex flex-row items-center gap-1 bg-white p-1.5 rounded-lg shadow-lg border border-slate-200 z-50">
         <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={20} /></button>
         <button onClick={() => setTransform({x:0, y:0, scale:1})} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Maximize size={20} /></button>
         <button onClick={() => setTransform(p => ({...p, scale: Math.min(3, p.scale + 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={20} /></button>
      </div>

      {/* --- Node Details --- */}
      {selectedNode && (
        <div className="fixed bottom-6 right-44 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div onClick={() => setStatsOpen(!statsOpen)} className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2"><Activity size={16} className="text-blue-500" /> <h3 className="font-bold text-slate-700 text-sm">Node Stats</h3></div>
            {statsOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
          </div>
          {statsOpen && (
            <div className="p-4 space-y-2">
               <div className="flex justify-between items-center"><span className="text-slate-500 text-sm font-medium">Value</span><span className="font-mono font-bold text-xl text-slate-800">{selectedNode.value}</span></div>
               <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Type</span><span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{selectedNode.isRoot ? 'Root' : 'Child'}</span></div>
            </div>
          )}
        </div>
      )}

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