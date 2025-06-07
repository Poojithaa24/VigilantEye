import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config } from "https://deno.land/x/dotenv@v3.0.0/mod.ts";

// Load environment variables from .env file
const env = config({ path: './variables.env' });
console.log("Loaded environment variables:", env); // Debugging line to check loaded variables

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface AlertRequest {
  message: string;
  phoneNumber?: string;
  detectionType: 'violence' | 'weapon';
  timestamp: string;
  confidence?: number;
  location?: string;
}

const alertCache = new Map<string, number>();
const ALERT_COOLDOWN = 60 * 1000;

// Add debug logging initialization
console.log("Alert service starting...");
console.log("Deno version:", Deno.version);

serve(async (req) => {
  console.log("\nNew request:", req.method, req.url);

  // Preflight handling
  if (req.method === 'GET') {
    if (req.url.endsWith('/favicon.ico')) {
      return new Response(null, { 
        status: 204, // No content
        headers: corsHeaders 
      });
    }
    
    return new Response(
      JSON.stringify({ 
        service: "Security Alert System",
        status: "Operational",
        endpoints: {
          alert: "POST /"
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
  }

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    console.log("Handling preflight request");
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate POST method
  if (req.method !== 'POST') {
    console.error("Invalid method:", req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Environment validation
    const requiredEnv = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
      'DEFAULT_ALERT_PHONE'
    ];

    // Check if environment variables are available
    const envStatus = requiredEnv.map(v => ({
      name: v,
      exists: !!env[v],
      value: env[v]?.slice(0, 4) + '...'
    }));
    console.log("Environment status:", envStatus);

    const missing = requiredEnv.filter(v => !env[v]);
    if (missing.length) {
      console.error('Missing env vars:', missing);
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    // Use variables from the loaded env object
    const twilioAccountSid = env.TWILIO_ACCOUNT_SID!;
    const twilioAuthToken = env.TWILIO_AUTH_TOKEN!;
    const twilioPhoneNumber = env.TWILIO_PHONE_NUMBER!;
    const defaultAlertPhone = env.DEFAULT_ALERT_PHONE!;

    // Request validation
    let body: AlertRequest;
    try {
      const rawBody = await req.text();
      console.log("Raw request body:", rawBody);
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("JSON parse error:", e);
      throw new Error('Invalid JSON payload');
    }

    console.log("Parsed request body:", body);

    const { 
      message,
      phoneNumber,
      detectionType,
      timestamp,
      confidence = 0,
      location = 'unknown'
    } = body;

    // Validation checks
    if (!message?.trim()) {
      console.error("Missing message");
      throw new Error('Message is required');
    }
    if (!detectionType) {
      console.error("Missing detectionType");
      throw new Error('Detection type is required');
    }
    if (!timestamp) {
      console.error("Missing timestamp");
      throw new Error('Timestamp is required');
    }

    // Phone number validation
    const recipient = phoneNumber || defaultAlertPhone;
    console.log("Using recipient:", recipient);
    if (!/^\+[1-9]\d{1,14}$/.test(recipient)) {
      console.error("Invalid phone format:", recipient);
      throw new Error(`Invalid phone number format: ${recipient}`);
    }

    // Rate limiting
    const now = Date.now();
    const lastAlert = alertCache.get(recipient) || 0;
    if (now - lastAlert < ALERT_COOLDOWN) {
      console.log("Rate limited:", recipient);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Alert cooldown active' 
        }),
        { status: 429, headers: corsHeaders }
      );
    }

    // Message construction
    const alertBody = `ALERT: ${detectionType} at ${location}. Confidence: ${Math.round(confidence * 100)}%.`;


    // Twilio API call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    console.log('Sending to:', recipient);
    console.log('From number:', twilioPhoneNumber);
    console.log('Message body:', alertBody);
    console.log('Twilio URL:', twilioUrl);

    // Send SMS using Twilio API
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: recipient,
        From: twilioPhoneNumber,
        Body: alertBody,
      }),
    });

    const result = await response.json();
    console.log('Twilio response status:', response.status);
    console.log('Twilio response body:', result);

    // Handle Twilio error
    if (!response.ok) {
      let errorMessage = result.message || `Twilio error: ${response.status}`;
      
      // Handle common Twilio error codes
      switch (result.code) {
        case 21211:
          errorMessage = `Invalid phone number: ${recipient}`;
          break;
        case 21614:
          errorMessage = `Twilio number ${twilioPhoneNumber} not SMS enabled`;
          break;
        case 21408:
          errorMessage = "Account not authorized for this operation";
          break;
      }
      
      console.error("Twilio API error:", result);
      throw new Error(errorMessage);
    }

    // Update cache
    alertCache.set(recipient, now);
    console.log("Alert sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        sid: result.sid,
        message: 'Alert delivered'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error processing alert:', error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
