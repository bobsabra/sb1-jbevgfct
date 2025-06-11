import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Filter, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { Event } from '../../types';

interface EventsPageProps {
  clientId: string;
}

const eventTypeColors: Record<string, string> = {
  'page_view': 'bg-blue-100 text-blue-800',
  'form_submit': 'bg-purple-100 text-purple-800',
  'conversion': 'bg-green-100 text-green-800',
  'checkout_click': 'bg-amber-100 text-amber-800'
};

const EventsPage: React.FC<EventsPageProps> = ({ clientId }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pageViews: 0,
    formSubmissions: 0,
    conversions: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    eventType: '',
    source: '',
    startDate: subDays(new Date(), 7).toISOString(),
    endDate: new Date().toISOString()
  });

  useEffect(() => {
    fetchEvents();
  }, [clientId, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch events with filters
      let query = supabase
        .from('events')
        .select('*')
        .eq('client_id', clientId)
        .gte('timestamp', filters.startDate)
        .lte('timestamp', filters.endDate)
        .order('timestamp', { ascending: false });
      
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      
      if (filters.source) {
        query = query.eq('utm_source', filters.source);
      }
      
      const { data: eventsData, error: eventsError } = await query;
      
      if (eventsError) throw eventsError;
      
      setEvents(eventsData || []);
      
      // Calculate stats
      const stats = {
        total: eventsData?.length || 0,
        pageViews: eventsData?.filter(e => e.event_type === 'page_view').length || 0,
        formSubmissions: eventsData?.filter(e => e.event_type === 'form_submit').length || 0,
        conversions: eventsData?.filter(e => e.event_type === 'conversion').length || 0
      };
      
      setStats(stats);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchEvents();
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
          <p className="text-sm text-red-800">Error loading events: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Events</h1>
          <p className="text-gray-500">Track and analyze user interactions</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-3 md:mt-0">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'} text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
          >
            <Filter size={16} className="mr-2" />
            Filter Events
          </button>
          
          <button 
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="page_view">Page View</option>
                <option value="form_submit">Form Submit</option>
                <option value="conversion">Conversion</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <input
                type="text"
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                placeholder="Filter by source..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="md:col-span-2 flex justify-end items-end">
              <button onClick={() => setFilters({ eventType: '', source: '', startDate: subDays(new Date(), 7).toISOString(), endDate: new Date().toISOString() })} className="text-sm text-gray-600 hover:text-gray-900">
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Events summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{stats.total.toLocaleString()}</p>
          <div className="flex items-center mt-1">
            <span className="flex items-center text-green-600 text-xs font-medium">
              <ArrowUp size={14} className="mr-1" />
              12.5%
            </span>
            <span className="text-gray-500 text-xs ml-1">vs. previous period</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500">Page Views</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{stats.pageViews.toLocaleString()}</p>
          <div className="flex items-center mt-1">
            <span className="flex items-center text-green-600 text-xs font-medium">
              <ArrowUp size={14} className="mr-1" />
              8.2%
            </span>
            <span className="text-gray-500 text-xs ml-1">vs. previous period</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500">Form Submissions</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{stats.formSubmissions.toLocaleString()}</p>
          <div className="flex items-center mt-1">
            <span className="flex items-center text-green-600 text-xs font-medium">
              <ArrowUp size={14} className="mr-1" />
              15.8%
            </span>
            <span className="text-gray-500 text-xs ml-1">vs. previous period</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500">Conversions</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{stats.conversions.toLocaleString()}</p>
          <div className="flex items-center mt-1">
            <span className="flex items-center text-red-600 text-xs font-medium">
              <ArrowDown size={14} className="mr-1" />
              3.2%
            </span>
            <span className="text-gray-500 text-xs ml-1">vs. previous period</span>
          </div>
        </div>
      </div>
      
      {/* Events table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Events</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Event Type</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Visitor ID</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Source</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Campaign</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Page URL</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-600">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${eventTypeColors[event.event_type] || 'bg-gray-100 text-gray-800'}`}>
                      {event.event_type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <span className="text-gray-700">{event.visitor_id}</span>
                      {event.email_hash && (
                        <span className="block text-xs text-gray-500 mt-1">Email: {event.email_hash}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <span className="text-gray-700">{event.utm_source || 'direct'}</span>
                      {event.utm_medium && (
                        <span className="block text-xs text-gray-500 mt-1">Medium: {event.utmMedium}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {event.utm_campaign || <span className="text-gray-400">None</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-gray-700 truncate block max-w-[200px]" title={event.page_url}>
                      {event.page_url}
                    </span>
                    {event.referrer && (
                      <span className="block text-xs text-gray-500 mt-1 truncate max-w-[200px]" title={event.referrer}>
                        Ref: {event.referrer}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}
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
    </div>
  );
};

export default EventsPage;