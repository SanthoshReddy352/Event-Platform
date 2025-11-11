// lib/email.js
// Email utility using Supabase for sending notifications

// Helper to format dates consistently in emails
function formatEmailDate(dateString) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short'
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
}

/**
 * Send registration approval email to participant
 */
export async function sendApprovalEmail({ to, from, participantName, eventTitle, eventStartDate, eventEndDate, clubLogoUrl }) {
  const subject = `✅ Registration Approved - ${eventTitle}`;
  const fromName = from.name || 'EventX Team';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const websiteLogoUrl = `${baseUrl}/logo.jpg`;
  
  const formattedStartDate = formatEmailDate(eventStartDate);
  const formattedEndDate = formatEmailDate(eventEndDate);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(90deg, #ff3131, #ff914d); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #ff3131; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .success-icon { font-size: 48px; margin-bottom: 20px; }
        .date-box { background: #eee; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .logo { width: 150px; height: auto; margin-bottom: 20px; }
        .club-logo-container { text-align: center; margin-top: 30px; }
        .club-logo { width: 80px; height: 80px; border-radius: 50%; object-fit: contain; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${websiteLogoUrl}" alt="EventX Logo" class="logo">
          <div class="success-icon">🎉</div>
          <h1>Registration Approved!</h1>
        </div>
        <div class="content">
          <p>Dear ${participantName || 'Participant'},</p>
          
          <p>Congratulations! Your registration for <strong>${eventTitle}</strong> has been approved.</p>
          
          <div class="date-box">
            ${formattedStartDate ? `<strong>Event Starts:</strong> ${formattedStartDate}<br>` : ''}
            ${formattedEndDate ? `<strong>Event Ends:</strong> ${formattedEndDate}` : ''}
          </div>
          
          <p>We're excited to have you join us! You will receive further details about the event closer to the date.</p>
          
          <p>If you have any questions, please reply to this email to contact the event organizers.</p>
          
          <p>See you at the event!</p>
          
          ${clubLogoUrl ? `
            <div class="club-logo-container">
              <img src="${clubLogoUrl}" alt="${fromName} Logo" class="club-logo">
              <p style="margin-top: 5px; font-size: 14px; color: #555;">Hosted by ${fromName}</p>
            </div>
          ` : ''}

          <p>Best regards,<br>${fromName}</p>
        </div>
        <div class="footer">
          <p>This is an automated email sent on behalf of ${fromName}.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html: htmlContent, from });
}

/**
 * Send registration rejection email to participant
 */
export async function sendRejectionEmail({ to, from, participantName, eventTitle, reason, eventStartDate, eventEndDate, clubLogoUrl }) {
  const subject = `Registration Status Update - ${eventTitle}`;
  const fromName = from.name || 'EventX Team';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const websiteLogoUrl = `${baseUrl}/logo.jpg`;
  
  const formattedStartDate = formatEmailDate(eventStartDate);
  const formattedEndDate = formatEmailDate(eventEndDate);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #ff3131; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .reason-box { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
        .date-box { background: #eee; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .logo { width: 150px; height: auto; margin-bottom: 20px; }
        .club-logo-container { text-align: center; margin-top: 30px; }
        .club-logo { width: 80px; height: 80px; border-radius: 50%; object-fit: contain; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${websiteLogoUrl}" alt="EventX Logo" class="logo">
          <h1>Registration Update</h1>
        </div>
        <div class="content">
          <p>Dear ${participantName || 'Participant'},</p>
          
          <p>Thank you for your interest in <strong>${eventTitle}</strong>.</p>
          
          <div class="date-box">
            ${formattedStartDate ? `<strong>Event Starts:</strong> ${formattedStartDate}<br>` : ''}
            ${formattedEndDate ? `<strong>Event Ends:</strong> ${formattedEndDate}` : ''}
          </div>

          <p>Unfortunately, we are unable to approve your registration at this time.</p>
          
          ${reason ? `
            <div class="reason-box">
              <strong>Reason for rejection:</strong>
              <p>${reason}</p>
            </div>
          ` : ''}
          
          <p>You are welcome to register again for future events. Please check our events page for upcoming opportunities.</p>
          
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/events" class="button">Browse Events</a>
          
          <p>If you have any questions or concerns, please reply to this email to contact the event organizers.</p>
          
          ${clubLogoUrl ? `
            <div class="club-logo-container">
              <img src="${clubLogoUrl}" alt="${fromName} Logo" class="club-logo">
              <p style="margin-top: 5px; font-size: 14px; color: #555;">Hosted by ${fromName}</p>
            </div>
          ` : ''}

          <p>Best regards,<br>${fromName}</p>
        </div>
        <div class="footer">
          <p>This is an automated email sent on behalf of ${fromName}.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html: htmlContent, from });
}

/**
 * Send notification to admin about new registration
 */
export async function sendAdminNotification({ to, adminName, eventTitle, participantName, participantEmail }) {
  const subject = `🔔 New Registration - ${eventTitle}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const websiteLogoUrl = `${baseUrl}/logo.jpg`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(90deg, #ff3131, #ff914d); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #ff3131; margin: 20px 0; }
        .button { display: inline-block; background: #ff3131; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .logo { width: 150px; height: auto; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${websiteLogoUrl}" alt="EventX Logo" class="logo">
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
          
          <p>Best regards,<br>EventX System</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from your EventX event management system.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // System notifications can use the default 'from' address
  return sendEmail({ to, subject, html: htmlContent });
}

// --- START OF NEW FUNCTION ---
/**
 * Send contact form submission to Super Admin
 */
export async function sendContactEmailToAdmin({ fromName, fromEmail, message }) {
  const superAdminEmail = 'gsreddy1182006@gmail.com'; // Your email
  const subject = `EventX Contact Form Submission from ${fromName}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const websiteLogoUrl = `${baseUrl}/logo.jpg`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(90deg, #ff3131, #ff914d); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .message-box { background: #ffffff; border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .logo { width: 150px; height: auto; margin-bottom: 20px; }
        .reply-button { display: inline-block; background: #ff3131; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${websiteLogoUrl}" alt="EventX Logo" class="logo">
          <h1>New Contact Message</h1>
        </div>
        <div class="content">
          <p>You received a new message from the EventX contact form.</p>
          
          <div class="message-box">
            <p><strong>From:</strong> ${fromName}</p>
            <p><strong>Email:</strong> ${fromEmail}</p>
            <hr style="border:0; border-top:1px solid #eee; margin: 15px 0;">
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          
          <a href="mailto:${fromEmail}" class="reply-button">Reply to ${fromName}</a>
          
        </div>
        <div class="footer">
          <p>This is an automated notification from the EventX platform.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send the email
  return sendEmail({
    to: superAdminEmail,
    subject: subject,
    html: htmlContent,
    from: { name: "EventX Notifications", email: "onboarding@resend.dev" }, // Use the default sender
    reply_to: fromEmail // Set reply-to to the user's email
  });
}
// --- END OF NEW FUNCTION ---


/**
 * Core email sending function
 * Supports multiple email providers
 */
async function sendEmail({ to, subject, html, from }) { // 'from' is an object { name, email } or undefined
  console.log('=== EMAIL SEND REQUEST ===');
  console.log('To:', to);
  console.log('Subject:', subject);
  
  const defaultFrom = 'EventX <onboarding@resend.dev>';
  
  let fromString;
  let replyToString = null; // This is the new field

  if (from && from.email) {
    // The "From" address MUST be onboarding@resend.dev
    // But we can set the "From Name" to be the club's name
    fromString = from.name ? `${from.name.replace(/"/g, '')} <onboarding@resend.dev>` : defaultFrom;
    // We set the "Reply-To" to be the admin's actual email
    replyToString = from.email;
  } else {
    fromString = defaultFrom;
  }

  console.log('From:', fromString);
  console.log('Reply-To:', replyToString);
  
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
        body: JSON.stringify({ 
          to, 
          subject, 
          html, 
          from: fromString,
          reply_to: replyToString // Pass the new field
        })
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
  
  // For development: just log the email
  console.log('⚠️  EMAIL SERVICE NOT CONFIGURED');
  console.log('📧 Email Preview:');
  console.log('   To:', to);
  console.log('   From:', fromString);
  console.log('   Reply-To:', replyToString);
  console.log('   Subject:', subject);
  console.log('');
  console.log('💡 To enable actual email sending:');
  console.log('   1. Set up Supabase Edge Function (see EMAIL_SETUP.md)');
  console.log('==========================');
  
  return { success: true, message: 'Email logged (service not configured)' };
}

/**
 * Get admin email by user ID
 */
export async function getAdminEmail(userId) {
  // This is no longer needed, as the API route handles this logic.
  return null;
}