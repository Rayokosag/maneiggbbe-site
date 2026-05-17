// Main JavaScript for homepage

// Quick track form handler
document.getElementById('quickTrackForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const trackingNumber = document.getElementById('quickTrackInput').value.trim();
    
    if (trackingNumber) {
        // Redirect to tracking page with the tracking number
        window.location.href = `tracking.html?track=${trackingNumber}`;
    }
});
