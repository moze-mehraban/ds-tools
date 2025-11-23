'use client';
import { useState } from 'react';

export default function StackSimulator() {
  const [stack, setStack] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');

  const handlePush = () => {
    if (!inputValue) return;
    setStack([...stack, inputValue]);
    setInputValue('');
    setMessage('');
  };

  const handlePop = () => {
    if (stack.length === 0) {
      setMessage('Stack is empty!');
      return;
    }
    const newStack = [...stack];
    newStack.pop();
    setStack(newStack);
    setMessage('');
  };

  const handlePeek = () => {
    if (stack.length === 0) {
      setMessage('Stack is empty, nothing to peek.');
      return;
    }
    const topItem = stack[stack.length - 1];
    setMessage(`Peek: The top element is "${topItem}"`);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleClear = () => {
    setStack([]);
    setMessage('Stack cleared.');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="border border-gray-200 p-8 rounded-2xl shadow-xl bg-white w-full max-w-xl transition-all duration-300">
      <h2 className="text-3xl font-bold mb-2 text-indigo-600 text-center">Stack</h2>
      <p className="text-sm text-gray-400 text-center mb-6 font-medium">LIFO: Last In, First Out</p>

      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePush()}
            className="border border-gray-300 p-3 rounded-lg flex-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            placeholder="Enter value..."
          />
          <button 
            onClick={handlePush} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-sm"
          >
            Push
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={handlePeek} className="bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-semibold transition-colors shadow-sm" title="View top element">Peek/Top</button>
          <button onClick={handlePop} className="bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg font-semibold transition-colors shadow-sm" title="Remove top element">Pop</button>
          <button onClick={handleClear} className="bg-slate-500 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-colors shadow-sm" title="Remove all elements">Clear</button>
        </div>
      </div>

      {/* Message Area */}
      <div className="h-6 mb-2 text-center">
        {message && (
          <span className="text-sm font-medium text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full animate-in fade-in">
            {message}
          </span>
        )}
      </div>

      {/* Stack Size Indicator */}
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Visualizing Stack
        </span>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Size:</span>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-sm font-bold min-w-[30px] text-center">
                {stack.length}
            </span>
        </div>
      </div>

      {/* Visual Container */}
      <div className="flex flex-col-reverse items-center gap-3 h-72 overflow-y-auto border-2 border-dashed border-indigo-100 p-6 rounded-xl bg-gray-50/50">
        {stack.length === 0 ? (
          <div className="h-full flex items-center justify-center flex-col gap-2">
             <p className="text-gray-300 font-medium text-lg">Stack is empty</p>
          </div>
        ) : (
          stack.map((item, index) => (
            <div
              key={index}
              className={`w-full text-center py-4 rounded-lg shadow-md font-medium text-lg animate-in slide-in-from-top-4 duration-300 ${
                index === stack.length - 1 
                  ? 'bg-indigo-600 ring-2 ring-indigo-300' 
                  : 'bg-indigo-500'
              } text-white`}
            >
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}