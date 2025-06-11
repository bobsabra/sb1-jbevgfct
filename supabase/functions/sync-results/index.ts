import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// Create Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// CORS headers for preflight requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
};

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Get client API key from headers
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Validate API key and get client ID and webhook URL
    const { data: clientData, error: clientError } = await supabaseClient
      .from("clients")
      .select("id, webhook_url")
      .eq("api_key", apiKey)
      .single();

    if (clientError || !clientData) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Check if we have a webhook URL configured
    if (!clientData.webhook_url) {
      return new Response(JSON.stringify({ error: "No webhook URL configured" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const url = new URL(req.url);
    const params = url.searchParams;
    const since = params.get("since") || getDefaultSince();
    const model = params.get("model") || "last_touch";

    // Get attribution results summarized by source
    const query = `
      WITH source_totals AS (
        SELECT
          COALESCE(ar.source, 'direct') as source,
          COALESCE(ar.campaign, 'none') as campaign,
          COALESCE(ar.ad_id, 'none') as ad_id,
          SUM(ar.credit) as conversions
        FROM
          attribution_results ar          
        WHERE
          ar.client_id = $1
          AND ar.attribution_model = $2
          AND ar.timestamp >= $3
        GROUP BY
          source, campaign, ad_id
      )
      SELECT * FROM source_totals
      ORDER BY conversions DESC
    `;

    const { data, error } = await supabaseClient.rpc("run_query", {
      query_text: query,
      params: [clientData.id, model, since]
    });

    if (error) {
      console.error("Error getting attribution results:", error);
      return new Response(JSON.stringify({ error: "Failed to get attribution results" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Format data for Grower API
    const growerPayload = {
      client_id: clientData.id,
      results: data.map((row: any) => ({
        source: row.source,
        campaign: row.campaign === 'none' ? null : row.campaign,
        ad_id: row.ad_id === 'none' ? null : row.ad_id,
        conversions: parseFloat(row.conversions)
      }))
    };

    // Send results to client webhook
    try {
      const webhookResponse = await fetch(clientData.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Version": "1.0"
        },
        body: JSON.stringify(growerPayload)
      });
      
      if (!webhookResponse.ok) {
        throw new Error(`Webhook responded with ${webhookResponse.status}`);
      }
      
      // Track this sync in our database
      await supabaseClient
        .from("sync_history")
        .insert({
          client_id: clientData.id,
          model,
          since,
          status: "success",
          record_count: data.length
        });
      
      return new Response(JSON.stringify({ 
        success: true,
        sync_timestamp: new Date().toISOString(),
        result_count: data.length
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      
    } catch (webhookError) {
      console.error("Error sending to webhook:", webhookError);
      
      // Track this failed sync
      await supabaseClient
        .from("sync_history")
        .insert({
          client_id: clientData.id,
          model,
          since,
          status: "failed",
          error_message: webhookError.message
        });
      
      return new Response(JSON.stringify({ 
        error: "Failed to send results to webhook",
        detail: webhookError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

/**
 * Get default since date (yesterday)
 */
function getDefaultSince(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday.toISOString();
}