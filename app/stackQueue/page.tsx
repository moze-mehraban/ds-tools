'use client';
import { useState } from 'react';
import Link from 'next/link';
import StackSimulator from '../components/StackSimulator';
import QueueSimulator from '../components/QueueSimulator';

export default function Home() {
  // State to track which view is active ('stack' or 'queue')
  const [activeTab, setActiveTab] = useState<'stack' | 'queue'>('stack');

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-start relative font-[family-name:var(--font-geist-sans)]">
      
      {/* Back to Menu Button */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium bg-white px-4 py-2 rounded shadow-sm hover:shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 19-7-7 7-7"/>
          <path d="M19 12H5"/>
        </svg>
        Back
      </Link>

      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center mt-16 lg:mt-10">
        Data Structure Simulator
      </h1>

      {/* Toggle Switch */}
      <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 inline-flex mb-8">
        <button
          onClick={() => setActiveTab('stack')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'stack'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Stack
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'queue'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Queue
        </button>
      </div>
      
      {/* Conditional Rendering */}
      <div className="w-full flex justify-center">
        {activeTab === 'stack' ? (
          <div className="animate-in fade-in zoom-in duration-300">
            <StackSimulator />
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in duration-300">
            <QueueSimulator />
          </div>
        )}
      </div>
    </main>
  );
}