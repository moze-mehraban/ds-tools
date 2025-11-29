'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Search, Activity, Play, Layers, MousePointer2, AlertCircle 
} from 'lucide-react';

// --- Types ---
type NodeId = string;

interface TreeNode {
  id: NodeId;
  value: string;
  left: TreeNode | null;
  right: TreeNode | null;
}

// --- Algorithms & Math Helpers ---

const getHeight = (node: TreeNode | null): number => {
  if (!node) return -1;
  return 1 + Math.max(getHeight(node.left), getHeight(node.right));
};

const getDepth = (root: TreeNode | null, targetId: NodeId, currentDepth = 0): number => {
  if (!root) return -1;
  if (root.id === targetId) return currentDepth;
  const left = getDepth(root.left, targetId, currentDepth + 1);
  if (left !== -1) return left;
  return getDepth(root.right, targetId, currentDepth + 1);
};

const getBalanceFactor = (node: TreeNode | null): number => {
  if (!node) return 0;
  return getHeight(node.left) - getHeight(node.right);
};

// --- Traversal Generators ---

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

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Component: Recursive Node ---
const RecursiveTreeNode = ({
  node,
  selectedId,
  visitingId,
  foundId,
  onSelect,
}: {
  node: TreeNode;
  selectedId: NodeId | null;
  visitingId: NodeId | null;
  foundId: NodeId | null;
  onSelect: (id: NodeId) => void;
}) => {
  const isSelected = node.id === selectedId;
  const isVisiting = node.id === visitingId;
  const isFound = node.id === foundId;
  const isLeaf = !node.left && !node.right;

  let bgClass = 'bg-white border-slate-800 text-slate-900';
  if (isFound) bgClass = 'bg-green-500 border-green-700 text-white scale-110 shadow-[0_0_15px_rgba(34,197,94,0.6)]';
  else if (isVisiting) bgClass = 'bg-yellow-400 border-yellow-600 text-black scale-105 shadow-md';
  else if (isSelected) bgClass = 'bg-blue-600 border-blue-800 text-white scale-110 shadow-lg';

  return (
    <li className="relative float-left text-center list-none p-4 pt-8">
      <div 
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
        className={`
          relative inline-flex items-center justify-center w-14 h-14 rounded-full border-2 
          transition-all duration-300 z-10 cursor-pointer select-none font-bold text-lg
          ${bgClass}
        `}
      >
        {node.value}
      </div>
      {(!isLeaf) && (
        <ul className="flex justify-center pt-4 relative">
          {node.left ? (
            <RecursiveTreeNode node={node.left} selectedId={selectedId} visitingId={visitingId} foundId={foundId} onSelect={onSelect} />
          ) : (
             node.right && <li className="relative float-left p-4 pt-8 opacity-0 pointer-events-none"><div className="w-14 h-14"></div></li>
          )}
          {node.right ? (
            <RecursiveTreeNode node={node.right} selectedId={selectedId} visitingId={visitingId} foundId={foundId} onSelect={onSelect} />
          ) : (
            node.left && <li className="relative float-left p-4 pt-8 opacity-0 pointer-events-none"><div className="w-14 h-14"></div></li>
          )}
        </ul>
      )}
    </li>
  );
};

export default function BinaryTreeSimulator() {
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode | null>(null);
  
  // State
  const [selectedId, setSelectedId] = useState<NodeId | null>(null);
  const [newValue, setNewValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  
  // Animation State
  const [visitingId, setVisitingId] = useState<NodeId | null>(null);
  const [foundId, setFoundId] = useState<NodeId | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');

  // --- Logic ---
  const findNode = (root: TreeNode | null, id: NodeId): TreeNode | null => {
    if (!root) return null;
    if (root.id === id) return root;
    return findNode(root.left, id) || findNode(root.right, id);
  };

  const findNodeByValue = (root: TreeNode | null, val: string): TreeNode | null => {
    if (!root) return null;
    if (root.value === val) return root;
    return findNodeByValue(root.left, val) || findNodeByValue(root.right, val);
  };

  const insertNode = (parentId: NodeId | null, side: 'left' | 'right', value: string) => {
    const newNode: TreeNode = { id: generateId(), value, left: null, right: null };
    if (!tree) { setTree(newNode); return; }
    const updateTree = (node: TreeNode): TreeNode => {
      if (node.id === parentId) return { ...node, [side]: newNode };
      return {
        ...node,
        left: node.left ? updateTree(node.left) : null,
        right: node.right ? updateTree(node.right) : null,
      };
    };
    if (tree) setTree(updateTree(tree));
  };

  const deleteNode = (targetId: NodeId) => {
    if (tree?.id === targetId) { setTree(null); setSelectedId(null); return; }
    const updateTree = (node: TreeNode): TreeNode | null => {
      if (node.left?.id === targetId) return { ...node, left: null };
      if (node.right?.id === targetId) return { ...node, right: null };
      return {
        ...node,
        left: node.left ? updateTree(node.left) : null,
        right: node.right ? updateTree(node.right) : null,
      };
    };
    if (tree) setTree(updateTree(tree));
    setSelectedId(null);
  };

  // --- Unified Animation Runner ---
  const runAnimation = (type: 'BFS' | 'DFS' | 'PRE' | 'IN' | 'POST') => {
    if (!tree) return;
    
    const isSearch = (type === 'BFS' || type === 'DFS') && searchValue !== '';
    
    // 1. Calculate the FULL path first
    let path: NodeId[] = [];
    if (type === 'BFS') path = getBFSPath(tree);
    else if (type === 'DFS' || type === 'PRE') path = getPreOrderPath(tree);
    else if (type === 'IN') path = getInOrderPath(tree);
    else if (type === 'POST') path = getPostOrderPath(tree);

    let foundNodeId: string | null = null;
    
    if (isSearch) {
        const targetNode = findNodeByValue(tree, searchValue);
        if (targetNode) {
            // IF FOUND: Trim the path to stop exactly at the target
            const index = path.indexOf(targetNode.id);
            if (index !== -1) {
                path = path.slice(0, index + 1);
                foundNodeId = targetNode.id;
            }
        } 
        // IF NOT FOUND: We do NOT trim the path. 
        // We let the animation run through the entire tree (simulating the search failure).
    }

    // Reset UI
    setSelectedId(null);
    setFoundId(null);
    setVisitingId(null);
    setIsAnimating(true);
    setStatusType('neutral');
    setStatusMessage(isSearch ? `Searching for ${searchValue}...` : `Running ${type}-Order...`);

    let step = 0;
    const interval = setInterval(() => {
      // End of Path reached
      if (step >= path.length) {
        clearInterval(interval);
        setIsAnimating(false);
        setVisitingId(null);
        
        if (isSearch) {
            if (foundNodeId) {
                setFoundId(foundNodeId);
                setStatusType('success');
                setStatusMessage(`Found value ${searchValue}!`);
                setTimeout(() => { setStatusMessage(''); setStatusType('neutral'); }, 3000);
            } else {
                setStatusType('error');
                setStatusMessage(`Value ${searchValue} not found.`);
                setTimeout(() => { setStatusMessage(''); setStatusType('neutral'); }, 3000);
            }
        } else {
            setStatusMessage('');
        }
        return;
      }

      // Visit current node
      setVisitingId(path[step]);
      step++;
    }, 600); // 600ms per step
  };

  // Stats
  const selectedNode = tree && selectedId ? findNode(tree, selectedId) : null;
  const canAddLeft = selectedNode && !selectedNode.left && !isAnimating;
  const canAddRight = selectedNode && !selectedNode.right && !isAnimating;
  
  const nodeHeight = selectedNode ? getHeight(selectedNode) : '-';
  const nodeDepth = selectedNode ? getDepth(tree, selectedId!) : '-';
  const balanceFactor = selectedNode ? getBalanceFactor(selectedNode) : '-';

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const val = e.target.value;
    if (val === '' || /^[0-9]+$/.test(val)) {
        setter(val);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <style jsx global>{`
        .tree ul { position: relative; padding-top: 20px; transition: all 0.5s; }
        .tree li { float: left; text-align: center; list-style-type: none; position: relative; padding: 20px 5px 0 5px; transition: all 0.5s; }
        .tree li::before, .tree li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 2px solid #334155; width: 50%; height: 20px; }
        .tree li::after { right: auto; left: 50%; border-left: 2px solid #334155; }
        .tree li:only-child::after, .tree li:only-child::before { display: none; }
        .tree li:only-child { padding-top: 0; }
        .tree li:first-child::before, .tree li:last-child::after { border: 0 none; }
        .tree li:last-child::before { border-right: 2px solid #334155; border-radius: 0 5px 0 0; }
        .tree li:first-child::after { border-radius: 5px 0 0 0; }
        .tree ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 2px solid #334155; width: 0; height: 20px; }
      `}</style>

      {/* --- Top Header (Edit Tools Only) --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 sticky top-0">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Binary Tree Simulator</h1>
          </div>

          {/* Edit Controls */}
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
            <input
              type="text" placeholder="Num" value={newValue}
              onChange={(e) => handleNumberInput(e, setNewValue)}
              disabled={isAnimating}
              className="px-4 py-2 rounded-md border border-slate-300 w-24 text-lg font-medium outline-none text-slate-900 focus:ring-2 focus:ring-blue-500"
              maxLength={3}
            />
            {!tree ? (
              <button onClick={() => insertNode(null, 'left', newValue || '50')} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm">
                <Plus size={16} /> Init Root
              </button>
            ) : (
              <>
                <button disabled={!canAddLeft || !newValue} onClick={() => { if(selectedId) insertNode(selectedId, 'left', newValue); setNewValue(''); }} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 rounded-md text-sm font-bold shadow-sm">+ Left</button>
                <button disabled={!canAddRight || !newValue} onClick={() => { if(selectedId) insertNode(selectedId, 'right', newValue); setNewValue(''); }} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 rounded-md text-sm font-bold shadow-sm">+ Right</button>
                <button disabled={!selectedId || isAnimating} onClick={() => selectedId && deleteNode(selectedId)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-md disabled:opacity-50 border border-transparent hover:border-rose-200"><Trash2 size={18} /></button>
              </>
            )}
             <button onClick={() => { setTree(null); setSelectedId(null); setFoundId(null); setVisitingId(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-md ml-1" title="Reset Tree"><RefreshCw size={18} /></button>
          </div>
        </div>
      </header>

      {/* --- Main Visual Area --- */}
      <main 
        className="flex-1 overflow-auto cursor-grab active:cursor-grabbing bg-slate-50 relative"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='%2394a3b8' fill-opacity='0.15' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-7.5l12.99-7.5H28v2.31h-.01L17 42.65V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: 'auto'
        }}
      >
        <div className="min-w-max min-h-max p-20 flex justify-center tree z-10 relative">
          {!tree ? (
            <div className="mt-20 text-center text-slate-400 bg-white/80 p-8 rounded-xl shadow-sm backdrop-blur-sm border border-slate-200">
              <MousePointer2 size={32} className="mx-auto mb-4 text-slate-300" />
              <p className="font-medium text-slate-600">Start by creating a Root Node.</p>
            </div>
          ) : (
            <ul className="flex">
               <RecursiveTreeNode 
                 node={tree} 
                 selectedId={selectedId} 
                 visitingId={visitingId}
                 foundId={foundId}
                 onSelect={(id) => {
                   if (!isAnimating) {
                     setSelectedId(id);
                     setFoundId(null);
                     setVisitingId(null);
                   }
                 }} 
               />
            </ul>
          )}
        </div>
      </main>

      {/* --- Bottom Left: Algorithms Menu --- */}
      <div className="fixed bottom-6 left-6 w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-4 z-50 flex flex-col gap-4">
          
          {/* Section 1: Search */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-500">
                <Search size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Search Node</span>
            </div>
            <div className="flex gap-2">
                <input
                    type="text" placeholder="Val" value={searchValue}
                    onChange={(e) => handleNumberInput(e, setSearchValue)}
                    disabled={isAnimating}
                    className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-lg font-medium outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                    maxLength={3}
                />
                <button onClick={() => runAnimation('BFS')} disabled={!tree || !searchValue || isAnimating} className="px-3 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-md text-xs font-bold shadow-sm transition-colors">BFS</button>
                <button onClick={() => runAnimation('DFS')} disabled={!tree || !searchValue || isAnimating} className="px-3 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-md text-xs font-bold shadow-sm transition-colors">DFS</button>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full"></div>

          {/* Section 2: Traversal */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-500">
                <Layers size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Traversal</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => runAnimation('PRE')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold transition-colors disabled:opacity-50">Pre-Order</button>
                <button onClick={() => runAnimation('IN')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold transition-colors disabled:opacity-50">In-Order</button>
                <button onClick={() => runAnimation('POST')} disabled={!tree || isAnimating} className="py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md text-xs font-bold transition-colors disabled:opacity-50">Post-Order</button>
            </div>
          </div>
      </div>

      {/* --- Bottom Right: Node Details Panel --- */}
      {selectedId && selectedNode && !isAnimating && (
        <div className="fixed bottom-6 right-6 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            <h3 className="font-bold text-slate-700 text-sm">Node Statistics</h3>
          </div>
          <div className="p-4 space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm font-medium">Value</span>
                <span className="font-mono font-bold text-xl text-slate-800 bg-slate-100 px-2 rounded">{selectedNode.value}</span>
             </div>
             
             <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div>
                   <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Height</div>
                   <div className="text-blue-600 font-bold">{nodeHeight}</div>
                </div>
                <div className="border-l border-slate-200">
                   <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Depth</div>
                   <div className="text-purple-600 font-bold">{nodeDepth}</div>
                </div>
                <div className="border-l border-slate-200">
                   <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Balance</div>
                   <div className={`font-bold ${Number(balanceFactor) === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                     {balanceFactor}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Animation Status Overlay (Centered Bottom) */}
      {statusMessage && (
         <div className={`
            fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 border transition-all duration-300
            ${statusType === 'error' ? 'bg-red-900 border-red-800 text-white' : ''}
            ${statusType === 'success' ? 'bg-green-900 border-green-800 text-white' : ''}
            ${statusType === 'neutral' ? 'bg-slate-800 border-slate-700 text-white animate-pulse' : ''}
         `}>
            {statusType === 'error' && <AlertCircle size={18} className="text-red-400" />}
            {statusType === 'success' && <Play size={18} className="text-green-400 fill-current" />}
            {statusType === 'neutral' && <Play size={18} className="text-blue-400 fill-current" />}
            <span className="font-medium tracking-wide text-sm">{statusMessage}</span>
         </div>
      )}

    </div>
  );
}