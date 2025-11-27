'use client';
import { useState } from 'react';
import LinkedListSimulator from '../components/LinkedListSimulator';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8 flex flex-col items-center">
      {/* دکمه بازگشت (تغییر نکرد - همچنان گوشه بالا چپ) */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium bg-white px-4 py-2 rounded shadow-sm hover:shadow-md z-20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 19-7-7 7-7"/>
          <path d="M19 12H5"/>
        </svg>
        <span className="hidden sm:inline">Back</span>
      </Link>
      <h1 className="text-4xl font-extrabold text-gray-800 mb-4 sm:mb-8 text-center">
        Linked List Visualization
      </h1>
      <p className="text-lg text-gray-500 mb-10 text-center max-w-2xl">
        Explore the fundamental Singly Linked List data structure:
        </p>
        <p className="text-lg text-gray-500 mb-10 text-center max-w-2xl">
         Head → Node → Node → NULL.
      </p>

      {/* Container for the single simulator */}
      <div className="w-full max-w-xl flex justify-center">
        
        {/* Linked List Simulator */}
        <div className="w-full flex justify-center">
          <LinkedListSimulator />
        </div>
        
      </div>
    </main>
  );
}