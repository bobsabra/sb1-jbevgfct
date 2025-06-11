import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, change, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5 transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center mt-1">
              {change >= 0 ? (
                <span className="flex items-center text-green-600 text-xs font-medium">
                  <ArrowUp size={14} className="mr-1" />
                  {change}%
                </span>
              ) : (
                <span className="flex items-center text-red-600 text-xs font-medium">
                  <ArrowDown size={14} className="mr-1" />
                  {Math.abs(change)}%
                </span>
              )}
              <span className="text-gray-500 text-xs ml-1">vs. previous period</span>
            </div>
          )}
        </div>
        
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default MetricsCard;