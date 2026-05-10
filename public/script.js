// Train stations list
const stations = [
    "New Delhi", "Mumbai", "Kolkata", "Chennai", "Bangalore",
    "Hyderabad", "Ahmedabad", "Pune", "Jaipur", "Lucknow",
    "Chandigarh", "Patna", "Goa", "Bhopal", "Indore"
];

// Populate datalist
const datalist = document.createElement('datalist');
datalist.id = 'stations';
stations.forEach(station => {
    const option = document.createElement('option');
    option.value = station;
    datalist.appendChild(option);
});
document.body.appendChild(datalist);

// Set minimum date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('journeyDate').min = today;
document.getElementById('journeyDate').value = today;

// Search trains
async function searchTrains() {
    const from = document.getElementById('fromStation').value;
    const to = document.getElementById('toStation').value;
    const date = document.getElementById('journeyDate').value;
    const classType = document.getElementById('classType').value;
    
    if (!from || !to) {
        showToast('Please enter both departure and arrival stations', 'error');
        return;
    }
    
    if (!date) {
        showToast('Please select journey date', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/trains/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to, date, classType })
        });
        
        const trains = await response.json();
        displaySearchResults(trains, date, classType);
    } catch (error) {
        showToast('Error searching trains', 'error');
    }
}

// Display search results
function displaySearchResults(trains, date, classType) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (trains.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-train"></i>
                <p>No trains found for this route on selected date.</p>
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = trains.map(train => `
        <div class="train-card">
            <div class="train-header">
                <div>
                    <div class="train-name">${train.name}</div>
                    <div class="train-number">${train.number}</div>
                </div>
                <div class="seat-availability">
                    <i class="fas fa-chair"></i> ${train.availableSeats} seats available
                </div>
            </div>
            
            <div class="train-route">
                <div class="station">
                    <div class="station-code">${train.from.substring(0, 3).toUpperCase()}</div>
                    <div class="station-name">${train.from}</div>
                    <div>${train.departure}</div>
                </div>
                <div class="train-duration">
                    <i class="fas fa-arrow-right"></i>
                    <div>${train.duration}</div>
                </div>
                <div class="station">
                    <div class="station-code">${train.to.substring(0, 3).toUpperCase()}</div>
                    <div class="station-name">${train.to}</div>
                    <div>${train.arrival}</div>
                </div>
            </div>
            
            <div class="train-details">
                <div class="train-price">
                    ₹${train.price} <span>per seat</span>
                </div>
                <button class="btn-book" onclick="openBookingModal(${JSON.stringify(train).replace(/"/g, '&quot;')}, '${date}', '${classType}')">
                    <i class="fas fa-ticket-alt"></i> Book Now
                </button>
            </div>
        </div>
    `).join('');
}

// Open booking modal
function openBookingModal(train, date, classType) {
    const modal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    
    const classNames = {
        sleeper: 'Sleeper (SL)',
        ac3: 'AC 3 Tier (3A)',
        ac2: 'AC 2 Tier (2A)',
        ac1: 'AC 1st Class (1A)',
        chair: 'Chair Car (CC)',
        executive: 'Executive (EC)'
    };
    
    bookingForm.innerHTML = `
        <div class="booking-form-details">
            <div class="form-group">
                <label>Train</label>
                <input type="text" value="${train.name} (${train.number})" readonly>
            </div>
            <div class="form-group">
                <label>From - To</label>
                <input type="text" value="${train.from} → ${train.to}" readonly>
            </div>
            <div class="form-group">
                <label>Journey Date</label>
                <input type="text" value="${date}" readonly>
            </div>
            <div class="form-group">
                <label>Class</label>
                <input type="text" value="${classNames[classType]}" readonly>
            </div>
            <div class="form-group">
                <label>Price per seat</label>
                <input type="text" value="₹${train.price}" readonly>
            </div>
            <div class="form-group">
                <label>Number of Seats *</label>
                <input type="number" id="seatCount" min="1" max="${train.availableSeats}" value="1" required>
            </div>
            <div class="form-group">
                <label>Passenger Name *</label>
                <input type="text" id="passengerName" placeholder="Full name" required>
            </div>
            <div class="form-group">
                <label>Age *</label>
                <input type="number" id="passengerAge" min="1" max="120" required>
            </div>
            <div class="form-group">
                <label>Gender *</label>
                <select id="passengerGender">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="passengerEmail" placeholder="Email address" required>
            </div>
            <div class="form-group">
                <label>Phone *</label>
                <input type="tel" id="passengerPhone" placeholder="Mobile number" required>
            </div>
            <button class="btn-submit" onclick="confirmBooking('${train.id}', '${train.name}', '${train.number}', '${train.from}', '${train.to}', '${date}', '${classType}', ${train.price})">
                <i class="fas fa-check"></i> Confirm Booking
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Close modal
    document.querySelector('.close').onclick = () => {
        modal.style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Confirm booking
async function confirmBooking(trainId, trainName, trainNumber, from, to, date, classType, price) {
    const seatCount = parseInt(document.getElementById('seatCount').value);
    const passengerName = document.getElementById('passengerName').value;
    const passengerAge = document.getElementById('passengerAge').value;
    const passengerGender = document.getElementById('passengerGender').value;
    const passengerEmail = document.getElementById('passengerEmail').value;
    const passengerPhone = document.getElementById('passengerPhone').value;
    
    if (!passengerName || !passengerAge || !passengerEmail || !passengerPhone) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const totalPrice = price * seatCount;
    
    const booking = {
        trainId: parseInt(trainId),
        trainName,
        trainNumber,
        from,
        to,
        journeyDate: date,
        classType,
        passengerName,
        passengerAge: parseInt(passengerAge),
        passengerGender,
        passengerEmail,
        passengerPhone,
        seatCount,
        totalPrice
    };
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`Booking confirmed! PNR: ${data.pnr}`, 'success');
            document.getElementById('bookingModal').style.display = 'none';
            
            // Clear search
            document.getElementById('searchEmail').value = passengerEmail;
            searchBookings();
        } else {
            showToast(data.error || 'Booking failed', 'error');
        }
    } catch (error) {
        showToast('Error creating booking', 'error');
    }
}

// Search bookings
async function searchBookings() {
    const email = document.getElementById('searchEmail').value;
    
    if (!email) {
        showToast('Please enter email address', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/bookings/${encodeURIComponent(email)}`);
        const bookings = await response.json();
        displayBookings(bookings);
    } catch (error) {
        showToast('Error fetching bookings', 'error');
    }
}

// Display bookings
function displayBookings(bookings) {
    const bookingsList = document.getElementById('bookingsList');
    
    if (bookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ticket-alt"></i>
                <p>No bookings found for this email.</p>
            </div>
        `;
        return;
    }
    
    const classNames = {
        sleeper: 'SL',
        ac3: '3A',
        ac2: '2A',
        ac1: '1A',
        chair: 'CC',
        executive: 'EC'
    };
    
    bookingsList.innerHTML = bookings.map(booking => `
        <div class="booking-card">
            <div class="booking-header">
                <div class="booking-pnr">PNR: ${booking.pnr}</div>
                <div class="booking-status">${booking.status}</div>
            </div>
            <div class="booking-details">
                <div class="booking-detail">
                    <i class="fas fa-train"></i>
                    <span>${booking.trainName} (${booking.trainNumber})</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${booking.from} → ${booking.to}</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${new Date(booking.journeyDate).toLocaleDateString()}</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-chair"></i>
                    <span>${classNames[booking.classType]} Class</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-user"></i>
                    <span>${booking.passengerName} (${booking.passengerAge}, ${booking.passengerGender})</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-ticket-alt"></i>
                    <span>${booking.seatCount} Seats</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-rupee-sign"></i>
                    <span>₹${booking.totalPrice}</span>
                </div>
            </div>
            <button class="btn-cancel" onclick="cancelBooking('${booking.pnr}')">
                <i class="fas fa-times"></i> Cancel Booking
            </button>
        </div>
    `).join('');
}

// Cancel booking
async function cancelBooking(pnr) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        const response = await fetch(`/api/bookings/${pnr}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Booking cancelled successfully', 'success');
            searchBookings(); // Refresh the list
        } else {
            showToast('Error cancelling booking', 'error');
        }
    } catch (error) {
        showToast('Error cancelling booking', 'error');
    }
}

// Show toast notification
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Scroll to search
function scrollToSearch() {
    document.getElementById('search').scrollIntoView({ behavior: 'smooth' });
}

// Smooth scrolling for nav links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        }
    });
});

// Update active nav link on scroll
window.addEventListener('scroll', () => {
    const sections = ['home', 'search', 'my-bookings'];
    let current = '';
    
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                current = section;
            }
        }
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});
