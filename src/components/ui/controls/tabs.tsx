import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  children: React.ReactNode | ((activeTab: string) => React.ReactNode);
  className?: string;
}

export function Tabs({ tabs, defaultTab, activeTab: controlledTab, onChange, children, className = '' }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab ?? tabs[0]?.id);
  
  const isControlled = controlledTab !== undefined;
  const active = isControlled ? controlledTab : internalTab;

  const handleTabChange = (id: string) => {
    if (!isControlled) {
      setInternalTab(id);
    }
    onChange?.(id);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tabs Header */}
      <div className="flex px-2 pt-2 gap-1 border-b border-border-default shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                  : 'border-transparent text-secondary hover:text-primary hover:bg-card-hover'
              }`}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto min-h-0 relative" role="tabpanel">
        <div className="absolute inset-0 p-4">
          {typeof children === 'function' ? children(active) : children}
        </div>
      </div>
    </div>
  );
}
