'use client';
import { useState } from 'react';
import Link from 'next/link';
import StackSimulator from '../components/StackSimulator';
export default function Home() {

  return (
    // تغییر: استفاده از justify-center برای وسط‌چین کردن عمودی
    <main className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center relative font-[family-name:var(--font-geist-sans)]">
      
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

      {/* یک نگهدارنده برای نظم دهی به محتوای اصلی */}
      <div className="flex flex-col items-center w-full max-w-2xl gap-8">
        
        {/* عنوان */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">
          Data Structure Simulator
        </h1>
        
        {/* نمایش کارت انتخاب شده */}
        <div className="w-full flex justify-center items-center min-h-[400px]">
            <div className="animate-in fade-in zoom-in duration-300 w-full flex justify-center">
              <StackSimulator />
            </div>
        </div>

      </div>
    </main>
  );
}