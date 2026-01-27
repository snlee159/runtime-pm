import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Origin checking
function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
  const allowOrigin = allowedOrigins.length === 0 
    ? (origin || "*")
    : (origin && allowedOrigins.some(o => origin.includes(o.trim()))) 
      ? origin 
      : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// Rate limiting (in-memory, per function instance)
const rateLimits = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// Allowed tables for data operations
const ALLOWED_TABLES = [
  "tasks",
  "projects",
  "daily_checkins",
  "daily_plans",
  "daily_wraps",
  "weekly_summaries",
  "task_dependencies",
  "user_profiles"
];

// Validate table name
function validateTable(table: string): boolean {
  return ALLOWED_TABLES.includes(table);
}

// Validate operation
function validateOperation(operation: string): boolean {
  return ["select", "insert", "update", "delete", "upsert"].includes(operation);
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get authorization token from header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user with token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: 100 requests per minute per user
    if (!checkRateLimit(`data:${user.id}`, 100, 60 * 1000)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { table, operation, filters, data: requestData, select, options } = await req.json();

    // Validate inputs
    if (!table || !validateTable(table)) {
      return new Response(
        JSON.stringify({ error: "Invalid or disallowed table name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!operation || !validateOperation(operation)) {
      return new Response(
        JSON.stringify({ error: "Invalid operation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query
    let query = supabase.from(table);

    // Apply operation
    switch (operation) {
      case "select": {
        query = query.select(select || "*");
        
        // Apply filters
        if (filters) {
          // Always filter by user_id for security
          query = query.eq("user_id", user.id);
          
          // Apply additional filters
          for (const [key, value] of Object.entries(filters)) {
            if (key === "eq" && typeof value === "object") {
              for (const [field, fieldValue] of Object.entries(value)) {
                query = query.eq(field, fieldValue);
              }
            } else if (key === "in" && typeof value === "object") {
              for (const [field, fieldValue] of Object.entries(value)) {
                if (Array.isArray(fieldValue)) {
                  query = query.in(field, fieldValue);
                }
              }
            } else if (key === "order" && typeof value === "object") {
              const orderValue = value as { column: string; ascending?: boolean };
              query = query.order(orderValue.column, { ascending: orderValue.ascending ?? true });
            } else if (key === "limit" && typeof value === "number") {
              query = query.limit(value);
            } else if (key === "single" && value === true) {
              // Will be applied after execution
            }
          }
        } else {
          // Default: filter by user_id
          query = query.eq("user_id", user.id);
        }

        // Execute query
        const result = filters?.single ? await query.single() : await query;
        
        return new Response(
          JSON.stringify({ data: result.data, error: result.error }),
          { status: result.error ? 400 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "insert": {
        if (!requestData) {
          return new Response(
            JSON.stringify({ error: "Missing data for insert operation" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Ensure user_id is set
        const dataWithUser = Array.isArray(requestData)
          ? requestData.map(item => ({ ...item, user_id: user.id }))
          : { ...requestData, user_id: user.id };

        const result = await query.insert(dataWithUser).select();
        
        return new Response(
          JSON.stringify({ data: result.data, error: result.error }),
          { status: result.error ? 400 : 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        if (!requestData || !filters) {
          return new Response(
            JSON.stringify({ error: "Missing data or filters for update operation" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Always filter by user_id for security
        query = query.eq("user_id", user.id);

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (key === "eq" && typeof value === "object") {
            for (const [field, fieldValue] of Object.entries(value)) {
              query = query.eq(field, fieldValue);
            }
          }
        }

        const result = await query.update(requestData).select();
        
        return new Response(
          JSON.stringify({ data: result.data, error: result.error }),
          { status: result.error ? 400 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "upsert": {
        if (!requestData) {
          return new Response(
            JSON.stringify({ error: "Missing data for upsert operation" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Ensure user_id is set
        const dataWithUser = Array.isArray(requestData)
          ? requestData.map(item => ({ ...item, user_id: user.id }))
          : { ...requestData, user_id: user.id };

        const result = await query.upsert(dataWithUser, options).select();
        
        return new Response(
          JSON.stringify({ data: result.data, error: result.error }),
          { status: result.error ? 400 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!filters) {
          return new Response(
            JSON.stringify({ error: "Missing filters for delete operation" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Always filter by user_id for security
        query = query.eq("user_id", user.id);

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          if (key === "eq" && typeof value === "object") {
            for (const [field, fieldValue] of Object.entries(value)) {
              query = query.eq(field, fieldValue);
            }
          }
        }

        const result = await query.delete();
        
        return new Response(
          JSON.stringify({ data: result.data, error: result.error }),
          { status: result.error ? 400 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unsupported operation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("Error in data-operations:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
