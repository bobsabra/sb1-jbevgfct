import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface TimeframeSelectorProps {
  periods: string[];
  selected: string;
  onChange: (period: string) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ periods, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelect = (period: string) => {
    onChange(period);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button 
        className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white shadow-sm text-sm hover:bg-gray-50 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={16} className="mr-2 text-gray-600" />
        <span>{selected}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200">
          {periods.map((period, index) => (
            <button
              key={index}
              className={`w-full text-left px-4 py-2 text-sm ${selected === period ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
              onClick={() => handleSelect(period)}
            >
              {period}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeframeSelector;