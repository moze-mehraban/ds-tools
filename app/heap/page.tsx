'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Activity, Play, Layers, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, GitMerge, ChevronDown, ChevronUp, X,
  ArrowUpIcon, ArrowDownIcon, KeyRound, ArrowUp, ArrowDown, Globe
} from 'lucide-react';

// --- Types ---
type HeapType = 'MAX' | 'MIN';

interface HeapNodeObj {
  id: string;
  value: number;
}

interface TreeNode {
  id: string;
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

interface VisualNode {
  id: string;
  value: number;
  x: number;
  y: number;
  isSelected: boolean;
  isVisiting: boolean;
  isFound: boolean;
  isComparing?: boolean; 
  isSwapping?: boolean;  
}

interface VisualEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Animation Step Structure
interface AnimationStep {
    heap: HeapNodeObj[];
    highlightIds: string[];
    action: 'COMPARE' | 'SWAP' | 'INSERT' | 'DELETE_PREP' | 'DONE';
    description?: string;
}

// --- HEAP LOGIC & STEP GENERATORS ---

const generateId = () => 'h-' + Math.random().toString(36).substr(2, 9);

const arrayToTree = (items: HeapNodeObj[]): TreeNode | null => {
    if (items.length === 0) return null;
    const treeNodes = items.map(item => ({
        id: item.id, value: item.value, left: null as TreeNode | null, right: null as TreeNode | null
    }));
    for (let i = 0; i < treeNodes.length; i++) {
        const leftIdx = 2 * i + 1;
        const rightIdx = 2 * i + 2;
        if (leftIdx < treeNodes.length) treeNodes[i].left = treeNodes[leftIdx];
        if (rightIdx < treeNodes.length) treeNodes[i].right = treeNodes[rightIdx];
    }
    return treeNodes[0];
};

// Generator: Bubble Up Steps
const generateHeapifyUpSteps = (initialHeap: HeapNodeObj[], startIndex: number, type: HeapType): AnimationStep[] => {
    const steps: AnimationStep[] = [];
    const arr = [...initialHeap];
    let index = startIndex;

    while (index > 0) {
        const parentIndex = Math.floor((index - 1) / 2);
        
        steps.push({ 
            heap: [...arr], 
            highlightIds: [arr[index].id, arr[parentIndex].id], 
            action: 'COMPARE',
            description: `Comparing ${arr[index].value} with Parent ${arr[parentIndex].value}`
        });

        const shouldSwap = type === 'MAX' 
            ? arr[index].value > arr[parentIndex].value 
            : arr[index].value < arr[parentIndex].value;

        if (shouldSwap) {
            [arr[index], arr[parentIndex]] = [arr[parentIndex], arr[index]];
            steps.push({ 
                heap: [...arr], 
                highlightIds: [arr[index].id, arr[parentIndex].id], 
                action: 'SWAP',
                description: `Swapped ${arr[index].value} and ${arr[parentIndex].value}`
            });
            index = parentIndex;
        } else {
            steps.push({ heap: [...arr], highlightIds: [arr[index].id, arr[parentIndex].id], action: 'DONE', description: 'Heap property satisfied' });
            break;
        }
    }
    if (steps.length === 0) {
         steps.push({ heap: [...arr], highlightIds: [arr[index].id], action: 'DONE', description: 'Heap property satisfied' });
    }
    return steps;
};

// Generator: Bubble Down Steps
const generateHeapifyDownSteps = (initialHeap: HeapNodeObj[], startIndex: number, type: HeapType): AnimationStep[] => {
    const steps: AnimationStep[] = [];
    const arr = [...initialHeap];
    let index = startIndex;
    const length = arr.length;

    while (true) {
        let leftIdx = 2 * index + 1;
        let rightIdx = 2 * index + 2;
        let swapIdx = index;

        const compareIds = [arr[index].id];
        if(leftIdx < length) compareIds.push(arr[leftIdx].id);
        if(rightIdx < length) compareIds.push(arr[rightIdx].id);

        steps.push({
            heap: [...arr],
            highlightIds: compareIds,
            action: 'COMPARE',
            description: `Comparing ${arr[index].value} with children`
        });

        if (leftIdx < length) {
            const condition = type === 'MAX' 
                ? arr[leftIdx].value > arr[swapIdx].value 
                : arr[leftIdx].value < arr[swapIdx].value;
            if (condition) swapIdx = leftIdx;
        }

        if (rightIdx < length) {
            const condition = type === 'MAX' 
                ? arr[rightIdx].value > arr[swapIdx].value 
                : arr[rightIdx].value < arr[swapIdx].value;
            if (condition) swapIdx = rightIdx;
        }

        if (swapIdx !== index) {
            [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
            steps.push({
                heap: [...arr],
                highlightIds: [arr[index].id, arr[swapIdx].id],
                action: 'SWAP',
                description: `Bubbling down: Swap ${arr[swapIdx].value} and ${arr[index].value}`
            });
            index = swapIdx;
        } else {
            steps.push({ heap: [...arr], highlightIds: [arr[index].id], action: 'DONE', description: 'Position found' });
            break;
        }
    }
    return steps;
};

// Helper for Delete Root Sequence
const generateDeleteRootSteps = (initialHeap: HeapNodeObj[], type: HeapType): AnimationStep[] => {
    if (initialHeap.length === 0) return [];
    
    const steps: AnimationStep[] = [];
    const arr = [...initialHeap];
    const rootId = arr[0].id;
    
    steps.push({ 
        heap: [...arr], 
        highlightIds: [rootId], 
        action: 'DELETE_PREP',
        description: `Marking root ${arr[0].value} for deletion`
    });

    if (arr.length === 1) {
        return [{ heap: [], highlightIds: [], action: 'DONE', description: 'Heap empty' }];
    }

    const lastNode = arr.pop()!;
    arr[0] = lastNode; 
    
    steps.push({
        heap: [...arr],
        highlightIds: [lastNode.id],
        action: 'SWAP',
        description: `Moved last node ${lastNode.value} to root`
    });

    const downSteps = generateHeapifyDownSteps(arr, 0, type);
    return [...steps, ...downSteps];
};

// Helper for Key Update Sequence
const generateUpdateKeySteps = (initialHeap: HeapNodeObj[], index: number, newValue: number, type: HeapType): AnimationStep[] => {
    const steps: AnimationStep[] = [];
    const arr = [...initialHeap]; // Shallow copy of array
    const oldValue = arr[index].value;
    
    // Step 1: Update Value visually in a new object to preserve immutability of other steps
    arr[index] = { ...arr[index], value: newValue };
    
    steps.push({
        heap: [...arr],
        highlightIds: [arr[index].id],
        action: 'DELETE_PREP', 
        description: `Updated key from ${oldValue} to ${newValue}`
    });

    // Step 2: Determine Direction
    // Logic Table:
    // MAX Heap: Increase -> Up, Decrease -> Down
    // MIN Heap: Increase -> Down, Decrease -> Up
    
    let isUp = false;
    if (type === 'MAX') {
        isUp = newValue > oldValue;
    } else {
        isUp = newValue < oldValue;
    }

    const fixSteps = isUp 
        ? generateHeapifyUpSteps(arr, index, type)
        : generateHeapifyDownSteps(arr, index, type);

    return [...steps, ...fixSteps];
}

// Helper for Global Update Steps
const generateGlobalUpdateSteps = (initialHeap: HeapNodeObj[], changeAmount: number): AnimationStep[] => {
    const steps: AnimationStep[] = [];
    const arr = initialHeap.map(n => ({...n})); // Deep copy nodes
    const allIds = arr.map(n => n.id);

    // Step 1: Highlight All (Visual cue that something big is happening)
    steps.push({
        heap: initialHeap, // Show old values first
        highlightIds: allIds,
        action: 'COMPARE',
        description: `Preparing to ${changeAmount > 0 ? 'add' : 'subtract'} ${Math.abs(changeAmount)} to all nodes`
    });

    // Step 2: Update All Values
    const updatedArr = arr.map(n => ({ ...n, value: n.value + changeAmount }));
    
    steps.push({
        heap: updatedArr,
        highlightIds: allIds,
        action: 'DONE',
        description: `Updated all values. Heap property preserved.`
    });

    return steps;
};

// Full Rebuild (Immediate)
const buildHeap = (items: HeapNodeObj[], type: HeapType): HeapNodeObj[] => {
    const arr = [...items];
    const heapify = (a: HeapNodeObj[], i: number) => {
        let largest = i;
        let l = 2 * i + 1;
        let r = 2 * i + 2;
        if (l < a.length && (type === 'MAX' ? a[l].value > a[largest].value : a[l].value < a[largest].value)) largest = l;
        if (r < a.length && (type === 'MAX' ? a[r].value > a[largest].value : a[r].value < a[largest].value)) largest = r;
        if (largest !== i) {
            [a[i], a[largest]] = [a[largest], a[i]];
            heapify(a, largest);
        }
    }
    for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) heapify(arr, i);
    return arr;
};

// --- LAYOUT ENGINE ---
const calculateLayout = (
    root: TreeNode | null, 
    selectedId: string | null,
    visitingId: string | null,
    foundId: string | null,
    highlightIds: string[],
    actionType: string
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    if (!root) return { nodes: [], edges: [] };

    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];
    const positions = new Map<string, { x: number, y: number }>();

    let counter = 0;
    const X_SPACING = 80; 
    const Y_SPACING = 100;

    const assignCoordinates = (node: TreeNode, depth: number) => {
        if (node.left) assignCoordinates(node.left, depth + 1);
        const x = counter * X_SPACING;
        const y = depth * Y_SPACING + 50;
        positions.set(node.id, { x, y });
        counter++;
        if (node.right) assignCoordinates(node.right, depth + 1);
    };

    assignCoordinates(root, 0);

    const totalWidth = counter * X_SPACING;
    const offsetCorrection = - (totalWidth / 2) + (X_SPACING / 2);

    const buildVisuals = (node: TreeNode) => {
        const pos = positions.get(node.id)!;
        const finalX = pos.x + offsetCorrection;
        
        const isHighlighted = highlightIds.includes(node.id);
        const isComparing = isHighlighted && actionType === 'COMPARE';
        const isSwapping = isHighlighted && actionType === 'SWAP';
        const isDeletePrep = isHighlighted && actionType === 'DELETE_PREP';

        nodes.push({
            id: node.id,
            value: node.value,
            x: finalX,
            y: pos.y,
            isSelected: node.id === selectedId || isDeletePrep,
            isVisiting: node.id === visitingId,
            isFound: node.id === foundId,
            isComparing,
            isSwapping
        });

        if (node.left) {
            const childPos = positions.get(node.left.id)!;
            edges.push({
                id: `${node.id}-${node.left.id}`,
                x1: finalX, y1: pos.y,
                x2: childPos.x + offsetCorrection, y2: childPos.y
            });
            buildVisuals(node.left);
        }

        if (node.right) {
            const childPos = positions.get(node.right.id)!;
            edges.push({
                id: `${node.id}-${node.right.id}`,
                x1: finalX, y1: pos.y,
                x2: childPos.x + offsetCorrection, y2: childPos.y
            });
            buildVisuals(node.right);
        }
    };

    buildVisuals(root);
    return { nodes, edges };
};

export default function HeapTreeSimulator() {
  const router = useRouter();
  const [heap, setHeap] = useState<HeapNodeObj[]>([]);
  const [heapType, setHeapType] = useState<HeapType>('MAX');
  
  // UI State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [keyUpdateValue, setKeyUpdateValue] = useState(''); 
  const [globalUpdateValue, setGlobalUpdateValue] = useState(''); // State for Global Ops
  const [statsOpen, setStatsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Viewport
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Animation State
  const [visitingId, setVisitingId] = useState<string | null>(null);
  const [foundId, setFoundId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [animSpeed, setAnimSpeed] = useState<'normal' | 'slow' | 'verySlow'>('verySlow');
  
  // Advanced Animation State
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [animationAction, setAnimationAction] = useState<string>('');

  const speedConfig = {
    normal:   { duration: 0.5, interval: 600 },
    slow:     { duration: 1.2, interval: 1200 },
    verySlow: { duration: 2.5, interval: 2500 }
  };

  // --- Derived State ---
  const treeRoot = useMemo(() => arrayToTree(heap), [heap]);
  const { nodes: visualNodes, edges: visualEdges } = useMemo(() => {
    return calculateLayout(treeRoot, selectedId, visitingId, foundId, highlightIds, animationAction);
  }, [treeRoot, selectedId, visitingId, foundId, highlightIds, animationAction]);

  // --- Actions ---
  const showToast = (type: 'neutral' | 'success' | 'error', msg: string) => {
      setStatusType(type);
      setStatusMessage(msg);
      if (!isAnimating) setTimeout(() => setStatusMessage(''), 3000);
  };

  const runHeapOperations = (steps: AnimationStep[]) => {
      setIsAnimating(true);
      let stepIdx = 0;

      const runStep = () => {
          if (stepIdx >= steps.length) {
              setIsAnimating(false);
              setHighlightIds([]);
              setAnimationAction('');
              setStatusMessage('Operation Complete');
              setTimeout(() => setStatusMessage(''), 2000);
              return;
          }

          const step = steps[stepIdx];
          setHeap(step.heap);
          setHighlightIds(step.highlightIds);
          setAnimationAction(step.action);
          if(step.description) setStatusMessage(step.description);
          setStatusType('neutral');

          stepIdx++;
          setTimeout(runStep, speedConfig[animSpeed].interval);
      };

      runStep();
  };

  const handleInsert = () => {
    if (!newValue) return;
    const val = parseInt(newValue);
    if (isNaN(val)) return;

    const newNode: HeapNodeObj = { id: generateId(), value: val };
    const tempHeap = [...heap, newNode];
    const steps = generateHeapifyUpSteps(tempHeap, tempHeap.length - 1, heapType);
    
    if(steps.length > 0 && steps[0].action !== 'INSERT') {
        steps.unshift({ heap: [...tempHeap], highlightIds: [newNode.id], action: 'INSERT', description: `Inserted ${val}`});
    }

    runHeapOperations(steps);
    setNewValue('');
  };

  const handleDeleteRoot = () => {
    if (heap.length === 0) return;
    const steps = generateDeleteRootSteps(heap, heapType);
    runHeapOperations(steps);
    setSelectedId(null);
  };

  const handleToggleType = () => {
      if (isAnimating) return;
      const newType = heapType === 'MAX' ? 'MIN' : 'MAX';
      setHeapType(newType);
      const newHeap = buildHeap(heap, newType);
      setHeap(newHeap);
      showToast('neutral', `Converted to ${newType} Heap`);
  };

  const handleKeyUpdate = (mode: 'INCREASE' | 'DECREASE') => {
      if (!selectedId) return;
      
      const index = heap.findIndex(n => n.id === selectedId);
      if (index === -1) return;
      const oldValue = heap[index].value;

      let changeAmount: number;

      if (!keyUpdateValue) {
          changeAmount = 10;
      } else {
          changeAmount = parseInt(keyUpdateValue);
          if (isNaN(changeAmount)) return;
      }

      let newValue: number;
      if (mode === 'INCREASE') {
          newValue = oldValue + changeAmount;
      } else {
          newValue = oldValue - changeAmount;
      }

      const steps = generateUpdateKeySteps(heap, index, newValue, heapType);
      runHeapOperations(steps);
      setKeyUpdateValue(''); 
  };

  // --- NEW: Global Operations (Add/Sub All) ---
  const handleGlobalUpdate = (mode: 'ADD' | 'SUB') => {
      if (heap.length === 0) return;

      let changeAmount: number;
      if (!globalUpdateValue) {
          changeAmount = 10; // Default amount
      } else {
          changeAmount = parseInt(globalUpdateValue);
          if (isNaN(changeAmount)) return;
      }

      // If subtracting, invert the amount for calculation
      if (mode === 'SUB') changeAmount = -changeAmount;

      const steps = generateGlobalUpdateSteps(heap, changeAmount);
      runHeapOperations(steps);
      setGlobalUpdateValue('');
  };
  
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const val = e.target.value;
    if (val === '' || /^-?\d*$/.test(val)) setter(val);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
      
      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 relative">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-800">Heap Simulator</h1>
                <div 
                    className="relative flex items-center bg-slate-200 rounded-full p-1 cursor-pointer w-32 h-9 shadow-inner select-none"
                    onClick={handleToggleType}
                >
                    <motion.div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-sm flex items-center justify-center text-xs font-bold z-10 transition-colors
                            ${heapType === 'MAX' ? 'bg-orange-500 text-white' : 'bg-cyan-500 text-white'}
                        `}
                        animate={{ x: heapType === 'MAX' ? '100%' : '0%' }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                        {heapType}
                    </motion.div>
                    <div className="flex w-full justify-between px-3 text-xs font-bold text-slate-500 z-0">
                        <span className={heapType === 'MIN' ? 'opacity-0' : 'opacity-100'}>MIN</span>
                        <span className={heapType === 'MAX' ? 'opacity-0' : 'opacity-100'}>MAX</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center mr-4 border-r border-slate-300 pr-4 gap-1">
               <Gauge size={16} className="text-slate-400 mr-2" />
               {(['normal', 'slow', 'verySlow'] as const).map(speed => (
                   <button key={speed} onClick={() => setAnimSpeed(speed)} className={`px-2 py-1 text-xs font-bold rounded ${animSpeed === speed ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{speed === 'normal' ? '1x' : speed === 'slow' ? '0.5x' : '0.2x'}</button>
               ))}
            </div>

            <input type="text" placeholder="Num" value={newValue} onChange={(e) => handleNumberInput(e, setNewValue)} onKeyDown={e => e.key === 'Enter' && handleInsert()} disabled={isAnimating} className="px-3 py-2 rounded-md border border-slate-300 w-20 outline-none text-black" maxLength={5}/>
            <button onClick={handleInsert} disabled={!newValue || isAnimating} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-bold shadow-sm transition"><Plus size={16}/></button>
            <div className="w-px h-8 bg-slate-300 mx-1"></div>
            <button onClick={handleDeleteRoot} disabled={heap.length === 0 || isAnimating} className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-md text-sm font-bold shadow-sm transition flex items-center gap-1">
                <Trash2 size={16}/>  Extract {heapType === 'MAX' ? 'Max' : 'Min'}
            </button>
            <button onClick={() => { setHeap([]); setSelectedId(null); setTransform({x:0, y:0, scale:1}) }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-md"><RefreshCw size={18}/></button>
          </div>
        </div>
      </header>

      {/* --- CANVAS --- */}
      <main 
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        {heap.length === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                <GitMerge size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty Heap</p>
             </div>
        )}

        <div className="absolute top-0 left-0 w-full h-full origin-center will-change-transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
            <div className="absolute top-1/2 left-1/2 w-0 h-0">
                <div className="relative">
                    <svg className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] pointer-events-none z-0 overflow-visible">
                        <AnimatePresence>
                            {visualEdges.map(edge => (
                                <motion.line
                                    key={edge.id}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ x1: 5000 + edge.x1, y1: 5000 + edge.y1, x2: 5000 + edge.x2, y2: 5000 + edge.y2, pathLength: 1, opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: speedConfig[animSpeed].duration }}
                                    stroke="#cbd5e1" strokeWidth="2"
                                />
                            ))}
                        </AnimatePresence>
                    </svg>

                    <AnimatePresence>
                        {visualNodes.map(node => {
                            let bg = 'bg-white border-slate-700 text-slate-800';
                            let zIndex = 10;
                            let scale = 1;
                            
                            if(node.isFound) { bg = 'bg-green-500 border-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'; zIndex = 20; scale = 1.1; }
                            else if(node.isVisiting) { bg = 'bg-yellow-400 border-yellow-600 text-black shadow-lg'; zIndex = 20; scale = 1.1; }
                            
                            if(node.isComparing) { bg = 'bg-yellow-300 border-yellow-600 text-black shadow-lg'; zIndex = 30; scale = 1.15; }
                            if(node.isSwapping) { bg = 'bg-indigo-400 border-indigo-600 text-white shadow-xl'; zIndex = 40; scale = 1.2; }
                            if(node.isSelected) { bg = 'bg-rose-500 border-rose-700 text-white shadow-lg'; zIndex = 50; scale = 1.1; }

                            return (
                                <motion.div
                                    key={node.id}
                                    initial={{ scale: 0, opacity: 0, x: node.x, y: node.y }}
                                    animate={{ x: node.x, y: node.y, scale, opacity: 1, zIndex }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: speedConfig[animSpeed].duration, type: "spring", bounce: 0.2 }}
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

      {/* --- Left Menu (Key Operations & Global Ops) --- */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-4">
          <AnimatePresence>
            {menuOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20, originY: 1 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-4 flex flex-col gap-4"
                >
                    {/* KEY OPERATIONS (Single Node) */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                            <KeyRound size={16} /> 
                            <span className="text-xs font-bold uppercase tracking-wider">Node Operations</span>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Auto (+/- 10)" 
                                value={keyUpdateValue} 
                                onChange={(e) => handleNumberInput(e, setKeyUpdateValue)} 
                                disabled={isAnimating || !selectedId} 
                                className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none focus:ring-2 focus:ring-indigo-500 w-full disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 placeholder:text-[10px]" 
                                maxLength={5}
                            />
                            <button 
                                onClick={() => handleKeyUpdate('DECREASE')} 
                                disabled={!selectedId || isAnimating} 
                                className="px-3 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-300 disabled:border-slate-200 rounded-md text-xs font-bold shadow-sm flex items-center"
                                title="Decrease Key"
                            >
                                <ArrowDown size={14} className="mr-1"/> Dec
                            </button>
                            <button 
                                onClick={() => handleKeyUpdate('INCREASE')} 
                                disabled={!selectedId || isAnimating} 
                                className="px-3 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:bg-slate-100 disabled:text-slate-300 disabled:border-slate-200 rounded-md text-xs font-bold shadow-sm flex items-center"
                                title="Increase Key"
                            >
                                <ArrowUp size={14} className="mr-1"/> Inc
                            </button>
                        </div>
                        {!selectedId && <p className="text-[10px] text-slate-400 mt-1 italic text-center">* Select a node first</p>}
                    </div>

                    <div className="h-px bg-slate-100 w-full"></div>
                    
                    {/* GLOBAL OPERATIONS (All Nodes) */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500"><Globe size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Global Operations</span></div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Auto (+/- 10)" 
                                value={globalUpdateValue} 
                                onChange={(e) => handleNumberInput(e, setGlobalUpdateValue)} 
                                disabled={isAnimating || heap.length === 0} 
                                className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none focus:ring-2 focus:ring-indigo-500 w-full disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 placeholder:text-[10px]" 
                                maxLength={5}
                            />
                            <button onClick={() => handleGlobalUpdate('ADD')} disabled={heap.length === 0 || isAnimating} className="px-3 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-300 disabled:border-slate-200 rounded-md text-xs font-bold shadow-sm">Add All</button>
                            <button onClick={() => handleGlobalUpdate('SUB')} disabled={heap.length === 0 || isAnimating} className="px-3 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:bg-slate-100 disabled:text-slate-300 disabled:border-slate-200 rounded-md text-xs font-bold shadow-sm">Sub All</button>
                        </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setMenuOpen(!menuOpen)} className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 border ${menuOpen ? 'bg-white text-slate-600 border-slate-200 rotate-90' : 'bg-indigo-600 text-white border-indigo-700 hover:scale-110 hover:bg-indigo-700'}`}>{menuOpen ? <X size={24} /> : <KeyRound size={24} />}</button>
      </div>

      {/* --- Node Stats --- */}
      {(selectedId || heap.length > 0) && !isAnimating && (
        <div className="fixed bottom-6 right-44 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div onClick={() => setStatsOpen(!statsOpen)} className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2"><Activity size={16} className="text-blue-500" /> <h3 className="font-bold text-slate-700 text-sm">{selectedId ? 'Node Details' : 'Heap Details'}</h3></div>
            {statsOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
          </div>
          {statsOpen && (
            <div className="p-4 space-y-4">
              {selectedId ? (
                  <>
                    <div className="flex justify-between items-center"><span className="text-slate-500 text-sm font-medium">Selected Value</span><span className="font-mono font-bold text-xl text-slate-800 bg-slate-100 px-2 rounded">{heap.find(n => n.id === selectedId)?.value}</span></div>
                    <div className="text-xs text-center text-slate-400">Index in Array: <span className="font-bold text-slate-600">{heap.findIndex(n => n.id === selectedId)}</span></div>
                  </>
              ) : (
                  <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Nodes</div><div className="text-slate-800 font-bold">{heap.length}</div></div>
                      <div className="border-l border-slate-200"><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Heap Type</div><div className={`font-bold ${heapType === 'MAX' ? 'text-orange-600' : 'text-cyan-600'}`}>{heapType}</div></div>
                  </div>
              )}
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