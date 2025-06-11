import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, BarChart4, Code, Home, Zap } from 'lucide-react';
import Dashboard from '../Dashboard';
import EventsPage from './EventsPage';
import ConversionsPage from './ConversionsPage';
import AttributionModelManager from '../AttributionModelManager';
import { supabase } from '../../lib/supabase';

type Tab = 'overview' | 'events' | 'conversions' | 'integration';
type ButtonStatus = 'default' | 'loading' | 'success' | 'failure';

interface Client {
  id: string;
  name: string;
  domain: string;
  api_key: string;
  grower_org_id?: string;
}

const ClientDetailsPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversionStatus, setConversionStatus] = useState<ButtonStatus>('default');
  const [eventStatus, setEventStatus] = useState<ButtonStatus>('default');
  const [models, setModels] = useState<AttributionModelData[]>([]);
  const [modelError, setModelError] = useState<string | null>(null);
  
  const handleTestConversion = () => {
    setConversionStatus('loading');
    if (window.gTracker) {
      window.gTracker.trackConversion('test_conversion', 99.99, 'USD');
      console.log('Test conversion event triggered for client:', clientId);
      setConversionStatus('success');
    } else {
      console.warn('Tracker not initialized');
      setConversionStatus('failure');
    }
    setTimeout(() => setConversionStatus('default'), 2000);
  };

  const handleTestEvent = () => {
    setEventStatus('loading');
    if (window.gTracker) {
      window.gTracker.trackEvent('test_event');
      console.log('Test event triggered for client:', clientId);
      setEventStatus('success');
    } else {
      console.warn('Tracker not initialized');
      setEventStatus('failure');
    }
    setTimeout(() => setEventStatus('default'), 2000);
  };

  const fetchAttributionModels = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('attribution_models')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setModels(data || []);
    } catch (err: any) {
      setModelError(err.message);
      console.error('Error fetching attribution models:', err);
    }
  };

  const handleSaveModel = async (model: AttributionModelData) => {
    try {
      const modelData = {
        ...model,
        client_id: clientId,
        updated_at: new Date().toISOString()
      };

      if (model.id) {
        // Update existing model
        const { error } = await supabase
          .from('attribution_models')
          .update(modelData)
          .eq('id', model.id);

        if (error) throw error;
      } else {
        // Create new model
        const { error } = await supabase
          .from('attribution_models')
          .insert({
            ...modelData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Refresh models list
      await fetchAttributionModels();
    } catch (err: any) {
      console.error('Error saving attribution model:', err);
      throw new Error('Failed to save attribution model');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      const { error } = await supabase
        .from('attribution_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      // Refresh models list
      await fetchAttributionModels();
    } catch (err: any) {
      console.error('Error deleting attribution model:', err);
      throw new Error('Failed to delete attribution model');
    }
  };

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (fetchError) throw fetchError;
        setClient(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchClient();
      fetchAttributionModels();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">
            {error || 'Client not found'}
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard clientId={clientId!} />;
      case 'events':
        return <EventsPage clientId={clientId!} />;
      case 'conversions':
        return <ConversionsPage clientId={clientId!} />;
      case 'integration':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Integration Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      value={client.api_key}
                      readOnly
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-sm"
                    />
                    <button
                      type="button"
                      className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization ID</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={client.grower_org_id || ''}
                      readOnly
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tracking Script</label>
                  <div className="mt-1">
                    <pre className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm overflow-x-auto">
                      {`<script 
  src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-tracker/tracker.js"
  data-client-id="${client.id}"
  defer
></script>`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5 mt-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Test Integration</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Use these buttons to verify the tracking is working correctly for this client.
                </p>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleTestConversion}
                    disabled={conversionStatus === 'loading'}
                    className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                      ${conversionStatus === 'default' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : ''}
                      ${conversionStatus === 'loading' ? 'bg-gray-500 cursor-not-allowed' : ''}
                      ${conversionStatus === 'success' ? 'bg-green-700 focus:ring-green-500' : ''}
                      ${conversionStatus === 'failure' ? 'bg-red-600 focus:ring-red-500' : ''}
                    `}
                  >
                    <Zap size={16} className="mr-2" />
                    {conversionStatus === 'default' && 'Test Conversion'}
                    {conversionStatus === 'loading' && 'Testing...'}
                    {conversionStatus === 'success' && 'Success!'}
                    {conversionStatus === 'failure' && 'Failed'}
                  </button>

                  <button
                    onClick={handleTestEvent}
                    disabled={eventStatus === 'loading'}
                    className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                      ${eventStatus === 'default' ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' : ''}
                      ${eventStatus === 'loading' ? 'bg-gray-500 cursor-not-allowed' : ''}
                      ${eventStatus === 'success' ? 'bg-purple-700 focus:ring-purple-500' : ''}
                      ${eventStatus === 'failure' ? 'bg-red-600 focus:ring-red-500' : ''}
                    `}
                  >
                    <Activity size={16} className="mr-2" />
                    {eventStatus === 'default' && 'Test Event'}
                    {eventStatus === 'loading' && 'Testing...'}
                    {eventStatus === 'success' && 'Success!'}
                    {eventStatus === 'failure' && 'Failed'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5">
                <AttributionModelManager
                  clientId={clientId!}
                  models={models}
                  onSave={handleSaveModel}
                  onDelete={handleDeleteModel}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
        <div className="flex items-center space-x-2">
          <p className="text-gray-500">{client.domain}</p>
          {client.grower_org_id && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              Org ID: {client.grower_org_id}
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <Home size={16} className="inline-block mr-2" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <Activity size={16} className="inline-block mr-2" />
            Events
          </button>

          <button
            onClick={() => setActiveTab('conversions')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'conversions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <BarChart4 size={16} className="inline-block mr-2" />
            Conversions
          </button>

          <button
            onClick={() => setActiveTab('integration')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'integration'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <Code size={16} className="inline-block mr-2" />
            Integration
          </button>
        </nav>
      </div>

      {renderContent()}
    </div>
  );
};

export default ClientDetailsPage;