'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Search, Activity, Play, Layers, GitMerge, AlertCircle, Gauge 
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

// Visual Types
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

// --- AVL LOGIC (Standard) ---
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


// --- LAYOUT ENGINE (Coordinate Calculator) ---
const calculateLayout = (
    root: TreeNode | null, 
    width: number, 
    selectedId: string | null,
    visitingId: string | null,
    foundId: string | null
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    if (!root) return { nodes: [], edges: [] };

    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];
    
    const traverse = (node: TreeNode, x: number, y: number, offset: number) => {
        nodes.push({
            id: node.id,
            value: node.value,
            x,
            y,
            isSelected: node.id === selectedId,
            isVisiting: node.id === visitingId,
            isFound: node.id === foundId
        });

        if (node.left) {
            const childX = x - offset;
            const childY = y + 80;
            edges.push({
                id: `${node.id}-${node.left.id}`,
                x1: x, y1: y,
                x2: childX, y2: childY
            });
            traverse(node.left, childX, childY, offset * 0.55);
        }

        if (node.right) {
            const childX = x + offset;
            const childY = y + 80;
            edges.push({
                id: `${node.id}-${node.right.id}`,
                x1: x, y1: y,
                x2: childX, y2: childY
            });
            traverse(node.right, childX, childY, offset * 0.55);
        }
    };

    traverse(root, width / 2, 50, 250); // Initial spread: 250px
    return { nodes, edges };
};


export default function AVLTreeSimulator() {
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode | null>(null);
  
  // UI State
  const [selectedId, setSelectedId] = useState<NodeId | null>(null);
  const [newValue, setNewValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  
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
    return calculateLayout(tree, 1200, selectedId, visitingId, foundId);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* --- Header (Controls) --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 relative">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                AVL Tree Sim <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded-full border border-purple-200">VisuAlgo Style</span>
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
            <button onClick={() => { setTree(null); setSelectedId(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-md"><RefreshCw size={18}/></button>
          </div>
        </div>
      </header>

      {/* --- CANVAS AREA --- */}
      <main className="flex-1 relative overflow-auto bg-slate-50 cursor-move">
        <div className="min-w-[1200px] min-h-[800px] relative mx-auto mt-10 transition-all origin-top" style={{ width: 1200, height: 800 }}>
            {!tree && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <GitMerge size={48} className="mb-4 text-slate-300" />
                    <p className="font-medium text-lg">Empty Tree</p>
                 </div>
            )}

            {/* SVG Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <AnimatePresence>
                    {visualEdges.map(edge => (
                        <motion.line
                            key={edge.id}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, pathLength: 1, opacity: 1 }}
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
                            onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                            className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center font-bold text-lg cursor-pointer select-none shadow-sm ${bg}`}
                        >
                            {node.value}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
      </main>

      {/* --- Bottom Left: Algorithms Menu --- */}
      <div className="fixed bottom-6 left-6 w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-4 z-50 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-500"><Search size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Search</span></div>
            <div className="flex gap-2">
                <input type="text" placeholder="Val" value={searchValue} onChange={(e) => handleNumberInput(e, setSearchValue)} disabled={isAnimating} className="flex-1 px-3 py-2 rounded-md border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 w-full text-slate-900" maxLength={3}/>
                <button onClick={() => runAnimation('BFS')} disabled={!tree || !searchValue || isAnimating} className="px-3 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 rounded-md text-xs font-bold shadow-sm">BFS</button>
                <button onClick={() => runAnimation('DFS')} disabled={!tree || !searchValue || isAnimating} className="px-3 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-200 rounded-md text-xs font-bold shadow-sm">DFS</button>
            </div>
          </div>
          <div className="h-px bg-slate-100 w-full"></div>
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-500"><Layers size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Traversal</span></div>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => runAnimation('PRE')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">Pre-Order</button>
                <button onClick={() => runAnimation('IN')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">In-Order</button>
                <button onClick={() => runAnimation('POST')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold disabled:opacity-50">Post-Order</button>
            </div>
          </div>
      </div>

      {/* --- Bottom Right: Stats --- */}
      {selectedId && selectedNode && !isAnimating && (
        <div className="fixed bottom-6 right-6 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2"><Activity size={16} className="text-blue-500" /> <h3 className="font-bold text-slate-700 text-sm">Node Statistics</h3></div>
          <div className="p-4 space-y-4">
             <div className="flex justify-between items-center"><span className="text-slate-500 text-sm font-medium">Value</span><span className="font-mono font-bold text-xl text-slate-800 bg-slate-100 px-2 rounded">{selectedNode.value}</span></div>
             <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Height</div><div className="text-blue-600 font-bold">{selectedNode.height}</div></div>
                <div className="border-l border-slate-200"><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Depth</div><div className="text-purple-600 font-bold">{nodeDepth}</div></div>
                <div className="border-l border-slate-200"><div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Balance</div><div className={`font-bold ${Math.abs(Number(balanceFactor)) > 1 ? 'text-red-500' : (Number(balanceFactor) === 0 ? 'text-green-500' : 'text-orange-500')}`}>{balanceFactor}</div></div>
             </div>
          </div>
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