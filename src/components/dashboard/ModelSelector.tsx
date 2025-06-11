import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { AttributionModel } from '../../types';

interface Model {
  id: AttributionModel;
  name: string;
}

interface ModelSelectorProps {
  models: Model[];
  selected: Model;
  onChange: (model: Model) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelect = (model: Model) => {
    onChange(model);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button 
        className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white shadow-sm text-sm hover:bg-gray-50 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings size={16} className="mr-2 text-gray-600" />
        <span>{selected.name}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200">
          {models.map((model, index) => (
            <button
              key={index}
              className={`w-full text-left px-4 py-2 text-sm ${selected.id === model.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
              onClick={() => handleSelect(model)}
            >
              {model.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;