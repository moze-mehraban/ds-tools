'use client';

import React, { useState } from 'react';
import { Trash2, Plus, RefreshCw, X } from 'lucide-react';

// --- Types ---
type NodeId = string;

interface TreeNode {
  id: NodeId;
  value: string;
  left: TreeNode | null;
  right: TreeNode | null;
}

// --- Helper: Random ID ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Component: The Tree Node (Recursive) ---
const RecursiveTreeNode = ({
  node,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  selectedId: NodeId | null;
  onSelect: (id: NodeId) => void;
}) => {
  const isSelected = node.id === selectedId;

  // If leaf node (no children), simple render
  const isLeaf = !node.left && !node.right;

  return (
    <li className="relative float-left text-center list-none p-4 pt-8">
      
      {/* CSS Magic for Connectors: 
         We use ::before and ::after in the <style> block below 
         to draw the lines automatically based on the <li> structure.
      */}

      {/* The Node Circle */}
      <div 
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
        className={`
          relative inline-flex items-center justify-center w-14 h-14 rounded-full border-2 
          transition-all duration-200 z-10 cursor-pointer select-none shadow-sm
          ${isSelected 
            ? 'bg-blue-600 border-blue-800 text-white scale-110 shadow-lg' 
            : 'bg-white border-slate-800 text-slate-900 hover:bg-slate-50 hover:border-blue-500'
          }
        `}
      >
        <span className="font-bold text-lg">{node.value}</span>
      </div>

      {/* Children Container */}
      {(!isLeaf) && (
        <ul className="flex justify-center pt-4 relative">
          
          {/* Left Child Slot */}
          {node.left ? (
            <RecursiveTreeNode node={node.left} selectedId={selectedId} onSelect={onSelect} />
          ) : (
             // If Right exists but Left is null, render an invisible placeholder 
             // to keep the Right child on the Right side visually.
             node.right && (
                <li className="relative float-left text-center list-none p-4 pt-8 opacity-0 pointer-events-none">
                  <div className="w-14 h-14"></div>
                </li>
             )
          )}

          {/* Right Child Slot */}
          {node.right ? (
            <RecursiveTreeNode node={node.right} selectedId={selectedId} onSelect={onSelect} />
          ) : (
            // If Left exists but Right is null, render placeholder
            node.left && (
                <li className="relative float-left text-center list-none p-4 pt-8 opacity-0 pointer-events-none">
                  <div className="w-14 h-14"></div>
                </li>
             )
          )}
        </ul>
      )}
    </li>
  );
};

export default function BinaryTreeSimulator() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [selectedId, setSelectedId] = useState<NodeId | null>(null);
  const [newValue, setNewValue] = useState('');

  // --- Logic ---
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

  const selectedNode = tree && selectedId ? findNode(tree, selectedId) : null;
  const canAddLeft = selectedNode && !selectedNode.left;
  const canAddRight = selectedNode && !selectedNode.right;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* CRITICAL CSS FOR TREE CONNECTORS 
        We inject this locally to handle the lines (::before, ::after)
      */}
      <style jsx global>{`
        /* Connector Lines Setup */
        .tree ul { position: relative; padding-top: 20px; transition: all 0.5s; }
        .tree li { float: left; text-align: center; list-style-type: none; position: relative; padding: 20px 5px 0 5px; transition: all 0.5s; }

        /* Vertical Line Down */
        .tree li::before, .tree li::after {
          content: ''; position: absolute; top: 0; right: 50%; border-top: 2px solid #334155; width: 50%; height: 20px;
        }
        .tree li::after { right: auto; left: 50%; border-left: 2px solid #334155; }

        /* Remove connectors for single children to avoid loose ends */
        .tree li:only-child::after, .tree li:only-child::before { display: none; }
        .tree li:only-child { padding-top: 0; }

        /* Remove left connector from first child and right connector from last child */
        .tree li:first-child::before, .tree li:last-child::after { border: 0 none; }
        
        /* Add vertical line back for the last child of a group */
        .tree li:last-child::before { border-right: 2px solid #334155; border-radius: 0 5px 0 0; }
        .tree li:first-child::after { border-radius: 5px 0 0 0; }

        /* Downward connector from parent to children */
        .tree ul ul::before {
          content: ''; position: absolute; top: 0; left: 50%; border-left: 2px solid #334155; width: 0; height: 20px;
        }
      `}</style>

      {/* --- Header / Controls --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 sticky top-0">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Binary Tree Sim</h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <input
              type="text"
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-slate-300 w-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
              maxLength={4}
            />

            {!tree ? (
              <button 
                onClick={() => insertNode(null, 'left', newValue || 'Root')}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm transition shadow-sm"
              >
                <Plus size={16} /> Initialize
              </button>
            ) : (
              <>
                <button
                  disabled={!canAddLeft || !newValue}
                  onClick={() => { if (selectedId) insertNode(selectedId, 'left', newValue); setNewValue(''); }}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition shadow-sm"
                >
                  + Left
                </button>
                <button
                  disabled={!canAddRight || !newValue}
                  onClick={() => { if (selectedId) insertNode(selectedId, 'right', newValue); setNewValue(''); }}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition shadow-sm"
                >
                  + Right
                </button>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <button
                  disabled={!selectedId}
                  onClick={() => selectedId && deleteNode(selectedId)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition disabled:opacity-50"
                  title="Delete Node"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
             <button 
              onClick={() => { setTree(null); setSelectedId(null); }}
              className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md transition ml-1"
              title="Reset"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* --- Tree Visualization --- */}
      {/* Added Hexagon Background Pattern via Inline Style SVG */}
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
              <div className="inline-block p-4 border-2 border-dashed border-slate-300 rounded-full mb-4 text-slate-300">
                <Plus size={32} />
              </div>
              <p className="font-medium text-slate-600">Tree is empty.</p>
              <p className="text-sm">Enter a value and initialize the Root.</p>
            </div>
          ) : (
            <ul className="flex">
               <RecursiveTreeNode 
                 node={tree} 
                 selectedId={selectedId} 
                 onSelect={setSelectedId} 
               />
            </ul>
          )}
        </div>
      </main>

    </div>
  );
}