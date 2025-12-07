'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Activity, Layers, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, GitMerge, ChevronDown, ChevronUp, Network,
  Play
} from 'lucide-react';

// --- Types ---

interface BinomialNode {
  id: string;
  value: number;
  children: BinomialNode[]; // Children list
  order: number;            // Degree of the tree
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
  order: number;
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

// --- BINOMIAL HEAP LOGIC (Ported) ---

const generateId = () => 'bh-' + Math.random().toString(36).substr(2, 9);

const createNode = (value: number): BinomialNode => ({
    id: generateId(),
    value,
    children: [],
    order: 0
});

// Link two trees of same order (t1 becomes parent of t2, or vice versa)
const link = (t1: BinomialNode, t2: BinomialNode): BinomialNode => {
    // Determine which is smaller
    let parent = t1;
    let child = t2;
    
    if (t1.value > t2.value) {
        parent = t2;
        child = t1;
    }

    // Deep clone to avoid mutating React state directly during complex operations if we were using refs
    // But here we usually rebuild structure. Let's just link references for now and clone at top level.
    // Ideally we treat these as immutable updates.
    
    const newParent = { ...parent, children: [...parent.children] };
    
    // Add child. In Binomial Trees constructed this way (linking), 
    // the children are usually stored in order of increasing degree if we append.
    // e.g. B0+B0->B1 (child B0). B1+B1->B2 (children B0, B1).
    newParent.children.push(child);
    newParent.order += 1;
    
    return newParent;
};

// Merge two heaps (lists of trees)
const unionHeaps = (heap1: (BinomialNode | null)[], heap2: (BinomialNode | null)[]): (BinomialNode | null)[] => {
    const newHeap: (BinomialNode | null)[] = [];
    let i = 0; 
    let j = 0;
    let carry: BinomialNode | null = null;

    const len1 = heap1.length;
    const len2 = heap2.length;

    while (i < len1 || j < len2 || carry) {
        const t1 = i < len1 ? heap1[i] : null;
        const t2 = j < len2 ? heap2[j] : null;

        const treesPresent = [t1, t2, carry].filter(t => t !== null) as BinomialNode[];

        if (treesPresent.length === 0) {
            newHeap.push(null);
        } else if (treesPresent.length === 1) {
            newHeap.push(treesPresent[0]);
            carry = null;
        } else if (treesPresent.length === 2) {
            newHeap.push(null);
            carry = link(treesPresent[0], treesPresent[1]);
        } else {
            // 3 trees: keep one as 'sum' (current bit), pass carry
            // Usually we keep 'carry' in the slot and link the other two? 
            // Or typically: link t1 and t2 to make new carry, place old carry in heap.
            newHeap.push(carry);
            carry = link(t1!, t2!);
        }

        i++;
        j++;
    }

    return newHeap;
};

const insert = (heap: (BinomialNode | null)[], value: number): (BinomialNode | null)[] => {
    const newNode = createNode(value);
    const newHeap = [newNode]; // A heap with just one B0 tree
    return unionHeaps(heap, newHeap);
};

// Standard deep clone to ensure UI updates
const cloneHeap = (heap: (BinomialNode | null)[]): (BinomialNode | null)[] => {
    const cloneNode = (node: BinomialNode): BinomialNode => ({
        ...node,
        children: node.children.map(cloneNode)
    });
    return heap.map(t => t ? cloneNode(t) : null);
};

const extractMin = (heap: (BinomialNode | null)[]): { newHeap: (BinomialNode | null)[], minVal: number | null } => {
    if (heap.length === 0 || heap.every(t => t === null)) {
        return { newHeap: heap, minVal: null };
    }

    // 1. Find min tree
    let minVal = Infinity;
    let minIdx = -1;

    heap.forEach((t, idx) => {
        if (t && t.value < minVal) {
            minVal = t.value;
            minIdx = idx;
        }
    });

    if (minIdx === -1) return { newHeap: heap, minVal: null };

    // 2. Remove min tree from heap
    const heapWithoutMin = [...heap];
    heapWithoutMin[minIdx] = null;

    // 3. Children of min tree become a new heap
    // In our construction (append), children are [Order 0, Order 1, ... Order k-1]
    // This perfectly matches the index requirement for a heap.
    const childrenHeap = heap[minIdx]!.children;

    // 4. Union
    const finalHeap = unionHeaps(heapWithoutMin, childrenHeap);
    
    return { newHeap: finalHeap, minVal };
};

// --- VISUALIZATION CONVERSION ---

// Convert single tree logic (N-ary)
const nodeToVisualData = (node: BinomialNode): VisualNodeData => {
    return {
        id: node.id,
        value: node.value,
        children: node.children.map(nodeToVisualData),
        width: 0
    };
};

const calculateLayout = (
    heap: (BinomialNode | null)[],
    selectedId: string | null
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];

    const NODE_SIZE = 50;
    const X_GAP = 30; // Gap between siblings
    const TREE_GAP = 80; // Gap between major trees in the forest
    const Y_GAP = 80;

    // We have a Forest. We need to layout each tree and place them side-by-side.
    
    let currentX = 0;

    // Helper to measure subtree width
    const measure = (n: VisualNodeData) => {
        if (n.children.length === 0) {
            n.width = NODE_SIZE + X_GAP;
            return;
        }
        let w = 0;
        n.children.forEach(c => measure(c));
        w = n.children.reduce((acc, c) => acc + c.width, 0);
        n.width = Math.max(w, NODE_SIZE + X_GAP); // Ensure at least node size
    };

    // Helper to assign coords
    // Returns the center X of the node processed
    const assign = (
        n: VisualNodeData, 
        x: number, 
        y: number, 
        parentId: string | null, 
        order: number,
        isRoot: boolean,
        minVal: number
    ) => {
        let myCenterX = 0;
        
        if (n.children.length === 0) {
            myCenterX = x + n.width / 2;
        } else {
            let childX = x;
            const childCenters: number[] = [];
            n.children.forEach(c => {
                childCenters.push(assign(c, childX, y + Y_GAP, n.id, 0, false, minVal));
                childX += c.width;
            });
            // Center parent over children
            myCenterX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
        }

        nodes.push({
            id: n.id,
            value: n.value,
            x: myCenterX,
            y,
            order,
            isRoot,
            isMin: n.value === minVal && isRoot, // Highlight global min root
            isSelected: n.id === selectedId
        });

        if (parentId) {
            // Find parent coords (hacky, but parent is already pushed usually if Pre-Order? 
            // Wait, we calculate Parent Center AFTER children in Post-Order logic usually, 
            // but here we are recursive. We pushed parent AFTER processing children above?
            // Actually, we construct edges using the return values to avoid searching.
        }
        
        // Let's use the return value approach for edges like before
        return myCenterX;
    };

    // Assign with edge generation
    const layoutTree = (n: VisualNodeData, startX: number, rootOrder: number, globalMin: number) => {
        // 1. Measure
        measure(n);

        // 2. Assign
        const placeNode = (node: VisualNodeData, x: number, y: number): number => {
            let center = 0;
            const childCenters: number[] = [];
            
            if (node.children.length > 0) {
                let cx = x;
                node.children.forEach(child => {
                    const cCenter = placeNode(child, cx, y + Y_GAP);
                    childCenters.push(cCenter);
                    cx += child.width;
                });
                center = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
                
                // Add edges
                childCenters.forEach((cCenter, i) => {
                    edges.push({
                        id: `${node.id}-${node.children[i].id}`,
                        x1: center, y1: y,
                        x2: cCenter, y2: y + Y_GAP
                    });
                });
            } else {
                center = x + node.width / 2;
            }

            nodes.push({
                id: node.id,
                value: node.value,
                x: center,
                y,
                order: -1, // Only roots track order explicitly for display
                isRoot: false,
                isMin: false,
                isSelected: node.id === selectedId
            });
            
            return center;
        };

        // Root specific handling
        let rootCenter = 0;
        const childCenters: number[] = [];
        if (n.children.length > 0) {
            let cx = startX;
            n.children.forEach(c => {
                childCenters.push(placeNode(c, cx, 50 + Y_GAP)); // Root is at Y=50
                cx += c.width;
            });
            rootCenter = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
             childCenters.forEach((cCenter, i) => {
                edges.push({
                    id: `${n.id}-${n.children[i].id}`,
                    x1: rootCenter, y1: 50,
                    x2: cCenter, y2: 50 + Y_GAP
                });
            });
        } else {
            rootCenter = startX + (NODE_SIZE + X_GAP) / 2;
        }

        // Push Root
        nodes.push({
            id: n.id,
            value: n.value,
            x: rootCenter,
            y: 50,
            order: rootOrder,
            isRoot: true,
            isMin: n.value === globalMin,
            isSelected: n.id === selectedId
        });

        return n.width; // Return used width
    };

    // Find Global Min for highlighting
    let minVal = Infinity;
    heap.forEach(t => { if(t && t.value < minVal) minVal = t.value; });

    // Iterate Forest
    heap.forEach((tree, index) => {
        if (tree) {
            const visualTree = nodeToVisualData(tree);
            const usedWidth = layoutTree(visualTree, currentX, index, minVal); // index is the Order
            currentX += usedWidth + TREE_GAP;
        } else {
            // Placeholder for missing order? Usually we just skip or leave a gap.
            // Let's leave a small gap to indicate structure if needed, or just skip.
            // Visually it's nicer to just stack them.
            // But preserving order index visually is good for understanding.
            // Let's just skip for compactness, the 'order' label will show the truth.
        }
    });

    return { nodes, edges };
};


export default function BinomialHeapSimulator() {
  const router = useRouter();
  const [heap, setHeap] = useState<(BinomialNode | null)[]>([]);
  
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
      const newHeap = insert(cloned, val);
      
      setHeap(newHeap);
      setNewValue('');
      showToast('success', `Inserted ${val}`);
  };

  const handleExtractMin = () => {
      const cloned = cloneHeap(heap);
      const { newHeap, minVal } = extractMin(cloned);
      if (minVal === null) {
          showToast('error', 'Heap is empty');
          return;
      }
      setHeap(newHeap);
      setSelectedId(null);
      showToast('neutral', `Extracted Min: ${minVal}`);
  };

  const handleClear = () => {
      setHeap([]);
      setSelectedId(null);
      setTransform({x:0, y:0, scale:1});
  }

  // Inputs
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^-?\d*$/.test(val)) setNewValue(val);
  };

  // Viewport
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
  const treeCount = heap.filter(t => t !== null).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
      
      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 relative">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Binomial Heap <span className="text-xs bg-amber-100 text-amber-700 px-2 rounded-full border border-amber-200">Forest Structure</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
            <input type="text" placeholder="Num" value={newValue} onChange={handleNumberInput} onKeyDown={e => e.key === 'Enter' && handleInsert()} className="px-3 py-2 rounded-md border border-slate-300 w-20 outline-none text-black" maxLength={5}/>
            <button onClick={handleInsert} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-bold shadow-sm transition"><Plus size={16}/></button>
            <div className="w-px h-8 bg-slate-300 mx-1"></div>
            <button onClick={handleExtractMin} disabled={treeCount === 0} className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-md text-sm font-bold shadow-sm transition flex items-center gap-1">
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
        {treeCount === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                <Network size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty Binomial Heap</p>
                <p className="text-sm">Insert nodes to create trees of increasing order.</p>
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
                                bg = node.isMin ? 'bg-rose-500 border-rose-700 text-white' : 'bg-amber-400 border-amber-600 text-black';
                                zIndex = 20;
                            } else {
                                bg = 'bg-blue-100 border-blue-300 text-blue-900';
                            }

                            if (node.isSelected) {
                                bg += ' ring-4 ring-indigo-400 ring-opacity-50';
                                scale = 1.2;
                                zIndex = 50;
                            }

                            return (
                                <React.Fragment key={node.id}>
                                    {/* Order Label for Roots */}
                                    {node.isRoot && (
                                        <motion.div
                                            initial={{ opacity: 0, y: node.y - 80 }}
                                            animate={{ opacity: 1, x: node.x, y: node.y - 45 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute -ml-6 w-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest z-30" // Increased z-index
                                        >
                                            Order {node.order}
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
               <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Role</span><span className={`text-xs font-bold px-2 py-1 rounded ${selectedNode.isRoot ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{selectedNode.isRoot ? 'Root' : 'Child'}</span></div>
               {selectedNode.isRoot && <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Order</span><span className="font-mono font-bold text-slate-800">{selectedNode.order}</span></div>}
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