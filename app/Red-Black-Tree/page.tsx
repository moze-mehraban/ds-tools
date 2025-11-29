'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Search, Activity, Play, Layers, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, GitCommit, ChevronDown, ChevronUp, X
} from 'lucide-react';

// --- Types ---
type Color = 'RED' | 'BLACK';

interface RBNode {
  id: string;
  value: number;
  color: Color;
  left: RBNode | null;
  right: RBNode | null;
  parent: RBNode | null; // Parent pointer makes RB logic much easier
}

interface VisualNode {
  id: string;
  value: number;
  x: number;
  y: number;
  color: Color;
  isSelected: boolean;
  isVisiting: boolean;
  isFound: boolean;
}

interface VisualEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// --- RED-BLACK TREE LOGIC ---

const generateId = () => 'n-' + Math.random().toString(36).substr(2, 9);

// Helper to create a new node
const createNode = (value: number, parent: RBNode | null = null, color: Color = 'RED'): RBNode => ({
  id: generateId(),
  value,
  color,
  left: null,
  right: null,
  parent
});

// Helper to deep clone the tree to avoid state mutation issues
const cloneTree = (node: RBNode | null, parent: RBNode | null = null): RBNode | null => {
  if (!node) return null;
  const newNode: RBNode = {
    ...node,
    parent: parent,
    left: null, // Will be set recursively
    right: null
  };
  newNode.left = cloneTree(node.left, newNode);
  newNode.right = cloneTree(node.right, newNode);
  return newNode;
};

// 1. Rotations
const rotateLeft = (root: RBNode, x: RBNode): RBNode => {
  const y = x.right!;
  x.right = y.left;
  if (y.left) y.left.parent = x;
  y.parent = x.parent;
  
  let newRoot = root;
  if (!x.parent) newRoot = y;
  else if (x === x.parent.left) x.parent.left = y;
  else x.parent.right = y;
  
  y.left = x;
  x.parent = y;
  return newRoot;
};

const rotateRight = (root: RBNode, y: RBNode): RBNode => {
  const x = y.left!;
  y.left = x.right;
  if (x.right) x.right.parent = y;
  x.parent = y.parent;
  
  let newRoot = root;
  if (!y.parent) newRoot = x;
  else if (y === y.parent.right) y.parent.right = x;
  else y.parent.left = x;
  
  x.right = y;
  y.parent = x;
  return newRoot;
};

// 2. Fixup after Insertion
const insertFixup = (root: RBNode, k: RBNode): RBNode => {
  let z = k;
  while (z.parent && z.parent.color === 'RED') {
    if (z.parent === z.parent.parent?.left) {
      const y = z.parent.parent.right; // Uncle
      // Case 1: Uncle is RED
      if (y && y.color === 'RED') {
        z.parent.color = 'BLACK';
        y.color = 'BLACK';
        z.parent.parent.color = 'RED';
        z = z.parent.parent;
      } else {
        // Case 2: Uncle is BLACK and z is right child (Triangle)
        if (z === z.parent.right) {
          z = z.parent;
          root = rotateLeft(root, z);
        }
        // Case 3: Uncle is BLACK and z is left child (Line)
        if (z.parent) { 
            z.parent.color = 'BLACK';
            if (z.parent.parent) {
                z.parent.parent.color = 'RED';
                root = rotateRight(root, z.parent.parent);
            }
        }
      }
    } else {
      // Mirror image of above
      const y = z.parent.parent?.left;
      if (y && y.color === 'RED') {
        z.parent.color = 'BLACK';
        y.color = 'BLACK';
        if (z.parent.parent) z.parent.parent.color = 'RED';
        z = z.parent.parent!;
      } else {
        if (z === z.parent.left) {
          z = z.parent;
          root = rotateRight(root, z);
        }
        if (z.parent) {
            z.parent.color = 'BLACK';
            if (z.parent.parent) {
                z.parent.parent.color = 'RED';
                root = rotateLeft(root, z.parent.parent);
            }
        }
      }
    }
  }
  root.color = 'BLACK';
  return root;
};

// 3. Main Insert
const insertRB = (root: RBNode | null, value: number): RBNode => {
  if (!root) return createNode(value, null, 'BLACK');

  // Standard BST Insert
  let y: RBNode | null = null;
  let x: RBNode | null = root;
  
  while (x !== null) {
    y = x;
    if (value < x.value) x = x.left;
    else if (value > x.value) x = x.right;
    else return root; // Duplicate
  }

  const z = createNode(value, y, 'RED');
  if (!y) return z; 
  if (value < y.value) y.left = z;
  else y.right = z;

  // Fix violations
  return insertFixup(root, z);
};

// --- RED BLACK DELETION AND REBUILD ---
const deleteNodeAndRebalance = (root: RBNode | null, value: number): RBNode | null => {
    // 1. Collect all values except deleted one
    const values: number[] = [];
    const collect = (n: RBNode | null) => {
        if(!n) return;
        collect(n.left);
        if(n.value !== value) values.push(n.value);
        collect(n.right);
    };
    collect(root);

    // 2. Rebuild tree
    let newRoot: RBNode | null = null;
    for(const v of values) {
        newRoot = insertRB(newRoot, v);
    }
    return newRoot;
};

// --- TRAVERSALS (Standard) ---
const getBFSPath = (root: RBNode | null) => {
    if (!root) return [];
    const queue = [root];
    const path: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      path.push(current.id);
      if (current.left) queue.push(current.left);
      if (current.right) queue.push(current.right);
    }
    return path;
};
const getPreOrderPath = (root: RBNode | null) => {
    const path: string[] = [];
    const traverse = (node: RBNode | null) => {
      if (!node) return;
      path.push(node.id);
      traverse(node.left);
      traverse(node.right);
    };
    traverse(root);
    return path;
};
const getInOrderPath = (root: RBNode | null) => {
    const path: string[] = [];
    const traverse = (node: RBNode | null) => {
      if (!node) return;
      traverse(node.left);
      path.push(node.id);
      traverse(node.right);
    };
    traverse(root);
    return path;
};
const getPostOrderPath = (root: RBNode | null) => {
    const path: string[] = [];
    const traverse = (node: RBNode | null) => {
      if (!node) return;
      traverse(node.left);
      traverse(node.right);
      path.push(node.id);
    };
    traverse(root);
    return path;
};

// --- Helpers ---
const findNodeByValue = (root: RBNode | null, val: number): RBNode | null => {
  if (!root) return null;
  if (root.value === val) return root;
  return val < root.value ? findNodeByValue(root.left, val) : findNodeByValue(root.right, val);
};

const findNodeById = (root: RBNode | null, id: string): RBNode | null => {
    if (!root) return null;
    if (root.id === id) return root;
    return findNodeById(root.left, id) || findNodeById(root.right, id);
}

// Calculate Black Height (Number of black nodes on path to leaf)
const getBlackHeight = (node: RBNode | null): number => {
    if (!node) return 1; // Null is black
    let bh = getBlackHeight(node.left);
    if (node.color === 'BLACK') bh++;
    return bh;
};

// Get visual depth for stats
const getDepth = (root: RBNode | null, id: string, d = 0): number => {
    if (!root) return -1;
    if (root.id === id) return d;
    const left = getDepth(root.left, id, d + 1);
    if (left !== -1) return left;
    return getDepth(root.right, id, d + 1);
};


// --- SMART LAYOUT ENGINE ---
const calculateLayout = (
    root: RBNode | null, 
    selectedId: string | null,
    visitingId: string | null,
    foundId: string | null
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    if (!root) return { nodes: [], edges: [] };

    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];
    const positions = new Map<string, { x: number, y: number }>();

    let counter = 0;
    const X_SPACING = 80; 
    const Y_SPACING = 100;

    const assignCoordinates = (node: RBNode, depth: number) => {
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

    const buildVisuals = (node: RBNode) => {
        const pos = positions.get(node.id)!;
        const finalX = pos.x + offsetCorrection;
        
        nodes.push({
            id: node.id,
            value: node.value,
            x: finalX,
            y: pos.y,
            color: node.color,
            isSelected: node.id === selectedId,
            isVisiting: node.id === visitingId,
            isFound: node.id === foundId
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


export default function RedBlackTreeSimulator() {
  const router = useRouter();
  const [tree, setTree] = useState<RBNode | null>(null);
  
  // UI State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [statsOpen, setStatsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Viewport State
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

  const speedConfig = {
    normal:   { duration: 0.5, interval: 600 },
    slow:     { duration: 1.2, interval: 1200 },
    verySlow: { duration: 2.5, interval: 2500 }
  };

  // --- Calculate Layout ---
  const { nodes: visualNodes, edges: visualEdges } = useMemo(() => {
    return calculateLayout(tree, selectedId, visitingId, foundId);
  }, [tree, selectedId, visitingId, foundId]);

  // --- Stats ---
  const selectedNode = tree && selectedId ? findNodeById(tree, selectedId) : null;
  const nodeDepth = selectedNode ? getDepth(tree, selectedId!) : '-';
  const blackHeight = selectedNode ? getBlackHeight(selectedNode) : '-';

  // --- Actions ---
  const showToast = (type: 'neutral' | 'success' | 'error', msg: string) => {
      setStatusType(type);
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleInsert = () => {
    if (!newValue) return;
    const val = parseInt(newValue);
    if (isNaN(val)) return;

    if (findNodeByValue(tree, val)) {
        showToast('error', `Value ${val} exists`);
        return;
    }

    // CRITICAL FIX: Deep clone the tree before modifying it
    const currentTreeClone = cloneTree(tree);
    const newTree = insertRB(currentTreeClone, val);
    
    setTree(newTree); 
    setNewValue('');
    showToast('success', `Inserted ${val}`);
  };

  const handleDelete = () => {
    if (!tree || !selectedId) return;
    const nodeToDelete = visualNodes.find(n => n.id === selectedId);
    if (!nodeToDelete) return;

    // Use Rebuild Strategy for visual simplicity
    const newTree = deleteNodeAndRebalance(tree, nodeToDelete.value);
    setTree(newTree ? { ...newTree } : null);
    setSelectedId(null);
    showToast('neutral', `Deleted ${nodeToDelete.value}`);
  };

  const runAnimation = (type: 'BFS' | 'DFS' | 'PRE' | 'IN' | 'POST') => {
    if (!tree) return;
    const isSearch = (type === 'BFS' || type === 'DFS') && searchValue !== '';
    
    let path: string[] = [];
    if (type === 'BFS') path = getBFSPath(tree);
    else if (type === 'DFS' || type === 'PRE') path = getPreOrderPath(tree); 
    else if (type === 'IN') path = getInOrderPath(tree);
    else if (type === 'POST') path = getPostOrderPath(tree);

    let foundNodeId: string | null = null;
    if (isSearch) {
        const val = parseInt(searchValue);
        const targetNode = findNodeByValue(tree, val);
        if (targetNode) {
            const index = path.indexOf(targetNode.id);
            if (index !== -1) {
                path = path.slice(0, index + 1);
                foundNodeId = targetNode.id;
            }
        }
    }

    setSelectedId(null);
    setFoundId(null);
    setVisitingId(null);
    setIsAnimating(true);
    setStatusType('neutral');
    setStatusMessage(isSearch ? `Searching for ${searchValue}...` : `Running ${type}-Order...`);

    let step = 0;
    const interval = setInterval(() => {
      if (step >= path.length) {
        clearInterval(interval);
        setIsAnimating(false);
        setVisitingId(null);
        if (isSearch) {
            if (foundNodeId) {
                setFoundId(foundNodeId);
                showToast('success', `Found ${searchValue}`);
            } else {
                showToast('error', `${searchValue} not found`);
            }
        } else {
            setStatusMessage('');
        }
        return;
      }
      setVisitingId(path[step]);
      step++;
    }, speedConfig[animSpeed].interval);
  };
  
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const val = e.target.value;
    if (val === '' || /^[0-9]+$/.test(val)) setter(val);
  };

  // --- Pan & Zoom ---
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

  useEffect(() => {
     if (!tree) { setTransform({ x: 0, y: 0, scale: 1 }); }
  }, [tree]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
      
      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 relative">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Red-Black Tree <span className="text-xs bg-rose-100 text-rose-700 px-2 rounded-full border border-rose-200">Balanced</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
            {/* Speed Toggle */}
            <div className="flex items-center mr-4 border-r border-slate-300 pr-4 gap-1">
               <Gauge size={16} className="text-slate-400 mr-2" />
               {(['normal', 'slow', 'verySlow'] as const).map(speed => (
                   <button key={speed} onClick={() => setAnimSpeed(speed)} className={`px-2 py-1 text-xs font-bold rounded ${animSpeed === speed ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{speed === 'normal' ? '1x' : speed === 'slow' ? '0.5x' : '0.2x'}</button>
               ))}
            </div>

            <input type="text" placeholder="Num" value={newValue} onChange={(e) => handleNumberInput(e, setNewValue)} onKeyDown={e => e.key === 'Enter' && handleInsert()} disabled={isAnimating} className="px-3 py-2 rounded-md border border-slate-300 w-20 outline-none text-black" maxLength={3}/>
            <button onClick={handleInsert} disabled={!newValue || isAnimating} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-bold shadow-sm transition"><Plus size={16}/></button>
            <div className="w-px h-8 bg-slate-300 mx-1"></div>
            <button onClick={handleDelete} disabled={!selectedId || isAnimating} className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-md text-sm font-bold shadow-sm transition"><Trash2 size={16}/></button>
            <button onClick={() => { setTree(null); setSelectedId(null); setTransform({x:0, y:0, scale:1}) }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-md"><RefreshCw size={18}/></button>
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
                <GitCommit size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty Red-Black Tree</p>
                <p className="text-sm">Insert nodes to see balancing.</p>
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
                            // Red-Black Styling Logic
                            let bg = node.color === 'RED' ? 'bg-rose-500 border-rose-700 text-white' : 'bg-slate-800 border-slate-950 text-white';
                            let zIndex = 10;
                            let scale = 1;
                            
                            if(node.isFound) { bg = 'bg-green-500 border-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'; zIndex = 20; scale = 1.1; }
                            else if(node.isVisiting) { bg = 'bg-yellow-400 border-yellow-600 text-black shadow-lg'; zIndex = 20; scale = 1.1; }
                            else if(node.isSelected) { 
                                // Keep color but add glow ring
                                bg += ' ring-4 ring-blue-400 ring-opacity-50'; 
                                zIndex = 50; scale = 1.2; 
                            }

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

      {/* --- Left Menu --- */}
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
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500"><Search size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Search</span></div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Val" value={searchValue} onChange={(e) => handleNumberInput(e, setSearchValue)} disabled={isAnimating} className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none focus:ring-2 focus:ring-indigo-500 w-full" maxLength={3}/>
                            <button onClick={() => runAnimation('BFS')} disabled={!tree || !searchValue || isAnimating} className="px-3 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 rounded-md text-xs font-bold shadow-sm">BFS</button>
                            <button onClick={() => runAnimation('DFS')} disabled={!tree || !searchValue || isAnimating} className="px-3 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-200 rounded-md text-xs font-bold shadow-sm">DFS</button>
                        </div>
                    </div>
                    <div className="h-px bg-slate-100 w-full"></div>
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500"><Layers size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Traversal</span></div>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => runAnimation('PRE')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">Pre</button>
                            <button onClick={() => runAnimation('IN')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">In</button>
                            <button onClick={() => runAnimation('POST')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">Post</button>
                        </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setMenuOpen(!menuOpen)} className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 border ${menuOpen ? 'bg-white text-slate-600 border-slate-200 rotate-90' : 'bg-indigo-600 text-white border-indigo-700 hover:scale-110 hover:bg-indigo-700'}`}>{menuOpen ? <X size={24} /> : <Search size={24} />}</button>
      </div>

      {/* --- Node Stats (Left of Zoom) --- */}
      {selectedId && selectedNode && !isAnimating && (
        <div className="fixed bottom-6 right-44 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div onClick={() => setStatsOpen(!statsOpen)} className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2"><Activity size={16} className="text-blue-500" /> <h3 className="font-bold text-slate-700 text-sm">Node Statistics</h3></div>
            {statsOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
          </div>
          {statsOpen && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center"><span className="text-slate-500 text-sm font-medium">Value</span><span className="font-mono font-bold text-xl text-slate-800 bg-slate-100 px-2 rounded">{selectedNode.value}</span></div>
              <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Color</div><div className={`font-bold ${selectedNode.color === 'RED' ? 'text-rose-600' : 'text-slate-800'}`}>{selectedNode.color}</div></div>
                  <div className="border-l border-slate-200"><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Black Height</div><div className="text-purple-600 font-bold">{blackHeight}</div></div>
              </div>
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