import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Edit, MoreHorizontal, Plus, Trash2, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Client {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  api_key: string;
  grower_org_id?: string;
}

interface ClientStats {
  visitors: number;
  conversions: number;
  revenue: number;
}

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<Record<string, ClientStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    domain: '',
    grower_org_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      setClients(clientsData || []);

      // Fetch stats for each client
      const stats: Record<string, ClientStats> = {};
      
      for (const client of clientsData || []) {
        const [visitors, conversions] = await Promise.all([
          supabase
            .from('visitors')
            .select('visitor_id', { count: 'exact' })
            .eq('client_id', client.id),
          supabase
            .from('conversions')
            .select('id, value')
            .eq('client_id', client.id)
        ]);

        const revenue = conversions.data?.reduce((sum, conv) => sum + (conv.value || 0), 0) || 0;

        stats[client.id] = {
          visitors: visitors.count || 0,
          conversions: conversions.data?.length || 0,
          revenue
        };
      }

      setClientStats(stats);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    setFormError(null);
    setSubmitting(true);

    try {
      // Basic validation
      if (!newClient.name || !newClient.domain || !newClient.grower_org_id) {
        throw new Error('All fields are required');
      }

      // Generate API key
      const apiKey = `tgr_${Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: newClient.name,
          domain: newClient.domain,
          grower_org_id: newClient.grower_org_id,
          api_key: apiKey
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form and close modal
      setNewClient({ name: '', domain: '', grower_org_id: '' });
      setShowAddModal(false);
      
      // Refresh client list
      fetchClients();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">Error loading clients: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
          <p className="text-gray-500">Manage your client tracking configurations</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="mt-3 md:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Add New Client
        </button>
      </div>
      
      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Client</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  value={newClient.domain}
                  onChange={(e) => setNewClient({ ...newClient, domain: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="acmecorp.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grower Organization ID
                </label>
                <input
                  type="text"
                  value={newClient.grower_org_id}
                  onChange={(e) => setNewClient({ ...newClient, grower_org_id: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="org_123456"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClient}
                disabled={submitting}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Client cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {clients.map((client) => (
          <div key={client.id} className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{client.name}</h3>
                  <p className="text-sm text-gray-500">{client.domain}</p>
                  {client.grower_org_id && (
                    <p className="text-xs text-gray-400 mt-1">Org ID: {client.grower_org_id}</p>
                  )}
                </div>
                
                <div className="relative group">
                  <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                    <MoreHorizontal size={18} className="text-gray-600" />
                  </button>
                  
                  <div className="hidden group-hover:block absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                      <Edit size={14} className="mr-2" /> Edit Client
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center">
                      <Trash2 size={14} className="mr-2" /> Delete Client
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Visitors</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {clientStats[client.id]?.visitors.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversions</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {clientStats[client.id]?.conversions || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversion Rate</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {clientStats[client.id]?.visitors > 0
                      ? ((clientStats[client.id]?.conversions / clientStats[client.id]?.visitors) * 100).toFixed(1)
                      : '0'}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-lg font-semibold text-gray-800">
                    ${clientStats[client.id]?.revenue.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              
              <div className="mt-5 flex justify-between">
                <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </div>
                
                <button 
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="text-blue-600 text-sm flex items-center hover:text-blue-800 transition-colors"
                >
                  View Dashboard <ArrowUpRight size={14} className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Client table */}
      <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Client List</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Client Name</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Domain</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Visitors</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Conversions</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Conversion Rate</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Revenue</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Status</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-medium text-gray-800">{client.name}</span>
                    {client.grower_org_id && (
                      <span className="block text-xs text-gray-500">Org ID: {client.grower_org_id}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700">{client.domain}</td>
                  <td className="px-5 py-4 text-gray-700">{clientStats[client.id]?.visitors.toLocaleString() || '0'}</td>
                  <td className="px-5 py-4 text-gray-700">{clientStats[client.id]?.conversions || '0'}</td>
                  <td className="px-5 py-4 text-gray-700">
                    {clientStats[client.id]?.visitors > 0
                      ? ((clientStats[client.id]?.conversions / clientStats[client.id]?.visitors) * 100).toFixed(1)
                      : '0'}%
                  </td>
                  <td className="px-5 py-4 text-gray-700">${clientStats[client.id]?.revenue.toLocaleString() || '0'}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <Edit size={16} className="text-gray-600" />
                      </button>
                      <button 
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <ArrowUpRight size={16} className="text-blue-600" />
                      </button>
                      <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;