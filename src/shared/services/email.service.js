const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create an SMTP transporter using env values or defaults
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // use STARTTLS
    auth: {
        user: process.env.SMTP_USER || 'farm2bag@gmail.com',
        pass: process.env.SMTP_PASS || 'wwhp meoz gngx sysz'
    }
});

/**
 * Sends a password reset email using Gmail SMTP
 * @param {string} email - Recipient email address
 * @param {string} resetUrl - The password reset URL containing the token
 * @returns {Promise<boolean>}
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

module.exports = {
    sendPasswordResetEmail
};
