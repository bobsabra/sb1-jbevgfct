import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface Source {
  source: string;
  conversions: number;
  revenue: number;
  share: number;
}

interface SourcesTableProps {
  sources: Source[];
}

const SourcesTable: React.FC<SourcesTableProps> = ({ sources }) => {
  // Color mapping for sources
  const sourceColors: Record<string, string> = {
    facebook: '#4267B2',
    google: '#DB4437',
    direct: '#333333',
    email: '#3AAEE0',
    organic: '#28A745',
    tiktok: '#000000',
    instagram: '#C13584',
    twitter: '#1DA1F2',
    linkedin: '#0077B5',
    youtube: '#FF0000',
    reddit: '#FF4500',
    pinterest: '#E60023',
    bing: '#008373',
    yahoo: '#720E9E',
    display: '#FFB900',
    affiliate: '#FD5A5A'
  };

  // Function to capitalize the first letter of source
  const capitalizeSource = (source: string) => {
    return source.charAt(0).toUpperCase() + source.slice(1);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-3 text-sm font-semibold text-gray-600">Source</th>
            <th className="pb-3 text-sm font-semibold text-gray-600">Conversions</th>
            <th className="pb-3 text-sm font-semibold text-gray-600">Revenue</th>
            <th className="pb-3 text-sm font-semibold text-gray-600">Share</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: sourceColors[source.source] || '#888888' }} 
                  />
                  <span className="font-medium text-gray-800">{capitalizeSource(source.source)}</span>
                </div>
              </td>
              <td className="py-3 text-gray-700">{source.conversions}</td>
              <td className="py-3 text-gray-700">${source.revenue.toLocaleString()}</td>
              <td className="py-3">
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">{source.share}%</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${source.share}%`, 
                        backgroundColor: sourceColors[source.source] || '#888888',
                        maxWidth: '100%'
                      }} 
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SourcesTable;