'use client';
import { useState } from 'react';

export default function QueueSimulator() {
  const [queue, setQueue] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleEnqueue = () => {
    if (!inputValue) return;
    setQueue([...queue, inputValue]);
    setInputValue('');
  };

  const handleDequeue = () => {
    if (queue.length === 0) return;
    setQueue(queue.slice(1));
  };

  return (
    // CHANGE: width changed to max-w-xl
    <div className="border border-gray-200 p-8 rounded-2xl shadow-xl bg-white w-full max-w-xl transition-all duration-300">
      <h2 className="text-3xl font-bold mb-2 text-emerald-600 text-center">Queue</h2>
      <p className="text-sm text-gray-400 text-center mb-8 font-medium">FIFO: First In, First Out</p>

      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleEnqueue()}
          className="border border-gray-300 p-3 rounded-lg flex-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          placeholder="Enter value..."
        />
        <button onClick={handleEnqueue} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-sm">Enqueue</button>
        <button onClick={handleDequeue} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-sm">Dequeue</button>
      </div>

      <div className="flex flex-row items-center gap-3 h-40 overflow-x-auto border-2 border-dashed border-emerald-100 p-6 rounded-xl bg-gray-50/50 relative">
        <span className="absolute left-3 bottom-2 text-[10px] tracking-widest text-red-400 font-bold uppercase">Out</span>
        <span className="absolute right-3 bottom-2 text-[10px] tracking-widest text-emerald-400 font-bold uppercase">In</span>
        
        {queue.length === 0 ? (
          <div className="w-full flex items-center justify-center">
            <p className="text-gray-300 font-medium text-lg">Queue is empty</p>
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={index}
              className="min-w-[100px] bg-emerald-500 text-white text-center py-6 rounded-lg shadow-md font-medium text-lg animate-in slide-in-from-right-4 duration-300"
            >
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}