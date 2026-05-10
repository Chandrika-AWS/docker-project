const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store bookings in memory
let bookings = [];
let bookingId = 1;

// Train data
const trains = [
    {
        id: 1,
        name: "Rajdhani Express",
        number: "12301",
        from: "New Delhi",
        to: "Mumbai",
        departure: "16:00",
        arrival: "08:00",
        duration: "16h",
        classes: {
            sleeper: { price: 850, seats: 50 },
            ac3: { price: 1850, seats: 40 },
            ac2: { price: 2450, seats: 30 },
            ac1: { price: 3850, seats: 20 }
        },
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    },
    {
        id: 2,
        name: "Shatabdi Express",
        number: "12001",
        from: "New Delhi",
        to: "Chandigarh",
        departure: "07:40",
        arrival: "11:10",
        duration: "3h 30m",
        classes: {
            chair: { price: 750, seats: 80 },
            executive: { price: 1450, seats: 40 }
        },
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    },
    {
        id: 3,
        name: "Duronto Express",
        number: "12269",
        from: "Chennai",
        to: "Delhi",
        departure: "21:00",
        arrival: "07:00",
        duration: "10h",
        classes: {
            sleeper: { price: 950, seats: 60 },
            ac3: { price: 1950, seats: 50 },
            ac2: { price: 2650, seats: 40 }
        },
        days: ["Mon", "Wed", "Fri"]
    },
    {
        id: 4,
        name: "Garib Rath",
        number: "12359",
        from: "Kolkata",
        to: "Patna",
        departure: "22:30",
        arrival: "06:00",
        duration: "7h 30m",
        classes: {
            sleeper: { price: 550, seats: 100 },
            ac3: { price: 1250, seats: 80 }
        },
        days: ["Tue", "Thu", "Sat"]
    },
    {
        id: 5,
        name: "Tejas Express",
        number: "22119",
        from: "Mumbai",
        to: "Goa",
        departure: "05:30",
        arrival: "14:30",
        duration: "9h",
        classes: {
            chair: { price: 1550, seats: 70 },
            executive: { price: 2650, seats: 35 }
        },
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    }
];

// API Routes

// Get all trains
app.get('/api/trains', (req, res) => {
    res.json(trains);
});

// Search trains
app.post('/api/trains/search', (req, res) => {
    const { from, to, date, classType } = req.body;
    
    let filteredTrains = trains.filter(train => 
        train.from.toLowerCase().includes(from.toLowerCase()) &&
        train.to.toLowerCase().includes(to.toLowerCase())
    );
    
    // Check if train runs on selected day
    const dayName = new Date(date).toLocaleString('en-US', { weekday: 'short' });
    filteredTrains = filteredTrains.filter(train => 
        train.days.includes(dayName)
    );
    
    // Update seat availability
    filteredTrains = filteredTrains.map(train => {
        const bookedSeats = bookings.filter(b => 
            b.trainId === train.id && 
            b.classType === classType &&
            b.journeyDate === date
        );
        
        let availableSeats = 0;
        if (train.classes[classType]) {
            availableSeats = train.classes[classType].seats - bookedSeats.length;
        }
        
        return {
            ...train,
            availableSeats,
            price: train.classes[classType]?.price || 0
        };
    });
    
    res.json(filteredTrains);
});

// Create booking
app.post('/api/bookings', (req, res) => {
    const {
        trainId,
        trainName,
        trainNumber,
        from,
        to,
        journeyDate,
        classType,
        passengerName,
        passengerAge,
        passengerGender,
        passengerEmail,
        passengerPhone,
        seatCount,
        totalPrice
    } = req.body;
    
    // Validate
    if (!trainId || !passengerName || !passengerEmail || !passengerPhone || !journeyDate || !classType) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check seat availability
    const existingBookings = bookings.filter(b => 
        b.trainId === trainId && 
        b.classType === classType &&
        b.journeyDate === journeyDate
    );
    
    const train = trains.find(t => t.id === trainId);
    const maxSeats = train.classes[classType]?.seats || 0;
    
    if (existingBookings.length + seatCount > maxSeats) {
        return res.status(409).json({ error: 'Not enough seats available' });
    }
    
    // Generate PNR
    const pnr = 'PNR' + Date.now() + Math.floor(Math.random() * 1000);
    
    // Create booking
    const booking = {
        id: bookingId++,
        pnr,
        trainId,
        trainName,
        trainNumber,
        from,
        to,
        journeyDate,
        classType,
        passengerName,
        passengerAge,
        passengerGender,
        passengerEmail,
        passengerPhone,
        seatCount,
        totalPrice,
        status: 'confirmed',
        bookingDate: new Date().toISOString()
    };
    
    bookings.push(booking);
    res.status(201).json(booking);
});

// Get bookings by email
app.get('/api/bookings/:email', (req, res) => {
    const userBookings = bookings.filter(b => b.passengerEmail === req.params.email);
    res.json(userBookings);
});

// Cancel booking
app.delete('/api/bookings/:pnr', (req, res) => {
    const index = bookings.findIndex(b => b.pnr === req.params.pnr);
    if (index === -1) return res.status(404).json({ error: 'Booking not found' });
    
    bookings.splice(index, 1);
    res.json({ message: 'Booking cancelled successfully' });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚂 Train Booking System running at http://localhost:${PORT}`);
    console.log(`📅 API endpoints: /api/trains, /api/bookings`);
});
