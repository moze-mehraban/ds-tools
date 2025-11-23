'use client';
import { useState } from 'react';

export default function StackSimulator() {
  const [stack, setStack] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handlePush = () => {
    if (!inputValue) return;
    setStack([...stack, inputValue]);
    setInputValue('');
  };

  const handlePop = () => {
    if (stack.length === 0) return;
    const newStack = [...stack];
    newStack.pop();
    setStack(newStack);
  };

  return (
    <div className="border p-6 rounded-xl shadow-lg bg-white w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600 text-center">Stack</h2>
      <p className="text-xs text-gray-500 text-center mb-4">LIFO: Last In, First Out</p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="border p-2 rounded flex-1 text-black"
          placeholder="Enter value..."
        />
        <button onClick={handlePush} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded">Push</button>
        <button onClick={handlePop} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Pop</button>
      </div>

      <div className="flex flex-col-reverse items-center gap-2 h-64 overflow-y-auto border-2 border-dashed border-indigo-200 p-4 rounded-lg bg-gray-50">
        {stack.length === 0 ? (
          <p className="text-gray-400 mt-auto mb-auto">Stack is empty</p>
        ) : (
          stack.map((item, index) => (
            <div
              key={index}
              className="w-full bg-indigo-500 text-white text-center py-3 rounded shadow-md"
            >
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}