const twilio = require('twilio');

const SITE_URL = process.env.BASE_URL || 'https://www.maneiggbbe.com';

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.warn('SMS: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — SMS will be skipped');
    return null;
  }
  return twilio(sid, token);
}

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (phone.startsWith('+')) return phone;
  return null;
}

async function sendSMS({ to, message }) {
  const client = getClient();
  if (!client) return { success: false, reason: 'not_configured' };

  const formattedTo = formatPhone(to);
  if (!formattedTo) {
    console.warn('SMS: Invalid phone number:', to);
    return { success: false, reason: 'invalid_phone' };
  }

  try {
    const msg = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo,
      body: message
    });
    console.log('SMS sent:', msg.sid);
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error('SMS error:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendPickupSMS({ to, trackingNumber }) {
  return sendSMS({
    to,
    message: `Maneigbbe Delivery: Your pickup is scheduled! Tracking #${trackingNumber}. Track at ${SITE_URL}/tracking.html?track=${trackingNumber}`
  });
}

async function sendStatusSMS({ to, trackingNumber, status }) {
  return sendSMS({
    to,
    message: `Maneigbbe Delivery: Package #${trackingNumber} is now "${status}". Track at ${SITE_URL}/tracking.html?track=${trackingNumber}`
  });
}

module.exports = { sendSMS, sendPickupSMS, sendStatusSMS };
