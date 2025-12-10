'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Plus, RefreshCw, ArrowLeft, 
  Search, Activity, Play, Layers, AlertCircle, Gauge,
  ZoomIn, ZoomOut, Maximize, GitCommit, ChevronDown, ChevronUp, Network, Type, X
} from 'lucide-react';

// --- Types ---

type TrieMode = 'STANDARD' | 'COMPRESSED';

interface TrieNode {
  id: string;
  label: string; // "a" for Standard, "abc" for Compressed
  isEndOfWord: boolean;
  children: { [key: string]: TrieNode };
}

// Visual Types
interface VisualNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isEndOfWord: boolean;
  isSelected: boolean;
  isVisiting: boolean;
  isFound: boolean;
  width: number;
}

interface VisualEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Animation Step
interface AnimationStep {
    activeIds: string[];
    foundId: string | null;
    description: string;
    action: 'VISIT' | 'FOUND' | 'ERROR' | 'DONE';
}

// --- LOGIC ---

const generateId = () => 'node-' + Math.random().toString(36).substr(2, 9);

const createNode = (label: string, isEndOfWord = false): TrieNode => ({
    id: generateId(),
    label,
    isEndOfWord,
    children: {}
});

const cloneTrie = (node: TrieNode): TrieNode => {
    const newNode: TrieNode = {
        ...node,
        children: {}
    };
    for (const key in node.children) {
        newNode.children[key] = cloneTrie(node.children[key]);
    }
    return newNode;
};

// --- STANDARD INSERT ---
const insertStandard = (root: TrieNode, word: string): TrieNode => {
    let curr = root;
    for (const char of word) {
        if (!curr.children[char]) {
            curr.children[char] = createNode(char);
        }
        curr = curr.children[char];
    }
    curr.isEndOfWord = true;
    return root;
};

// --- RADIX (COMPRESSED) INSERT ---
const getCommonPrefixLen = (s1: string, s2: string): number => {
    let i = 0;
    while (i < s1.length && i < s2.length && s1[i] === s2[i]) i++;
    return i;
};

const insertRadix = (root: TrieNode, word: string): TrieNode => {
    let curr = root;
    let remaining = word;

    while (remaining.length > 0) {
        const firstChar = remaining[0];
        const child = curr.children[firstChar];

        if (!child) {
            curr.children[firstChar] = createNode(remaining, true);
            return root;
        }

        const commonLen = getCommonPrefixLen(child.label, remaining);
        
        if (commonLen === child.label.length) {
            curr = child;
            remaining = remaining.slice(commonLen);
            
            if (remaining.length === 0) {
                child.isEndOfWord = true;
                return root;
            }
        } else {
            // Split logic
            const commonPart = child.label.slice(0, commonLen);
            const childSuffix = child.label.slice(commonLen);
            const wordSuffix = remaining.slice(commonLen);

            // Create the new parent node (the prefix)
            const splitNode = createNode(commonPart, false);
            
            // FIX: Preserve the existing child ID for the suffix node.
            // This ensures the visual node "moves down" rather than being deleted/recreated.
            const newChildSuffixNode = {
                ...child,
                label: childSuffix,
                id: child.id // <--- IMPORTANT: KEEP ORIGINAL ID
            }; 
            
            splitNode.children[childSuffix[0]] = newChildSuffixNode;
            curr.children[firstChar] = splitNode;

            if (wordSuffix.length > 0) {
                splitNode.children[wordSuffix[0]] = createNode(wordSuffix, true);
            } else {
                splitNode.isEndOfWord = true;
            }
            return root;
        }
    }
    return root;
};

// Search Logic
const generateSearchSteps = (root: TrieNode, word: string, mode: TrieMode): AnimationStep[] => {
    const steps: AnimationStep[] = [];
    let curr = root;
    let remaining = word;
    
    steps.push({ activeIds: [curr.id], foundId: null, description: `Start at Root`, action: 'VISIT' });

    while (remaining.length > 0) {
        const char = remaining[0];
        const child = curr.children[char];
        
        if (!child) {
            steps.push({ activeIds: [curr.id], foundId: null, description: `No edge for '${char}'`, action: 'ERROR' });
            return steps;
        }

        const matchLen = mode === 'STANDARD' ? 1 : getCommonPrefixLen(child.label, remaining);
        
        steps.push({ activeIds: [child.id], foundId: null, description: `Checking '${child.label}'`, action: 'VISIT' });

        if (matchLen < child.label.length) {
             steps.push({ activeIds: [child.id], foundId: null, description: `Mismatch in '${child.label}'`, action: 'ERROR' });
             return steps;
        }

        remaining = remaining.slice(child.label.length);
        curr = child;
    }

    if (curr.isEndOfWord) {
        steps.push({ activeIds: [curr.id], foundId: curr.id, description: `Word found`, action: 'FOUND' });
    } else {
        steps.push({ activeIds: [curr.id], foundId: null, description: `Prefix exists (not marked)`, action: 'ERROR' });
    }

    return steps;
};

// --- LAYOUT ---
const calculateLayout = (
    root: TrieNode | null, 
    visitingId: string | null,
    foundId: string | null,
    mode: TrieMode
): { nodes: VisualNode[], edges: VisualEdge[] } => {
    if (!root) return { nodes: [], edges: [] };

    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];

    const X_GAP = 20; 
    const Y_GAP = 80;
    const CHAR_WIDTH = 10;
    const BASE_WIDTH = mode === 'STANDARD' ? 40 : 40; 

    const traverse = (node: TrieNode, startX: number, y: number): { width: number, centerX: number } => {
        const childKeys = Object.keys(node.children).sort();
        
        const labelLen = node.label.length || 1; 
        const myNodeWidth = Math.max(BASE_WIDTH, labelLen * CHAR_WIDTH + 20);

        if (childKeys.length === 0) {
            const centerX = startX + myNodeWidth / 2;
            nodes.push({
                id: node.id,
                label: node.label,
                x: centerX,
                y,
                isEndOfWord: node.isEndOfWord,
                isSelected: false,
                isVisiting: node.id === visitingId,
                isFound: node.id === foundId,
                width: myNodeWidth
            });
            return { width: myNodeWidth + X_GAP, centerX };
        }

        let currentChildX = startX;
        const childCenters: { x: number, key: string }[] = [];

        childKeys.forEach(key => {
            const childNode = node.children[key];
            const metrics = traverse(childNode, currentChildX, y + Y_GAP);
            childCenters.push({ x: metrics.centerX, key });
            currentChildX += metrics.width;
        });

        const totalChildrenWidth = currentChildX - startX;
        const childrenCenter = (childCenters[0].x + childCenters[childCenters.length - 1].x) / 2;
        const myCenterX = childrenCenter;

        nodes.push({
            id: node.id,
            label: node.label,
            x: myCenterX,
            y,
            isEndOfWord: node.isEndOfWord,
            isSelected: false,
            isVisiting: node.id === visitingId,
            isFound: node.id === foundId,
            width: myNodeWidth
        });

        childKeys.forEach((key, i) => {
            const childNode = node.children[key];
            edges.push({
                id: `${node.id}-${childNode.id}`,
                x1: myCenterX,
                y1: y,
                x2: childCenters[i].x,
                y2: y + Y_GAP
            });
        });

        return { width: Math.max(totalChildrenWidth, myNodeWidth) + X_GAP, centerX: myCenterX };
    };

    traverse(root, 0, 50);
    return { nodes, edges };
};


export default function TrieVisualizer() {
  const router = useRouter();
  
  // State
  const [words, setWords] = useState<string[]>([]);
  const [root, setRoot] = useState<TrieNode>(createNode('')); 
  const [trieMode, setTrieMode] = useState<TrieMode>('STANDARD');
  
  const [wordInput, setWordInput] = useState('');
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [menuOpen, setMenuOpen] = useState(false);

  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [visitingId, setVisitingId] = useState<string | null>(null);
  const [foundId, setFoundId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'neutral' | 'success' | 'error'>('neutral');

  useEffect(() => {
      let newRoot = createNode('');
      const insertFn = trieMode === 'STANDARD' ? insertStandard : insertRadix;
      
      words.forEach(w => {
          insertFn(newRoot, w);
      });
      setRoot(newRoot);
  }, [words, trieMode]);

  const { nodes: visualNodes, edges: visualEdges } = useMemo(() => {
    return calculateLayout(root, visitingId, foundId, trieMode);
  }, [root, visitingId, foundId, trieMode]);

  const showToast = (type: 'neutral' | 'success' | 'error', msg: string) => {
      setStatusType(type);
      setStatusMessage(msg);
      if(!isAnimating) setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleInsert = () => {
      if (!wordInput) return;
      if (!/^[a-zA-Z]+$/.test(wordInput)) {
          showToast('error', 'Letters only');
          return;
      }
      if (words.includes(wordInput.toLowerCase())) {
          showToast('error', 'Word already exists');
          return;
      }

      setWords([...words, wordInput.toLowerCase()]);
      setWordInput('');
      showToast('success', `Inserted "${wordInput}"`);
  };

  const handleDelete = () => {
      if (!wordInput) return;
      const w = wordInput.toLowerCase();
      if (!words.includes(w)) {
          showToast('error', 'Word not found');
          return;
      }
      setWords(words.filter(word => word !== w));
      setWordInput('');
      showToast('neutral', `Deleted "${w}"`);
  };

  const handleSearch = (isPrefix: boolean) => {
      if (!wordInput) return;
      const steps = generateSearchSteps(root, wordInput.toLowerCase(), trieMode);
      
      setIsAnimating(true);
      setVisitingId(null);
      setFoundId(null);
      
      let i = 0;
      const interval = setInterval(() => {
          if (i >= steps.length) {
              clearInterval(interval);
              setIsAnimating(false);
              return;
          }
          const step = steps[i];
          setVisitingId(step.activeIds[0] || null);
          setFoundId(step.foundId);
          
          if (step.action === 'ERROR') setStatusType('error');
          else if (step.action === 'FOUND') setStatusType('success');
          else setStatusType('neutral');
          
          setStatusMessage(step.description);
          i++;
      }, 600);
  };

  const handleClear = () => {
      setWords([]);
      setTransform({x:0, y:0, scale:1});
      setWordInput('');
  };

  // Handlers
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
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    Trie Simulator
                </h1>
                
                {/* MODE SWITCHER */}
                <div 
                    className="relative flex items-center bg-slate-200 rounded-full p-1 cursor-pointer w-48 h-8 shadow-inner select-none overflow-hidden"
                    onClick={() => setTrieMode(trieMode === 'STANDARD' ? 'COMPRESSED' : 'STANDARD')}
                >
                    <motion.div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-sm z-0
                            ${trieMode === 'STANDARD' ? 'bg-indigo-600' : 'bg-amber-600'}
                        `}
                        initial={false}
                        animate={{ x: trieMode === 'COMPRESSED' ? '100%' : '0%' }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                    
                    <div className="flex w-full justify-between px-0 relative z-10 h-full items-center">
                        <span className={`w-1/2 text-center text-[10px] font-bold transition-colors duration-200 ${trieMode === 'STANDARD' ? 'text-white' : 'text-slate-500'}`}>STANDARD</span>
                        <span className={`w-1/2 text-center text-[10px] font-bold transition-colors duration-200 ${trieMode === 'COMPRESSED' ? 'text-white' : 'text-slate-500'}`}>COMPRESSED</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200 w-full lg:w-auto">
            <input 
                type="text" 
                placeholder="Word" 
                value={wordInput} 
                onChange={(e) => setWordInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleInsert()}
                disabled={isAnimating}
                className="px-3 py-2 rounded-md border border-slate-300 w-32 outline-none text-black uppercase font-mono"
            />
            <button onClick={handleInsert} disabled={isAnimating} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-bold shadow-sm transition"><Plus size={16}/></button>
            <div className="w-px h-8 bg-slate-300 mx-1"></div>
            <button onClick={handleDelete} disabled={isAnimating} className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-md text-sm font-bold shadow-sm transition"><Trash2 size={16}/></button>
            <button onClick={handleClear} disabled={isAnimating} className="p-2 text-slate-400 hover:bg-slate-200 rounded-md"><RefreshCw size={18}/></button>
          </div>
        </div>
      </header>

      {/* --- CANVAS --- */}
      <main 
        className={`flex-1 relative overflow-hidden bg-slate-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        {Object.keys(root.children).length === 0 && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                <Type size={48} className="mb-4 text-slate-300" />
                <p className="font-medium text-lg">Empty {trieMode === 'COMPRESSED' ? 'Radix' : ''} Trie</p>
                <p className="text-sm">Insert words to start.</p>
             </div>
        )}

        <div className="absolute top-0 left-0 w-full h-full origin-center will-change-transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}>
            <div className="absolute top-1/2 left-1/2 w-0 h-0">
                <div className="relative">
                    {/* SVG Lines */}
                    <svg className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] pointer-events-none z-0 overflow-visible">
                        <AnimatePresence>
                            {visualEdges.map(edge => (
                                <motion.g 
                                    key={edge.id} 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }} 
                                >
                                    <motion.line
                                        initial={false}
                                        animate={{
                                            x1: 5000 + edge.x1,
                                            y1: 5000 + edge.y1,
                                            x2: 5000 + edge.x2,
                                            y2: 5000 + edge.y2
                                        }}
                                        transition={{ duration: 0.4, ease: "backOut" }}
                                        stroke="#cbd5e1" strokeWidth="2"
                                    />
                                </motion.g>
                            ))}
                        </AnimatePresence>
                    </svg>

                    {/* Nodes */}
                    <AnimatePresence>
                        {visualNodes.map(node => {
                            let bg = 'bg-white border-slate-700 text-slate-800';
                            let scale = 1;
                            let zIndex = 10;

                            if (node.isEndOfWord) {
                                bg = 'bg-slate-800 text-white border-slate-900'; 
                            }

                            if (node.isVisiting) {
                                bg = 'bg-yellow-400 border-yellow-600 text-black shadow-lg';
                                scale = 1.2; zIndex = 20;
                            }
                            if (node.isFound) {
                                bg = 'bg-green-500 border-green-700 text-white shadow-xl';
                                scale = 1.3; zIndex = 30;
                            }

                            return (
                                <motion.div
                                    key={node.id}
                                    // REMOVED 'layout' prop to prevent conflict with absolute X/Y animation
                                    initial={{ scale: 0, opacity: 0, x: node.x, y: node.y - 20 }}
                                    animate={{ 
                                        x: node.x, 
                                        y: node.y, 
                                        scale, 
                                        opacity: 1, 
                                        zIndex 
                                    }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "backOut" }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className={`absolute -mt-5 h-10 rounded-full border-2 flex items-center justify-center font-bold font-mono text-sm cursor-default shadow-sm px-3 ${bg}`}
                                    style={{ 
                                        width: node.width,
                                        marginLeft: -node.width / 2 
                                    }}
                                >
                                    {node.label || '*'} 
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

      {/* --- Search Menu (Bottom Left) --- */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-4">
          <AnimatePresence>
            {menuOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20, originY: 1 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-4 flex flex-col gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-500"><Search size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Search Operations</span></div>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Word/Prefix" 
                                value={wordInput} 
                                onChange={(e) => setWordInput(e.target.value)} 
                                disabled={isAnimating} 
                                className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-black outline-none font-mono uppercase w-full"
                            />
                            <button onClick={() => handleSearch(false)} disabled={!wordInput || isAnimating} className="px-3 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 rounded-md text-xs font-bold shadow-sm">Word</button>
                            <button onClick={() => handleSearch(true)} disabled={!wordInput || isAnimating} className="px-3 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-slate-200 rounded-md text-xs font-bold shadow-sm">Prefix</button>
                        </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setMenuOpen(!menuOpen)} className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 border ${menuOpen ? 'bg-white text-slate-600 border-slate-200 rotate-90' : 'bg-indigo-600 text-white border-indigo-700 hover:scale-110 hover:bg-indigo-700'}`}>{menuOpen ? <X size={24} /> : <Search size={24} />}</button>
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