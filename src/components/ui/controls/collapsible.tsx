import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({ title, defaultOpen = false, children, className = '' }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-lg border border-border-subtle overflow-hidden bg-card ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium font-display transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/50 ${
          open 
            ? 'bg-amber-500/10 text-amber-500 border-b border-border-subtle' 
            : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
        }`}
        aria-expanded={open}
      >
        {title}
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} 
        />
      </button>
      
      <div 
        className={`grid transition-all duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
