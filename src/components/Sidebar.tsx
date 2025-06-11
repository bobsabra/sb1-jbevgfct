import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gauge, Users } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Gauge size={28} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">AttributionEngine</h1>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          <li>
            <Link
              to="/clients"
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/clients'
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className={`mr-3 ${location.pathname === '/clients' ? 'text-blue-600' : 'text-gray-500'}`}>
                  <Users size={20} />
                </span>
                Clients
              </Link>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="bg-blue-50 rounded-md p-3">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Need Help?</h3>
          <p className="text-xs text-blue-700">
            Check our documentation or contact support for assistance with your attribution setup.
          </p>
          <button 
            className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
          >
            View Documentation
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;