const nodemailer = require('nodemailer');

function createTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

/**
 * Send instant security alert email when an Admin or Accountant logs in
 */
async function sendAdminLoginAlert({ username, fullName, role, ipAddress, deviceType, userAgent, loginTimeBs }) {
  try {
    const transporter = createTransporter();
    if (!transporter) return;

    const toEmail = process.env.GMAIL_USER || 'nepalsecondaryschool.bdn@gmail.com';
    const now = new Date();

    const mailOptions = {
      from: `"Nepal Secondary School Security" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `🚨 [Security Alert] Admin / Finance Login: ${username} (${role})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1e3a5f; margin: 0;">नेपाल माध्यमिक विद्यालय</h2>
            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">ERP System Security Audit Alert</p>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #78350f; font-weight: bold; font-size: 13px;">
              A privileged administrative session was just authenticated.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; width: 35%;"><strong>Username:</strong></td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold; font-family: monospace;">${username}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;"><strong>Name:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${fullName || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;"><strong>Role:</strong></td>
              <td style="padding: 8px 0; color: #b45309; font-weight: bold;">${role}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;"><strong>IP Address:</strong></td>
              <td style="padding: 8px 0; color: #0f172a; font-family: monospace;">${ipAddress}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;"><strong>Device:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${deviceType}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;"><strong>User Agent:</strong></td>
              <td style="padding: 8px 0; color: #64748b; font-size: 11px;">${userAgent}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Time:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${loginTimeBs} (BS) • ${now.toUTCString()}</td>
            </tr>
          </table>

          <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 0;">
            If this was not you or an authorized school official, please immediately change your password and reset 2FA from the ERP dashboard.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SECURITY] Login alert email sent for ${username} (${role})`);
  } catch (err) {
    console.error('[SECURITY EMAIL ERROR]', err.message);
  }
}

module.exports = { sendAdminLoginAlert };
