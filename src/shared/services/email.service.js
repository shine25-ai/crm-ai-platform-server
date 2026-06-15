const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create an SMTP transporter using env values or defaults
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'farm2bag@gmail.com',
        pass: process.env.SMTP_PASS || 'wwhp meoz gngx sysz'
    }
});

/**
 * Sends a password reset email
 */
const sendPasswordResetEmail = async (email, resetUrl) => {
    const mailOptions = {
        from: `"CRM AI Platform" <${process.env.SMTP_USER || 'farm2bag@gmail.com'}>`,
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
        const info = await transporter.sendMail(mailOptions);
        logger.info(
            `[Email Service] Password reset email sent to ${email}. Message ID: ${info.messageId}`
        );
        return true;
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
    const firstName = name.split(' ')[0];

    const mailOptions = {
        from: `"CRM AI Platform" <${process.env.SMTP_USER || 'farm2bag@gmail.com'}>`,
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
        const info = await transporter.sendMail(mailOptions);
        logger.info(
            `[Email Service] Onboarding email sent to ${email}. Message ID: ${info.messageId}`
        );
        return true;
    } catch (error) {
        logger.error(
            `[Email Service] Failed to send onboarding email to ${email}:`,
            error
        );
        throw error;
    }
};

/**
 * Notifies HR, Admin, and Super Admin that an employee has completed their onboarding submission.
 * @param {string[]} recipientEmails - Array of email addresses to notify
 * @param {Object} employeeInfo - Employee details
 * @param {string} employeeInfo.name - Employee full name
 * @param {string} employeeInfo.employeeId - Employee ID
 * @param {string} employeeInfo.email - Employee email
 * @param {string} employeeInfo.department - Department name
 * @param {string} employeeInfo.designation - Employee designation
 * @param {string} employeeInfo.mobile - Mobile number
 */
const sendOnboardingCompletionNotification = async (
    recipientEmails,
    employeeInfo
) => {
    if (!recipientEmails || recipientEmails.length === 0) return;

    const { name, employeeId, email, department, designation, mobile } =
        employeeInfo;
    const firstName = (name || '').split(' ')[0];
    const submittedAt = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    const mailOptions = {
        from: `"CRM AI Platform" <${process.env.SMTP_USER || 'farm2bag@gmail.com'}>`,
        to: recipientEmails.join(', '),
        subject: `🎉 Employee Onboarding Completed — ${name} (${employeeId})`,
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
                    <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 48px; text-align:center;">
                      <div style="display:inline-block; background:rgba(255,255,255,0.15); border-radius:50%; width:60px; height:60px; line-height:60px; font-size:28px; margin-bottom:16px;">✅</div>
                      <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700; letter-spacing:-0.5px;">Onboarding Details Submitted</h1>
                      <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:14px;">Action required — please review and activate the employee account</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 48px;">

                      <!-- Alert Banner -->
                      <div style="background:#ECFDF5; border-left:4px solid #10B981; border-radius:8px; padding:16px 20px; margin-bottom:28px;">
                        <p style="margin:0; color:#065F46; font-size:14px; font-weight:600;">
                          📋 &nbsp;<strong>${firstName}</strong> has successfully completed their account setup and submitted all required personal details.
                        </p>
                        <p style="margin:6px 0 0; color:#047857; font-size:13px;">Submitted on: ${submittedAt} (IST)</p>
                      </div>

                      <p style="color:#1E293B; font-size:15px; margin:0 0 24px; font-weight:600;">Employee Summary</p>

                      <!-- Employee Info Card -->
                      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; margin-bottom:28px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr style="border-bottom:1px solid #E2E8F0;">
                            <td style="padding:14px 20px; width:40%;">
                              <p style="margin:0; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Full Name</p>
                            </td>
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#1E293B; font-size:14px; font-weight:600;">${name}</p>
                            </td>
                          </tr>
                          <tr style="border-bottom:1px solid #E2E8F0; background:#FAFAFA;">
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Employee ID</p>
                            </td>
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#1E293B; font-size:14px; font-weight:600;">${employeeId}</p>
                            </td>
                          </tr>
                          <tr style="border-bottom:1px solid #E2E8F0;">
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Email Address</p>
                            </td>
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#4F46E5; font-size:14px;">${email}</p>
                            </td>
                          </tr>
                          <tr style="border-bottom:1px solid #E2E8F0; background:#FAFAFA;">
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Department</p>
                            </td>
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#1E293B; font-size:14px; font-weight:600;">${department || '—'}</p>
                            </td>
                          </tr>
                          <tr style="border-bottom:1px solid #E2E8F0;">
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Designation</p>
                            </td>
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#1E293B; font-size:14px;">${designation || '—'}</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:14px 20px; background:#FAFAFA;">
                              <p style="margin:0; color:#94A3B8; font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Mobile</p>
                            </td>
                            <td style="padding:14px 20px; background:#FAFAFA;">
                              <p style="margin:0; color:#1E293B; font-size:14px;">${mobile || '—'}</p>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Next Steps -->
                      <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:20px 24px; margin-bottom:24px;">
                        <p style="margin:0 0 12px; color:#1E40AF; font-size:14px; font-weight:700;">📌 Required Next Steps</p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:6px 0; color:#1D4ED8; font-size:13px;">
                              <span style="background:#DBEAFE; color:#1D4ED8; border-radius:50%; width:22px; height:22px; display:inline-block; text-align:center; line-height:22px; font-weight:700; font-size:11px; margin-right:10px;">1</span>
                              Review the submitted personal & bank details
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0; color:#1D4ED8; font-size:13px;">
                              <span style="background:#DBEAFE; color:#1D4ED8; border-radius:50%; width:22px; height:22px; display:inline-block; text-align:center; line-height:22px; font-weight:700; font-size:11px; margin-right:10px;">2</span>
                              Add joining date and salary in the employee profile
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0; color:#1D4ED8; font-size:13px;">
                              <span style="background:#DBEAFE; color:#1D4ED8; border-radius:50%; width:22px; height:22px; display:inline-block; text-align:center; line-height:22px; font-weight:700; font-size:11px; margin-right:10px;">3</span>
                              Activate the employee account to grant portal access
                            </td>
                          </tr>
                        </table>
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
        const info = await transporter.sendMail(mailOptions);
        logger.info(
            `[Email Service] Onboarding completion notification sent to [${recipientEmails.join(', ')}]. Message ID: ${info.messageId}`
        );
        return true;
    } catch (error) {
        logger.error(
            `[Email Service] Failed to send onboarding completion notification:`,
            error
        );
        // Non-fatal — log and continue
        return false;
    }
};

/**
 * Notifies the employee that their account has been activated by HR.
 * @param {string} email - Employee email
 * @param {string} name - Employee full name
 * @param {string} employeeId - Employee ID
 * @param {string} department - Department name
 * @param {string} designation - Employee designation
 */
const sendAccountActivationEmail = async (
    email,
    name,
    employeeId,
    department,
    designation
) => {
    const firstName = (name || '').split(' ')[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const loginUrl = `${frontendUrl}/login`;

    const mailOptions = {
        from: `"CRM AI Platform" <${process.env.SMTP_USER || 'farm2bag@gmail.com'}>`,
        to: email,
        subject: `🚀 Your CRM Account is Now Active, ${firstName}!`,
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
                      <div style="display:inline-block; background:rgba(255,255,255,0.15); border-radius:50%; width:68px; height:68px; line-height:68px; font-size:32px; margin-bottom:16px;">🚀</div>
                      <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:700; letter-spacing:-0.5px;">You're All Set, ${firstName}!</h1>
                      <p style="color:rgba(255,255,255,0.85); margin:10px 0 0; font-size:15px;">Your employee account has been activated</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 44px 48px;">

                      <!-- Success Banner -->
                      <div style="background: linear-gradient(135deg, #ECFDF5, #D1FAE5); border:1px solid #6EE7B7; border-radius:10px; padding:18px 22px; margin-bottom:32px; text-align:center;">
                        <p style="margin:0; color:#065F46; font-size:16px; font-weight:700;">✅ &nbsp;Account Successfully Activated</p>
                        <p style="margin:6px 0 0; color:#047857; font-size:13px;">HR has reviewed your profile and granted you full portal access.</p>
                      </div>

                      <p style="color:#475569; font-size:15px; line-height:1.7; margin:0 0 28px;">
                        Hi <strong style="color:#1E293B;">${firstName}</strong>, great news! Your CRM AI Platform account is now fully active.
                        You can log in right away and start using all the features available to you.
                      </p>

                      <!-- Employee Info Card -->
                      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; margin-bottom:32px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr style="border-bottom:1px solid #E2E8F0;">
                            <td style="padding:14px 20px; width:40%; background:#F1F5F9;">
                              <p style="margin:0; color:#64748B; font-size:11px; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Employee ID</p>
                            </td>
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#1E293B; font-size:14px; font-weight:700;">${employeeId}</p>
                            </td>
                          </tr>
                          <tr style="border-bottom:1px solid #E2E8F0;">
                            <td style="padding:14px 20px; background:#F1F5F9;">
                              <p style="margin:0; color:#64748B; font-size:11px; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Department</p>
                            </td>
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#1E293B; font-size:14px;">${department || '—'}</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:14px 20px; background:#F1F5F9;">
                              <p style="margin:0; color:#64748B; font-size:11px; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Designation</p>
                            </td>
                            <td style="padding:14px 20px;">
                              <p style="margin:0; color:#1E293B; font-size:14px;">${designation || '—'}</p>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align:center; margin: 32px 0;">
                        <a href="${loginUrl}"
                           style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                                  color:white;
                                  padding:16px 44px;
                                  text-decoration:none;
                                  border-radius:10px;
                                  font-weight:700;
                                  font-size:16px;
                                  display:inline-block;
                                  box-shadow: 0 4px 14px rgba(79,70,229,0.4);">
                          🔑 &nbsp;Log In to Your Portal
                        </a>
                      </div>

                      <!-- Info Note -->
                      <div style="background:#FEF9C3; border:1px solid #FDE68A; border-radius:8px; padding:14px 18px; margin-top:8px;">
                        <p style="margin:0; color:#92400E; font-size:13px;">
                          💡 <strong>Tip:</strong> Use the email address <strong>${email}</strong> and the password you set during onboarding to log in.
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
        const info = await transporter.sendMail(mailOptions);
        logger.info(
            `[Email Service] Account activation email sent to ${email}. Message ID: ${info.messageId}`
        );
        return true;
    } catch (error) {
        logger.error(
            `[Email Service] Failed to send activation email to ${email}:`,
            error
        );
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendOnboardingEmail,
    sendOnboardingCompletionNotification,
    sendAccountActivationEmail
};
