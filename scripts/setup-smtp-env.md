# SMTP Environment Setup for OTP Emails

## Required Environment Variables

Add these to your Supabase Edge Function environment variables:

```bash
# SMTP Configuration (for Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@luhega.com

# Alternative: Use SendGrid API (recommended)
SENDGRID_API_KEY=your-sendgrid-api-key
SMTP_FROM=noreply@luhega.com
```

## Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail on [device name]"
   - Use this app password as SMTP_PASSWORD

3. **Configure Supabase**:
   - Go to Supabase Dashboard → Edge Functions
   - Add environment variables listed above

## SendGrid Alternative (Recommended)

1. **Create SendGrid Account** at https://sendgrid.com/
2. **Generate API Key**:
   - Go to Settings → API Keys
   - Create API Key with "Mail Send" permission
   - Copy the API key

3. **Update Edge Function** to use SendGrid instead of SMTP

## Testing

After setting up environment variables, test OTP functionality:

1. Try to login with staff email
2. Check if email with 6-digit code is received
3. Enter code to verify login

## Security Notes

- Never commit SMTP credentials to git
- Use app passwords, not regular passwords
- Consider using a transactional email service like SendGrid for production
- Set up SPF/DKIM records for better deliverability
