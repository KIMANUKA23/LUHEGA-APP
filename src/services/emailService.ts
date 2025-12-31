// Email Service using Brevo (formerly Sendinblue)
// Sends email notifications for feedback, alerts, etc.

const BREVO_API_KEY = process.env.EXPO_PUBLIC_BREVO_API_KEY || '';
const DEVELOPER_EMAIL = process.env.EXPO_PUBLIC_DEVELOPER_EMAIL || 'developer@example.com';
const SENDER_EMAIL = process.env.EXPO_PUBLIC_SENDER_EMAIL || 'noreply@luhega.com';
const SENDER_NAME = process.env.EXPO_PUBLIC_SENDER_NAME || 'LUHEGA App';

export type EmailData = {
    to: string;
    toName?: string;
    subject: string;
    htmlContent?: string;
    textContent?: string;
};

/**
 * Send an email using Brevo's Transactional Email API
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
    if (!BREVO_API_KEY) {
        console.warn('📧 [Email] Brevo API key not configured, skipping email send.');
        return false;
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: SENDER_NAME,
                    email: SENDER_EMAIL,
                },
                to: [
                    {
                        email: emailData.to,
                        name: emailData.toName || emailData.to,
                    },
                ],
                subject: emailData.subject,
                htmlContent: emailData.htmlContent || `<p>${emailData.textContent}</p>`,
                textContent: emailData.textContent || '',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.log('📧 [Email] Brevo API error:', errorData);
            return false;
        }

        console.log('📧 [Email] Sent successfully to:', emailData.to);
        return true;
    } catch (error) {
        console.log('📧 [Email] Error sending email:', error);
        return false;
    }
}

/**
 * Send a feedback notification email to the developer
 */
export async function sendFeedbackNotification(feedback: {
    type: string;
    subject: string;
    message: string;
    userName?: string;
    userEmail?: string;
}): Promise<boolean> {
    const typeEmoji = {
        bug: '🐛',
        feature: '✨',
        improvement: '📈',
        other: '💬',
    }[feedback.type] || '📝';

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #007BFF 0%, #0056b3 100%); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">
          ${typeEmoji} New Feedback Received
        </h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
        <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${feedback.type.toUpperCase()}</p>
        <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${feedback.subject}</p>
        ${feedback.userName ? `<p style="margin: 0 0 10px 0;"><strong>From:</strong> ${feedback.userName} ${feedback.userEmail ? `(${feedback.userEmail})` : ''}</p>` : '<p style="margin: 0 0 10px 0;"><strong>From:</strong> Anonymous User</p>'}
      </div>
      
      <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-top: none;">
        <h3 style="margin: 0 0 10px 0; color: #333;">Message:</h3>
        <p style="margin: 0; color: #555; line-height: 1.6; white-space: pre-wrap;">${feedback.message}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none; text-align: center;">
        <p style="margin: 0; color: #888; font-size: 12px;">
          This email was sent from the LUHEGA App feedback system.
        </p>
      </div>
    </div>
  `;

    return sendEmail({
        to: DEVELOPER_EMAIL,
        toName: 'LUHEGA Developer',
        subject: `${typeEmoji} [LUHEGA Feedback] ${feedback.type.toUpperCase()}: ${feedback.subject}`,
        htmlContent,
        textContent: `New ${feedback.type} feedback: ${feedback.subject}\n\n${feedback.message}`,
    });
}
