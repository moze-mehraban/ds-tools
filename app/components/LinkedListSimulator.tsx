'use client';
import { useState, Fragment, useRef } from 'react';

// Utility function for delay in async search
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function LinkedListSimulator() {
  const [list, setList] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // State for index-based operations
  const [insertIndex, setInsertIndex] = useState('');
  const [deleteIndex, setDeleteIndex] = useState('');
  const [updateIndex, setUpdateIndex] = useState(''); // New state for update index
  const [updateValue, setUpdateValue] = useState(''); // New state for update value
  
  // State for search
  const [searchInputValue, setSearchInputValue] = useState('');
  
  // State for visualization
  const [highlightIndex, setHighlightIndex] = useState(-1); // Index of the node currently being checked
  const [foundIndex, setFoundIndex] = useState(-1);         // Index where the value was found
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for general status/error messages
  const [statusMessage, setStatusMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- Core Operations ---
  
  // Helper to clear all operation statuses
  const clearStatuses = () => {
    setStatusMessage(null);
    setFoundIndex(-1);
    setHighlightIndex(-1);
    setIsSearching(false);
  }

  const handleInsertHead = () => {
    clearStatuses();
    if (!inputValue) {
      setStatusMessage({ message: 'Please enter a value to insert.', type: 'error' });
      return;
    }
    setList([inputValue, ...list]);
    setInputValue('');
    setStatusMessage({ message: `Successfully inserted "${inputValue}" at the HEAD (Index 0).`, type: 'success' });
  };

  const handleRemoveHead = () => {
    clearStatuses();
    if (list.length === 0) {
      setStatusMessage({ message: 'List is empty. Cannot remove head.', type: 'error' });
      return;
    }
    const removedValue = list[0];
    setList(list.slice(1));
    setStatusMessage({ message: `Successfully removed "${removedValue}" from the HEAD (Index 0).`, type: 'success' });
  };
  
  const handleInsertAtIndex = () => {
    clearStatuses();
    const index = parseInt(insertIndex, 10);
    if (!inputValue || isNaN(index)) {
      setStatusMessage({ message: 'Invalid value or index for insertion.', type: 'error' });
      return;
    }
    
    // Check bounds: 0 <= index <= list.length (can insert at the end)
    if (index < 0 || index > list.length) {
      setStatusMessage({ message: `Index ${index} is out of bounds. Index must be between 0 and ${list.length}.`, type: 'error' });
      return;
    }
    
    const newList = [...list];
    newList.splice(index, 0, inputValue); // Inserts inputValue at the given index
    
    setList(newList);
    setInputValue('');
    setInsertIndex('');
    setStatusMessage({ message: `Successfully inserted "${inputValue}" at index ${index}.`, type: 'success' });
  };

  const handleRemoveAtIndex = () => {
    clearStatuses();
    const index = parseInt(deleteIndex, 10);
    
    if (isNaN(index)) {
        setStatusMessage({ message: 'Invalid index for deletion.', type: 'error' });
        return;
    }

    // Check bounds: 0 <= index < list.length (cannot delete beyond the last element)
    if (index < 0 || index >= list.length) {
        const validRange = list.length > 0 ? `0 and ${list.length - 1}` : '0';
        setStatusMessage({ message: `Index ${index} is out of bounds. Index must be between ${validRange}.`, type: 'error' });
        return;
    }

    const removedValue = list[index];
    const newList = [...list];
    newList.splice(index, 1); // Removes 1 element at the given index

    setList(newList);
    setDeleteIndex('');
    setStatusMessage({ message: `Successfully removed "${removedValue}" from index ${index}.`, type: 'success' });
  };

  const handleUpdateAtIndex = () => {
      clearStatuses();
      const index = parseInt(updateIndex, 10);
      
      if (!updateValue || isNaN(index)) {
          setStatusMessage({ message: 'Invalid value or index for update.', type: 'error' });
          return;
      }
      
      // Check bounds: 0 <= index < list.length (must update an existing element)
      if (index < 0 || index >= list.length) {
          const validRange = list.length > 0 ? `0 and ${list.length - 1}` : '0';
          setStatusMessage({ message: `Index ${index} is out of bounds for update. Index must be between ${validRange}.`, type: 'error' });
          return;
      }
      
      const oldValue = list[index];
      const newList = [...list];
      newList[index] = updateValue; // Update the value at the specific index
      
      setList(newList);
      setUpdateValue('');
      setUpdateIndex('');
      setStatusMessage({ message: `Successfully updated index ${index} from "${oldValue}" to "${updateValue}".`, type: 'success' });
  }

  const handleSearch = async () => {
    setStatusMessage(null); // Clear general status message
    if (!searchInputValue) return;
    
    if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
    }

    setIsSearching(true);
    setFoundIndex(-1);
    setHighlightIndex(-1);

    for (let i = 0; i < list.length; i++) {
        setHighlightIndex(i); // Highlight the current node
        await sleep(400); // Pause for visualization
        
        if (list[i] === searchInputValue) {
            setFoundIndex(i); // Value found
            setIsSearching(false);
            setHighlightIndex(-1);
            setStatusMessage({ message: `Value "${searchInputValue}" found at index ${i}!`, type: 'success' });
            return;
        }
    }
    
    // If the loop finishes without finding the value
    setIsSearching(false);
    setHighlightIndex(-1);
    setStatusMessage({ message: `Search complete. Value "${searchInputValue}" not found.`, type: 'info' });
  };
  
  // --- UI Rendering ---

  // Helper function for node class names
  const getNodeClasses = (index: number) => {
    let baseClasses = "min-w-[100px] text-white text-center py-6 rounded-lg shadow-md font-medium text-lg flex-shrink-0 transition-all duration-300 transform ";
    
    if (index === foundIndex) {
        return baseClasses + "bg-green-500 scale-110 ring-4 ring-green-300"; // Found Node
    } else if (index === highlightIndex) {
        return baseClasses + "bg-yellow-500 scale-105 ring-2 ring-yellow-300"; // Searching Node
    } else {
        return baseClasses + "bg-indigo-500 hover:bg-indigo-600"; // Default Node
    }
  };
  
  // Helper to determine status message color
  const getStatusClasses = (type: 'success' | 'error' | 'info') => {
      if (type === 'success') return 'bg-green-100 text-green-700';
      if (type === 'error') return 'bg-red-100 text-red-700';
      return 'bg-blue-100 text-blue-700';
  }

  return (
    <div className="border border-gray-200 p-8 rounded-2xl shadow-xl bg-white w-full max-w-4xl transition-all duration-300">
      <h2 className="text-3xl font-bold mb-2 text-indigo-600 text-center">Singly Linked List</h2>

      {/* Input & Insert Head/Remove Head Controls */}
      <div className="flex gap-3 mb-4 items-end">
        <div className='flex-1'>
            <label className='text-xs font-semibold text-gray-500 ml-1'>New Node Value</label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInsertHead()}
              className="border border-gray-300 p-3 rounded-lg w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="Enter node value..."
              disabled={isSearching}
            />
        </div>
        <button 
          onClick={handleInsertHead} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm disabled:bg-gray-400 whitespace-nowrap"
          disabled={!inputValue || isSearching}
        >
          Insert Head
        </button>
        <button 
          onClick={handleRemoveHead} 
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm disabled:bg-gray-400 whitespace-nowrap"
          disabled={list.length === 0 || isSearching}
        >
          Remove Head
        </button>
      </div>
      
      {/* Insert at Index Controls */}
      <div className='flex gap-3 mb-4 items-end'>
        <div className='flex-1'>
            <label className='text-xs font-semibold text-gray-500 ml-1'>Insert Index (0 to {list.length})</label>
            <input
              type="number"
              value={insertIndex}
              onChange={(e) => setInsertIndex(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInsertAtIndex()}
              className="border border-gray-300 p-3 rounded-lg w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="0, 1, 2..."
              disabled={isSearching}
              min="0"
              max={list.length}
            />
        </div>
        <button 
            onClick={handleInsertAtIndex} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm disabled:bg-gray-400 whitespace-nowrap"
            disabled={!inputValue || isSearching}
        >
            Insert at Index
        </button>
        
        {/* Remove at Index Controls */}
        <div className='flex-1'>
            <label className='text-xs font-semibold text-gray-500 ml-1'>Remove Index (0 to {list.length > 0 ? list.length - 1 : 0})</label>
            <input
              type="number"
              value={deleteIndex}
              onChange={(e) => setDeleteIndex(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRemoveAtIndex()}
              className="border border-gray-300 p-3 rounded-lg w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              placeholder="0, 1, 2..."
              disabled={isSearching}
              min="0"
              max={list.length > 0 ? list.length - 1 : 0}
            />
        </div>
        <button 
            onClick={handleRemoveAtIndex} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm disabled:bg-gray-400 whitespace-nowrap"
            disabled={list.length === 0 || isSearching}
        >
            Remove at Index
        </button>
      </div>
      
      {/* Update at Index Controls (NEW) */}
      <div className='flex gap-3 mb-4 items-end'>
        <div className='flex-1'>
            <label className='text-xs font-semibold text-gray-500 ml-1'>Update Index (0 to {list.length > 0 ? list.length - 1 : 0})</label>
            <input
              type="number"
              value={updateIndex}
              onChange={(e) => setUpdateIndex(e.target.value)}
              className="border border-gray-300 p-3 rounded-lg w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="0, 1, 2..."
              disabled={isSearching}
              min="0"
              max={list.length > 0 ? list.length - 1 : 0}
            />
        </div>
        <div className='flex-1'>
            <label className='text-xs font-semibold text-gray-500 ml-1'>New Value for Update</label>
            <input
              type="text"
              value={updateValue}
              onChange={(e) => setUpdateValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateAtIndex()}
              className="border border-gray-300 p-3 rounded-lg w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="New node value..."
              disabled={isSearching}
            />
        </div>
        <button 
            onClick={handleUpdateAtIndex} 
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm disabled:bg-gray-400 whitespace-nowrap"
            disabled={list.length === 0 || !updateValue || isSearching}
        >
            Update Node
        </button>
      </div>


      {/* Search Controls */}
      <div className='flex gap-3 mb-8 items-end'>
        <div className='flex-1'>
            <label className='text-xs font-semibold text-gray-500 ml-1'>Search Value</label>
            <input
              type="text"
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="border border-gray-300 p-3 rounded-lg w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
              placeholder="Value to search for..."
              disabled={isSearching}
            />
        </div>
        <button 
            onClick={handleSearch} 
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm disabled:bg-gray-400 whitespace-nowrap"
            disabled={!searchInputValue || isSearching || list.length === 0}
        >
            {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>


      {/* List Size & Status Indicator */}
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Visualizing List
        </span>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Nodes:</span>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-sm font-bold min-w-[30px] text-center">
                {list.length}
            </span>
        </div>
      </div>
      
      {/* General Status Message Area */}
      {statusMessage && (
          <div className={`${getStatusClasses(statusMessage.type)} p-3 rounded-lg mb-4 text-center font-medium`}>
              {statusMessage.message}
          </div>
      )}

      {/* Linked List Visualization */}
      <div className="flex flex-row items-center gap-1 h-40 overflow-x-auto border-2 border-dashed border-indigo-100 p-6 rounded-xl bg-gray-50/50">
        
        {list.length === 0 ? (
          <div className="w-full flex items-center justify-center">
            <p className="text-gray-300 font-medium text-lg">List is empty (Head → NULL)</p>
          </div>
        ) : (
          <>
            {/* HEAD Indicator */}
            <div className="flex flex-col items-center mr-2 min-w-[50px] flex-shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    HEAD
                </span>
                <span className="text-2xl text-indigo-600 font-extrabold">
                    →
                </span>
            </div>

            {list.map((item, index) => (
              <Fragment key={index}>
                <div className={getNodeClasses(index)}>
                  {item} <span className='text-xs font-light block mt-1'>[Index: {index}]</span>
                </div>
                
                {/* Pointer logic: shows pointer until the last element */}
                {index < list.length - 1 ? (
                  <span className="text-2xl text-gray-400 font-extrabold flex-shrink-0">→</span>
                ) : (
                  // Last element shows NULL
                  <span className="text-lg text-gray-400 font-medium whitespace-nowrap flex-shrink-0">→ NULL</span>
                )}
              </Fragment>
            ))}
          </>
        )}
      </div>
    </div>
  );
}