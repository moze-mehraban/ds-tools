'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, ArrowLeft, Activity, Search,
  ZoomIn, ZoomOut, Maximize, Play, X, Plus, Network,
  ArrowRight,
  Trash2
} from 'lucide-react';

// --- Types ---

interface BSTNode {
  id: string;
  val: number;
  left: BSTNode | null;
  right: BSTNode | null;
  depth: number; 
}

// Visual Types
interface VisualNode {
  id: string;
  value: number;
  x: number;
  y: number;
  // State Flags
  isFound: boolean;    
  isVisiting: boolean; // Yellow (Traversal/Comparison)
  isNew: boolean;      // Blue (Just Inserted)
}

interface VisualEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Animation Step
interface AnimStep {
    visibleIds: string[];         // Nodes currently on screen
    activeIds: string[];          // Nodes being compared/visited
    foundIds: string[];           // Search Result
    newIds: string[];             // Nodes just created
    message: string;
}

// --- BST LOGIC ---

const generateId = () => 'node-' + Math.random().toString(36).substr(2, 9);

// Pure function to insert a node into the structure
const insertNode = (root: BSTNode | null, val: number, depth: number = 0): BSTNode => {
    if (!root) {
        return { id: generateId(), val, left: null, right: null, depth };
    }
    if (val < root.val) {
        // Return new object to keep React state pure (mostly)
        return { ...root, left: insertNode(root.left, val, depth + 1) };
    } else if (val > root.val) {
        return { ...root, right: insertNode(root.right, val, depth + 1) };
    }
    return root; // Duplicate, return as is
};

// Helper to get all IDs from a tree
const getAllIds = (node: BSTNode | null): string[] => {
    if(!node) return [];
    return [node.id, ...getAllIds(node.left), ...getAllIds(node.right)];
}

// --- ANIMATION GENERATOR ---

const generateBuildSteps = (
    finalTree: BSTNode, 
    numsToInsert: number[], 
    initialVisibleIds: string[] // <--- CRITICAL FIX: Pass what we already have
): AnimStep[] => {
    const steps: AnimStep[] = [];
    
    // We maintain a "running state" of what is visible throughout the animation
    const currentVisibleSet = new Set<string>(initialVisibleIds);

    numsToInsert.forEach(val => {
        let curr: BSTNode | null = finalTree;
        let pathFinished = false;

        // Traverse the FINAL tree to find where this node lives
        while (curr && !pathFinished) {
            
            // 1. VISITING STEP: Highlight current node
            // Note: We only highlight if it's ALREADY visible (don't highlight empty space yet)
            if (currentVisibleSet.has(curr.id)) {
                steps.push({
                    visibleIds: Array.from(currentVisibleSet),
                    activeIds: [curr.id],
                    foundIds: [],
                    newIds: [],
                    message: `Comparing ${val} vs ${curr.val}`
                });
            }

            // 2. LOGIC: Compare or Insert
            if (val === curr.val) {
                // We found the target node in the final tree.
                // If it is NOT in visible set, it means this is the moment we "Create" it.
                if (!currentVisibleSet.has(curr.id)) {
                    currentVisibleSet.add(curr.id); // Reveal it!
                    
                    steps.push({
                        visibleIds: Array.from(currentVisibleSet),
                        activeIds: [],
                        foundIds: [],
                        newIds: [curr.id], // Mark as New (Blue)
                        message: `Inserted ${val} here`
                    });
                } else {
                    // Duplicate case
                    steps.push({
                        visibleIds: Array.from(currentVisibleSet),
                        activeIds: [curr.id],
                        foundIds: [],
                        newIds: [],
                        message: `${val} already exists`
                    });
                }
                pathFinished = true;
            } else if (val < curr.val) {
                // Visualization: "Going Left"
                // Only add a step if we are visibly moving
                if (currentVisibleSet.has(curr.id)) {
                     steps.push({
                        visibleIds: Array.from(currentVisibleSet),
                        activeIds: [curr.id],
                        foundIds: [],
                        newIds: [],
                        message: `${val} < ${curr.val}, Looking Left...`
                    });
                }
                curr = curr.left;
            } else {
                // Visualization: "Going Right"
                if (currentVisibleSet.has(curr.id)) {
                     steps.push({
                        visibleIds: Array.from(currentVisibleSet),
                        activeIds: [curr.id],
                        foundIds: [],
                        newIds: [],
                        message: `${val} > ${curr.val}, Looking Right...`
                    });
                }
                curr = curr.right;
            }
        }
    });

    // Cleanup Step
    steps.push({
        visibleIds: Array.from(currentVisibleSet),
        activeIds: [],
        foundIds: [],
        newIds: [],
        message: 'Ready'
    });

    return steps;
};

// Search is simpler: Tree is fully visible, we just trace path
const generateSearchSteps = (root: BSTNode, val: number, allIds: string[]): AnimStep[] => {
    const steps: AnimStep[] = [];
    
    const traverse = (node: BSTNode | null) => {
        if (!node) {
            steps.push({
                visibleIds: allIds,
                activeIds: [],
                foundIds: [],
                newIds: [],
                message: `${val} not found.`
            });
            return;
        }

        // Highlight current
        steps.push({
            visibleIds: allIds,
            activeIds: [node.id],
            foundIds: [],
            newIds: [],
            message: `Checking ${node.val}...`
        });

        if (val === node.val) {
             steps.push({
                visibleIds: allIds,
                activeIds: [],
                foundIds: [node.id], // Green
                newIds: [],
                message: `Found ${val}!`
            });
            return;
        }

        if (val < node.val) traverse(node.left);
        else traverse(node.right);
    };

    traverse(root);
    return steps;
};


// --- LAYOUT ENGINE ---

const calculateLayout = (
    root: BSTNode | null, 
    animStep: AnimStep | null,
    fullTreeIds: string[] // Helper to fallback if not animating
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    if (!root) return { nodes: [], edges: [] };

    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];
    
    // In-Order Traversal to determine X coordinates (ensures no overlap)
    let rankCounter = 0;
    const nodeRanks = new Map<string, number>();
    
    const inOrder = (node: BSTNode) => {
        if (node.left) inOrder(node.left);
        nodeRanks.set(node.id, rankCounter++);
        if (node.right) inOrder(node.right);
    };
    inOrder(root);

    // Centering logic
    const totalNodes = rankCounter;
    const centerOffset = (totalNodes - 1) / 2;
    const X_SPACING = 50; 
    const Y_SPACING = 70;

    const traverse = (node: BSTNode) => {
        // VISIBILITY CHECK:
        // If animating, use step.visibleIds. If not, show everything.
        const isVisible = animStep 
            ? animStep.visibleIds.includes(node.id) 
            : true;

        if (!isVisible) return; // Stop drawing this branch if node is hidden

        const rank = nodeRanks.get(node.id) || 0;
        const x = (rank - centerOffset) * X_SPACING;
        const y = 50 + node.depth * Y_SPACING;

        // Draw Edges to visible children
        if (node.left) {
             const leftVisible = !animStep || animStep.visibleIds.includes(node.left.id);
             if (leftVisible) {
                const leftRank = nodeRanks.get(node.left.id) || 0;
                const leftX = (leftRank - centerOffset) * X_SPACING;
                edges.push({ id: `${node.id}-L`, x1: x, y1: y, x2: leftX, y2: y + Y_SPACING });
                traverse(node.left);
             }
        }
        if (node.right) {
             const rightVisible = !animStep || animStep.visibleIds.includes(node.right.id);
             if (rightVisible) {
                const rightRank = nodeRanks.get(node.right.id) || 0;
                const rightX = (rightRank - centerOffset) * X_SPACING;
                edges.push({ id: `${node.id}-R`, x1: x, y1: y, x2: rightX, y2: y + Y_SPACING });
                traverse(node.right);
             }
        }

        // Coloring
        const isVisiting = animStep?.activeIds.includes(node.id) || false;
        const isFound = animStep?.foundIds.includes(node.id) || false;
        const isNew = animStep?.newIds.includes(node.id) || false;

        nodes.push({
            id: node.id,
            value: node.val,
            x,
            y,
            isVisiting,
            isFound,
            isNew
        });
    };

    traverse(root);
    return { nodes, edges };
};


export default function BSTSimulator() {
  const router = useRouter();
  
  // State
  const [tree, setTree] = useState<BSTNode | null>(null);
  const [inputVal, setInputVal] = useState(''); 
  const [searchVal, setSearchVal] = useState('');
  
  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [animStep, setAnimStep] = useState<AnimStep | null>(null);
  
  // Viewport
  const [transform, setTransform] = useState({ x: 0, y: 50, scale: 1 }); 
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Status
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');

  // Layout Memoization
  const { nodes: visualNodes, edges: visualEdges } = useMemo(() => {
    // Pass null as AnimStep if not animating to show full tree
    return calculateLayout(tree, isAnimating ? animStep : null, []);
  }, [tree, animStep, isAnimating]);


  // --- Actions ---

  const showToast = (type: 'neutral' | 'success' | 'error', msg: string) => {
      setStatusType(type);
      setStatusMessage(msg);
  };

  const handleInsert = () => {
      const nums = inputVal.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      if (nums.length === 0) return showToast('error', 'Enter numbers');
      if (nums.length > 20) return showToast('error', 'Limit 20 nodes');

      // 1. Snapshot current visible nodes (so they don't disappear!)
      const initialVisibleIds = tree ? getAllIds(tree) : [];

      // 2. Build new tree structure
      let newTree = tree;
      nums.forEach(n => { newTree = insertNode(newTree, n); });

      // 3. Generate steps using the NEW structure, but knowing what WAS visible
      // We assume `newTree` is not null because we inserted at least one number
      if (!newTree) return;

      const steps = generateBuildSteps(newTree, nums, initialVisibleIds);
      
      // 4. Start Animation
      setTree(newTree); // Update structure immediately (Layout will hide new nodes based on `animStep`)
      
      setIsAnimating(true);
      setAnimStep(steps[0]); // Show first frame immediately
      setStatusMessage(steps[0].message);

      let i = 0;
      const interval = setInterval(() => {
          i++;
          if (i >= steps.length) {
              clearInterval(interval);
              setIsAnimating(false);
              setAnimStep(null); // Return to default view
              showToast('success', 'Done');
              return;
          }
          setAnimStep(steps[i]);
          setStatusMessage(steps[i].message);
      }, 700); // 700ms per step for readability
      
      setInputVal('');
  };

  const handleSearch = () => {
      const val = parseInt(searchVal);
      if (!tree || isNaN(val)) return;

      const allIds = getAllIds(tree);
      const steps = generateSearchSteps(tree, val, allIds);
      
      setIsAnimating(true);
      setAnimStep(steps[0]);
      setStatusMessage(steps[0].message);
      
      let i = 0;
      const interval = setInterval(() => {
          i++;
          if (i >= steps.length) {
              clearInterval(interval);
              setIsAnimating(false);
              setAnimStep(null);
              const found = steps[steps.length-1].foundIds.length > 0;
              showToast(found ? 'success' : 'error', found ? `Found ${val}` : `Not Found`);
              return;
          }
          setAnimStep(steps[i]);
          setStatusMessage(steps[i].message);
      }, 500);
  };

  const handleClear = () => {
      setTree(null);
      setAnimStep(null);
      setTransform({ x: 0, y: 50, scale: 1 });
      setStatusMessage('');
  };

  // --- Handlers (Pan/Zoom) ---
  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const scaleAdjustment = -e.deltaY * 0.001;
      setTransform(prev => ({ ...prev, scale: Math.min(3, Math.max(0.2, prev.scale + scaleAdjustment)) }));
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
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    Binary Search Tree
                </h1>
                <p className="text-xs text-slate-500 font-medium">Standard BST Operations</p>
            </div>
          </div>

          <div className="flex gap-2 w-full max-w-2xl">
            {/* Insert Control */}
            <div className="flex-1 flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-black">
                <input 
                    type="text" 
                    placeholder="e.g. 50, 30, 70" 
                    value={inputVal} 
                    onChange={(e) => setInputVal(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleInsert()}
                    disabled={isAnimating}
                    className="flex-1 px-3 py-1.5 rounded-md border-0 bg-white text-sm outline-none w-24 focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={handleInsert} disabled={isAnimating} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50">
                    <Plus size={16} /> Insert
                </button>
            </div>

            {/* Search Control */}
            <div className="flex-1 flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-black">
                <input 
                    type="number" 
                    placeholder="Search Val" 
                    value={searchVal} 
                    onChange={(e) => setSearchVal(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    disabled={isAnimating}
                    className="flex-1 px-3 py-1.5 rounded-md border-0 bg-white text-sm outline-none w-24 focus:ring-1 focus:ring-indigo-500"
                />
                <button onClick={handleSearch} disabled={isAnimating || !tree} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50">
                    <Search size={16} /> Find
                </button>
            </div>
            
            <button onClick={handleClear} disabled={isAnimating} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg border border-transparent hover:border-red-200 transition"><Trash2 size={18}/></button>
          </div>
        </div>
      </header>

      {/* --- CANVAS --- */}
      <main 
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        {!tree && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none opacity-50">
                <Network size={64} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Tree is Empty</p>
                <p className="text-sm">Insert numbers to visualize.</p>
             </div>
        )}

        <div className="absolute top-0 left-1/2 w-0 h-0 will-change-transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
            
            {/* Edges */}
            <svg className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                <AnimatePresence>
                    {visualEdges.map(edge => (
                        <motion.line
                            key={edge.id}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ x1: 5000 + edge.x1, y1: 5000 + edge.y1, x2: 5000 + edge.x2, y2: 5000 + edge.y2, pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round"
                        />
                    ))}
                </AnimatePresence>
            </svg>

            {/* Nodes */}
            <AnimatePresence>
                {visualNodes.map(node => {
                    let bg = 'bg-white border-slate-600 text-slate-700';
                    let scale = 1;
                    let zIndex = 10;

                    if (node.isVisiting) {
                        // Yellow highlight during comparison
                        bg = 'bg-yellow-100 border-yellow-500 text-yellow-900 shadow-[0_0_15px_rgba(234,179,8,0.6)]';
                        scale = 1.2;
                        zIndex = 50;
                    }
                    if (node.isNew) {
                        // Blue pop for new insertion
                        bg = 'bg-blue-500 border-blue-600 text-white shadow-xl';
                        scale = 1.25;
                        zIndex = 60;
                    }
                    if (node.isFound) {
                        // Green for search result
                        bg = 'bg-green-500 border-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)]';
                        scale = 1.25;
                        zIndex = 60;
                    }

                    return (
                        <motion.div
                            key={node.id}
                            layout
                            initial={{ scale: 0, opacity: 0, y: node.y - 30 }}
                            animate={{ x: node.x, y: node.y, scale, opacity: 1, zIndex }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center font-bold text-sm shadow-sm select-none transition-colors duration-300 ${bg}`}
                        >
                            {node.value}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
      </main>

      {/* --- Zoom Controls --- */}
      <div className="fixed bottom-6 right-6 flex flex-row items-center gap-1 bg-white p-1.5 rounded-lg shadow-lg border border-slate-200 z-50">
         <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut size={20} /></button>
         <button onClick={() => setTransform({x: 0, y: 50, scale: 1})} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Maximize size={20} /></button>
         <button onClick={() => setTransform(p => ({...p, scale: Math.min(3, p.scale + 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn size={20} /></button>
      </div>

      {/* --- Status Toast --- */}
      {statusMessage && (
         <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 border transition-all duration-300 backdrop-blur-md 
            ${statusType === 'error' ? 'bg-red-900/90 border-red-800 text-white' : ''} 
            ${statusType === 'success' ? 'bg-green-900/90 border-green-800 text-white' : ''} 
            ${statusType === 'neutral' ? 'bg-slate-800/90 border-slate-700 text-white' : ''}
         `}>
            {statusType === 'error' && <Activity size={18} className="text-red-400" />} 
            {statusType === 'success' && <Activity size={18} className="text-green-400" />} 
            {statusType === 'neutral' && <Play size={18} className="text-blue-400 fill-current animate-pulse" />}
            <span className="font-medium tracking-wide text-sm">{statusMessage}</span>
         </div>
      )}
    </div>
  );
}