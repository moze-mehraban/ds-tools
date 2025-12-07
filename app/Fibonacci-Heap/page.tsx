'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Activity, Layers, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, GitMerge, ChevronDown, ChevronUp, Network, Scissors,
  Play
} from 'lucide-react';

// --- Types ---

interface FibNode {
  id: string;
  value: number;
  degree: number;
  marked: boolean;
  children: FibNode[]; // Simulating child pointer list
  // In a real implementation, we use left/right/parent pointers. 
  // For React state, a recursive structure is easier to manage and render.
}

// Visual Types
interface VisualNodeData {
    id: string;
    value: number;
    children: VisualNodeData[];
    width: number;
}

interface VisualNode {
  id: string;
  value: number;
  x: number;
  y: number;
  degree: number;
  marked: boolean;
  isRoot: boolean;
  isMin: boolean;
  isSelected: boolean;
}

interface VisualEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// --- FIBONACCI HEAP LOGIC ---

const generateId = () => 'fib-' + Math.random().toString(36).substr(2, 9);

const createNode = (value: number): FibNode => ({
    id: generateId(),
    value,
    degree: 0,
    marked: false,
    children: []
});

// Deep Clone
const cloneHeap = (heap: FibNode[]): FibNode[] => {
    const cloneNode = (node: FibNode): FibNode => ({
        ...node,
        children: node.children.map(cloneNode)
    });
    return heap.map(cloneNode);
};

// Link two trees (y becomes child of x)
const link = (y: FibNode, x: FibNode) => {
    // Remove y from root list is implicit because we pass specific trees to link
    // Make y a child of x
    x.children.push(y);
    x.degree++;
    y.marked = false; // Unmark y
}

// Insert: Add to root list
const insert = (heap: FibNode[], value: number): { newHeap: FibNode[], minNode: FibNode | null } => {
    const newNode = createNode(value);
    const newHeap = [...heap, newNode];
    
    // Update Min
    let minNode = newNode;
    newHeap.forEach(n => {
        if (n.value < minNode.value) minNode = n;
    });

    return { newHeap, minNode };
};

// Consolidate (The heavy lifting)
const consolidate = (heap: FibNode[]): FibNode[] => {
    // We need an array to store trees by degree
    // The size roughly log(N). Let's use a map or sparse array.
    const A: (FibNode | null)[] = []; 

    // Iterate through root list
    // Important: We must iterate a copy or handle the dynamic nature carefully
    // The standard algo iterates the list. Merging removes from list.
    
    // In our state-based approach, 'heap' is the root list.
    let rootList = [...heap];
    
    rootList.forEach(w => {
        let x = w;
        let d = x.degree;
        
        while (A[d] != null) {
            let y = A[d]!; // Another tree with same degree
            
            // Make sure x is the smaller root
            if (x.value > y.value) {
                [x, y] = [y, x];
            }
            
            // Link y to x
            link(y, x);
            
            A[d] = null;
            d++;
        }
        A[d] = x;
    });

    // Reconstruct root list from A
    return A.filter(n => n !== null && n !== undefined) as FibNode[];
};

const extractMin = (heap: FibNode[]): { newHeap: FibNode[], minVal: number | null } => {
    if (heap.length === 0) return { newHeap: [], minVal: null };

    // Find min
    let minNode = heap[0];
    let minIndex = 0;
    heap.forEach((n, i) => {
        if (n.value < minNode.value) {
            minNode = n;
            minIndex = i;
        }
    });

    const minVal = minNode.value;

    // Remove min from root list
    // Add its children to root list
    // (Children parent pointers would be reset here in real impl)
    
    const children = minNode.children;
    let newRootList = [
        ...heap.slice(0, minIndex),
        ...heap.slice(minIndex + 1),
        ...children // Dump children into root list
    ];

    if (newRootList.length === 0) {
        return { newHeap: [], minVal };
    }

    // Consolidate
    const consolidatedHeap = consolidate(newRootList);

    return { newHeap: consolidatedHeap, minVal };
};

// --- VISUALIZATION LAYOUT (Similar to Binomial but handles marking) ---

const nodeToVisualData = (node: FibNode): VisualNodeData => ({
    id: node.id,
    value: node.value,
    children: node.children.map(nodeToVisualData),
    width: 0
});

const calculateLayout = (
    heap: FibNode[], 
    selectedId: string | null
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];

    const NODE_SIZE = 50;
    const X_GAP = 30; 
    const TREE_GAP = 80; 
    const Y_GAP = 80;

    let currentX = 0;

    // Helper to measure
    const measure = (n: VisualNodeData) => {
        if (n.children.length === 0) {
            n.width = NODE_SIZE + X_GAP;
            return;
        }
        n.children.forEach(measure);
        const w = n.children.reduce((acc, c) => acc + c.width, 0);
        n.width = Math.max(w, NODE_SIZE + X_GAP);
    };

    // Helper to assign (Recursive)
    const assign = (
        n: VisualNodeData, 
        x: number, 
        y: number, 
        realNode: FibNode, // Pass real node to access properties like 'marked'
        isRoot: boolean,
        minVal: number
    ) => {
        let myCenterX = 0;
        
        if (n.children.length === 0) {
            myCenterX = x + n.width / 2;
        } else {
            let childX = x;
            const childCenters: number[] = [];
            n.children.forEach((c, i) => {
                // Find corresponding real child node
                const realChild = realNode.children[i];
                childCenters.push(assign(c, childX, y + Y_GAP, realChild, false, minVal));
                childX += c.width;
            });
            myCenterX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
            
            // Edges
            childCenters.forEach((cx, i) => {
                edges.push({
                    id: `${n.id}-${n.children[i].id}`,
                    x1: myCenterX, y1: y,
                    x2: cx, y2: y + Y_GAP
                });
            });
        }

        nodes.push({
            id: n.id,
            value: n.value,
            x: myCenterX,
            y,
            degree: realNode.degree,
            marked: realNode.marked,
            isRoot,
            isMin: isRoot && n.value === minVal,
            isSelected: n.id === selectedId
        });

        return myCenterX;
    };

    // Find global min for highlighting
    let minVal = Infinity;
    heap.forEach(n => { if(n.value < minVal) minVal = n.value; });

    // Iterate Root List
    heap.forEach((tree) => {
        const visualData = nodeToVisualData(tree);
        measure(visualData);
        assign(visualData, currentX, 50, tree, true, minVal);
        currentX += visualData.width + TREE_GAP;
    });

    return { nodes, edges };
};


export default function FibonacciHeapSimulator() {
  const router = useRouter();
  const [heap, setHeap] = useState<FibNode[]>([]);
  
  // UI State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [statsOpen, setStatsOpen] = useState(true);
  
  // Viewport
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Animation
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

      const cloned = cloneHeap(heap);
      const { newHeap } = insert(cloned, val);
      
      setHeap(newHeap);
      setNewValue('');
      showToast('success', `Inserted ${val}`);
  };

  const handleExtractMin = () => {
      if (heap.length === 0) return;
      const cloned = cloneHeap(heap);
      const { newHeap, minVal } = extractMin(cloned);
      setHeap(newHeap);
      setSelectedId(null);
      showToast('neutral', `Extracted Min: ${minVal}`);
  };

  const handleClear = () => {
      setHeap([]);
      setSelectedId(null);
      setTransform({x:0, y:0, scale:1});
  }

  // --- Handlers ---
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^-?\d*$/.test(val)) setNewValue(val);
  };

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

  // Stats
  const selectedNode = selectedId ? visualNodes.find(n => n.id === selectedId) : null;
  const rootCount = heap.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
      
      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 relative">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Fibonacci Heap <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded-full border border-purple-200">Lazy Structure</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
            <input type="text" placeholder="Num" value={newValue} onChange={handleNumberInput} onKeyDown={e => e.key === 'Enter' && handleInsert()} className="px-3 py-2 rounded-md border border-slate-300 w-20 outline-none text-black" maxLength={5}/>
            <button onClick={handleInsert} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-bold shadow-sm transition"><Plus size={16}/></button>
            <div className="w-px h-8 bg-slate-300 mx-1"></div>
            <button onClick={handleExtractMin} disabled={rootCount === 0} className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-md text-sm font-bold shadow-sm transition flex items-center gap-1">
               <Trash2 size={16}/> Extract Min
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
        {rootCount === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                <Network size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty Fibonacci Heap</p>
                <p className="text-sm">Insert nodes to begin lazy insertion.</p>
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
                            // Colors
                            let bg = 'bg-white border-slate-700 text-slate-800';
                            let scale = 1;
                            let zIndex = 10;

                            if (node.isRoot) {
                                bg = node.isMin ? 'bg-rose-500 border-rose-700 text-white' : 'bg-purple-400 border-purple-600 text-white';
                                zIndex = 20;
                            } else {
                                bg = 'bg-blue-100 border-blue-300 text-blue-900';
                            }

                            if (node.marked) {
                                // Marked nodes (lost a child) get special visual cue
                                bg += ' border-dashed border-4 border-slate-600'; // Dashed border for marked
                            }

                            if (node.isSelected) {
                                bg += ' ring-4 ring-indigo-400 ring-opacity-50';
                                scale = 1.2;
                                zIndex = 50;
                            }

                            return (
                                <React.Fragment key={node.id}>
                                    {/* Degree Label for Roots */}
                                    {node.isRoot && (
                                        <motion.div
                                            initial={{ opacity: 0, y: node.y - 80 }}
                                            animate={{ opacity: 1, x: node.x, y: node.y - 45 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute -ml-6 w-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest z-30"
                                        >
                                            Deg {node.degree}
                                        </motion.div>
                                    )}
                                    
                                    {/* Mark Indicator (Scissors icon if marked) */}
                                    {node.marked && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1, x: node.x + 15, y: node.y - 20 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute z-40 text-red-500 bg-white rounded-full p-0.5 border border-red-200"
                                        >
                                            <Scissors size={12} />
                                        </motion.div>
                                    )}

                                    <motion.div
                                        layout
                                        initial={{ scale: 0, opacity: 0, x: node.x, y: node.y }}
                                        animate={{ x: node.x, y: node.y, scale, opacity: 1, zIndex }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                                        className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center font-bold text-lg cursor-pointer shadow-sm ${bg}`}
                                    >
                                        {node.value}
                                    </motion.div>
                                </React.Fragment>
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
            <div className="flex items-center gap-2"><Activity size={16} className="text-blue-500" /> <h3 className="font-bold text-slate-700 text-sm">Node Details</h3></div>
            {statsOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
          </div>
          {statsOpen && (
            <div className="p-4 space-y-2">
               <div className="flex justify-between items-center"><span className="text-slate-500 text-sm font-medium">Value</span><span className="font-mono font-bold text-xl text-slate-800">{selectedNode.value}</span></div>
               <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Role</span><span className={`text-xs font-bold px-2 py-1 rounded ${selectedNode.isRoot ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{selectedNode.isRoot ? 'Root' : 'Child'}</span></div>
               <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Degree</span><span className="font-mono font-bold text-slate-800">{selectedNode.degree}</span></div>
               <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Marked</span><span className={`text-xs font-bold px-2 py-1 rounded ${selectedNode.marked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{selectedNode.marked ? 'YES' : 'NO'}</span></div>
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