"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';

export default function ArraySimulator() {
    const [array, setArray] = useState<number[]>([1, 2, 3, 4, 5]);
    const [input, setInput] = useState('');
    const [index, setIndex] = useState('');
    const [searchValue, setSearchValue] = useState('');
    const [searchActiveIndex, setSearchActiveIndex] = useState<number | null>(null);
    const [searchResult, setSearchResult] = useState<number | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [updateIndex, setUpdateIndex] = useState('');
    const [updateValue, setUpdateValue] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [reportMessage, setReportMessage] = useState('');
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Insert value at end
    const handleInsert = () => {
        if (input !== '') {
            setArray([...array, Number(input)]);
            setReportMessage(`Value ${input} inserted at index ${array.length}`);
            setInput('');
            setErrorMessage('');
        }
    };

    // Delete value at index
    const handleDelete = () => {
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
                position: 'relative'
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
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    padding: '32px 24px',
                    minWidth: '350px',
                    textAlign: 'center'
                }}
            >
                <h2 style={{ marginBottom: '24px', color: '#222', fontSize: '2rem', fontWeight: 'bold' }}>Array Simulator</h2>
                <div style={{ display: 'flex', marginBottom: '24px', justifyContent: 'center' }}>
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
                                    borderRadius: '0px',
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
                            </div>
                        );
                    })}
                </div>
                <div style={{ marginBottom: '12px' }}>
                    <input
                        type="number"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Value to insert"
                        style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            marginRight: '8px',
                            width: '120px',
                            fontSize: '1rem',
                            color: '#222',
                            background: '#fff'
                        }}
                    />
                    <button
                        onClick={handleInsert}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#6366f1',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Insert
                    </button>
                </div>
                <div style={{ marginBottom: '12px' }}>
                    <input
                        type="number"
                        value={index}
                        onChange={e => setIndex(e.target.value)}
                        placeholder="Index to delete"
                        style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            marginRight: '8px',
                            width: '120px',
                            fontSize: '1rem',
                            color: '#222',
                            background: '#fff'
                        }}
                    />
                    <button
                        onClick={handleDelete}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#f87171',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Delete
                    </button>
                </div>
                <div style={{ marginBottom: '12px' }}>
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
                        placeholder="Value to search"
                        style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            marginRight: '8px',
                            width: '120px',
                            fontSize: '1rem',
                            color: '#222',
                            background: '#fff'
                        }}
                    />
                    <button
                        onClick={handleSearch}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#34d399',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                        disabled={searchValue === ''}
                    >
                        Search
                    </button>
                    {hasSearched && searchResult !== null && (
                        <span style={{ marginLeft: '10px', color: '#222', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            Found at index: {searchResult}
                        </span>
                    )}
                    {hasSearched && searchResult === null && searchActiveIndex === null && (
                        <span style={{ marginLeft: '10px', color: '#f87171', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            Not found
                        </span>
                    )}
                </div>
                <div>
                    <input
                        type="number"
                        value={updateIndex}
                        onChange={e => setUpdateIndex(e.target.value)}
                        placeholder="Index to update"
                        style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            marginRight: '8px',
                            width: '120px',
                            fontSize: '1rem',
                            color: '#222',
                            background: '#fff'
                        }}
                    />
                    <input
                        type="number"
                        value={updateValue}
                        onChange={e => setUpdateValue(e.target.value)}
                        placeholder="New value"
                        style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            marginRight: '8px',
                            width: '120px',
                            fontSize: '1rem',
                            color: '#222',
                            background: '#fff'
                        }}
                    />
                    <button
                        onClick={handleUpdate}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#fbbf24',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Update
                    </button>
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
        </div>
    );
}
