import LinkedListSimulator from '../components/LinkedListSimulator';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8 flex flex-col items-center">
      
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