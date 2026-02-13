// Shared Navbar Module — auth state, hamburger, profile dropdown, logout, active link

(function() {
    'use strict';

    var hamburgerBtn = document.getElementById('hamburgerBtn');
    var navMenu = document.getElementById('navMenu');
    var navLoginBtn = document.getElementById('navLoginBtn');
    var navProfile = document.getElementById('navProfile');
    var profileToggle = document.getElementById('profileToggle');
    var profileDropdown = document.getElementById('profileDropdown');
    var profileDropdownName = document.getElementById('profileDropdownName');
    var navLogoutBtn = document.getElementById('navLogoutBtn');

    // --- Auth state ---
    var token = localStorage.getItem('customerToken');
    var customerName = localStorage.getItem('customerName');

    if (token) {
        if (navLoginBtn) navLoginBtn.style.display = 'none';
        if (navProfile) navProfile.style.display = '';
        if (profileDropdownName && customerName) {
            profileDropdownName.textContent = customerName;
        }
    } else {
        if (navLoginBtn) navLoginBtn.style.display = '';
        if (navProfile) navProfile.style.display = 'none';
    }

    // --- Overlay ---
    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.id = 'navOverlay';
    document.body.appendChild(overlay);

    function closeMenu() {
        if (navMenu) navMenu.classList.remove('active');
        if (hamburgerBtn) hamburgerBtn.classList.remove('active');
        overlay.classList.remove('active');
    }

    // --- Hamburger toggle ---
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', function() {
            var isOpen = navMenu.classList.toggle('active');
            hamburgerBtn.classList.toggle('active');
            if (isOpen) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        });
    }

    overlay.addEventListener('click', closeMenu);

    // --- Profile dropdown toggle ---
    if (profileToggle) {
        profileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
    }

    // Close dropdown on outside click
    document.addEventListener('click', function(e) {
        if (profileDropdown && !profileDropdown.contains(e.target) && e.target !== profileToggle) {
            profileDropdown.classList.remove('active');
        }
    });

    // --- Logout ---
    if (navLogoutBtn) {
        navLogoutBtn.addEventListener('click', function() {
            localStorage.removeItem('customerToken');
            localStorage.removeItem('customerName');
            window.location.href = 'customer-login.html';
        });
    }

    // --- Active link highlighting ---
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(function(link) {
        var linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });
})();
