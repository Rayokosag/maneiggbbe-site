const API = '/api';

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem('adminToken') || ''),
        'X-Requested-With': 'XMLHttpRequest'
    };
}

// Auth guard
if (localStorage.getItem('adminLoggedIn') !== 'true' || !localStorage.getItem('adminToken')) {
    window.location.href = 'login.html';
}

// State
let page = 1, totalPages = 1, statusFilter = '', searchQuery = '';
let allPackages = [];
let pendingDeleteTracking = null;

// ── INIT ─────────────────────────────────────────────────────────────────────
loadDashboard();

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function loadDashboard() {
    try {
        const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : '';
        const [pkgRes, statsRes] = await Promise.all([
            fetch(`${API}/packages?page=${page}&limit=20${statusParam}`, { headers: authHeaders() }),
            fetch(`${API}/packages/stats`, { headers: authHeaders() })
        ]);

        if (pkgRes.status === 401 || pkgRes.status === 403) {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
            return;
        }

        const pkgData = await pkgRes.json();
        const stats   = await statsRes.json();

        document.getElementById('statTotal').textContent    = stats.total    ?? '—';
        document.getElementById('statPending').textContent  = stats.pending  ?? '—';
        document.getElementById('statTransit').textContent  = stats.inTransit ?? '—';
        document.getElementById('statDelivered').textContent= stats.delivered ?? '—';

        allPackages = pkgData.packages || [];
        if (pkgData.pagination) {
            totalPages = pkgData.pagination.totalPages;
            page       = pkgData.pagination.page;
        }

        renderTable();
        renderPagination();
    } catch (err) {
        console.error(err);
        toast('Failed to load dashboard', 'error');
    }
}

// ── RENDER TABLE ──────────────────────────────────────────────────────────────
function renderTable() {
    const q = searchQuery.toLowerCase();
    const filtered = q ? allPackages.filter(p =>
        p.trackingNumber.toLowerCase().includes(q) ||
        p.sender.name.toLowerCase().includes(q) ||
        p.recipient.name.toLowerCase().includes(q) ||
        (p.sender.city || '').toLowerCase().includes(q) ||
        (p.recipient.city || '').toLowerCase().includes(q)
    ) : allPackages;

    document.getElementById('resultsCount').textContent =
        filtered.length + ' package' + (filtered.length !== 1 ? 's' : '');

    const tbody = document.getElementById('tableBody');
    const empty = document.getElementById('emptyState');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = filtered.map(pkg => {
        const date = new Date(pkg.requestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const badgeClass = statusBadge(pkg.status);
        return `<tr>
            <td><strong style="font-family:monospace;">${pkg.trackingNumber}</strong></td>
            <td>
                ${esc(pkg.sender.name)}
                <div class="cell-sub">${esc(pkg.sender.city || '')}, ${esc(pkg.sender.zip || '')}</div>
            </td>
            <td>
                ${esc(pkg.recipient.name)}
                <div class="cell-sub">${esc(pkg.recipient.city || '')}, ${esc(pkg.recipient.zip || '')}</div>
            </td>
            <td><span class="badge ${badgeClass}">${pkg.status}</span></td>
            <td style="text-transform:capitalize;">${pkg.package.speed}</td>
            <td>${pkg.price || '—'}</td>
            <td>${date}</td>
            <td>
                <div class="actions">
                    <button class="btn-action btn-view"   onclick="openDetail('${pkg.trackingNumber}')">View</button>
                    <button class="btn-action btn-update" onclick="openDetail('${pkg.trackingNumber}', true)">Update</button>
                    <button class="btn-action btn-delete" onclick="askDelete('${pkg.trackingNumber}')">Delete</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── PAGINATION ────────────────────────────────────────────────────────────────
function renderPagination() {
    const el = document.getElementById('pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = `<button class="btn-page" onclick="goPage(${page-1})" ${page<=1?'disabled':''}>← Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn-page ${i===page?'active':''}" onclick="goPage(${i})">${i}</button>`;
    }
    html += `<button class="btn-page" onclick="goPage(${page+1})" ${page>=totalPages?'disabled':''}>Next →</button>`;
    el.innerHTML = html;
}

function goPage(p) {
    if (p < 1 || p > totalPages) return;
    page = p;
    loadDashboard();
}

// ── DETAIL MODAL ──────────────────────────────────────────────────────────────
async function openDetail(trackingNumber, focusUpdate = false) {
    try {
        const res = await fetch(`${API}/packages/${trackingNumber}`, { headers: authHeaders() });
        if (!res.ok) { toast('Package not found', 'error'); return; }
        const pkg = await res.json();

        document.getElementById('modalTracking').textContent    = trackingNumber;
        document.getElementById('dSenderName').textContent      = pkg.sender.name || '—';
        document.getElementById('dSenderPhone').textContent     = pkg.sender.phone || '—';
        document.getElementById('dSenderEmail').textContent     = pkg.sender.email || '—';
        document.getElementById('dSenderAddress').textContent   = pkg.sender.address || '—';
        document.getElementById('dSenderCity').textContent      = (pkg.sender.city || '') + (pkg.sender.zip ? ', ' + pkg.sender.zip : '');
        document.getElementById('dRecipientName').textContent   = pkg.recipient.name || '—';
        document.getElementById('dRecipientPhone').textContent  = pkg.recipient.phone || '—';
        document.getElementById('dRecipientEmail').textContent  = pkg.recipient.email || '—';
        document.getElementById('dRecipientAddress').textContent= pkg.recipient.address || '—';
        document.getElementById('dRecipientCity').textContent   = (pkg.recipient.city || '') + (pkg.recipient.zip ? ', ' + pkg.recipient.zip : '');
        document.getElementById('dWeight').textContent          = pkg.package.weight ? pkg.package.weight + ' kg' : '—';
        document.getElementById('dSpeed').textContent           = capitalize(pkg.package.speed || '—');
        document.getElementById('dPrice').textContent           = pkg.price || '—';
        document.getElementById('dExpected').textContent        = pkg.expectedDelivery || '—';
        document.getElementById('dDesc').textContent            = pkg.package.description || '—';
        document.getElementById('newStatus').value              = pkg.status;
        document.getElementById('newLocation').value            = '';

        document.getElementById('submitUpdate').dataset.tracking = trackingNumber;
        document.getElementById('detailModal').classList.add('open');

        if (focusUpdate) {
            setTimeout(() => document.getElementById('newStatus').focus(), 100);
        }
    } catch (err) {
        toast('Failed to load package', 'error');
    }
}

function closeDetail() {
    document.getElementById('detailModal').classList.remove('open');
}

document.getElementById('closeDetail').addEventListener('click', closeDetail);
document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) closeDetail();
});

// ── STATUS UPDATE ─────────────────────────────────────────────────────────────
document.getElementById('submitUpdate').addEventListener('click', async function() {
    const trackingNumber = this.dataset.tracking;
    const status   = document.getElementById('newStatus').value;
    const location = document.getElementById('newLocation').value.trim() || 'Distribution Center';

    if (!status) { toast('Please select a status', 'error'); return; }

    try {
        const res = await fetch(`${API}/packages/${trackingNumber}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ status, location })
        });
        if (!res.ok) throw new Error();
        closeDetail();
        await loadDashboard();
        toast(`${trackingNumber} updated to "${status}"`, 'success');
    } catch {
        toast('Failed to update package', 'error');
    }
});

// ── DELETE ────────────────────────────────────────────────────────────────────
function askDelete(trackingNumber) {
    pendingDeleteTracking = trackingNumber;
    document.getElementById('confirmTracking').textContent = trackingNumber;
    document.getElementById('confirmModal').classList.add('open');
}

document.getElementById('cancelDelete').addEventListener('click', function() {
    pendingDeleteTracking = null;
    document.getElementById('confirmModal').classList.remove('open');
});

document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) {
        pendingDeleteTracking = null;
        this.classList.remove('open');
    }
});

document.getElementById('confirmDelete').addEventListener('click', async function() {
    if (!pendingDeleteTracking) return;
    const tracking = pendingDeleteTracking;
    document.getElementById('confirmModal').classList.remove('open');
    pendingDeleteTracking = null;

    try {
        const res = await fetch(`${API}/packages/${tracking}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (!res.ok) throw new Error();
        await loadDashboard();
        toast(`Package ${tracking} deleted`, 'success');
    } catch {
        toast('Failed to delete package', 'error');
    }
});

// ── FILTERS ───────────────────────────────────────────────────────────────────
let searchTimer;
document.getElementById('searchInput').addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchQuery = this.value.trim();
        renderTable();
    }, 200);
});

document.getElementById('statusFilter').addEventListener('change', function() {
    statusFilter = this.value;
    page = 1;
    loadDashboard();
});

document.getElementById('refreshBtn').addEventListener('click', function() {
    this.classList.add('spinning');
    loadDashboard().finally(() => {
        setTimeout(() => this.classList.remove('spinning'), 500);
    });
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async function() {
    try {
        await fetch(`${API}/auth/logout`, { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    } catch {}
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    window.location.href = 'login.html';
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
function statusBadge(status) {
    return { 'Pending Pickup': 'badge-pending', 'Picked Up': 'badge-picked',
             'In Transit': 'badge-transit', 'Out for Delivery': 'badge-delivery',
             'Delivered': 'badge-delivered' }[status] || '';
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3500);
}
