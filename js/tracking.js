// Tracking page JavaScript

// API base URL
const API_URL = '/api';

// Get tracking number from URL or form
const urlParams = new URLSearchParams(window.location.search);
const urlTrackingNumber = urlParams.get('track');

if (urlTrackingNumber) {
    document.getElementById('trackingNumber').value = urlTrackingNumber;
    trackPackage(urlTrackingNumber);
}

// Handle form submission
document.getElementById('trackingForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const trackingNumber = document.getElementById('trackingNumber').value.trim().toUpperCase();
    trackPackage(trackingNumber);
});

async function trackPackage(trackingNumber) {
    // Hide previous results and errors
    document.getElementById('trackingResults').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/packages/${trackingNumber}`);

        if (!response.ok) {
            if (response.status === 404) {
                displayError();
                return;
            }
            throw new Error('Failed to fetch package');
        }

        const packageData = await response.json();
        displayTrackingResults(packageData);

    } catch (error) {
        console.error('Error tracking package:', error);
        displayError();
    }
}

function displayTrackingResults(data) {
    // Update tracking number display
    document.getElementById('displayTrackingNumber').textContent = data.trackingNumber;

    // Update status badge
    const statusBadge = document.getElementById('currentStatus');
    statusBadge.textContent = data.status;

    // Change badge color based on status
    if (data.status === 'Delivered') {
        statusBadge.style.backgroundColor = '#27ae60';
    } else if (data.status === 'In Transit' || data.status === 'Out for Delivery') {
        statusBadge.style.backgroundColor = '#3498db';
    } else {
        statusBadge.style.backgroundColor = '#f39c12';
    }

    // Update package info
    document.getElementById('fromLocation').textContent = data.from;
    document.getElementById('toLocation').textContent = data.to;
    document.getElementById('expectedDelivery').textContent = data.expectedDelivery;

    // Build timeline
    const timelineContainer = document.getElementById('timeline');
    timelineContainer.innerHTML = '';

    data.timeline.forEach(item => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item' + (item.completed ? ' completed' : '');

        timelineItem.innerHTML = `
            <div class="timeline-date">${item.date}</div>
            <div class="timeline-status">${item.status}</div>
            <div class="timeline-location">${item.location}</div>
        `;

        timelineContainer.appendChild(timelineItem);
    });

    // Display photos if available
    const photosSection = document.getElementById('packagePhotos');
    const photoGallery = document.getElementById('photoGallery');
    if (data.photos && data.photos.length > 0) {
        photoGallery.innerHTML = '';
        data.photos.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Package photo';
            img.style.cssText = 'width: 150px; height: 150px; object-fit: cover; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); cursor: pointer;';
            img.onclick = function() { window.open(url, '_blank'); };
            photoGallery.appendChild(img);
        });
        photosSection.style.display = 'block';
    } else {
        photosSection.style.display = 'none';
    }

    // Show results
    document.getElementById('trackingResults').style.display = 'block';
}

function displayError() {
    document.getElementById('errorMessage').style.display = 'block';
}
