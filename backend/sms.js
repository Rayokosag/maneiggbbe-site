// SMS disabled for cloud deployment

async function sendSMS({ to, message }) {
  console.log('SMS: Disabled -', message);
  return { success: false, reason: 'SMS not configured' };
}

async function sendPickupSMS({ to, trackingNumber }) {
  return sendSMS({
    to,
    message: `Pickup scheduled! Tracking #${trackingNumber}`
  });
}

async function sendStatusSMS({ to, trackingNumber, status }) {
  return sendSMS({
    to,
    message: `Package ${trackingNumber} is now "${status}"`
  });
}

module.exports = { sendSMS, sendPickupSMS, sendStatusSMS };
