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
    <div className="border p-6 rounded-xl shadow-lg bg-white w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-emerald-600 text-center">Queue</h2>
      <p className="text-xs text-gray-500 text-center mb-4">FIFO: First In, First Out</p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="border p-2 rounded flex-1 text-black"
          placeholder="Enter value..."
        />
        <button onClick={handleEnqueue} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded">Enqueue</button>
        <button onClick={handleDequeue} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Dequeue</button>
      </div>

      <div className="flex flex-row items-center gap-2 h-32 overflow-x-auto border-2 border-dashed border-emerald-200 p-4 rounded-lg bg-gray-50 relative">
        <span className="absolute left-2 text-xs text-red-500 font-bold">OUT</span>
        <span className="absolute right-2 text-xs text-emerald-500 font-bold">IN</span>
        
        {queue.length === 0 ? (
          <p className="text-gray-400 w-full text-center">Queue is empty</p>
        ) : (
          queue.map((item, index) => (
            <div
              key={index}
              className="min-w-[80px] bg-emerald-500 text-white text-center py-4 rounded shadow-md"
            >
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}