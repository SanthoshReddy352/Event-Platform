// lib/email.js
// Email utility using Supabase for sending notifications

/**
 * Send email using external email service
 * For production, integrate with Resend, SendGrid, or other email service
 * For now, this is a placeholder that logs emails
 */

const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || null;
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || null;

/**
 * Send registration approval email to participant
 */
export async function sendApprovalEmail({ to, participantName, eventTitle, eventDate }) {
  const subject = `✅ Registration Approved - ${eventTitle}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00629B 0%, #004d7a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #00629B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .success-icon { font-size: 48px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">🎉</div>
          <h1>Registration Approved!</h1>
        </div>
        <div class="content">
          <p>Dear ${participantName || 'Participant'},</p>
          
          <p>Congratulations! Your registration for <strong>${eventTitle}</strong> has been approved.</p>
          
          ${eventDate ? `<p><strong>Event Date:</strong> ${new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          
          <p>We're excited to have you join us! You will receive further details about the event closer to the date.</p>
          
          <p>If you have any questions, please don't hesitate to reach out to the event organizers.</p>
          
          <p>See you at the event!</p>
          
          <p>Best regards,<br>IEEE Club Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html: htmlContent });
}

/**
 * Send registration rejection email to participant
 */
export async function sendRejectionEmail({ to, participantName, eventTitle, reason }) {
  const subject = `Registration Status Update - ${eventTitle}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #00629B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Registration Update</h1>
        </div>
        <div class="content">
          <p>Dear ${participantName || 'Participant'},</p>
          
          <p>Thank you for your interest in <strong>${eventTitle}</strong>.</p>
          
          <p>Unfortunately, we are unable to approve your registration at this time${reason ? ': ' + reason : '.'}</p>
          
          <p>You are welcome to register again for future events. Please check our events page for upcoming opportunities.</p>
          
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/events" class="button">Browse Events</a>
          
          <p>If you have any questions or concerns, please contact the event organizers.</p>
          
          <p>Best regards,<br>IEEE Club Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html: htmlContent });
}

/**
 * Send notification to admin about new registration
 */
export async function sendAdminNotification({ to, adminName, eventTitle, participantName, participantEmail }) {
  const subject = `🔔 New Registration - ${eventTitle}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00629B 0%, #004d7a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #00629B; margin: 20px 0; }
        .button { display: inline-block; background: #00629B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Registration</h1>
        </div>
        <div class="content">
          <p>Hello ${adminName || 'Admin'},</p>
          
          <p>A new participant has registered for your event and is awaiting approval.</p>
          
          <div class="info-box">
            <p><strong>Event:</strong> ${eventTitle}</p>
            <p><strong>Participant:</strong> ${participantName || 'N/A'}</p>
            <p><strong>Email:</strong> ${participantEmail}</p>
          </div>
          
          <p>Please review and approve or reject this registration from your admin dashboard.</p>
          
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/registrations" class="button">Review Registration</a>
          
          <p>Best regards,<br>IEEE Club System</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from your IEEE Club event management system.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html: htmlContent });
}

/**
 * Core email sending function
 * Supports multiple email providers
 */
async function sendEmail({ to, subject, html }) {
  console.log('=== EMAIL SEND REQUEST ===');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('HTML Content Length:', html.length);
  
  const from = process.env.EMAIL_FROM || 'IEEE Club <noreply@ieeeclub.com>';
  
  // Option 1: Use Supabase Edge Function (Recommended)
  const supabaseFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_URL;
  if (supabaseFunctionUrl) {
    try {
      const response = await fetch(supabaseFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ to, subject, html, from })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Supabase function error: ${error}`);
      }
      
      const result = await response.json();
      console.log('✅ Email sent via Supabase Edge Function:', result);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error sending email via Supabase:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Option 2: Direct Email Service Integration (if configured)
  if (EMAIL_SERVICE_URL && EMAIL_API_KEY) {
    try {
      const response = await fetch(EMAIL_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMAIL_API_KEY}`
        },
        body: JSON.stringify({ from, to, subject, html })
      });
      
      if (!response.ok) {
        throw new Error(`Email service error: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Email sent successfully:', result);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, error: error.message };
    }
  }
  
  // For development: just log the email
  console.log('⚠️  EMAIL SERVICE NOT CONFIGURED');
  console.log('📧 Email Preview:');
  console.log('   To:', to);
  console.log('   From:', from);
  console.log('   Subject:', subject);
  console.log('');
  console.log('💡 To enable actual email sending:');
  console.log('   1. Set up Supabase Edge Function (see EMAIL_SETUP.md)');
  console.log('   2. Or set EMAIL_SERVICE_URL and EMAIL_API_KEY in .env');
  console.log('==========================');
  
  return { success: true, message: 'Email logged (service not configured)' };
}

/**
 * Get admin email by user ID
 */
export async function getAdminEmail(userId) {
  // This would query your database to get the admin's email
  // For now, return a placeholder
  // You'll need to import supabase here and query auth.users
  return null;
}
