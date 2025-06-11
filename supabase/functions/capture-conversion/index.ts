import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

interface AttributionModelSettings {
  lookback_window_days: number;
  decay_base?: number;
  first_touch_weight?: number;
  last_touch_weight?: number;
  middle_touch_weight?: number;
}

interface Touchpoint {
  id: string;
  timestamp: string;
  source: string;
  medium?: string;
  campaign?: string;
  ad_id?: string;
}

// Types
interface ConversionPayload {
  client_id: string;
  visitor_id: string;
  event_type: 'conversion';
  conversion_type: string;
  value?: number;
  currency?: string;
  email_hash?: string;
  utm_params?: UTMParams;
  click_ids?: ClickIds;
  timestamp: string;
  page_url: string;
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

async function calculateAttribution(
  touchpoints: Touchpoint[],
  modelType: string,
  settings: AttributionModelSettings
): Promise<{ [key: string]: number }> {
  const weights: { [key: string]: number } = {};

  if (touchpoints.length === 0) {
    return weights;
  }

  switch (modelType) {
    case 'first_touch':
      weights[touchpoints[0].id] = 1;
      break;

    case 'last_touch':
      weights[touchpoints[touchpoints.length - 1].id] = 1;
      break;

    case 'linear':
      const weight = 1 / touchpoints.length;
      touchpoints.forEach(tp => {
        weights[tp.id] = weight;
      });
      break;

    case 'time_decay':
      const decayBase = settings.decay_base || 0.7;
      const lastTs = new Date(touchpoints[touchpoints.length - 1].timestamp).getTime();
      let totalWeight = 0;

      touchpoints.forEach(tp => {
        const daysBefore = (lastTs - new Date(tp.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        const weight = Math.pow(decayBase, daysBefore);
        totalWeight += weight;
        weights[tp.id] = weight; // Store unnormalized weight
      });

      // Normalize weights
      Object.keys(weights).forEach(id => {
        weights[id] = weights[id] / totalWeight;
      });
      break;

    default:
      // Default to last-touch attribution
      weights[touchpoints[touchpoints.length - 1].id] = 1;
      break;
  }

  return weights;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
};

serve(async (req: Request) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse payload
    const payload: ConversionPayload = await req.json();

    // Store the conversion first
    const { data: conversion, error: conversionError } = await supabaseClient
      .from("conversions")
      .insert({
        visitor_id: payload.visitor_id,
        client_id: payload.client_id,
        conversion_type: payload.conversion_type,
        value: payload.value,
        currency: payload.currency,
        email_hash: payload.email_hash,
        timestamp: payload.timestamp
      })
      .select()
      .single();

    if (conversionError || !conversion) {
      console.error("Error storing conversion:", conversionError);
      return new Response(
        JSON.stringify({ error: "Failed to store conversion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get attribution model settings
    const { data: modelSettings } = await supabaseClient
      .from("attribution_models")
      .select("name, settings")
      .eq("client_id", payload.client_id)
      .eq("is_active", true)
      .single();

    const modelName = modelSettings?.name || "last_touch";
    const lookbackDays = modelSettings?.settings?.lookback_window_days || 30;
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    // Get all visitor IDs for this user
    const visitorIds = [payload.visitor_id];
    if (payload.email_hash) {
      const { data: identityMap } = await supabaseClient
        .from("identity_map")
        .select("visitor_ids")
        .eq("email_hash", payload.email_hash)
        .eq("client_id", payload.client_id)
        .single();

      if (identityMap?.visitor_ids) {
        visitorIds.push(...identityMap.visitor_ids);
      }
    }

    // Get all touchpoints
    const { data: touchpoints } = await supabaseClient
      .from("events")
      .select("id, timestamp, utm_source, utm_medium, utm_campaign, click_ids")
      .in("visitor_id", visitorIds)
      .eq("client_id", payload.client_id)
      .gte("timestamp", lookbackDate.toISOString())
      .lt("timestamp", payload.timestamp)
      .order("timestamp", { ascending: true });

    if (!touchpoints?.length) {
      // No touchpoints found, attribute to direct
      await supabaseClient
        .from("attribution_results")
        .insert({
          client_id: payload.client_id,
          conversion_id: conversion.id,
          visitor_id: payload.visitor_id,
          attribution_model: modelName,
          attribution_weight: 1,
          source: "direct",
          timestamp: payload.timestamp,
          credit: payload.value || 0 // Assign full credit to direct
        });

      return new Response(
        JSON.stringify({ success: true, attribution: "direct" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate attribution weights
    const formattedTouchpoints = touchpoints.map(tp => ({
      id: tp.id,
      timestamp: tp.timestamp,
      source: tp.utm_source || "direct",
      medium: tp.utm_medium,
      campaign: tp.utm_campaign,
      ad_id: tp.click_ids?.gclid || tp.click_ids?.fbclid || tp.click_ids?.ttclid || tp.click_ids?.msclkid
    }));

    const weights = await calculateAttribution(
      formattedTouchpoints,
      modelName,
      modelSettings?.settings || { lookback_window_days: 30 }
    );

    // Store attribution results
    const attributionResults = touchpoints.map(tp => ({
      client_id: payload.client_id,
      conversion_id: conversion.id,
      visitor_id: tp.visitor_id,
      attributed_event_id: tp.id,
      attribution_model: modelName,
      attribution_weight: weights[tp.id] || 0,
      source: tp.utm_source || "direct",
      medium: tp.utm_medium,
      campaign: tp.utm_campaign,
      ad_id: tp.click_ids?.gclid || tp.click_ids?.fbclid || tp.click_ids?.ttclid || tp.click_ids?.msclkid,
      timestamp: payload.timestamp,
      credit: (weights[tp.id] || 0) * (payload.value || 0) // Calculate proportional credit
    }));

    const { error: attributionError } = await supabaseClient
      .from("attribution_results")
      .insert(attributionResults);

    if (attributionError) {
      console.error("Error storing attribution results:", attributionError);
      return new Response(
        JSON.stringify({ error: "Failed to store attribution results" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        conversion_id: conversion.id,
        attribution_count: attributionResults.length,
        total_credit: payload.value || 0,
        model: modelName
      }),
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