const nodemailer = require('nodemailer');

let transporter = null;

async function initTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Create Ethereal test account for development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('Email: Using Ethereal test account -', testAccount.user);
  }

  return transporter;
}

async function sendPickupConfirmation({ to, trackingNumber, senderName, recipientName, expectedDelivery }) {
  try {
    const transport = await initTransporter();
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || '"Maneigbbe Delivery" <noreply@maneiggbbe.com>',
      to,
      subject: `Pickup Confirmed - Tracking #${trackingNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Maneigbbe Delivery</h1>
          </div>
          <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
            <h2>Pickup Confirmed!</h2>
            <p>Hi ${senderName},</p>
            <p>Your package pickup has been scheduled. Here are the details:</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
              <p><strong>Recipient:</strong> ${recipientName}</p>
              <p><strong>Expected Delivery:</strong> ${expectedDelivery}</p>
            </div>
            <p>Track your package at any time using your tracking number.</p>
          </div>
          <div style="background: #333; color: #aaa; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
            &copy; 2026 Maneigbbe Delivery Service
          </div>
        </div>
      `
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Email preview:', previewUrl);
    }
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendStatusUpdate({ to, trackingNumber, status, recipientName }) {
  try {
    const transport = await initTransporter();
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || '"Maneigbbe Delivery" <noreply@maneiggbbe.com>',
      to,
      subject: `Package Update - ${status} - Tracking #${trackingNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Maneigbbe Delivery</h1>
          </div>
          <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
            <h2>Package Status Update</h2>
            <p>Hi ${recipientName},</p>
            <p>Your package status has been updated:</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
              <p style="font-size: 1.3em; color: #667eea;"><strong>${status}</strong></p>
            </div>
            <p>Track your package for the latest updates.</p>
          </div>
          <div style="background: #333; color: #aaa; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
            &copy; 2026 Maneigbbe Delivery Service
          </div>
        </div>
      `
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Email preview:', previewUrl);
    }
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendPasswordReset({ to, name, token }) {
  try {
    const transport = await initTransporter();
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password.html?token=${token}`;
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || '"Maneigbbe Delivery" <noreply@maneiggbbe.com>',
      to,
      subject: 'Password Reset - Maneigbbe Delivery',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Maneigbbe Delivery</h1>
          </div>
          <div style="padding: 30px; background: #fff; border: 1px solid #eee;">
            <h2>Password Reset</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 0.9rem;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div style="background: #333; color: #aaa; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
            &copy; 2026 Maneigbbe Delivery Service
          </div>
        </div>
      `
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Password reset email preview:', previewUrl);
    }
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Password reset email error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPickupConfirmation, sendStatusUpdate, sendPasswordReset, initTransporter };
