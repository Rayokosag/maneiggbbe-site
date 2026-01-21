// Login page JavaScript

// API base URL
const API_URL = '/api';

// Handle form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store session info
            localStorage.setItem('adminLoggedIn', 'true');
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

function showError() {
    document.getElementById('errorMessage').style.display = 'block';

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
