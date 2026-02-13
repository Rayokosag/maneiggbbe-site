// Login page JavaScript

// API base URL
const API_URL = '/api';

let tempToken = null;

// Handle form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // If we're in 2FA mode, verify the code
    if (tempToken) {
        const totpCode = document.getElementById('totpCode').value.trim();
        if (!totpCode) {
            showError('Please enter your 2FA code');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/login/verify-2fa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ tempToken, totpCode })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminUsername', data.username);
                localStorage.setItem('loginTime', data.loginTime);
                window.location.href = 'admin.html';
            } else {
                showError(data.error || 'Invalid 2FA code');
            }
        } catch (error) {
            console.error('2FA error:', error);
            showError('Connection error');
        }
        return;
    }

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.requires2FA) {
            // Show 2FA input
            tempToken = data.tempToken;
            document.getElementById('totpGroup').style.display = 'block';
            document.getElementById('totpCode').focus();
            document.getElementById('username').parentElement.parentElement.style.display = 'none';
            document.getElementById('password').parentElement.parentElement.style.display = 'none';
            return;
        }

        if (response.ok && data.success) {
            // Store session info
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUsername', data.username);
            localStorage.setItem('loginTime', data.loginTime);

            // Redirect to admin dashboard
            window.location.href = 'admin.html';
        } else {
            showError();
        }
    } catch (error) {
        console.error('Login error:', error);
        showError();
    }
});

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (message) errorEl.textContent = message;
    errorEl.style.display = 'block';

    // Shake animation for error
    const form = document.getElementById('loginForm');
    form.style.animation = 'shake 0.5s';
    setTimeout(() => {
        form.style.animation = '';
    }, 500);
}

// Hide error message when user starts typing
document.getElementById('username').addEventListener('input', function() {
    document.getElementById('errorMessage').style.display = 'none';
});

document.getElementById('password').addEventListener('input', function() {
    document.getElementById('errorMessage').style.display = 'none';
});

// Check if already logged in
if (localStorage.getItem('adminLoggedIn') === 'true') {
    window.location.href = 'admin.html';
}
