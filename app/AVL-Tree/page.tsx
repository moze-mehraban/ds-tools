'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Search, Activity, Play, Layers, GitMerge, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, Move,
  ChevronDown, ChevronUp, X
} from 'lucide-react';

// --- Types ---
type NodeId = string;

interface TreeNode {
  id: NodeId;
  value: number;
  height: number;
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
}

interface VisualEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// --- AVL LOGIC (Unchanged) ---
const generateId = () => 'n-' + Math.random().toString(36).substr(2, 9);
const getHeight = (node: TreeNode | null): number => node ? node.height : 0;
const getBalance = (node: TreeNode | null): number => node ? getHeight(node.left) - getHeight(node.right) : 0;
const updateHeight = (node: TreeNode) => {
  node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right));
};
const rotateRight = (y: TreeNode): TreeNode => {
  const x = y.left!;
  const T2 = x.right;
  x.right = y;
  y.left = T2;
  updateHeight(y);
  updateHeight(x);
  return x;
};
const rotateLeft = (x: TreeNode): TreeNode => {
  const y = x.right!;
  const T2 = y.left;
  y.left = x;
  x.right = T2;
  updateHeight(x);
  updateHeight(y);
  return y;
};
const insertAVL = (node: TreeNode | null, value: number): TreeNode => {
  if (!node) return { id: generateId(), value, height: 1, left: null, right: null };
  if (value < node.value) node.left = insertAVL(node.left, value);
  else if (value > node.value) node.right = insertAVL(node.right, value);
  else return node;
  updateHeight(node);
  const balance = getBalance(node);
  if (balance > 1 && value < node.left!.value) return rotateRight(node);
  if (balance < -1 && value > node.right!.value) return rotateLeft(node);
  if (balance > 1 && value > node.left!.value) {
    node.left = rotateLeft(node.left!);
    return rotateRight(node);
  }
  if (balance < -1 && value < node.right!.value) {
    node.right = rotateRight(node.right!);
    return rotateLeft(node);
  }
  return node;
};
const minValueNode = (node: TreeNode): TreeNode => {
  let current = node;
  while (current.left) current = current.left;
  return current;
};
const deleteAVL = (root: TreeNode | null, value: number): TreeNode | null => {
  if (!root) return null;
  if (value < root.value) root.left = deleteAVL(root.left, value);
  else if (value > root.value) root.right = deleteAVL(root.right, value);
  else {
    if (!root.left || !root.right) {
      const temp = root.left ? root.left : root.right;
      if (!temp) return null;
      else return temp;
    } else {
      const temp = minValueNode(root.right);
      root.value = temp.value;
      root.right = deleteAVL(root.right, temp.value);
    }
  }
  updateHeight(root);
  const balance = getBalance(root);
  if (balance > 1 && getBalance(root.left) >= 0) return rotateRight(root);
  if (balance > 1 && getBalance(root.left) < 0) {
    root.left = rotateLeft(root.left!);
    return rotateRight(root);
  }
  if (balance < -1 && getBalance(root.right) <= 0) return rotateLeft(root);
  if (balance < -1 && getBalance(root.right) > 0) {
    root.right = rotateRight(root.right!);
    return rotateLeft(root);
  }
  return root;
};

// --- Traversals ---
const getBFSPath = (root: TreeNode | null) => {
    if (!root) return [];
    const queue = [root];
    const path: NodeId[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      path.push(current.id);
      if (current.left) queue.push(current.left);
      if (current.right) queue.push(current.right);
    }
    return path;
};
const getPreOrderPath = (root: TreeNode | null) => {
    const path: NodeId[] = [];
    const traverse = (node: TreeNode | null) => {
      if (!node) return;
      path.push(node.id);
      traverse(node.left);
      traverse(node.right);
    };
    traverse(root);
    return path;
};
const getInOrderPath = (root: TreeNode | null) => {
    const path: NodeId[] = [];
    const traverse = (node: TreeNode | null) => {
      if (!node) return;
      traverse(node.left);
      path.push(node.id);
      traverse(node.right);
    };
    traverse(root);
    return path;
};
const getPostOrderPath = (root: TreeNode | null) => {
    const path: NodeId[] = [];
    const traverse = (node: TreeNode | null) => {
      if (!node) return;
      traverse(node.left);
      traverse(node.right);
      path.push(node.id);
    };
    traverse(root);
    return path;
};

// --- Helpers ---
const findNode = (root: TreeNode | null, id: NodeId): TreeNode | null => {
  if (!root) return null;
  if (root.id === id) return root;
  return findNode(root.left, id) || findNode(root.right, id);
};
const findNodeByValue = (root: TreeNode | null, val: number): TreeNode | null => {
  if (!root) return null;
  if (root.value === val) return root;
  return val < root.value ? findNodeByValue(root.left, val) : findNodeByValue(root.right, val);
};
const getDepth = (root: TreeNode | null, id: NodeId, d = 0): number => {
    if (!root) return -1;
    if (root.id === id) return d;
    const left = getDepth(root.left, id, d + 1);
    if (left !== -1) return left;
    return getDepth(root.right, id, d + 1);
};


// --- SMART LAYOUT ENGINE (In-Order Traversal) ---
// This guarantees NO OVERLAP by assigning X based on index in sequence.
const calculateLayout = (
    root: TreeNode | null, 
    selectedId: string | null,
    visitingId: string | null,
    foundId: string | null
): { nodes: VisualNode[], edges: VisualEdge[], width: number } => {
    if (!root) return { nodes: [], edges: [], width: 0 };

    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];
    const positions = new Map<string, { x: number, y: number }>();

    let counter = 0;
    const X_SPACING = 80; // Distance between columns
    const Y_SPACING = 100; // Distance between rows

    // Pass 1: Assign Coordinates via In-Order Traversal
    const assignCoordinates = (node: TreeNode, depth: number) => {
        if (node.left) assignCoordinates(node.left, depth + 1);

        const x = counter * X_SPACING;
        const y = depth * Y_SPACING + 50; // +50 padding top
        positions.set(node.id, { x, y });
        counter++;

        if (node.right) assignCoordinates(node.right, depth + 1);
    };

    assignCoordinates(root, 0);

    // Center the tree
    const totalWidth = counter * X_SPACING;
    const offsetCorrection = - (totalWidth / 2) + (X_SPACING / 2); // Center align

    // Pass 2: Build Visual Objects
    const buildVisuals = (node: TreeNode) => {
        const pos = positions.get(node.id)!;
        const finalX = pos.x + offsetCorrection;
        
        nodes.push({
            id: node.id,
            value: node.value,
            x: finalX,
            y: pos.y,
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

    return { nodes, edges, width: totalWidth };
};


export default function AVLTreeSimulator() {
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode | null>(null);
  
  // UI State
  const [selectedId, setSelectedId] = useState<NodeId | null>(null);
  const [newValue, setNewValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  // Viewport State (Pan & Zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [statsOpen, setStatsOpen] = useState(true);

  // Animation State
  const [visitingId, setVisitingId] = useState<NodeId | null>(null);
  const [foundId, setFoundId] = useState<NodeId | null>(null);
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
  const selectedNode = tree && selectedId ? findNode(tree, selectedId) : null;
  const nodeDepth = selectedNode ? getDepth(tree, selectedId!) : '-';
  const balanceFactor = selectedNode ? getBalance(selectedNode) : '-';

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

    const exists = (n: TreeNode | null, v: number): boolean => {
        if(!n) return false;
        if(n.value === v) return true;
        return v < n.value ? exists(n.left, v) : exists(n.right, v);
    }
    if (exists(tree, val)) {
        showToast('error', `Value ${val} exists`);
        return;
    }

    const newTree = insertAVL(tree, val);
    setTree({ ...newTree });
    setNewValue('');
    showToast('success', `Inserted ${val}`);
  };

  const handleDelete = () => {
    if (!tree || !selectedId) return;
    const nodeToDelete = visualNodes.find(n => n.id === selectedId);
    if (!nodeToDelete) return;

    const newTree = deleteAVL(tree, nodeToDelete.value);
    setTree(newTree ? { ...newTree } : null);
    setSelectedId(null);
    showToast('neutral', `Deleted ${nodeToDelete.value}`);
  };

  const runAnimation = (type: 'BFS' | 'DFS' | 'PRE' | 'IN' | 'POST') => {
    if (!tree) return;
    const isSearch = (type === 'BFS' || type === 'DFS') && searchValue !== '';
    
    let path: NodeId[] = [];
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

  // --- Pan & Zoom Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
      // Zoom on wheel
      e.stopPropagation(); // prevent page scroll if possible, though overflow hidden handles it
      const scaleAdjustment = -e.deltaY * 0.001;
      setTransform(prev => ({
          ...prev,
          scale: Math.min(3, Math.max(0.1, prev.scale + scaleAdjustment))
      }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      setIsDragging(true);
      dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      setTransform(prev => ({
          ...prev,
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
      }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Reset View
  useEffect(() => {
     if (!tree) {
         setTransform({ x: 0, y: 0, scale: 1 });
     }
  }, [tree]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden select-none">
      
      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 relative">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                AVL Tree Sim <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded-full border border-purple-200">Infinite Canvas</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
            {/* Speed Toggle */}
            <div className="flex items-center mr-4 border-r border-slate-300 pr-4 gap-1">
               <Gauge size={16} className="text-slate-400 mr-2" />
               {(['normal', 'slow', 'verySlow'] as const).map(speed => (
                   <button key={speed} onClick={() => setAnimSpeed(speed)} 
                    className={`px-2 py-1 text-xs font-bold rounded ${animSpeed === speed ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>
                    {speed === 'normal' ? '1x' : speed === 'slow' ? '0.5x' : '0.2x'}
                   </button>
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

      {/* --- CANVAS AREA (Pan & Zoom) --- */}
      <main 
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Helper Instructions Background */}
        {!tree && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                <GitMerge size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty Tree</p>
                <p className="text-sm">Insert nodes. Drag to Pan. Scroll to Zoom.</p>
             </div>
        )}

        {/* --- ZOOM & PAN TRANSFORM LAYER --- */}
        <div 
            className="absolute top-0 left-0 w-full h-full origin-center will-change-transform"
            style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
        >
            {/* Center Reference Point (Optional visual aid) */}
            <div className="absolute top-1/2 left-1/2 w-0 h-0">
                {/* Visual Tree Container - Centered at 0,0 relative to parent */}
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
                                    transition={{ duration: speedConfig[animSpeed].duration }}
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
                            
                            if(node.isFound) { bg = 'bg-green-500 border-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'; zIndex = 20; scale = 1.1; }
                            else if(node.isVisiting) { bg = 'bg-yellow-400 border-yellow-600 text-black shadow-lg'; zIndex = 20; scale = 1.1; }
                            else if(node.isSelected) { bg = 'bg-blue-600 border-blue-800 text-white shadow-xl'; zIndex = 50; scale = 1.2; }

                            return (
                                <motion.div
                                    key={node.id}
                                    initial={{ scale: 0, opacity: 0, x: node.x, y: node.y }}
                                    animate={{ x: node.x, y: node.y, scale, opacity: 1, zIndex }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: speedConfig[animSpeed].duration, type: "spring", bounce: 0.2 }}
                                    onMouseDown={(e) => e.stopPropagation() /* Prevent pan start on node click */}
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

      {/* --- Zoom Controls (Bottom Right Corner) --- */}
      <div className="fixed bottom-6 right-6 flex flex-row items-center gap-1 bg-white p-1.5 rounded-lg shadow-lg border border-slate-200 z-50">
         <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.1, p.scale - 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Zoom Out"><ZoomOut size={20} /></button>
         <button onClick={() => setTransform({x:0, y:0, scale:1})} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Reset View"><Maximize size={20} /></button>
         <button onClick={() => setTransform(p => ({...p, scale: Math.min(3, p.scale + 0.2)}))} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Zoom In"><ZoomIn size={20} /></button>
      </div>

      {/* --- Bottom Left: Algorithms Menu (Collapsible) --- */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-4">
          
          {/* The Menu Content (AnimatePresence handles the smooth popup) */}
          <AnimatePresence>
            {menuOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20, originY: 1 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-4 flex flex-col gap-4"
                >
                    {/* Search Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500"><Search size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Search</span></div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Val" value={searchValue} onChange={(e) => handleNumberInput(e, setSearchValue)} disabled={isAnimating} className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none focus:ring-2 focus:ring-indigo-500 w-full" maxLength={3}/>
                            <button onClick={() => runAnimation('BFS')} disabled={!tree || !searchValue || isAnimating} className="px-3 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 rounded-md text-xs font-bold shadow-sm">BFS</button>
                            <button onClick={() => runAnimation('DFS')} disabled={!tree || !searchValue || isAnimating} className="px-3 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-200 rounded-md text-xs font-bold shadow-sm">DFS</button>
                        </div>
                    </div>
                    
                    <div className="h-px bg-slate-100 w-full"></div>
                    
                    {/* Traversal Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500"><Layers size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Traversal</span></div>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => runAnimation('PRE')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">Pre-Order</button>
                            <button onClick={() => runAnimation('IN')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">In-Order</button>
                            <button onClick={() => runAnimation('POST')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">Post-Order</button>
                        </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          {/* The Circle Toggle Button */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className={`
                h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 border
                ${menuOpen 
                    ? 'bg-white text-slate-600 border-slate-200 rotate-90' 
                    : 'bg-indigo-600 text-white border-indigo-700 hover:scale-110 hover:bg-indigo-700'
                }
            `}
          >
            {menuOpen ? <X size={24} /> : <Search size={24} />}
          </button>
      </div>
      {/* --- Node Stats (Left of Zoom) --- */}
      {selectedId && selectedNode && !isAnimating && (
        <div className="fixed bottom-6 right-44 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header */}
          <div 
            onClick={() => setStatsOpen(!statsOpen)}
            className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <h3 className="font-bold text-slate-700 text-sm">Node Statistics</h3>
            </div>
            {statsOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
          </div>

          {/* Body */}
          {statsOpen && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm font-medium">Value</span>
                  <span className="font-mono font-bold text-xl text-slate-800 bg-slate-100 px-2 rounded">{selectedNode.value}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Height</div>
                    <div className="text-blue-600 font-bold">{selectedNode.height}</div>
                  </div>
                  <div className="border-l border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Depth</div>
                    <div className="text-purple-600 font-bold">{nodeDepth}</div>
                  </div>
                  <div className="border-l border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Balance</div>
                    <div className={`font-bold ${Math.abs(Number(balanceFactor)) > 1 ? 'text-red-500' : (Number(balanceFactor) === 0 ? 'text-green-500' : 'text-orange-500')}`}>
                      {balanceFactor}
                    </div>
                  </div>
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