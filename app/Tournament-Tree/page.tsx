'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trash2, RefreshCw, ArrowLeft, 
  Settings, MousePointer2, Trophy, User, Hash, GitCommit,
  ZoomIn, ZoomOut, Maximize 
} from 'lucide-react';

// --- Types ---
type NodeId = string;

interface PlayerData {
  name: string;
  score: number;
}

interface TreeNode {
  id: NodeId;
  data: PlayerData;
  left: TreeNode | null;
  right: TreeNode | null;
  isLeaf?: boolean;
  leafIndex?: number;
  sourceId?: string;
}

// --- Helpers ---
const getHeight = (node: TreeNode | null): number => {
  if (!node) return -1;
  return 1 + Math.max(getHeight(node.left), getHeight(node.right));
};

// --- Component: Recursive Node ---
const RecursiveTreeNode = ({
  node,
  selectedId,
  tracePath,
  onSelect,
}: {
  node: TreeNode;
  selectedId: NodeId | null;
  tracePath: Set<string>;
  onSelect: (node: TreeNode) => void;
}) => {
  const isSelected = node.id === selectedId;
  const isTraced = tracePath.has(node.id);
  const isLeaf = !!node.isLeaf;

  // Visual Logic (Your Exact Design)
  let bgClass = isLeaf 
    ? 'bg-white border-slate-300 text-slate-700 shadow-sm' 
    : 'bg-gradient-to-b from-amber-50 to-amber-100 border-amber-300 text-amber-900 shadow-md';

  if (isTraced) {
    bgClass = 'bg-amber-400 border-amber-600 text-white shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-105 z-20';
  }

  if (isSelected) {
    bgClass = 'bg-blue-600 border-blue-800 text-white scale-110 shadow-xl ring-4 ring-blue-100 z-50';
  }

  return (
    <li className="relative float-left text-center list-none p-4 pt-8">
      <div 
        onClick={(e) => { e.stopPropagation(); onSelect(node); }}
        className={`
          relative inline-flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 
          transition-all duration-300 ease-out z-10 cursor-pointer select-none
          ${bgClass}
        `}
      >
        <span className="font-bold text-xs truncate w-16 px-1">{node.data.name}</span>
        
        <div className={`
          mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
          ${isSelected ? 'bg-blue-800 text-blue-200 border-blue-700' : ''}
          ${!isSelected && isTraced ? 'bg-amber-600 text-white border-amber-700' : ''}
          ${!isSelected && !isTraced ? 'bg-slate-100 text-slate-500 border-slate-200' : ''}
        `}>
          {node.data.score}
        </div>

        {isLeaf && !isSelected && !isTraced && (
           <div className="absolute -bottom-3 text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-300">
             idx:{node.leafIndex}
           </div>
        )}
      </div>

      {(!isLeaf) && (
        <ul className="flex justify-center pt-4 relative">
          {node.left ? (
            <RecursiveTreeNode node={node.left} selectedId={selectedId} tracePath={tracePath} onSelect={onSelect} />
          ) : (
             node.right && <li className="relative float-left p-4 pt-8 opacity-0 pointer-events-none"><div className="w-20 h-20"></div></li>
          )}
          {node.right ? (
            <RecursiveTreeNode node={node.right} selectedId={selectedId} tracePath={tracePath} onSelect={onSelect} />
          ) : (
            node.left && <li className="relative float-left p-4 pt-8 opacity-0 pointer-events-none"><div className="w-20 h-20"></div></li>
          )}
        </ul>
      )}
    </li>
  );
};

export default function TournamentTreeFixed() {
  const router = useRouter();
  
  // --- Data ---
  const [players, setPlayers] = useState<PlayerData[]>([]); 
  const [tree, setTree] = useState<TreeNode | null>(null);
  
  // --- Inputs ---
  const [inputName, setInputName] = useState('');
  const [inputScore, setInputScore] = useState('');
  const [winType, setWinType] = useState<'min' | 'max'>('max');

  // --- State ---
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [editScore, setEditScore] = useState('');
  const [tracePath, setTracePath] = useState<Set<string>>(new Set());

  // --- ZOOM & PAN (Fixed Logic) ---
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Actions ---
  const addPlayer = () => {
    if (!inputScore.trim()) return;
    const nextIndex = players.length;
    const nameToUse = inputName.trim() === '' ? `${nextIndex}` : inputName.trim();
    setPlayers([...players, { name: nameToUse, score: parseInt(inputScore) || 0 }]);
    setInputName('');
    setInputScore('');
    setTracePath(new Set());
  };

  const updateSelectedPlayer = () => {
    if (!selectedNode || selectedNode.leafIndex === undefined) return;
    const newPlayers = [...players];
    newPlayers[selectedNode.leafIndex] = {
        ...newPlayers[selectedNode.leafIndex],
        score: parseInt(editScore) || 0
    };
    setPlayers(newPlayers);
    setSelectedNode(null);
    setTracePath(new Set());
  };

  const resetAll = () => {
    setPlayers([]);
    setTree(null);
    setInputName('');
    setSelectedNode(null);
    setTracePath(new Set());
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // --- Pan/Zoom Event Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    // Zoom on wheel (Ctrl+Wheel or standard wheel)
    const scaleAmount = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(zoom + scaleAmount, 0.2), 3);
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Start dragging
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- Tree Builder ---
  useEffect(() => {
    if (players.length === 0) {
      setTree(null);
      return;
    }
    let currentLevel: TreeNode[] = players.map((p, index) => ({
      id: `leaf-${index}`,
      data: p,
      left: null,
      right: null,
      isLeaf: true,
      leafIndex: index,
      sourceId: undefined
    }));
    let levelCount = 0;
    while (currentLevel.length > 1) {
      const nextLevel: TreeNode[] = [];
      levelCount++;
      for (let i = 0; i < currentLevel.length; i += 2) {
        const leftNode = currentLevel[i];
        if (i + 1 >= currentLevel.length) {
          // Pass bye node
          const passNode: TreeNode = {
              id: `lvl-${levelCount}-bye-${i}`,
              data: leftNode.data,
              left: leftNode,
              right: null,
              sourceId: leftNode.id,
              isLeaf: false
          };
          nextLevel.push(passNode);
          continue;
        }
        const rightNode = currentLevel[i+1];
        const s1 = leftNode.data.score;
        const s2 = rightNode.data.score;
        let winnerNode = leftNode;
        if (winType === 'max') {
             winnerNode = s1 >= s2 ? leftNode : rightNode;
        } else {
             winnerNode = s1 <= s2 ? leftNode : rightNode;
        }
        const parentNode: TreeNode = {
          id: `lvl-${levelCount}-match-${nextLevel.length}`, 
          data: winnerNode.data,
          left: leftNode,
          right: rightNode,
          isLeaf: false,
          sourceId: winnerNode.id
        };
        nextLevel.push(parentNode);
      }
      currentLevel = nextLevel;
    }
    setTree(currentLevel[0]);
  }, [players, winType]);

  // --- Trace Logic ---
  const handleTraceWinner = () => {
    if (!tree) return;
    const path = new Set<string>();
    let currentNode: TreeNode | null = tree;
    while (currentNode) {
        path.add(currentNode.id);
        if (currentNode.left && currentNode.left.id === currentNode.sourceId) {
            currentNode = currentNode.left;
        } else if (currentNode.right && currentNode.right.id === currentNode.sourceId) {
            currentNode = currentNode.right;
        } else {
            currentNode = null;
        }
    }
    setTracePath(path);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
       {/* CSS Tree Logic (Preserved & Fixed) */}
       <style jsx global>{`
        .tree ul { 
            position: relative; 
            padding-top: 20px; 
            transition: all 0.5s; 
            display: flex; 
            justify-content: center; 
        }
        .tree li { 
            float: left; 
            text-align: center; 
            list-style-type: none; 
            position: relative; 
            padding: 20px 5px 0 5px; 
            transition: all 0.5s; 
        }
        /* Connectors */
        .tree li::before, .tree li::after { 
            content: ''; 
            position: absolute; 
            top: 0; 
            right: 50%; 
            border-top: 2px solid #cbd5e1; 
            width: 50%; 
            height: 20px; 
            z-index: 0; /* Behind nodes */
        }
        .tree li::after { 
            right: auto; 
            left: 50%; 
            border-left: 2px solid #cbd5e1; 
        }
        .tree li:only-child::after, .tree li:only-child::before { 
            display: none; 
        }
        .tree li:only-child { 
            padding-top: 0; 
        }
        .tree li:first-child::before, .tree li:last-child::after { 
            border: 0 none; 
        }
        .tree li:last-child::before { 
            border-right: 2px solid #cbd5e1; 
            border-radius: 0 5px 0 0; 
        }
        .tree li:first-child::after { 
            border-radius: 5px 0 0 0; 
        }
        .tree ul ul::before { 
            content: ''; 
            position: absolute; 
            top: 0; 
            left: 50%; 
            border-left: 2px solid #cbd5e1; 
            width: 0; 
            height: 20px; 
        }
      `}</style>

      {/* --- Header --- */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm z-50 sticky top-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Trophy className="text-amber-500" size={20}/>
                    Tournament Tree
                </h1>
                <span className="text-xs text-slate-500 font-medium">Pan & Zoom Enabled</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <div className="flex items-center px-2 text-slate-400 border-r border-slate-200">
                    <User size={14} />
                </div>
                <input
                  type="text" 
                  placeholder="Name (Optional)" 
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-32 px-3 py-1.5 bg-transparent text-sm font-medium outline-none text-slate-900 placeholder:text-slate-400"
                />
                <div className="flex items-center px-2 text-slate-400 border-l border-r border-slate-200">
                    <Hash size={14} />
                </div>
                <input
                  type="number" 
                  placeholder="Score" 
                  value={inputScore}
                  onChange={(e) => setInputScore(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                  className="w-20 px-3 py-1.5 bg-transparent text-sm font-medium outline-none text-slate-900"
                />
                <button onClick={addPlayer} disabled={!inputScore} className="ml-1 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm border border-slate-200 disabled:opacity-50">
                    ADD
                </button>
             </div>
             <button onClick={resetAll} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                 <Trash2 size={18} />
             </button>
          </div>
        </div>
      </header>

      {/* --- Main Infinite Canvas --- */}
      <main 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Grid Background */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
                backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
                backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
        />

        {/* Tree Container - Rigid Div for Transform */}
        <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center"
            style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center'
            }}
        >
             {/* The Tree Content - Needs pointer-events-auto to capture clicks */}
             <div className="pointer-events-auto min-w-max">
                {!tree ? (
                    <div className="flex flex-col items-center text-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-white/50 backdrop-blur-sm select-none">
                    <MousePointer2 size={32} className="mb-4 text-slate-300" />
                    <p className="font-bold text-slate-600">No Players</p>
                    <p className="text-sm text-slate-400">Add a Score to start.</p>
                    </div>
                ) : (
                    <div className="tree">
                        <ul>
                            <RecursiveTreeNode 
                                node={tree} 
                                selectedId={selectedNode?.id || null} 
                                tracePath={tracePath}
                                onSelect={(node) => {
                                    setSelectedNode(node);
                                    if(node.isLeaf) setEditScore(node.data.score.toString());
                                }} 
                            />
                        </ul>
                    </div>
                )}
             </div>
        </div>
        
        {/* --- Controls --- */}
        <div className="absolute bottom-32 right-8 flex flex-col gap-2 z-50">
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-2 bg-white shadow-lg border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                <ZoomIn size={20} />
            </button>
            <button onClick={() => { setZoom(1); setPan({x:0,y:0}); }} className="p-2 bg-white shadow-lg border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600" title="Reset View">
                <Maximize size={20} />
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-2 bg-white shadow-lg border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                <ZoomOut size={20} />
            </button>
        </div>
      </main>

      {/* --- Footer Controls --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 flex items-center justify-between gap-6 select-none">
          
          <div className="flex items-center gap-6">
              <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Settings size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Logic</span>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button onClick={() => { setWinType('max'); setTracePath(new Set()); }} className={`px-3 py-1 rounded text-xs font-bold transition-all ${winType === 'max' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Max</button>
                      <button onClick={() => { setWinType('min'); setTracePath(new Set()); }} className={`px-3 py-1 rounded text-xs font-bold transition-all ${winType === 'min' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Min</button>
                  </div>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <GitCommit size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Analysis</span>
                  </div>
                  <button 
                    onClick={handleTraceWinner}
                    disabled={!tree} 
                    className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trace Winner
                  </button>
              </div>
          </div>

          <div className="flex-1 flex justify-end">
             {selectedNode?.isLeaf ? (
                 <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2">
                     <div className="text-right mr-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Update Score</div>
                        <div className="text-xs font-bold text-slate-700">{selectedNode.data.name}</div>
                     </div>
                     <input 
                       type="number" 
                       value={editScore} 
                       onChange={(e) => setEditScore(e.target.value)}
                       className="w-16 p-2 text-center font-bold border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                     />
                     <button onClick={updateSelectedPlayer} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg">
                         <RefreshCw size={18} />
                     </button>
                 </div>
             ) : selectedNode ? (
                 <div className="flex items-center gap-3 text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                     <Trophy size={18} className="text-amber-500" />
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase opacity-70">Winner Node</span>
                        <span className="font-bold">{selectedNode.data.name} : {selectedNode.data.score}</span>
                     </div>
                 </div>
             ) : (
                 <div className="text-slate-400 text-xs flex items-center gap-2">
                     <MousePointer2 size={16} />
                     Select node to edit
                 </div>
             )}
          </div>
      </div>
    </div>
  );
}