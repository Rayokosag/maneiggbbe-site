const { Resend } = require('resend');

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Maneigbbe Delivery <noreply@maneiggbbe.com>';
const SITE_URL = process.env.BASE_URL || 'https://www.maneiggbbe.com';

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Email: RESEND_API_KEY not set — emails will be skipped');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function emailWrapper(content) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 1.6rem;">Maneigbbe Delivery</h1>
      </div>
      <div style="padding: 32px; background: #fff; border: 1px solid #e0e0e0; border-top: none;">
        ${content}
      </div>
      <div style="background: #222; color: #999; padding: 16px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Maneigbbe Delivery Service &nbsp;|&nbsp;
        <a href="${SITE_URL}" style="color: #aaa;">www.maneiggbbe.com</a>
      </div>
    </div>
  `;
}

function trackingButton(trackingNumber) {
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${SITE_URL}/tracking.html?track=${trackingNumber}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
                padding: 14px 32px; text-decoration: none; border-radius: 8px;
                font-weight: bold; font-size: 1rem; display: inline-block;">
        Track My Package
      </a>
    </div>
  `;
}

async function sendPickupConfirmation({ to, trackingNumber, senderName, recipientName, expectedDelivery }) {
  const client = getClient();
  if (!client) return { success: false, reason: 'no_api_key' };

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject: `Pickup Confirmed — Tracking #${trackingNumber}`,
      html: emailWrapper(`
        <h2 style="color: #333;">Pickup Confirmed!</h2>
        <p>Hi <strong>${senderName}</strong>,</p>
        <p>Your pickup request has been received. Here are the details:</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <p style="margin: 6px 0;"><strong>Tracking Number:</strong> <span style="font-family: monospace; font-size: 1.1em;">${trackingNumber}</span></p>
          <p style="margin: 6px 0;"><strong>Recipient:</strong> ${recipientName}</p>
          <p style="margin: 6px 0;"><strong>Expected Delivery:</strong> ${expectedDelivery}</p>
        </div>
        ${trackingButton(trackingNumber)}
        <p style="color: #666; font-size: 0.9rem;">Keep your tracking number safe — you can use it to check your package status at any time.</p>
      `)
    });

    if (error) {
      console.error('Resend error (pickup confirmation):', error);
      return { success: false, error: error.message };
    }
    console.log('Pickup confirmation sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendStatusUpdate({ to, trackingNumber, status, recipientName }) {
  const client = getClient();
  if (!client) return { success: false, reason: 'no_api_key' };

  const statusColors = {
    'Delivered': '#28a745',
    'In Transit': '#667eea',
    'Out for Delivery': '#fd7e14',
    'Pending': '#6c757d',
  };
  const statusColor = statusColors[status] || '#667eea';

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject: `Package Update: ${status} — #${trackingNumber}`,
      html: emailWrapper(`
        <h2 style="color: #333;">Package Status Update</h2>
        <p>Hi <strong>${recipientName}</strong>,</p>
        <p>Your package status has been updated:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid ${statusColor};">
          <p style="margin: 4px 0; color: #666; font-size: 0.9rem;">Tracking #${trackingNumber}</p>
          <p style="font-size: 1.4em; font-weight: bold; color: ${statusColor}; margin: 8px 0;">${status}</p>
        </div>
        ${trackingButton(trackingNumber)}
      `)
    });

    if (error) {
      console.error('Resend error (status update):', error);
      return { success: false, error: error.message };
    }
    console.log('Status update email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendPasswordReset({ to, name, token }) {
  const client = getClient();
  if (!client) return { success: false, reason: 'no_api_key' };

  const resetUrl = `${SITE_URL}/reset-password.html?token=${token}`;

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject: 'Reset Your Password — Maneigbbe Delivery',
      html: emailWrapper(`
        <h2 style="color: #333;">Password Reset</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to set a new one:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}"
             style="background: #333; color: white; padding: 14px 32px;
                    text-decoration: none; border-radius: 8px; font-weight: bold;
                    font-size: 1rem; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 0.9rem;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
      `)
    });

    if (error) {
      console.error('Resend error (password reset):', error);
      return { success: false, error: error.message };
    }
    console.log('Password reset email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendNewPickupAlert({ trackingNumber, senderName, senderEmail, senderPhone, recipientName, recipientCity, weight, speed, price, expectedDelivery }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('Email: ADMIN_EMAIL not set — admin pickup alert skipped');
    return { success: false, reason: 'no_admin_email' };
  }

  const client = getClient();
  if (!client) return { success: false, reason: 'no_api_key' };

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: [adminEmail],
      subject: `New Pickup Request — #${trackingNumber}`,
      html: emailWrapper(`
        <h2 style="color: #333;">New Pickup Request</h2>
        <p>A new pickup has been submitted and is waiting for processing.</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <p style="margin: 6px 0;"><strong>Tracking #:</strong> <span style="font-family: monospace;">${trackingNumber}</span></p>
          <p style="margin: 6px 0;"><strong>Sender:</strong> ${senderName} — ${senderEmail || 'no email'} — ${senderPhone || 'no phone'}</p>
          <p style="margin: 6px 0;"><strong>Recipient:</strong> ${recipientName} (${recipientCity})</p>
          <p style="margin: 6px 0;"><strong>Weight:</strong> ${weight} kg &nbsp;|&nbsp; <strong>Speed:</strong> ${speed}</p>
          <p style="margin: 6px 0;"><strong>Price:</strong> $${price} &nbsp;|&nbsp; <strong>Expected Delivery:</strong> ${expectedDelivery}</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${SITE_URL}/login.html"
             style="background: #333; color: white; padding: 14px 32px;
                    text-decoration: none; border-radius: 8px; font-weight: bold;
                    font-size: 1rem; display: inline-block;">
            Open Admin Dashboard
          </a>
        </div>
      `)
    });

    if (error) {
      console.error('Resend error (admin pickup alert):', error);
      return { success: false, error: error.message };
    }
    console.log('Admin pickup alert sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendPickupConfirmation, sendStatusUpdate, sendPasswordReset, sendNewPickupAlert };
