let twilioClient = null;

function initTwilio() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.log('SMS: Twilio credentials not configured, SMS disabled');
    return null;
  }

  try {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    console.log('SMS: Twilio initialized');
    return twilioClient;
  } catch (error) {
    console.error('SMS: Failed to initialize Twilio:', error.message);
    return null;
  }
}

async function sendSMS({ to, message }) {
  const client = initTwilio();
  if (!client) {
    console.log('SMS: Skipped (Twilio not configured) -', message);
    return { success: false, reason: 'Twilio not configured' };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendPickupSMS({ to, trackingNumber }) {
  return sendSMS({
    to,
    message: `Maneigbbe Delivery: Your pickup has been scheduled! Tracking #${trackingNumber}. Track at our website.`
  });
}

async function sendStatusSMS({ to, trackingNumber, status }) {
  return sendSMS({
    to,
    message: `Maneigbbe Delivery: Package ${trackingNumber} is now "${status}". Track at our website.`
  });
}

module.exports = { sendSMS, sendPickupSMS, sendStatusSMS };
