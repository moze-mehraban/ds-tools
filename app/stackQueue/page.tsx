import Link from 'next/link';
import StackSimulator from '../components/StackSimulator';
import QueueSimulator from '../components/QueueSimulator';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center relative">
      
      {/* دکمه بازگشت به منو (گوشه بالا سمت چپ) */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium bg-white px-4 py-2 rounded shadow-sm hover:shadow-md"
      >
        {/* آیکون فلش ساده */}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 19-7-7 7-7"/>
          <path d="M19 12H5"/>
        </svg>
        Back to Menu
      </Link>

      <h1 className="text-4xl font-bold text-gray-800 mb-12 text-center mt-10 lg:mt-0">
        Data Structure Simulator
      </h1>
      
      <div className="flex flex-col lg:flex-row gap-10 items-start justify-center w-full">
        <StackSimulator />
        <QueueSimulator />
      </div>
    </main>
  );
}