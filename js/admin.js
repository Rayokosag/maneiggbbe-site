// Admin Dashboard JavaScript

// API base URL
const API_URL = '/api';

// Check if user is logged in
function checkAuth() {
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Initialize dashboard
if (checkAuth()) {
    loadDashboard();
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', async function(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        try {
            await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminUsername');
        localStorage.removeItem('loginTime');
        window.location.href = 'login.html';
    }
});

// Load dashboard data
async function loadDashboard() {
    try {
        // Fetch packages and stats in parallel
        const [packagesRes, statsRes] = await Promise.all([
            fetch(`${API_URL}/packages`),
            fetch(`${API_URL}/packages/stats`)
        ]);

        const packages = await packagesRes.json();
        const stats = await statsRes.json();

        updateStats(stats);
        renderPackagesTable(packages);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Failed to load dashboard data');
    }
}

// Update statistics
function updateStats(stats) {
    document.getElementById('totalPackages').textContent = stats.total;
    document.getElementById('inTransit').textContent = stats.inTransit;
    document.getElementById('delivered').textContent = stats.delivered;
    document.getElementById('pending').textContent = stats.pending;
}

// Render packages table
function renderPackagesTable(packages) {
    const tbody = document.getElementById('packagesTableBody');
    const noPackages = document.getElementById('noPackages');

    if (packages.length === 0) {
        tbody.innerHTML = '';
        noPackages.style.display = 'block';
        return;
    }

    noPackages.style.display = 'none';

    // Sort by date (newest first)
    packages.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    tbody.innerHTML = packages.map(pkg => {
        const statusClass = getStatusClass(pkg.status);
        const date = new Date(pkg.requestDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <tr>
                <td><strong>${pkg.trackingNumber}</strong></td>
                <td>${pkg.sender.city}, ${pkg.sender.zip}</td>
                <td>${pkg.recipient.city}, ${pkg.recipient.zip}</td>
                <td><span class="status-badge ${statusClass}">${pkg.status}</span></td>
                <td>${capitalize(pkg.package.speed)}</td>
                <td>${date}</td>
                <td>
                    <button class="btn-icon" onclick="openUpdateModal('${pkg.trackingNumber}')" title="Update Status">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="viewDetails('${pkg.trackingNumber}')" title="View Details">
                        👁️
                    </button>
                    <button class="btn-icon btn-danger" onclick="deletePackage('${pkg.trackingNumber}')" title="Delete">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Get status class for styling
function getStatusClass(status) {
    const statusMap = {
        'Pending Pickup': 'status-pending',
        'Picked Up': 'status-picked',
        'In Transit': 'status-transit',
        'Out for Delivery': 'status-delivery',
        'Delivered': 'status-delivered'
    };
    return statusMap[status] || '';
}

// Capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Refresh button
document.getElementById('refreshBtn').addEventListener('click', function() {
    loadDashboard();

    // Show refresh animation
    this.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        this.style.transform = 'rotate(0deg)';
    }, 500);
});

// Update Modal Functions
let currentTrackingNumber = null;
let packagesCache = [];

async function openUpdateModal(trackingNumber) {
    currentTrackingNumber = trackingNumber;

    try {
        const response = await fetch(`${API_URL}/packages/${trackingNumber}`);
        const pkg = await response.json();

        if (!pkg) return;

        // Populate modal with package info
        document.getElementById('modalTrackingNumber').textContent = trackingNumber;
        document.getElementById('modalFrom').textContent = `${pkg.sender.city}, ${pkg.sender.zip}`;
        document.getElementById('modalTo').textContent = `${pkg.recipient.city}, ${pkg.recipient.zip}`;
        document.getElementById('newStatus').value = pkg.status;

        // Show modal
        document.getElementById('updateModal').style.display = 'flex';
    } catch (error) {
        console.error('Error fetching package:', error);
    }
}

function closeUpdateModal() {
    document.getElementById('updateModal').style.display = 'none';
    document.getElementById('updateStatusForm').reset();
    currentTrackingNumber = null;
}

// Modal close button
document.querySelector('.modal-close').addEventListener('click', closeUpdateModal);
document.getElementById('cancelUpdate').addEventListener('click', closeUpdateModal);

// Close modal when clicking outside
document.getElementById('updateModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeUpdateModal();
    }
});

// Handle status update
document.getElementById('updateStatusForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const newStatus = document.getElementById('newStatus').value;
    const newLocation = document.getElementById('newLocation').value.trim();

    if (!currentTrackingNumber) return;

    try {
        const response = await fetch(`${API_URL}/packages/${currentTrackingNumber}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: newStatus,
                location: newLocation || 'Distribution Center'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update package');
        }

        // Close modal and reload
        closeUpdateModal();
        loadDashboard();

        // Show success message
        alert(`Package ${currentTrackingNumber} updated to: ${newStatus}`);
    } catch (error) {
        console.error('Error updating package:', error);
        alert('Failed to update package. Please try again.');
    }
});

function viewDetails(trackingNumber) {
    window.open(`tracking.html?track=${trackingNumber}`, '_blank');
}

async function deletePackage(trackingNumber) {
    if (confirm(`Are you sure you want to delete package ${trackingNumber}?`)) {
        try {
            const response = await fetch(`${API_URL}/packages/${trackingNumber}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete package');
            }

            loadDashboard();
            alert(`Package ${trackingNumber} deleted successfully`);
        } catch (error) {
            console.error('Error deleting package:', error);
            alert('Failed to delete package. Please try again.');
        }
    }
}
