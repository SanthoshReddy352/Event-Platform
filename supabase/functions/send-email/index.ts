// supabase/functions/send-email/index.ts
/// <reference types="https://deno.land/x/deno/module.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Get the Resend API key from the secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Get fields from the request body
    const { to, subject, html, from, reply_to } = await req.json()

    // Validate inputs
    if (!to || !subject || !html || !from) {
      throw new Error('Missing required fields: to, from, subject, html')
    }

    if (!RESEND_API_KEY) {
      throw new Error('No email service configured. Set RESEND_API_KEY as a Supabase secret.')
    }

    // Construct the payload for Resend
    // This correctly includes your "from" and "reply_to"
    const payload = {
      from: from,
      to: [to],
      subject: subject,
      html: html,
      reply_to: reply_to || undefined // Add reply_to if it exists
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text()
      // This will now send the *actual* Resend error back to your browser
      throw new Error(`Resend API error: ${error}`)
    }

    const result = await response.json()
    
    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400, // This is the 400 error you are seeing
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})