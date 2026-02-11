// Admin Dashboard JavaScript

// API base URL
const API_URL = '/api';

// Get admin token for API calls
function getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Check if user is logged in
function checkAuth() {
    if (localStorage.getItem('adminLoggedIn') !== 'true' || !localStorage.getItem('adminToken')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// State
let currentPage = 1;
let currentStatus = '';
let currentSearch = '';
let totalPages = 1;

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
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        localStorage.removeItem('loginTime');
        window.location.href = 'login.html';
    }
});

// Load dashboard data
async function loadDashboard() {
    try {
        const headers = getAuthHeaders();
        const statusParam = currentStatus ? `&status=${encodeURIComponent(currentStatus)}` : '';

        const [packagesRes, statsRes] = await Promise.all([
            fetch(`${API_URL}/packages?page=${currentPage}&limit=20${statusParam}`, { headers }),
            fetch(`${API_URL}/packages/stats`, { headers })
        ]);

        if (packagesRes.status === 401 || packagesRes.status === 403) {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
            return;
        }

        const packagesData = await packagesRes.json();
        const stats = await statsRes.json();

        updateStats(stats);

        // Handle paginated response format
        const packages = packagesData.packages || packagesData;
        const pagination = packagesData.pagination;
        if (pagination) {
            totalPages = pagination.totalPages;
            currentPage = pagination.page;
        }

        renderPackagesTable(packages);
        renderPagination();
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

    // Apply client-side search filter
    let filtered = packages;
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = packages.filter(pkg =>
            pkg.trackingNumber.toLowerCase().includes(q) ||
            pkg.sender.name.toLowerCase().includes(q) ||
            pkg.recipient.name.toLowerCase().includes(q) ||
            (pkg.sender.city && pkg.sender.city.toLowerCase().includes(q)) ||
            (pkg.recipient.city && pkg.recipient.city.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        noPackages.style.display = 'block';
        return;
    }

    noPackages.style.display = 'none';

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    tbody.innerHTML = filtered.map(pkg => {
        const statusClass = getStatusClass(pkg.status);
        const date = new Date(pkg.requestDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <tr>
                <td><strong>${pkg.trackingNumber}</strong></td>
                <td>${pkg.sender.name}</td>
                <td>${pkg.recipient.name}</td>
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

// Render pagination controls
function renderPagination() {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="btn btn-small" onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn btn-small ${i === currentPage ? 'btn-primary' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    html += `<button class="btn btn-small" onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>`;
    container.innerHTML = html;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadDashboard();
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
    this.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        this.style.transform = 'rotate(0deg)';
    }, 500);
});

// Search input handler
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        currentSearch = this.value.trim();
        loadDashboard();
    });
}

// Status filter handler
const statusFilter = document.getElementById('statusFilter');
if (statusFilter) {
    statusFilter.addEventListener('change', function() {
        currentStatus = this.value;
        currentPage = 1;
        loadDashboard();
    });
}

// Update Modal Functions
let currentTrackingNumber = null;

async function openUpdateModal(trackingNumber) {
    currentTrackingNumber = trackingNumber;

    try {
        const response = await fetch(`${API_URL}/packages/${trackingNumber}`);
        const pkg = await response.json();

        if (!pkg) return;

        document.getElementById('modalTrackingNumber').textContent = trackingNumber;
        document.getElementById('modalFrom').textContent = `${pkg.sender.city}, ${pkg.sender.zip}`;
        document.getElementById('modalTo').textContent = `${pkg.recipient.city}, ${pkg.recipient.zip}`;
        document.getElementById('newStatus').value = pkg.status;

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
            headers: getAuthHeaders(),
            body: JSON.stringify({
                status: newStatus,
                location: newLocation || 'Distribution Center'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update package');
        }

        closeUpdateModal();
        loadDashboard();
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
                method: 'DELETE',
                headers: getAuthHeaders()
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
