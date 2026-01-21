'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ScrollableRowProps = {
  children: React.ReactNode;
  className?: string;
};

export default function ScrollableRow({ children, className = '' }: ScrollableRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  function scrollLeft() {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -600, behavior: 'smooth' });
    }
  }

  function scrollRight() {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 600, behavior: 'smooth' });
    }
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Left Navigation Button */}
      <button
        type="button"
        onClick={scrollLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-2 text-white hover:bg-amber-500 hover:border-amber-500 transition opacity-0 group-hover:opacity-100 shadow-lg"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-1 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {children}
      </div>

      {/* Right Navigation Button */}
      <button
        type="button"
        onClick={scrollRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-2 text-white hover:bg-amber-500 hover:border-amber-500 transition opacity-0 group-hover:opacity-100 shadow-lg"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
