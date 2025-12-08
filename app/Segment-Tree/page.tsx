'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Activity, Layers, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, GitMerge, ChevronDown, ChevronUp, Network, Edit3, Search,
  Calculator, ArrowDownToLine, ArrowUpToLine, Play, X
} from 'lucide-react';

// --- Types ---

type TreeMode = 'SUM' | 'MIN' | 'MAX';

interface SegNode {
  id: string;
  val: number;
  start: number;
  end: number;
  left: SegNode | null;
  right: SegNode | null;
}

// Visual Types
interface VisualNode {
  id: string;
  value: number | null; // Null means "unknown yet" (?)
  rangeLabel: string;
  x: number;
  y: number;
  isLeaf: boolean;
  isSelected: boolean;
  isQueryMatch: boolean;
  isUpdatePath: boolean;
  // Animation Flags
  isVisiting: boolean; 
  isMerging: boolean;
  isDone: boolean;
}

interface VisualEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Animation Step
interface BuildStep {
    treeSnapshot: SegNode | null; 
    visibleIds: string[];         // Nodes that exist visually
    resolvedIds: string[];        // Nodes that have calculated their value
    activeIds: string[];          // Highlighted nodes
    action: 'VISIT' | 'LEAF' | 'MERGE' | 'DONE';
    description: string;
}

// --- SEGMENT TREE LOGIC ---

const generateId = () => 'seg-' + Math.random().toString(36).substr(2, 9);

const getIdentity = (mode: TreeMode): number => {
    if (mode === 'SUM') return 0;
    if (mode === 'MIN') return Infinity;
    if (mode === 'MAX') return -Infinity;
    return 0;
};

const aggregate = (v1: number, v2: number, mode: TreeMode): number => {
    if (mode === 'SUM') return v1 + v2;
    if (mode === 'MIN') return Math.min(v1, v2);
    if (mode === 'MAX') return Math.max(v1, v2);
    return 0;
};

// Recursive Build Function
const buildTreeRecursive = (arr: number[], start: number, end: number, mode: TreeMode): SegNode => {
    if (start === end) {
        return {
            id: generateId(),
            val: arr[start],
            start,
            end,
            left: null,
            right: null
        };
    }
    const mid = Math.floor((start + end) / 2);
    const left = buildTreeRecursive(arr, start, mid, mode);
    const right = buildTreeRecursive(arr, mid + 1, end, mode);
    return {
        id: generateId(),
        val: aggregate(left.val, right.val, mode),
        start,
        end,
        left,
        right
    };
};

// Generator for Build Animation Steps
const generateBuildSteps = (arr: number[], mode: TreeMode): BuildStep[] => {
    const steps: BuildStep[] = [];
    const fullTree = buildTreeRecursive(arr, 0, arr.length - 1, mode);
    
    const visibleIds = new Set<string>();
    const resolvedIds = new Set<string>(); // Tracks nodes that know their value

    const traverse = (node: SegNode) => {
        // Step 1: Visit Node (Going Down)
        // Node appears, but value is UNKNOWN (not in resolvedIds)
        visibleIds.add(node.id);
        
        steps.push({
            treeSnapshot: fullTree, 
            visibleIds: Array.from(visibleIds), 
            resolvedIds: Array.from(resolvedIds),
            activeIds: [node.id],
            action: 'VISIT',
            description: `Visiting range [${node.start}-${node.end}]`
        });

        if (node.start === node.end) {
            // LEAF: Value becomes known immediately
            resolvedIds.add(node.id);
            steps.push({
                treeSnapshot: fullTree,
                visibleIds: Array.from(visibleIds),
                resolvedIds: Array.from(resolvedIds),
                activeIds: [node.id],
                action: 'LEAF',
                description: `Leaf found at index ${node.start}. Value: ${node.val}`
            });
            return;
        }

        // Recurse
        if (node.left) traverse(node.left);
        if (node.right) traverse(node.right);

        // Step 2: Merge (Coming Up)
        // NOW the parent value becomes known
        resolvedIds.add(node.id);
        
        const childIds = [];
        if(node.left) childIds.push(node.left.id);
        if(node.right) childIds.push(node.right.id);
        
        steps.push({
            treeSnapshot: fullTree,
            visibleIds: Array.from(visibleIds),
            resolvedIds: Array.from(resolvedIds),
            activeIds: [node.id, ...childIds],
            action: 'MERGE',
            description: `Merged children to get ${mode}: ${node.val}`
        });
        
        steps.push({
            treeSnapshot: fullTree,
            visibleIds: Array.from(visibleIds),
            resolvedIds: Array.from(resolvedIds),
            activeIds: [node.id],
            action: 'DONE',
            description: `Node [${node.start}-${node.end}] complete`
        });
    };

    traverse(fullTree);
    return steps;
};


// Update Logic
const update = (node: SegNode, idx: number, newVal: number, mode: TreeMode): SegNode => {
    if (node.start === node.end) {
        return { ...node, val: newVal };
    }
    const mid = Math.floor((node.start + node.end) / 2);
    let newLeft = node.left;
    let newRight = node.right;
    if (idx <= mid) newLeft = update(node.left!, idx, newVal, mode);
    else newRight = update(node.right!, idx, newVal, mode);
    return {
        ...node,
        val: aggregate(newLeft!.val, newRight!.val, mode),
        left: newLeft,
        right: newRight
    };
};

// Query Logic
const query = (node: SegNode, l: number, r: number, usedNodes: string[], mode: TreeMode): number => {
    if (l <= node.start && r >= node.end) {
        usedNodes.push(node.id);
        return node.val;
    }
    if (node.end < l || node.start > r) return getIdentity(mode);
    const mid = Math.floor((node.start + node.end) / 2);
    const lRes = query(node.left!, l, r, usedNodes, mode);
    const rRes = query(node.right!, l, r, usedNodes, mode);
    return aggregate(lRes, rRes, mode);
};

const getUpdatePath = (node: SegNode, idx: number, path: string[]) => {
    path.push(node.id);
    if (node.start === node.end) return;
    const mid = Math.floor((node.start + node.end) / 2);
    if (idx <= mid) getUpdatePath(node.left!, idx, path);
    else getUpdatePath(node.right!, idx, path);
}

// --- VISUALIZATION LAYOUT ---

const calculateLayout = (
    root: SegNode | null, 
    queryIds: string[], 
    updateIds: string[],
    animationState: { activeIds: string[], action: string } | null,
    visibleNodeIds: string[] | null,
    resolvedValueIds: string[] | null 
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    if (!root) return { nodes: [], edges: [] };

    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];
    
    const refinedTraverse = (node: SegNode, depth: number): number | null => {
        
        // Visibility Check
        if (visibleNodeIds && !visibleNodeIds.includes(node.id)) {
            return null;
        }

        let myX = 0;
        const Y = 50 + depth * 80;

        if (node.start === node.end) {
            myX = node.start * 80; 
        } else {
            let leftX: number | null = null;
            let rightX: number | null = null;

            if (node.left) leftX = refinedTraverse(node.left, depth + 1);
            if (node.right) rightX = refinedTraverse(node.right, depth + 1);
            
            if (leftX !== null && rightX !== null) {
                myX = (leftX + rightX) / 2;
                edges.push({ id: `${node.id}-L`, x1: myX, y1: Y, x2: leftX, y2: Y + 80 });
                edges.push({ id: `${node.id}-R`, x1: myX, y1: Y, x2: rightX, y2: Y + 80 });
            } else if (leftX !== null) {
                myX = leftX + 40; 
                edges.push({ id: `${node.id}-L`, x1: myX, y1: Y, x2: leftX, y2: Y + 80 });
            } else {
                const midRange = (node.start + node.end) / 2;
                myX = midRange * 80;
            }
        }

        // Determine Animation Colors
        let isVisiting = false;
        let isMerging = false;
        let isDone = false;

        if (animationState) {
            if (animationState.activeIds.includes(node.id)) {
                if (animationState.action === 'VISIT') isVisiting = true;
                if (animationState.action === 'LEAF') isDone = true; 
                if (animationState.action === 'MERGE') isMerging = true;
                if (animationState.action === 'DONE') isDone = true;
            }
        }

        // Value Check: If animating and node is NOT in resolved list, value is null
        let displayValue: number | null = node.val;
        if (resolvedValueIds && !resolvedValueIds.includes(node.id)) {
            displayValue = null;
        }

        nodes.push({
            id: node.id,
            value: displayValue,
            rangeLabel: `[${node.start}-${node.end}]`,
            x: myX,
            y: Y,
            isLeaf: node.start === node.end,
            isSelected: false,
            isQueryMatch: queryIds.includes(node.id),
            isUpdatePath: updateIds.includes(node.id),
            isVisiting,
            isMerging,
            isDone
        });

        return myX;
    }

    if(root) refinedTraverse(root, 0);
    return { nodes, edges };
};


export default function SegmentTreeSimulator() {
  const router = useRouter();
  
  // Data State
  const [arrayData, setArrayData] = useState<number[]>([]);
  const [tree, setTree] = useState<SegNode | null>(null);
  const [arrayInput, setArrayInput] = useState(''); 
  const [treeMode, setTreeMode] = useState<TreeMode>('SUM');
  
  // Operation State
  const [queryRange, setQueryRange] = useState({ l: '', r: '' });
  const [updateVal, setUpdateVal] = useState({ idx: '', val: '' });
  const [queryResult, setQueryResult] = useState<number | null>(null);
  
  // Visual State
  const [highlightedQueryNodes, setHighlightedQueryNodes] = useState<string[]>([]);
  const [highlightedUpdateNodes, setHighlightedUpdateNodes] = useState<string[]>([]);
  
  // Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStep, setAnimationStep] = useState<{ activeIds: string[], action: string, visibleIds: string[], resolvedIds: string[] } | null>(null);
  
  // UI State
  const [menuOpen, setMenuOpen] = useState(false); 
  const [queryMode, setQueryMode] = useState<'QUERY' | 'UPDATE'>('QUERY');
  
  // Viewport
  const [transform, setTransform] = useState({ x: 400, y: 50, scale: 0.8 }); 
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Status
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');

  // --- Layout Calculation ---
  const { nodes: visualNodes, edges: visualEdges } = useMemo(() => {
    return calculateLayout(
        tree, 
        highlightedQueryNodes, 
        highlightedUpdateNodes, 
        animationStep, 
        animationStep?.visibleIds || null, // If null, show all
        animationStep?.resolvedIds || null // If null, show all values
    );
  }, [tree, highlightedQueryNodes, highlightedUpdateNodes, animationStep]);

  // --- Effects ---
  useEffect(() => {
      // Auto-rebuild if mode changes, but SKIP animation for simple mode switch
      if (arrayData.length > 0 && !isAnimating) {
          const newTree = buildTreeRecursive(arrayData, 0, arrayData.length - 1, treeMode);
          setTree(newTree);
          setHighlightedQueryNodes([]);
          setHighlightedUpdateNodes([]);
          setQueryResult(null);
          showToast('neutral', `Switched to ${treeMode} Mode`);
      }
  }, [treeMode]); 

  // --- Actions ---
  const showToast = (type: 'neutral' | 'success' | 'error', msg: string) => {
      setStatusType(type);
      setStatusMessage(msg);
      if (!isAnimating) setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleBuild = () => {
      const nums = arrayInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      if (nums.length === 0) {
          showToast('error', 'Please enter numbers (e.g. "1, 5, 3")');
          return;
      }
      if (nums.length > 32) {
          showToast('error', 'Max 32 numbers for performance');
          return;
      }

      setArrayData(nums);
      
      const steps = generateBuildSteps(nums, treeMode);
      
      // FIX FOR FLASH: Set initial state BEFORE interval starts
      const firstStep = steps[0];

      setTree(firstStep.treeSnapshot); 
      setAnimationStep({ 
          activeIds: firstStep.activeIds, 
          action: firstStep.action, 
          visibleIds: firstStep.visibleIds,
          resolvedIds: firstStep.resolvedIds
      });

      setHighlightedQueryNodes([]);
      setHighlightedUpdateNodes([]);
      setQueryResult(null);
      setIsAnimating(true);
      setStatusMessage(firstStep.description);

      // Start interval from step 1 (since we just set step 0)
      let i = 1;
      const interval = setInterval(() => {
          if (i >= steps.length) {
              clearInterval(interval);
              setIsAnimating(false);
              setAnimationStep(null); 
              showToast('success', `Built ${treeMode} Tree`);
              return;
          }

          const step = steps[i];
          setAnimationStep({ 
              activeIds: step.activeIds, 
              action: step.action, 
              visibleIds: step.visibleIds,
              resolvedIds: step.resolvedIds
          });
          setStatusMessage(step.description);
          i++;
      }, 500);
  };

  const handleQuery = () => {
      if (!tree || isAnimating) return;
      const l = parseInt(queryRange.l);
      const r = parseInt(queryRange.r);
      
      if (isNaN(l) || isNaN(r) || l > r || l < 0 || r >= arrayData.length) {
          showToast('error', 'Invalid Range');
          return;
      }

      setHighlightedUpdateNodes([]); 
      const usedNodes: string[] = [];
      const result = query(tree, l, r, usedNodes, treeMode);
      
      setHighlightedQueryNodes(usedNodes);
      setQueryResult(result);
      showToast('neutral', `${treeMode} [${l}, ${r}] = ${result}`);
  };

  const handleUpdate = () => {
      if (!tree || isAnimating) return;
      const idx = parseInt(updateVal.idx);
      const val = parseInt(updateVal.val);

      if (isNaN(idx) || isNaN(val) || idx < 0 || idx >= arrayData.length) {
          showToast('error', 'Invalid Index or Value');
          return;
      }

      const pathIds: string[] = [];
      getUpdatePath(tree, idx, pathIds);
      setHighlightedQueryNodes([]); 
      setHighlightedUpdateNodes(pathIds);

      const newTree = update(tree, idx, val, treeMode);
      
      const newArr = [...arrayData];
      newArr[idx] = val;
      
      setArrayData(newArr);
      setTree(newTree);
      showToast('success', `Updated Index ${idx} to ${val}`);
  };

  const handleClear = () => {
      setTree(null);
      setArrayData([]);
      setArrayInput('');
      setHighlightedQueryNodes([]);
      setHighlightedUpdateNodes([]);
      setQueryResult(null);
      setAnimationStep(null);
  };

  // --- Handlers ---
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
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    Segment Tree 
                </h1>
                <p className="text-xs text-slate-500 font-medium">Range Operations</p>
            </div>
            
            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg ml-4">
                {(['SUM', 'MIN', 'MAX'] as const).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setTreeMode(mode)}
                        className={`
                            px-3 py-1 text-xs font-bold rounded-md transition-all
                            ${treeMode === mode 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }
                        `}
                    >
                        {mode}
                    </button>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200 w-full max-w-lg">
            <input 
                type="text" 
                placeholder="Array (e.g. 1, 3, 5, 7)" 
                value={arrayInput} 
                onChange={(e) => setArrayInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleBuild()}
                disabled={isAnimating}
                className="flex-1 px-3 py-2 rounded-md border border-slate-300 w-full outline-none text-black text-sm disabled:text-slate-400"
            />
            <button onClick={handleBuild} disabled={isAnimating} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm transition whitespace-nowrap disabled:bg-slate-400">Build</button>
            <button onClick={handleClear} disabled={isAnimating} className="p-2 text-slate-400 hover:bg-slate-200 rounded-md"><RefreshCw size={18}/></button>
          </div>
        </div>
      </header>

      {/* --- CANVAS --- */}
      <main 
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        {!tree && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                <Network size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty Segment Tree</p>
                <p className="text-sm">Select mode ({treeMode}) and enter array.</p>
             </div>
        )}

        <div className="absolute top-0 left-0 w-full h-full origin-center will-change-transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
            <div className="absolute top-20 left-0"> 
                <div className="relative">
                    {/* SVG Lines */}
                    <svg className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] pointer-events-none z-0 overflow-visible">
                        <AnimatePresence>
                            {visualEdges.map(edge => (
                                <motion.line
                                    key={edge.id}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ x1: 5000 + edge.x1, y1: 5000 + edge.y1, x2: 5000 + edge.x2, y2: 5000 + edge.y2, pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    stroke="#cbd5e1" strokeWidth="2"
                                />
                            ))}
                        </AnimatePresence>
                    </svg>

                    {/* Nodes */}
                    <AnimatePresence>
                        {visualNodes.map(node => {
                            let bg = 'bg-white border-slate-700 text-slate-800';
                            let zIndex = 10;
                            let scale = 1;
                            const isValueUnknown = node.value === null;

                            // Operation Colors
                            if (node.isQueryMatch) {
                                bg = 'bg-green-100 border-green-500 text-green-800 shadow-md';
                                scale = 1.1;
                                zIndex = 20;
                            }
                            if (node.isUpdatePath) {
                                bg = 'bg-amber-100 border-amber-500 text-amber-800 shadow-md';
                                scale = 1.1;
                                zIndex = 20;
                            }

                            // Animation Colors
                            if (node.isVisiting) { bg = 'bg-yellow-100 border-yellow-500 text-yellow-900 shadow-lg'; scale = 1.2; zIndex = 30; }
                            if (node.isMerging) { bg = 'bg-purple-100 border-purple-500 text-purple-900 shadow-lg'; scale = 1.2; zIndex = 30; }
                            if (node.isDone) { bg = 'bg-white border-slate-700 text-slate-800'; }

                            // If unknown value, grey it out slightly
                            if (isValueUnknown) {
                                bg = 'bg-slate-100 border-slate-400 text-slate-400';
                            }

                            return (
                                <motion.div
                                    key={node.id}
                                    layout
                                    initial={{ scale: 0, opacity: 0, y: node.y - 20 }}
                                    animate={{ x: node.x, y: node.y, scale, opacity: 1, zIndex }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center font-bold text-xs cursor-default shadow-sm ${bg}`}
                                >
                                    {isValueUnknown ? '?' : node.value}
                                    
                                    <div className="absolute -top-6 text-[10px] text-slate-400 font-mono whitespace-nowrap bg-white/80 px-1 rounded">
                                        {node.rangeLabel}
                                    </div>
                                    
                                    {node.isLeaf && (
                                        <div className="absolute -bottom-6 text-[10px] font-bold text-slate-500">
                                            idx {node.rangeLabel.replace('[','').replace(']','').split('-')[0]}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
      </main>

      {/* --- Operations Menu (Bottom Left) --- */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-4">
          <AnimatePresence>
            {menuOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20, originY: 1 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-4 flex flex-col gap-4"
                >
                    {/* Toggle Mode */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setQueryMode('QUERY')} 
                            className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${queryMode === 'QUERY' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                        >Range Query</button>
                        <button 
                            onClick={() => setQueryMode('UPDATE')} 
                            className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${queryMode === 'UPDATE' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}
                        >Point Update</button>
                    </div>

                    {queryMode === 'QUERY' ? (
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-slate-500"><Search size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Range [L, R]</span></div>
                            <div className="flex gap-2 items-center">
                                <input type="number" placeholder="L" value={queryRange.l} onChange={e => setQueryRange({...queryRange, l: e.target.value})} className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none w-16" disabled={isAnimating} />
                                <span className="text-slate-400">-</span>
                                <input type="number" placeholder="R" value={queryRange.r} onChange={e => setQueryRange({...queryRange, r: e.target.value})} className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none w-16" disabled={isAnimating} />
                                <button onClick={handleQuery} disabled={!tree || isAnimating} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-bold shadow-sm hover:bg-indigo-700 disabled:bg-slate-300">
                                    {treeMode}
                                </button>
                            </div>
                            {queryResult !== null && (
                                <div className="mt-2 text-center p-2 bg-green-50 text-green-700 rounded border border-green-200 font-bold">
                                    Result: {queryResult}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-slate-500"><Edit3 size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Update Index</span></div>
                            <div className="flex gap-2 items-center">
                                <input type="number" placeholder="Idx" value={updateVal.idx} onChange={e => setUpdateVal({...updateVal, idx: e.target.value})} className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none w-16" disabled={isAnimating} />
                                <span className="text-slate-400">=</span>
                                <input type="number" placeholder="Val" value={updateVal.val} onChange={e => setUpdateVal({...updateVal, val: e.target.value})} className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none w-16" disabled={isAnimating} />
                                <button onClick={handleUpdate} disabled={!tree || isAnimating} className="px-4 py-2 bg-amber-600 text-white rounded-md text-xs font-bold shadow-sm hover:bg-amber-700 disabled:bg-slate-300">Set</button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setMenuOpen(!menuOpen)} className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 border ${menuOpen ? 'bg-white text-slate-600 border-slate-200 rotate-90' : 'bg-indigo-600 text-white border-indigo-700 hover:scale-110 hover:bg-indigo-700'}`}>{menuOpen ? <X size={24} /> : <Activity size={24} />}</button>
      </div>

      {/* --- Zoom Controls --- */}
      <div className="fixed bottom-6 right-6 flex flex-row items-center gap-1 bg-white p-1.5 rounded-lg shadow-lg border border-slate-200 z-50">
         <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={20} /></button>
         <button onClick={() => setTransform({x:400, y:50, scale:0.8})} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Maximize size={20} /></button>
         <button onClick={() => setTransform(p => ({...p, scale: Math.min(3, p.scale + 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={20} /></button>
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