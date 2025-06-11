import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface EventPayload {
  client_id: string;
  visitor_id: string;
  event_type: string;
  email_hash?: string;
  utm_params?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  click_ids?: {
    fbclid?: string;
    gclid?: string;
    ttclid?: string;
    msclkid?: string;
    [key: string]: string | undefined;
  };
  timestamp: string;
  page_url: string;
  referrer?: string;
}

function validatePayload(payload: unknown): payload is EventPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as EventPayload;

  // Required fields
  if (!p.client_id || typeof p.client_id !== 'string') return false;
  if (!p.visitor_id || typeof p.visitor_id !== 'string') return false;
  if (!p.event_type || typeof p.event_type !== 'string') return false;
  if (!p.timestamp || typeof p.timestamp !== 'string') return false;
  if (!p.page_url || typeof p.page_url !== 'string') return false;

  // Validate event type
  const validEventTypes = ['pageview', 'form_submit', 'purchase', 'conversion'];
  if (!validEventTypes.includes(p.event_type)) return false;

  // Optional fields
  if (p.email_hash && typeof p.email_hash !== 'string') return false;
  if (p.email_hash && !/^[a-f0-9]{64}$/.test(p.email_hash)) return false;
  if (p.referrer && typeof p.referrer !== 'string') return false;

  return true;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate payload
    const payload = await req.json();
    if (!validatePayload(payload)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate client exists
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("id")
      .eq("id", payload.client_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Invalid client_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure visitor exists
    const { error: visitorError } = await supabaseClient
      .from("visitors")
      .upsert({
        visitor_id: payload.visitor_id,
        client_id: payload.client_id,
        email_hash: payload.email_hash,
      }, {
        onConflict: "visitor_id"
      });

    if (visitorError) {
      console.error("Error upserting visitor:", visitorError);
      return new Response(
        JSON.stringify({ error: "Failed to process visitor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create event record
    const eventRecord = {
      visitor_id: payload.visitor_id,
      client_id: payload.client_id,
      event_type: payload.event_type,
      utm_source: payload.utm_params?.source,
      utm_medium: payload.utm_params?.medium,
      utm_campaign: payload.utm_params?.campaign,
      utm_content: payload.utm_params?.content,
      utm_term: payload.utm_params?.term,
      click_ids: payload.click_ids && Object.keys(payload.click_ids).length > 0
        ? payload.click_ids
        : null,
      email_hash: payload.email_hash,
      page_url: payload.page_url,
      referrer: payload.referrer,
      timestamp: payload.timestamp
    };

    const { error: eventError } = await supabaseClient
      .from("events")
      .insert(eventRecord);

    if (eventError) {
      console.error("Error inserting event:", eventError);
      return new Response(
        JSON.stringify({ error: "Failed to store event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});