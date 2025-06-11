import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Donut as Button } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ClientsPage from './components/pages/ClientsPage';
import ClientDetailsPage from './components/pages/ClientDetailsPage';

function App() {
  // Test function to trigger a custom event
  const triggerTestEvent = () => {
    if (window.gTracker) {
      window.gTracker.trackConversion('test_conversion', 99.99, 'USD');
      console.log('Test conversion event triggered');
    } else {
      console.warn('Tracker not initialized');
    }
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-4 right-4 z-50">
              <button
                onClick={triggerTestEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Test Conversion
              </button>
            </div>
          )}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <Routes>
              <Route path="/" element={<Navigate to="/clients" replace />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:clientId/*" element={<ClientDetailsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
