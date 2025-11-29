'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, RefreshCw, ArrowLeft, Search, Activity } from 'lucide-react';

// --- Types ---
type NodeId = string;

interface TreeNode {
  id: NodeId;
  value: string;
  left: TreeNode | null;
  right: TreeNode | null;
}

// --- Algorithms & Math Helpers ---

// 1. Get Node Height (Distance to deepest leaf)
const getHeight = (node: TreeNode | null): number => {
  if (!node) return -1;
  return 1 + Math.max(getHeight(node.left), getHeight(node.right));
};

// 2. Get Node Depth (Distance from root)
const getDepth = (root: TreeNode | null, targetId: NodeId, currentDepth = 0): number => {
  if (!root) return -1;
  if (root.id === targetId) return currentDepth;
  
  const left = getDepth(root.left, targetId, currentDepth + 1);
  if (left !== -1) return left;
  
  return getDepth(root.right, targetId, currentDepth + 1);
};

// 3. Get Balance Factor (Left Height - Right Height)
const getBalanceFactor = (node: TreeNode | null): number => {
  if (!node) return 0;
  return getHeight(node.left) - getHeight(node.right);
};

// 4. BFS Generator (Returns array of IDs visited)
const getBFSPath = (root: TreeNode | null, targetValue: string) => {
  if (!root) return { path: [], found: false };
  const queue = [root];
  const path: NodeId[] = [];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    path.push(current.id);
    if (current.value === targetValue) return { path, found: true };
    if (current.left) queue.push(current.left);
    if (current.right) queue.push(current.right);
  }
  return { path, found: false };
};

// 5. DFS Generator (Pre-order traversal path)
const getDFSPath = (root: TreeNode | null, targetValue: string) => {
  const path: NodeId[] = [];
  let found = false;

  const traverse = (node: TreeNode | null) => {
    if (!node || found) return;
    path.push(node.id);
    if (node.value === targetValue) {
      found = true;
      return;
    }
    traverse(node.left);
    traverse(node.right);
  };

  traverse(root);
  return { path, found };
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

  // Determine Color State
  let bgClass = 'bg-white border-slate-800 text-slate-900'; // Default
  if (isFound) bgClass = 'bg-green-500 border-green-700 text-white scale-110 shadow-[0_0_15px_rgba(34,197,94,0.6)]';
  else if (isVisiting) bgClass = 'bg-yellow-400 border-yellow-600 text-black scale-105 shadow-md';
  else if (isSelected) bgClass = 'bg-blue-600 border-blue-800 text-white scale-110 shadow-lg';

  return (
    <li className="relative float-left text-center list-none p-4 pt-8">
      {/* Node Circle */}
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

      {/* Children Container */}
      {(!isLeaf) && (
        <ul className="flex justify-center pt-4 relative">
          {node.left ? (
            <RecursiveTreeNode node={node.left} selectedId={selectedId} visitingId={visitingId} foundId={foundId} onSelect={onSelect} />
          ) : (
             node.right && (
                <li className="relative float-left text-center list-none p-4 pt-8 opacity-0 pointer-events-none"><div className="w-14 h-14"></div></li>
             )
          )}
          {node.right ? (
            <RecursiveTreeNode node={node.right} selectedId={selectedId} visitingId={visitingId} foundId={foundId} onSelect={onSelect} />
          ) : (
            node.left && (
                <li className="relative float-left text-center list-none p-4 pt-8 opacity-0 pointer-events-none"><div className="w-14 h-14"></div></li>
             )
          )}
        </ul>
      )}
    </li>
  );
};

export default function BinaryTreeSimulator() {
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode | null>(null);
  
  // Interaction State
  const [selectedId, setSelectedId] = useState<NodeId | null>(null);
  const [newValue, setNewValue] = useState('');
  
  // Search/Animation State
  const [searchValue, setSearchValue] = useState('');
  const [visitingId, setVisitingId] = useState<NodeId | null>(null);
  const [foundId, setFoundId] = useState<NodeId | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // --- Logic Helpers ---
  const findNode = (root: TreeNode | null, id: NodeId): TreeNode | null => {
    if (!root) return null;
    if (root.id === id) return root;
    return findNode(root.left, id) || findNode(root.right, id);
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

  // --- Animation Runner ---
  const runSearch = (type: 'BFS' | 'DFS') => {
    if (!tree || !searchValue) return;
    
    // Reset previous states
    setSelectedId(null);
    setFoundId(null);
    setVisitingId(null);
    setIsAnimating(true);

    const { path, found } = type === 'BFS' 
      ? getBFSPath(tree, searchValue) 
      : getDFSPath(tree, searchValue);

    let step = 0;
    
    const interval = setInterval(() => {
      if (step >= path.length) {
        clearInterval(interval);
        setIsAnimating(false);
        if (!found) alert('Value not found in tree');
        return;
      }

      const nodeId = path[step];
      setVisitingId(nodeId);

      // If this is the last step and it was found
      if (step === path.length - 1 && found) {
        setFoundId(nodeId);
        setVisitingId(null); // Stop visiting, keep found
      }

      step++;
    }, 600); // 600ms delay between steps
  };

  // --- Derived Data ---
  const selectedNode = tree && selectedId ? findNode(tree, selectedId) : null;
  const canAddLeft = selectedNode && !selectedNode.left && !isAnimating;
  const canAddRight = selectedNode && !selectedNode.right && !isAnimating;
  
  // Calculate stats for details panel
  const nodeHeight = selectedNode ? getHeight(selectedNode) : '-';
  const nodeDepth = selectedNode ? getDepth(tree, selectedId!) : '-';
  const balanceFactor = selectedNode ? getBalanceFactor(selectedNode) : '-';

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

      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 sticky top-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => router.back()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">Binary Tree Sim</h1>
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-4">
            
            {/* Edit Tools */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
              <input
                type="text" placeholder="Val" value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                disabled={isAnimating}
                className="px-3 py-1.5 rounded-md border border-slate-300 w-16 text-sm outline-none text-slate-900"
                maxLength={3}
              />
              {!tree ? (
                <button onClick={() => insertNode(null, 'left', newValue || 'Root')} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm">
                  <Plus size={16} /> Init
                </button>
              ) : (
                <>
                  <button disabled={!canAddLeft || !newValue} onClick={() => { if(selectedId) insertNode(selectedId, 'left', newValue); setNewValue(''); }} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 rounded-md text-sm">+ L</button>
                  <button disabled={!canAddRight || !newValue} onClick={() => { if(selectedId) insertNode(selectedId, 'right', newValue); setNewValue(''); }} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 rounded-md text-sm">+ R</button>
                  <button disabled={!selectedId || isAnimating} onClick={() => selectedId && deleteNode(selectedId)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md disabled:opacity-50"><Trash2 size={18} /></button>
                </>
              )}
               <button onClick={() => { setTree(null); setSelectedId(null); setFoundId(null); setVisitingId(null); }} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md ml-1"><RefreshCw size={18} /></button>
            </div>

            {/* Separator */}
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

            {/* Search Tools */}
            <div className="flex items-center gap-2 bg-indigo-50 p-1.5 rounded-lg border border-indigo-100">
               <input
                type="text" placeholder="Find" value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                disabled={isAnimating}
                className="px-3 py-1.5 rounded-md border border-indigo-200 w-16 text-sm outline-none text-slate-900 focus:border-indigo-500"
                maxLength={3}
              />
              <button 
                onClick={() => runSearch('BFS')} 
                disabled={!tree || !searchValue || isAnimating}
                className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 rounded-md text-xs font-bold tracking-wide transition"
              >
                BFS
              </button>
              <button 
                onClick={() => runSearch('DFS')} 
                disabled={!tree || !searchValue || isAnimating}
                className="px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-300 rounded-md text-xs font-bold tracking-wide transition"
              >
                DFS
              </button>
            </div>

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
              <Plus size={32} className="mx-auto mb-4 text-slate-300" />
              <p className="font-medium text-slate-600">Tree is empty.</p>
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

      {/* --- Node Details Panel (Bottom Right) --- */}
      {selectedId && selectedNode && !isAnimating && (
        <div className="fixed bottom-6 right-6 w-64 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            <h3 className="font-bold text-slate-700 text-sm">Node Details</h3>
          </div>
          <div className="p-4 space-y-3">
             <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Value</span>
                <span className="font-mono font-bold text-lg text-slate-800">{selectedNode.value}</span>
             </div>
             <div className="w-full h-px bg-slate-100"></div>
             
             <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                   <div className="text-xs text-slate-400 uppercase font-bold">Height</div>
                   <div className="text-blue-600 font-bold">{nodeHeight}</div>
                </div>
                <div className="border-l border-slate-100">
                   <div className="text-xs text-slate-400 uppercase font-bold">Depth</div>
                   <div className="text-purple-600 font-bold">{nodeDepth}</div>
                </div>
                <div className="border-l border-slate-100">
                   <div className="text-xs text-slate-400 uppercase font-bold">Balance</div>
                   <div className={`font-bold ${Number(balanceFactor) === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                     {balanceFactor}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Animation Status Overlay */}
      {isAnimating && (
         <div className="fixed bottom-6 right-6 bg-indigo-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-pulse z-50">
            <Search size={18} />
            <span className="font-medium">Searching...</span>
         </div>
      )}

    </div>
  );
}