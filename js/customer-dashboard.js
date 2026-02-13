// Customer Dashboard JavaScript

const API_URL = '/api';

function getToken() {
    return localStorage.getItem('customerToken');
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

// Auth check
if (!getToken()) {
    window.location.href = 'customer-login.html';
} else {
    init();
}

async function init() {
    // Set name from localStorage first
    const storedName = localStorage.getItem('customerName');
    if (storedName) {
        document.getElementById('customerName').textContent = storedName;
    }

    // Load profile, stats, and packages in parallel
    await Promise.all([
        loadProfile(),
        loadStats(),
        loadPackages()
    ]);
}

// Tab navigation
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    var btn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
    if (btn) btn.classList.add('active');
    var content = document.getElementById('tab-' + tabName);
    if (content) content.classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        switchTab(btn.dataset.tab);
    });
});

// Hash-based tab switching (e.g. #profile from navbar dropdown)
var hash = window.location.hash.replace('#', '');
if (hash && document.getElementById('tab-' + hash)) {
    switchTab(hash);
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerName');
    window.location.href = 'customer-login.html';
});

// Load profile
async function loadProfile() {
    try {
        const res = await fetch(`${API_URL}/customers/profile`, { headers: getAuthHeaders() });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('customerToken');
            window.location.href = 'customer-login.html';
            return;
        }
        const data = await res.json();
        document.getElementById('customerName').textContent = data.name;
        document.getElementById('profileName').value = data.name;
        document.getElementById('profileEmail').value = data.email;
        document.getElementById('profilePhone').value = data.phone || '';
        localStorage.setItem('customerName', data.name);
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

// Load stats
async function loadStats() {
    try {
        const res = await fetch(`${API_URL}/customers/packages/stats`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('statTotal').textContent = data.total;
        document.getElementById('statTransit').textContent = data.inTransit;
        document.getElementById('statDelivered').textContent = data.delivered;
        document.getElementById('statPending').textContent = data.pending;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// Load packages
async function loadPackages() {
    try {
        const res = await fetch(`${API_URL}/customers/packages`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const packages = data.packages || [];
        const tbody = document.getElementById('packagesBody');
        const noData = document.getElementById('noPackages');

        if (packages.length === 0) {
            tbody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';
        tbody.innerHTML = packages.map(function(pkg) {
            var statusClass = getStatusClass(pkg.status);
            var date = new Date(pkg.requestDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
            return '<tr>' +
                '<td><strong>' + pkg.trackingNumber + '</strong></td>' +
                '<td>' + pkg.from + '</td>' +
                '<td>' + pkg.to + '</td>' +
                '<td><span class="status-badge ' + statusClass + '">' + pkg.status + '</span></td>' +
                '<td>' + date + '</td>' +
                '<td><a href="tracking.html?track=' + pkg.trackingNumber + '" class="track-link">Track</a></td>' +
                '</tr>';
        }).join('');
    } catch (err) {
        console.error('Error loading packages:', err);
    }
}

function getStatusClass(status) {
    var map = {
        'Pending Pickup': 'status-pending',
        'Picked Up': 'status-picked',
        'In Transit': 'status-transit',
        'Out for Delivery': 'status-delivery',
        'Delivered': 'status-delivered'
    };
    return map[status] || '';
}

// Profile form
document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var msg = document.getElementById('profileMsg');
    msg.style.display = 'none';

    try {
        var res = await fetch(`${API_URL}/customers/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                name: document.getElementById('profileName').value,
                email: document.getElementById('profileEmail').value,
                phone: document.getElementById('profilePhone').value
            })
        });
        var data = await res.json();

        if (res.ok) {
            msg.className = 'form-message form-message-success';
            msg.textContent = 'Profile updated successfully';
            document.getElementById('customerName').textContent = data.name;
            localStorage.setItem('customerName', data.name);
        } else {
            msg.className = 'form-message form-message-error';
            msg.textContent = data.error || 'Failed to update profile';
        }
        msg.style.display = 'block';
    } catch (err) {
        msg.className = 'form-message form-message-error';
        msg.textContent = 'Connection error';
        msg.style.display = 'block';
    }
});

// Password form
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var msg = document.getElementById('passwordMsg');
    msg.style.display = 'none';

    var newPw = document.getElementById('newPassword').value;
    var confirmPw = document.getElementById('confirmNewPassword').value;

    if (newPw !== confirmPw) {
        msg.className = 'form-message form-message-error';
        msg.textContent = 'Passwords do not match';
        msg.style.display = 'block';
        return;
    }

    try {
        var res = await fetch(`${API_URL}/customers/password`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                currentPassword: document.getElementById('currentPassword').value,
                newPassword: newPw
            })
        });
        var data = await res.json();

        if (res.ok) {
            msg.className = 'form-message form-message-success';
            msg.textContent = 'Password updated successfully';
            document.getElementById('passwordForm').reset();
        } else {
            msg.className = 'form-message form-message-error';
            msg.textContent = data.error || 'Failed to change password';
        }
        msg.style.display = 'block';
    } catch (err) {
        msg.className = 'form-message form-message-error';
        msg.textContent = 'Connection error';
        msg.style.display = 'block';
    }
});

// Bulk Upload Form
document.getElementById('bulkUploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const csvFile = document.getElementById('csvFile').files[0];
    if (csvFile) {
        alert(`Simulating CSV upload for file: ${csvFile.name}. This would typically be sent to a backend API.`);
        console.log('Bulk upload file:', csvFile);
        // In a real application, you would send this file to a backend API
    } else {
        alert('Please select a CSV file to upload.');
    }
});

// Message Account Manager Button
document.querySelector('#tab-contact-manager .btn-save').addEventListener('click', function() {
    alert('Simulating sending a message to your Account Manager. This would typically open a chat or email client.');
    console.log('Message Account Manager clicked.');
});
