# Maneigbbe Delivery Service

A delivery tracking website similar to UPS, built with vanilla HTML, CSS, and JavaScript.

## Project Structure

```
maneigbbe-delivery/
│
├── index.html              # Homepage
├── tracking.html           # Package tracking page
├── request-pickup.html     # Pickup request form
│
├── css/
│   └── styles.css         # All styles for the website
│
└── js/
    ├── main.js            # Homepage JavaScript
    ├── tracking.js        # Tracking page logic
    └── pickup.js          # Pickup form logic
```

## Features (Phase 1 - Frontend Only)

### ✅ Completed
- **Homepage** with hero section and features
- **Package Tracking** with mock data (3 test tracking numbers)
- **Request Pickup Form** with price calculator
- **Admin Login System** with authentication
- **Admin Dashboard** to manage packages
- Responsive design (works on mobile)
- Local storage for pickup requests

### 🧪 Test Tracking Numbers
You can test the tracking feature with these numbers:
- `MNG123456` - Package in transit
- `MNG789012` - Delivered package
- `MNG345678` - Pending pickup

### 🔐 Admin Access
- **Login URL**: Open `login.html`
- **Username**: `admin`
- **Password**: `admin123`

## How to Use

1. Open `index.html` in your browser (just double-click it)
2. Navigate between pages using the navigation menu
3. Try tracking with the test numbers above
4. Fill out the pickup form to generate a new tracking number
5. **Access admin panel**: Open `login.html` and use credentials above

### Admin Panel Features
- **Dashboard Stats**: View total packages, in transit, delivered, pending
- **Package Management**: See all packages in a table
- **Update Status**: Click the ✏️ icon to update package status and location
- **View Details**: Click the 👁️ icon to open tracking page
- **Delete Packages**: Click the 🗑️ icon to remove packages
- **Real-time Updates**: Changes appear instantly on tracking page

## How It Works Right Now

### Tracking Page (tracking.js)
- Uses **mock data** stored in a JavaScript object
- Displays package status, timeline, and delivery info
- No backend yet - all data is hardcoded

### Pickup Form (pickup.js)
- Calculates price based on weight and delivery speed
- Generates a random tracking number
- Saves data to **localStorage** (browser storage)
- Shows success message with tracking number

### Current Limitations
- Data is not persistent across browsers (localStorage only)
- Mock tracking data is hardcoded
- No real backend or database yet
- No admin panel yet

## Next Steps (Phase 2)

We'll add:
1. **Node.js/Express backend** server
2. **SQLite database** to store real package data
3. Connect frontend to backend with **API calls**
4. Make tracking numbers actually work with database data

## Learning Notes

### Key Concepts Used:
- **DOM Manipulation**: Getting elements with `getElementById`, updating content
- **Event Listeners**: Handling form submissions and button clicks
- **LocalStorage**: Saving data in the browser
- **URL Parameters**: Passing tracking numbers via URL (`?track=MNG123456`)
- **JSON**: Storing and parsing data
- **CSS Grid & Flexbox**: Layout and responsive design

### JavaScript Patterns You'll See:
```javascript
// Event listener pattern
document.getElementById('form').addEventListener('submit', function(e) {
    e.preventDefault(); // Stop default form behavior
    // Your code here
});

// Getting form values
const value = document.getElementById('input').value;

// Updating HTML content
document.getElementById('element').textContent = 'New text';

// Showing/hiding elements
document.getElementById('element').style.display = 'block'; // Show
document.getElementById('element').style.display = 'none';  // Hide
```

## Questions?

Feel free to explore the code! Each file has comments explaining what it does.
