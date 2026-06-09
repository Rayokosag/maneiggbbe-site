// Pickup form JavaScript

// API base URL
const API_URL = '/api';

// Price calculation based on weight and delivery speed
const deliveryPrices = {
    standard: 5.99,
    express: 12.99,
    overnight: 24.99
};

// Packaging material prices
const packagingPrices = {
    none: 0,
    mail: 15.00,
    parcel: 20.00,
    box1: 30.00,
    box2: 30.00,
    box3: 30.00,
    box4: 30.00,
    box5: 30.00,
    box6: 30.00,
    box7: 30.00
};

// Update price when weight, delivery speed, or packaging changes
document.getElementById('packageWeight').addEventListener('input', calculatePrice);
document.getElementById('deliverySpeed').addEventListener('change', calculatePrice);
document.getElementById('packagingOption').addEventListener('change', calculatePrice);

function calculatePrice() {
    const weight = parseFloat(document.getElementById('packageWeight').value) || 0;
    const speed = document.getElementById('deliverySpeed').value;
    const packaging = document.getElementById('packagingOption').value;

    let totalPrice = 0;

    if (speed) {
        totalPrice += deliveryPrices[speed];
    }

    // Add $0.25 per pound over 5 lbs (matching the pricing chart)
    if (weight > 5) {
        totalPrice += (weight - 5) * 0.25;
    }

    // Add packaging cost
    if (packaging && packagingPrices[packaging]) {
        totalPrice += packagingPrices[packaging];
    }

    document.getElementById('estimatedPrice').textContent = `$${totalPrice.toFixed(2)}`;
}

// Handle form submission
document.getElementById('pickupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const packagingOption = document.getElementById('packagingOption').value;
    const packagingNames = {
        none: 'Own packaging',
        mail: 'Mail Envelope',
        parcel: 'Parcel Box',
        box1: 'Box 1 - Small',
        box2: 'Box 2 - Medium',
        box3: 'Box 3 - Medium',
        box4: 'Box 4 - Large',
        box5: 'Box 5 - Large',
        box6: 'Box 6 - X-Large',
        box7: 'Box 7 - XX-Large'
    };

    // Collect form data
    const formData = {
        sender: {
            name: document.getElementById('senderName').value,
            phone: document.getElementById('senderPhone').value,
            address: document.getElementById('senderAddress').value,
            city: document.getElementById('senderCity').value,
            zip: document.getElementById('senderZip').value,
            email: document.getElementById('senderEmail') ? document.getElementById('senderEmail').value : undefined
        },
        recipient: {
            name: document.getElementById('recipientName').value,
            phone: document.getElementById('recipientPhone').value,
            address: document.getElementById('recipientAddress').value,
            city: document.getElementById('recipientCity').value,
            zip: document.getElementById('recipientZip').value,
            email: document.getElementById('recipientEmail') ? document.getElementById('recipientEmail').value : undefined
        },
        package: {
            weight: parseFloat(document.getElementById('packageWeight').value),
            speed: document.getElementById('deliverySpeed').value,
            description: document.getElementById('packageDescription').value,
            packaging: packagingOption,
            packagingName: packagingNames[packagingOption],
            packagingCost: packagingPrices[packagingOption]
        },
        price: document.getElementById('estimatedPrice').textContent,
        expectedDelivery: calculateExpectedDelivery(document.getElementById('deliverySpeed').value)
    };

    // Build headers - include customer auth if logged in
    const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    const customerToken = localStorage.getItem('customerToken');
    if (customerToken) {
        headers['Authorization'] = `Bearer ${customerToken}`;
    }

    try {
        const response = await fetch(`${API_URL}/packages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to create pickup request');
        }

        const data = await response.json();

        // Upload photos if any were selected
        const photoInput = document.getElementById('packagePhotos');
        if (photoInput && photoInput.files && photoInput.files.length > 0) {
            const photoFormData = new FormData();
            const files = Array.from(photoInput.files).slice(0, 5);
            files.forEach(function(file) {
                photoFormData.append('photos', file);
            });

            try {
                await fetch(`${API_URL}/packages/${data.trackingNumber}/photos`, {
                    method: 'POST',
                    body: photoFormData
                });
            } catch (photoErr) {
                console.error('Photo upload failed:', photoErr);
            }
        }

        // Hide form and show success message
        document.getElementById('pickupForm').style.display = 'none';
        document.getElementById('generatedTrackingNumber').textContent = data.trackingNumber;
        document.getElementById('trackLink').href = 'tracking.html?track=' + data.trackingNumber;
        if (localStorage.getItem('customerToken')) {
            document.getElementById('dashboardLink').style.display = 'block';
        }
        document.getElementById('successMessage').style.display = 'block';

        // Scroll to success message
        document.getElementById('successMessage').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error creating pickup request:', error);
        alert('Failed to create pickup request. Please try again.');
    }
});

function calculateExpectedDelivery(speed) {
    const today = new Date();
    let daysToAdd;

    switch(speed) {
        case 'overnight':
            daysToAdd = 1;
            break;
        case 'express':
            daysToAdd = 2;
            break;
        case 'standard':
            daysToAdd = 4;
            break;
        default:
            daysToAdd = 4;
    }

    const deliveryDate = new Date(today.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[deliveryDate.getMonth()]} ${deliveryDate.getDate()}, ${deliveryDate.getFullYear()}`;
}
