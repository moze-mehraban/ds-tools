"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';

// 1. Define the code snippets to display
const CODE_SNIPPETS = {
    insert: `// Insert value at end
const handleInsert = () => {
  if (input !== '') {
    // Create new array with added value
    setArray([...array, Number(input)]); 
  }
};`,
    delete: `// Delete value at index
const handleDelete = () => {
  const idx = Number(index);
  // Filter out the item at the specific index
  setArray(array.filter((_, i) => i !== idx));
};`,
    search: `// Linear Search Animation
const searchStep = () => {
  // 1. Check if we reached end
  if (i >= array.length) return "Not Found";
  
  // 2. Highlight current index
  setSearchActiveIndex(i);

  // 3. Compare values
  if (array[i] === val) return "Found";

  // 4. Move to next index after delay
  i++;
  setTimeout(searchStep, 500);
}`,
    update: `// Update value at index
const handleUpdate = () => {
  // Create a copy of the array
  const newArray = [...array];
  // Modify the specific index
  newArray[idx] = val;
  // Save new state
  setArray(newArray);
};`
};

export default function ArraySimulator() {
    const [array, setArray] = useState<number[]>([1, 2, 3, 4, 5]);
    
    // Input States
    const [input, setInput] = useState('');
    const [index, setIndex] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [updateIndex, setUpdateIndex] = useState('');
    const [updateValue, setUpdateValue] = useState('');

    // Visualization States
    const [searchActiveIndex, setSearchActiveIndex] = useState<number | null>(null);
    const [searchResult, setSearchResult] = useState<number | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [reportMessage, setReportMessage] = useState('');
    
    // New: Code Display State
    const [activeCode, setActiveCode] = useState<string>('// Select an operation to see the code here...');

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Insert value at end
    const handleInsert = () => {
        setActiveCode(CODE_SNIPPETS.insert); // Show code
        if (input !== '') {
            setArray([...array, Number(input)]);
            setReportMessage(`Value ${input} inserted at index ${array.length}`);
            setInput('');
            setErrorMessage('');
        }
    };

    // Delete value at index
    const handleDelete = () => {
        setActiveCode(CODE_SNIPPETS.delete); // Show code
        const idx = Number(index);
        if (!isNaN(idx) && idx >= 0 && idx < array.length) {
            setArray(array.filter((_, i) => i !== idx));
            setReportMessage(`Index ${idx} deleted`);
            setIndex('');
            setErrorMessage('');
            // Clear search state after delete
            setSearchActiveIndex(null);
            setSearchResult(null);
            setHasSearched(false);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        } else {
            setErrorMessage('Error: Index out of range for delete.');
            setReportMessage('');
        }
    };

    // Animated search for value
    const handleSearch = () => {
        setActiveCode(CODE_SNIPPETS.search); // Show code
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        setHasSearched(true);
        setSearchActiveIndex(0);
        setSearchResult(null);
        setErrorMessage('');
        setReportMessage('');

        const val = Number(searchValue);
        let i = 0;

        function searchStep() {
            if (i >= array.length) {
                setSearchActiveIndex(null);
                setSearchResult(null);
                setReportMessage(`Value ${val} not found`);
                return;
            }
            setSearchActiveIndex(i);
            if (array[i] === val) {
                setSearchResult(i);
                setSearchActiveIndex(null);
                setReportMessage(`Value ${val} found at index ${i}`);
                return;
            }
            i++;
            searchTimeoutRef.current = setTimeout(searchStep, 500);
        }

        searchStep();
    };

    // Update value at index
    const handleUpdate = () => {
        setActiveCode(CODE_SNIPPETS.update); // Show code
        const idx = Number(updateIndex);
        const val = Number(updateValue);
        if (!isNaN(idx) && idx >= 0 && idx < array.length && updateValue !== '') {
            const newArray = [...array];
            newArray[idx] = val;
            setArray(newArray);
            setReportMessage(`Index ${idx} updated to ${val}`);
            setUpdateIndex('');
            setUpdateValue('');
            setErrorMessage('');
        } else {
            setErrorMessage('Error: Index out of range for update.');
            setReportMessage('');
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                position: 'relative',
                padding: '20px'
            }}
        >
            <Link href="/" style={{
                position: 'absolute',
                top: '32px',
                left: '32px',
                textDecoration: 'none'
            }}>
                <button
                    style={{
                        padding: '8px 20px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#6366f1',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                >
                    ← Back
                </button>
            </Link>

            <h2 style={{ marginBottom: '24px', color: '#222', fontSize: '2.5rem', fontWeight: 'bold' }}>Array Simulator</h2>

            <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '24px', 
                justifyContent: 'center', 
                width: '100%', 
                maxWidth: '1200px' 
            }}>
                
                {/* Left Panel: Simulator Controls */}
                <div
                    style={{
                        background: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                        padding: '32px 24px',
                        flex: '1 1 400px',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ display: 'flex', marginBottom: '24px', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        {array.map((value, i) => {
                            let background = '#f1f5f9';
                            if (searchResult === i) {
                                background = '#4ade80'; // green
                            } else if (searchActiveIndex === i) {
                                background = '#ffe066'; // yellow
                            }
                            return (
                                <div
                                    key={i}
                                    style={{
                                        border: '2px solid #6366f1',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        minWidth: '48px',
                                        textAlign: 'center',
                                        background,
                                        fontWeight: 'bold',
                                        fontSize: '1.3rem',
                                        color: '#222',
                                        transition: 'background 0.3s'
                                    }}
                                >
                                    {value}
                                    <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '4px'}}>idx:{i}</div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                        
                        {/* Insert */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Value"
                                style={inputStyle}
                            />
                            <button onClick={handleInsert} style={{ ...btnStyle, background: '#6366f1' }}>
                                Insert
                            </button>
                        </div>

                        {/* Delete */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                value={index}
                                onChange={e => setIndex(e.target.value)}
                                placeholder="Index"
                                style={inputStyle}
                            />
                            <button onClick={handleDelete} style={{ ...btnStyle, background: '#f87171' }}>
                                Delete
                            </button>
                        </div>

                        {/* Search */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="number"
                                value={searchValue}
                                onChange={e => {
                                    setSearchValue(e.target.value);
                                    setHasSearched(false);
                                    setSearchActiveIndex(null);
                                    setSearchResult(null);
                                    setErrorMessage('');
                                    setReportMessage('');
                                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                                }}
                                placeholder="Value"
                                style={inputStyle}
                            />
                            <button onClick={handleSearch} disabled={searchValue === ''} style={{ ...btnStyle, background: '#34d399' }}>
                                Search
                            </button>
                        </div>
                        {hasSearched && searchResult !== null && (
                                <div style={{ color: '#059669', fontWeight: 'bold' }}>Found at index: {searchResult}</div>
                            )}
                        {hasSearched && searchResult === null && searchActiveIndex === null && (
                            <div style={{ color: '#f87171', fontWeight: 'bold' }}>Not found</div>
                        )}

                        {/* Update */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                value={updateIndex}
                                onChange={e => setUpdateIndex(e.target.value)}
                                placeholder="Index"
                                style={inputStyle}
                            />
                            <input
                                type="number"
                                value={updateValue}
                                onChange={e => setUpdateValue(e.target.value)}
                                placeholder="New Val"
                                style={inputStyle}
                            />
                            <button onClick={handleUpdate} style={{ ...btnStyle, background: '#fbbf24' }}>
                                Update
                            </button>
                        </div>
                    </div>

                    {reportMessage && (
                        <div style={{ color: '#2563eb', fontWeight: 'bold', marginTop: '16px', fontSize: '1rem' }}>
                            {reportMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div style={{ color: '#f87171', fontWeight: 'bold', marginTop: '8px', fontSize: '1rem' }}>
                            {errorMessage}
                        </div>
                    )}
                </div>

                {/* Right Panel: Code Visualization */}
                <div style={{
                    flex: '1 1 400px',
                    background: '#1e293b',
                    borderRadius: '16px',
                    padding: '24px',
                    color: '#e2e8f0',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '500px',
                    overflow: 'auto'
                }}>
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                        Logic Viewer
                    </h3>
                    <pre style={{
                        fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                        fontSize: '0.95rem',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        color: '#a5b4fc'
                    }}>
                        {activeCode}
                    </pre>
                    <div style={{ marginTop: 'auto', paddingTop: '16px', fontSize: '0.8rem', color: '#64748b' }}>
                        * Represents the core logic of the current operation
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple Shared Styles
const inputStyle: React.CSSProperties = {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    width: '100px',
    fontSize: '1rem',
    color: '#222',
    background: '#fff'
};

const btnStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem',
    minWidth: '80px'
};