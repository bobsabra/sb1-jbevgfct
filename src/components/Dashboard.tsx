import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, BarChart4, DollarSign, Users, Zap } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { AttributionModel } from '../types';
import MetricsCard from './dashboard/MetricsCard';
import SourcesTable from './dashboard/SourcesTable';
import TimeframeSelector from './dashboard/TimeframeSelector';
import ModelSelector from './dashboard/ModelSelector';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  clientId: string;
}

interface DashboardData {
  stats: {
    total_visitors: number;
    total_conversions: number;
    conversion_rate: number;
    attributed_revenue: number;
    revenue_change: number;
  };
  sources: Array<{
    source: string;
    conversions: number;
    revenue: number;
    share: number;
  }>;
  channels: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  monthly: Array<{
    month: string;
    [key: string]: number | string;
  }>;
}

// Time periods for the selector
const timePeriods = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Year to date', 'Custom'];

// Attribution models
const attributionModels = [
  { id: AttributionModel.LAST_TOUCH, name: 'Last Touch' },
  { id: AttributionModel.FIRST_TOUCH, name: 'First Touch' },
  { id: AttributionModel.LINEAR, name: 'Linear' },
  { id: AttributionModel.TIME_DECAY, name: 'Time Decay' },
  { id: AttributionModel.POSITION_BASED, name: 'Position Based' }
];

const Dashboard: React.FC<DashboardProps> = ({ clientId }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timePeriods[1]);
  const [selectedModel, setSelectedModel] = useState(attributionModels[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [clientId, selectedTimeframe, selectedModel]);

  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();

    switch (selectedTimeframe) {
      case 'Last 7 days':
        startDate = subDays(endDate, 7);
        break;
      case 'Last 30 days':
        startDate = subDays(endDate, 30);
        break;
      case 'Last 90 days':
        startDate = subDays(endDate, 90);
        break;
      case 'Year to date':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = subDays(endDate, 30);
    }

    return { startDate, endDate };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      // Fetch total visitors
      const { data: visitors, error: visitorsError } = await supabase
        .from('visitors')
        .select('visitor_id')
        .eq('client_id', clientId)
        .gte('first_seen_at', startDate.toISOString())
        .lte('first_seen_at', endDate.toISOString());

      if (visitorsError) throw visitorsError;

      // Fetch conversions
      const { data: conversions, error: conversionsError } = await supabase
        .from('conversions')
        .select('id, value')
        .eq('client_id', clientId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (conversionsError) throw conversionsError;

      // Fetch attribution results
      const { data: attributionResults, error: attributionError } = await supabase
        .from('attribution_results')
        .select('source, credit')
        .eq('client_id', clientId)
        .eq('attribution_model', selectedModel.id)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (attributionError) throw attributionError;

      // Calculate metrics
      const totalVisitors = visitors?.length || 0;
      const totalConversions = conversions?.length || 0;
      const conversionRate = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0;
      const attributedRevenue = attributionResults?.reduce((sum, result) => sum + (result.credit || 0), 0) || 0;

      // Calculate source distribution
      const sourceMap = new Map<string, { conversions: number; revenue: number }>();
      attributionResults?.forEach(result => {
        const source = result.source || 'direct';
        const current = sourceMap.get(source) || { conversions: 0, revenue: 0 };
        sourceMap.set(source, {
          conversions: current.conversions + 1,
          revenue: current.revenue + (result.credit || 0)
        });
      });

      const sources = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        conversions: data.conversions,
        revenue: data.revenue,
        share: (data.revenue / attributedRevenue) * 100
      }));

      // Transform data for charts
      const channels = sources.map(source => ({
        name: source.source.charAt(0).toUpperCase() + source.source.slice(1),
        value: source.share,
        color: getSourceColor(source.source)
      }));

      setData({
        stats: {
          total_visitors: totalVisitors,
          total_conversions: totalConversions,
          conversion_rate: conversionRate,
          attributed_revenue: attributedRevenue,
          revenue_change: 0 // This would require comparing with previous period
        },
        sources,
        channels,
        monthly: [] // This would require additional query for monthly breakdown
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSourceColor = (source: string): string => {
    const colors: Record<string, string> = {
      facebook: '#4267B2',
      google: '#DB4437',
      direct: '#333333',
      email: '#3AAEE0',
      organic: '#28A745',
      default: '#888888'
    };
    return colors[source] || colors.default;
  };
  
  // In a real app, we would fetch data when these change
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
  };
  
  const handleModelChange = (model: typeof attributionModels[0]) => {
    setSelectedModel(model);
  };

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
          <p className="text-sm text-red-800">Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Attribution Dashboard</h1>
          <p className="text-gray-500">
            {format(new Date(), 'MMMM d, yyyy')} • Attribution model: {selectedModel.name}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-3 md:mt-0">
          <TimeframeSelector 
            periods={timePeriods} 
            selected={selectedTimeframe} 
            onChange={handleTimeframeChange} 
          />
          
          <ModelSelector 
            models={attributionModels} 
            selected={selectedModel} 
            onChange={handleModelChange} 
          />
        </div>
      </div>
      
      {/* Metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricsCard 
          title="Total Visitors" 
          value={data.stats.total_visitors.toLocaleString()} 
          icon={<Users className="text-blue-600" />} 
        />
        <MetricsCard 
          title="Conversions" 
          value={data.stats.total_conversions.toLocaleString()} 
          change={data.stats.revenue_change} 
          icon={<Zap className="text-green-600" />} 
        />
        <MetricsCard 
          title="Conversion Rate" 
          value={`${data.stats.conversion_rate.toFixed(2)}%`} 
          icon={<BarChart4 className="text-purple-600" />} 
        />
        <MetricsCard 
          title="Attributed Revenue" 
          value={`$${data.stats.attributed_revenue.toLocaleString()}`} 
          change={data.stats.revenue_change} 
          icon={<DollarSign className="text-amber-600" />} 
        />
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel distribution */}
        <div className="bg-white rounded-lg shadow-sm p-5 lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Channel Distribution</h2>
            <button className="text-blue-600 text-sm flex items-center hover:text-blue-800 transition-colors">
              View Details <ArrowUpRight size={14} className="ml-1" />
            </button>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.channels}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {data.channels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Contribution']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Monthly trend */}
        <div className="bg-white rounded-lg shadow-sm p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Monthly Revenue Trend</h2>
            <button className="text-blue-600 text-sm flex items-center hover:text-blue-800 transition-colors">
              View Details <ArrowUpRight size={14} className="ml-1" />
            </button>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sources}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Legend />
                <Bar dataKey="facebook" name="Facebook" stackId="a" fill="#4267B2" />
                <Bar dataKey="google" name="Google" stackId="a" fill="#DB4437" />
                <Bar dataKey="direct" name="Direct" stackId="a" fill="#333333" />
                <Bar dataKey="email" name="Email" stackId="a" fill="#3AAEE0" />
                <Bar dataKey="organic" name="Organic" stackId="a" fill="#28A745" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Top sources table */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Top Sources</h2>
          <button className="text-blue-600 text-sm flex items-center hover:text-blue-800 transition-colors">
            View All Sources <ArrowUpRight size={14} className="ml-1" />
          </button>
        </div>
        
        <SourcesTable sources={data.sources} />
      </div>
    </div>
  );
};

export default Dashboard;