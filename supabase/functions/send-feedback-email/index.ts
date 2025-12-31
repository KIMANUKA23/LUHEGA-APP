// Supabase Edge Function: send-feedback-email
// Sends feedback notification emails to the developer
// @ts-ignore - Deno import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-ignore - Deno global
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
// @ts-ignore - Deno global
const SMTP_FROM = Deno.env.get('SMTP_FROM') || 'noreply@luhega.com'
// @ts-ignore - Deno global
const DEVELOPER_EMAIL = Deno.env.get('DEVELOPER_EMAIL') || 'mathiasgavument@gmail.com'


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackEmailRequest {
    type: string
    subject: string
    message: string
    userName?: string
    userEmail?: string
}

serve(async (req: Request) => {

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { type, subject, message, userName, userEmail }: FeedbackEmailRequest = await req.json()

        if (!BREVO_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'BREVO_API_KEY is not configured in Supabase secrets.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const typeEmoji: Record<string, string> = {
            bug: '🐛',
            feature: '✨',
            improvement: '📈',
            other: '💬',
        }
        const emoji = typeEmoji[type] || '📝'

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #007BFF 0%, #0056b3 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">
            ${emoji} New Feedback Received
          </h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
          <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${type.toUpperCase()}</p>
          <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject}</p>
          ${userName ? `<p style="margin: 0 0 10px 0;"><strong>From:</strong> ${userName} ${userEmail ? `(${userEmail})` : ''}</p>` : '<p style="margin: 0 0 10px 0;"><strong>From:</strong> Anonymous User</p>'}
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-top: none;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Message:</h3>
          <p style="margin: 0; color: #555; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none; text-align: center;">
          <p style="margin: 0; color: #888; font-size: 12px;">
            This email was sent from the LUHEGA App feedback system.
          </p>
        </div>
      </div>
    `

        // Send email via Brevo API
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: 'LUHEGA App Feedback',
                    email: SMTP_FROM
                },
                to: [
                    {
                        email: DEVELOPER_EMAIL,
                        name: 'LUHEGA Developer'
                    }
                ],
                subject: `${emoji} [LUHEGA Feedback] ${type.toUpperCase()}: ${subject}`,
                htmlContent: htmlContent,
                textContent: `New ${type} feedback: ${subject}\n\nFrom: ${userName || 'Anonymous'}\n\n${message}`,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.message || 'Failed to send email via Brevo')
        }

        return new Response(
            JSON.stringify({ success: true, data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    }
})
