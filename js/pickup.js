// Pickup form JavaScript

// API base URL
const API_URL = '/api';

// Price calculation based on weight and delivery speed
const deliveryPrices = {
    standard: 5.99,
    express: 12.99,
    overnight: 24.99
};

// Update price when weight or delivery speed changes
document.getElementById('packageWeight').addEventListener('input', calculatePrice);
document.getElementById('deliverySpeed').addEventListener('change', calculatePrice);

function calculatePrice() {
    const weight = parseFloat(document.getElementById('packageWeight').value) || 0;
    const speed = document.getElementById('deliverySpeed').value;

    if (weight > 0 && speed) {
        const basePrice = deliveryPrices[speed];
        // Add $0.50 per pound over 5 lbs
        const weightCharge = weight > 5 ? (weight - 5) * 0.5 : 0;
        const totalPrice = basePrice + weightCharge;

        document.getElementById('estimatedPrice').textContent = `$${totalPrice.toFixed(2)}`;
    } else {
        document.getElementById('estimatedPrice').textContent = '$0.00';
    }
}

// Handle form submission
document.getElementById('pickupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Collect form data
    const formData = {
        sender: {
            name: document.getElementById('senderName').value,
            phone: document.getElementById('senderPhone').value,
            address: document.getElementById('senderAddress').value,
            city: document.getElementById('senderCity').value,
            zip: document.getElementById('senderZip').value
        },
        recipient: {
            name: document.getElementById('recipientName').value,
            phone: document.getElementById('recipientPhone').value,
            address: document.getElementById('recipientAddress').value,
            city: document.getElementById('recipientCity').value,
            zip: document.getElementById('recipientZip').value
        },
        package: {
            weight: parseFloat(document.getElementById('packageWeight').value),
            speed: document.getElementById('deliverySpeed').value,
            description: document.getElementById('packageDescription').value
        },
        price: document.getElementById('estimatedPrice').textContent,
        expectedDelivery: calculateExpectedDelivery(document.getElementById('deliverySpeed').value)
    };

    try {
        const response = await fetch(`${API_URL}/packages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to create pickup request');
        }

        const data = await response.json();

        // Hide form and show success message
        document.getElementById('pickupForm').style.display = 'none';
        document.getElementById('generatedTrackingNumber').textContent = data.trackingNumber;
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
