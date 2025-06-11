import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// Types
interface EventData {
  visitor_id: string;
  event_type: string;
  email_hash?: string;
  utm_params?: UTMParams;
  click_ids?: ClickIds;
  timestamp: number;
  page_url: string;
  referrer?: string;
  client_id?: string;
}

interface DebugLog {
  timestamp: string;
  stage: string;
  details: unknown;
  duration_ms?: number;
}

interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

interface ClickIds {
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  msclkid?: string;
  [key: string]: string | undefined;
}

// Create Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// CORS headers for preflight requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
};

serve(async (req: Request) => {
  const startTime = performance.now();
  const debugLog: DebugLog[] = [];
  
  const addLog = (stage: string, details: unknown) => {
    debugLog.push({
      timestamp: new Date().toISOString(),
      stage,
      details,
      duration_ms: Math.round(performance.now() - startTime)
    });
  };

  try {
    addLog('function_start', { method: req.method });
    
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      console.log('Invalid method:', req.method);
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Parse request body
    const eventData: EventData = await req.json();
    addLog('request_parsed', { 
      event_data: eventData,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    // Validate client ID
    if (!eventData.client_id) {
      addLog('validation_error', { error: 'Missing client ID' });
      return new Response(JSON.stringify({ error: "Client ID is required" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Validate client exists
    const { data: clientData, error: clientError } = await supabaseClient
      .from("clients")
      .select("id, domain")
      .eq("id", eventData.client_id)
      .single();

    addLog('client_lookup', { 
      success: !clientError,
      data: clientData,
      error: clientError
    });

    if (clientError || !clientData) {
      return new Response(JSON.stringify({ error: "Invalid client ID" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Add client ID to event data
    eventData.client_id = clientData.id;

    // Ensure visitor record exists
    addLog('visitor_upsert_start', {
      visitor_id: eventData.visitor_id
    });

    const { error: visitorError } = await supabaseClient
      .from("visitors")
      .upsert({
        visitor_id: eventData.visitor_id,
        email_hash: eventData.email_hash,
        client_id: clientData.id,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: "visitor_id",
        ignoreDuplicates: false
      });

    if (visitorError) {
      addLog('visitor_upsert_error', { error: visitorError });
    } else {
      addLog('visitor_upsert_success', { visitor_id: eventData.visitor_id });
      // Continue processing - we'll log the event anyway
    }

    // Prepare event record
    const eventRecord = {
      visitor_id: eventData.visitor_id,
      event_type: eventData.event_type,
      utm_source: eventData.utm_params?.source,
      utm_medium: eventData.utm_params?.medium,
      utm_campaign: eventData.utm_params?.campaign,
      utm_content: eventData.utm_params?.content,
      utm_term: eventData.utm_params?.term,
      fbclid: eventData.click_ids?.fbclid,
      gclid: eventData.click_ids?.gclid,
      ttclid: eventData.click_ids?.ttclid,
      msclkid: eventData.click_ids?.msclkid,
      page_url: eventData.page_url,
      referrer: eventData.referrer,
      email_hash: eventData.email_hash,
      timestamp: new Date(eventData.timestamp).toISOString(),
      client_id: clientData.id,
      debug_log: debugLog,
      request_headers: Object.fromEntries(req.headers.entries()),
      processing_time: Math.round(performance.now() - startTime)
    };

    addLog('event_record_prepared', { record: eventRecord });

    // Insert event
    const { error: eventError } = await supabaseClient
      .from("events")
      .insert(eventRecord);

    if (eventError) {
      addLog('event_insert_error', { 
        error: eventError,
        code: eventError.code,
        message: eventError.message
      });
      return new Response(JSON.stringify({ error: "Failed to store event" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // If this is a conversion event, process it separately
    if (eventData.event_type === "conversion") {
      addLog('conversion_processing', { type: 'conversion' });
      // Additional logic for conversion handling would go here
      // This would typically trigger the attribution engine
    }

    addLog('event_complete', { 
      success: true,
      duration_ms: Math.round(performance.now() - startTime)
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    addLog('unexpected_error', { error: String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});