import React, { useState, useEffect } from 'react';
import { Activity, Circle, ExternalLink, Globe, Mail, MousePointer } from 'lucide-react';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';
import { Event } from '../types';

interface TouchpointTimelineProps {
  visitorId: string;
  onClose?: () => void;
}

const supabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const eventTypeIcons: Record<string, React.ReactNode> = {
  page_view: <Globe size={16} className="text-blue-500" />,
  form_submit: <Mail size={16} className="text-purple-500" />,
  conversion: <Activity size={16} className="text-green-500" />,
  click: <MousePointer size={16} className="text-amber-500" />
};

const TouchpointTimeline: React.FC<TouchpointTimelineProps> = ({ visitorId, onClose }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabaseClient
          .from('events')
          .select('*')
          .eq('visitor_id', visitorId)
          .order('timestamp', { ascending: true });

        if (error) {
          setError(error.message);
        } else {
          setEvents(data || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [visitorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
        Error loading touchpoints: {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No touchpoints found for this visitor.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Visitor Journey</h3>
          <p className="text-sm text-gray-500">Visitor ID: {visitorId}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <Circle size={20} />
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200"></div>
        
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative pl-10">
              <div className="absolute left-0 p-1 bg-white rounded-full">
                {eventTypeIcons[event.event_type] || <Circle size={16} className="text-gray-400" />}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 capitalize">
                      {event.event_type.replace('_', ' ')}
                    </h4>
                    <time className="text-xs text-gray-500">
                      {format(new Date(event.timestamp), 'MMM d, yyyy h:mm:ss a')}
                    </time>
                  </div>
                  
                  {event.page_url && (
                    <a
                      href={event.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <div className="mt-2 space-y-2 text-sm">
                  {event.page_url && (
                    <p className="text-gray-600">
                      Page: <span className="font-mono text-xs">{event.page_url}</span>
                    </p>
                  )}
                  
                  {event.referrer && (
                    <p className="text-gray-600">
                      Referrer: <span className="font-mono text-xs">{event.referrer}</span>
                    </p>
                  )}

                  {(event.utm_source || event.utm_medium || event.utm_campaign) && (
                    <div className="mt-2 space-x-2">
                      {event.utm_source && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          source: {event.utm_source}
                        </span>
                      )}
                      {event.utm_medium && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          medium: {event.utm_medium}
                        </span>
                      )}
                      {event.utm_campaign && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          campaign: {event.utm_campaign}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TouchpointTimeline;