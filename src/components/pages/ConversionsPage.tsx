import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart4, CircleDollarSign, DollarSign, Download, Filter, Search, X, Zap } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import TimeframeSelector from '../dashboard/TimeframeSelector';
import debounce from 'lodash.debounce';
import TouchpointTimeline from '../TouchpointTimeline';
import { supabase } from '../../lib/supabase';
import MetricsCard from '../dashboard/MetricsCard';

// Mock data for charts
const mockDailyConversions = [
  { date: 'May 1', count: 42, value: 2100 },
  { date: 'May 2', count: 38, value: 1900 },
  { date: 'May 3', count: 45, value: 2250 },
  { date: 'May 4', count: 40, value: 2000 },
  { date: 'May 5', count: 52, value: 2600 },
  { date: 'May 6', count: 48, value: 2400 },
  { date: 'May 7', count: 58, value: 2900 }
];

const mockConversionBySource = [
  { source: 'Facebook', count: 156, value: 7800 },
  { source: 'Google', count: 142, value: 7100 },
  { source: 'Direct', count: 98, value: 4900 },
  { source: 'Email', count: 75, value: 3750 },
  { source: 'Instagram', count: 64, value: 3200 }
];

interface ConversionsPageProps {
  clientId: string;
}

const ConversionsPage: React.FC<ConversionsPageProps> = ({ clientId }) => {
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    value: 0,
    rate: 0,
    averageValue: 0
  });

  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 7 days');
  const [adIdFilter, setAdIdFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversions();
  }, [clientId, selectedTimeframe, adIdFilter]);

  const getDateRange = () => {
    const endDate = endOfDay(new Date());
    let startDate = startOfDay(new Date());

    switch (selectedTimeframe) {
      case 'Last 7 days':
        startDate = subDays(endDate, 7);
        break;
      case 'Last 14 days':
        startDate = subDays(endDate, 14);
        break;
      case 'Last 30 days':
        startDate = subDays(endDate, 30);
        break;
      case 'Last 90 days':
        startDate = subDays(endDate, 90);
        break;
      default:
        startDate = subDays(endDate, 7);
    }

    return { startDate, endDate };
  };

  const fetchConversions = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      // Fetch conversions with filters
      let query = supabase
        .from('conversions')
        .select(`
          *,
          attribution_results (
            source,
            medium,
            campaign,
            ad_id,
            credit
          )
        `)
        .eq('client_id', clientId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false });

      if (adIdFilter) {
        query = query.contains('attribution_results.ad_id', [adIdFilter]);
      }

      const { data: conversionsData, error: conversionsError } = await query;

      if (conversionsError) throw conversionsError;

      // Get total visitors for conversion rate
      const { count: visitorCount } = await supabase
        .from('visitors')
        .select('*', { count: 'exact' })
        .eq('client_id', clientId)
        .gte('first_seen_at', startDate.toISOString())
        .lte('first_seen_at', endDate.toISOString());

      // Calculate stats
      const total = conversionsData?.length || 0;
      const value = conversionsData?.reduce((sum, conv) => sum + (conv.value || 0), 0) || 0;
      const rate = visitorCount ? (total / visitorCount) * 100 : 0;
      const averageValue = total ? value / total : 0;

      setConversions(conversionsData || []);
      setStats({
        total,
        value,
        rate,
        averageValue
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const conversionTypeColors = {
    'purchase': 'bg-green-100 text-green-800',
    'lead': 'bg-blue-100 text-blue-800',
    'subscription': 'bg-purple-100 text-purple-800'
  };

  const timePeriods = ['Last 7 days', 'Last 14 days', 'Last 30 days', 'Last 90 days'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">Error loading conversions: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Conversions</h1>
          <p className="text-gray-500">Track and analyze conversion events</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-3 md:mt-0">
          <TimeframeSelector 
            periods={timePeriods} 
            selected={selectedTimeframe} 
            onChange={setSelectedTimeframe} 
          />
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border ${
              showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'
            } text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
          >
            <Filter size={16} className="mr-2" />
            Filter
          </button>
          
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Search by ad ID..."
                  onChange={(e) => debouncedSetAdIdFilter(e.target.value)}
                />
                <Search size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricsCard 
          title="Total Conversions" 
          value={stats.total.toLocaleString()} 
          icon={<Zap className="text-green-600" />} 
        />
        
        <MetricsCard 
          title="Conversion Rate" 
          value={`${stats.rate.toFixed(1)}%`} 
          icon={<BarChart4 className="text-purple-600" />} 
        />
        
        <MetricsCard 
          title="Average Order Value" 
          value={`$${stats.averageValue.toFixed(2)}`} 
          icon={<CircleDollarSign className="text-amber-600" />} 
        />
        
        <MetricsCard 
          title="Total Revenue" 
          value={`$${stats.value.toFixed(2)}`} 
          icon={<DollarSign className="text-amber-600" />} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Conversions</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockDailyConversions}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="count" 
                  name="Conversions" 
                  stroke="#3B82F6" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="value" 
                  name="Revenue ($)" 
                  stroke="#10B981" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Conversions by Source</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockConversionBySource}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Count']} />
                <Legend />
                <Bar dataKey="count" name="Conversions" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Conversions</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Type</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Visitor ID</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Source</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Campaign</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Ad ID</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Value</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((conversion) => (
                <tr key={conversion.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${conversionTypeColors[conversion.conversion_type] || 'bg-gray-100 text-gray-800'}`}>
                      {conversion.conversion_type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <span className="text-gray-700">{conversion.visitorId}</span>
                      {conversion.email && (
                        <span className="block text-xs text-gray-500 mt-1">Email: {conversion.email}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {conversion.utmSource || <span className="text-gray-400">Direct</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {conversion.utmCampaign || <span className="text-gray-400">None</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {conversion.adId ? (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                        {conversion.adId}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {conversion.value > 0 ? (
                      <div className="flex items-center text-gray-800">
                        <CircleDollarSign size={16} className="mr-1 text-green-600" />
                        {conversion.value.toFixed(2)}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {format(conversion.timestamp, 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setSelectedVisitorId(conversion.visitorId)}
                      className="text-blue-600 hover:text-blue-800 transition-colors text-sm flex items-center"
                    >
                      View Journey
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-5 flex justify-between border-t border-gray-200">
          <button className="text-sm text-gray-700 hover:text-blue-600 transition-colors">Previous</button>
          <div className="text-sm text-gray-500">Page 1 of {Math.ceil(stats.total / 10)}</div>
          <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">Next</button>
        </div>
      </div>
      
      {selectedVisitorId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <TouchpointTimeline 
              visitorId={selectedVisitorId} 
              onClose={() => setSelectedVisitorId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversionsPage;