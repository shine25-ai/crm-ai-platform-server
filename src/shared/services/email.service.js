const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const getSmtpConfig = () => {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    return {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };
};

const createTransporter = () => nodemailer.createTransport(getSmtpConfig());

const getSender = () =>
    `"CRM AI Platform" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

const assertSmtpConfig = () => {
    const missing = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].filter(
        (key) => !process.env[key]
    );

    if (missing.length) {
        throw new Error(`Missing SMTP configuration: ${missing.join(', ')}`);
    }
};

const verifySmtpConnection = async () => {
    assertSmtpConfig();
    const transporter = createTransporter();
    await transporter.verify();
    return true;
};

/**
 * Sends a password reset email
 */
const sendPasswordResetEmail = async (email, resetUrl) => {
    assertSmtpConfig();

    const mailOptions = {
        from: getSender(),
        to: email,
        subject: 'Reset Your Password - CRM AI Platform',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px;">
                <h2 style="color: #6366F1; text-align: center;">CRM AI Platform</h2>
                <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 20px 0;">
                <p>Hello,</p>
                <p>You requested a password reset for your CRM AI Platform account. Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p>This password reset link will expire in 1 hour.</p>
                <p>If you did not request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 20px 0;">
                <p style="font-size: 12px; color: #94A3B8; text-align: center;">This is an automated system email. Please do not reply directly.</p>
            </div>
        `
    };

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail(mailOptions);
        logger.info(
            `[Email Service] Password reset email sent to ${email}. Message ID: ${info.messageId}`
        );
        return info;
    } catch (error) {
        logger.error(
            `[Email Service] Failed to send email to ${email}:`,
            error
        );
        throw error;
    }
};

/**
 * Sends the employee onboarding invitation email
 * @param {string} email - Employee email address
 * @param {string} name - Employee full name
 * @param {string} employeeId - Employee ID (e.g. EMP001)
 * @param {string} department - Department name
 * @param {string} onboardingUrl - Secure one-time onboarding link
 */
const sendOnboardingEmail = async (
    email,
    name,
    employeeId,
    department,
    onboardingUrl
) => {
    assertSmtpConfig();
    const firstName = name.split(' ')[0];

    const mailOptions = {
        from: getSender(),
        to: email,
        subject: `Welcome to the Team, ${firstName}! Complete Your Account Setup`,
        html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0; padding:0; background-color:#F8FAFC; font-family: 'Segoe UI', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 48px; text-align:center;">
                      <div style="display:inline-block; background:rgba(255,255,255,0.15); border-radius:50%; width:60px; height:60px; line-height:60px; font-size:28px; margin-bottom:16px;">🎉</div>
                      <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:700; letter-spacing:-0.5px;">Welcome to CRM AI Platform</h1>
                      <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:15px;">Your employee account is ready to be activated</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 48px;">
                      <p style="color:#1E293B; font-size:16px; margin:0 0 8px; font-weight:600;">Hi ${firstName},</p>
                      <p style="color:#475569; font-size:15px; line-height:1.7; margin:0 0 24px;">
                        You've been added to the <strong style="color:#4F46E5;">${department}</strong> team. 
                        Please complete your account setup by clicking the button below. 
                        It only takes a few minutes!
                      </p>

                      <!-- Employee Info Card -->
                      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:20px 24px; margin-bottom:32px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="50%">
                              <p style="margin:0 0 4px; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Employee Name</p>
                              <p style="margin:0; color:#1E293B; font-size:14px; font-weight:600;">${name}</p>
                            </td>
                            <td width="50%">
                              <p style="margin:0 0 4px; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Employee ID</p>
                              <p style="margin:0; color:#1E293B; font-size:14px; font-weight:600;">${employeeId}</p>
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding-top:12px;">
                              <p style="margin:0 0 4px; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Department</p>
                              <p style="margin:0; color:#1E293B; font-size:14px; font-weight:600;">${department}</p>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align:center; margin: 32px 0;">
                        <a href="${onboardingUrl}" 
                           style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); 
                                  color:white; 
                                  padding:16px 40px; 
                                  text-decoration:none; 
                                  border-radius:10px; 
                                  font-weight:700; 
                                  font-size:16px;
                                  display:inline-block;
                                  box-shadow: 0 4px 14px rgba(79,70,229,0.4);">
                          ✅ &nbsp; Complete My Account Setup
                        </a>
                      </div>

                      <!-- Steps -->
                      <div style="margin: 32px 0;">
                        <p style="color:#1E293B; font-size:14px; font-weight:600; margin:0 0 12px;">What happens next:</p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:8px 0; color:#475569; font-size:14px;">
                              <span style="background:#EEF2FF; color:#4F46E5; border-radius:50%; width:24px; height:24px; display:inline-block; text-align:center; line-height:24px; font-weight:700; font-size:12px; margin-right:10px;">1</span>
                              Set your password
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0; color:#475569; font-size:14px;">
                              <span style="background:#EEF2FF; color:#4F46E5; border-radius:50%; width:24px; height:24px; display:inline-block; text-align:center; line-height:24px; font-weight:700; font-size:12px; margin-right:10px;">2</span>
                              Fill in your personal information
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0; color:#475569; font-size:14px;">
                              <span style="background:#EEF2FF; color:#4F46E5; border-radius:50%; width:24px; height:24px; display:inline-block; text-align:center; line-height:24px; font-weight:700; font-size:12px; margin-right:10px;">3</span>
                              Login and access your employee portal
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Warning -->
                      <div style="background:#FEF9C3; border:1px solid #FDE68A; border-radius:8px; padding:14px 18px; margin-top:24px;">
                        <p style="margin:0; color:#92400E; font-size:13px;">
                          ⏰ <strong>This link expires in 48 hours.</strong> If you did not expect this email, please contact your HR administrator.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#F8FAFC; border-top:1px solid #E2E8F0; padding:24px 48px; text-align:center;">
                      <p style="color:#94A3B8; font-size:12px; margin:0;">CRM AI Platform &mdash; Automated system email. Do not reply.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `
    };

    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail(mailOptions);
        logger.info(
            `[Email Service] Onboarding email sent to ${email}. Message ID: ${info.messageId}`
        );
        return info;
    } catch (error) {
        logger.error(
            `[Email Service] Failed to send onboarding email to ${email}:`,
            error
        );
        throw error;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendOnboardingEmail,
    verifySmtpConnection
};
