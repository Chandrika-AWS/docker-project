from flask import Flask, render_template, request, jsonify, session
from datetime import datetime, timedelta
import json
import os
import logging
from functools import wraps
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-production-secret-key-change-this')

# Production configuration
app.config['DEBUG'] = False
app.config['JSON_SORT_KEYS'] = False

# Setup logging for production
if not app.debug:
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/restaurant.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Restaurant booking system startup')

# Data storage (in production, use a real database like PostgreSQL)
BOOKINGS_FILE = os.environ.get('BOOKINGS_FILE', 'bookings.json')

def load_bookings():
    """Load bookings from JSON file"""
    if os.path.exists(BOOKINGS_FILE):
        try:
            with open(BOOKINGS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_bookings(bookings):
    """Save bookings to JSON file with error handling"""
    try:
        with open(BOOKINGS_FILE, 'w') as f:
            json.dump(bookings, f, indent=2)
        return True
    except Exception as e:
        app.logger.error(f"Error saving bookings: {e}")
        return False

# Table configuration
TABLES = {
    1: {'capacity': 2, 'name': 'Table 1 (Window)'},
    2: {'capacity': 4, 'name': 'Table 2 (Booth)'},
    3: {'capacity': 4, 'name': 'Table 3 (Garden View)'},
    4: {'capacity': 6, 'name': 'Table 4 (Family Table)'},
    5: {'capacity': 8, 'name': 'Table 5 (Private Room)'}
}

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/api/tables')
def get_tables():
    """Get all tables information"""
    return jsonify(TABLES)

@app.route('/api/availability')
def check_availability():
    """Check table availability for a given date and time"""
    try:
        date = request.args.get('date')
        time = request.args.get('time')
        guests = int(request.args.get('guests', 1))
        
        if not date or not time:
            return jsonify({'error': 'Date and time required'}), 400
        
        bookings = load_bookings()
        
        # Filter available tables
        available_tables = []
        for table_id, table_info in TABLES.items():
            if table_info['capacity'] >= guests:
                is_booked = False
                for booking in bookings:
                    if (booking['table_id'] == table_id and 
                        booking['date'] == date and 
                        booking['time'] == time):
                        is_booked = True
                        break
                
                if not is_booked:
                    available_tables.append({
                        'id': table_id,
                        'name': table_info['name'],
                        'capacity': table_info['capacity']
                    })
        
        return jsonify(available_tables)
    except Exception as e:
        app.logger.error(f"Error in check_availability: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/book', methods=['POST'])
def make_booking():
    """Make a new table booking"""
    try:
        data = request.json
        
        required_fields = ['customer_name', 'customer_email', 'customer_phone', 
                          'date', 'time', 'guests', 'table_id']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # Validate date
        try:
            booking_date = datetime.strptime(data['date'], '%Y-%m-%d')
            if booking_date < datetime.now().replace(hour=0, minute=0, second=0, microsecond=0):
                return jsonify({'error': 'Cannot book for past dates'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
        
        # Validate time
        valid_times = ['11:00', '12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00', '21:00']
        if data['time'] not in valid_times:
            return jsonify({'error': 'Invalid time slot'}), 400
        
        table_id = int(data['table_id'])
        if table_id not in TABLES:
            return jsonify({'error': 'Invalid table selection'}), 400
        
        if data['guests'] > TABLES[table_id]['capacity']:
            return jsonify({'error': f'Table capacity is {TABLES[table_id]["capacity"]} guests'}), 400
        
        bookings = load_bookings()
        
        # Check for duplicate booking
        for booking in bookings:
            if (booking['table_id'] == table_id and 
                booking['date'] == data['date'] and 
                booking['time'] == data['time']):
                return jsonify({'error': 'This table is already booked for the selected time'}), 409
        
        # Create booking
        booking = {
            'id': len(bookings) + 1,
            'customer_name': data['customer_name'],
            'customer_email': data['customer_email'],
            'customer_phone': data['customer_phone'],
            'date': data['date'],
            'time': data['time'],
            'guests': data['guests'],
            'table_id': table_id,
            'special_requests': data.get('special_requests', ''),
            'booking_time': datetime.now().isoformat()
        }
        
        bookings.append(booking)
        if save_bookings(bookings):
            app.logger.info(f"New booking created: {booking['id']} for {booking['customer_email']}")
            return jsonify({
                'message': 'Booking confirmed!',
                'booking_id': booking['id'],
                'booking': booking
            }), 201
        else:
            return jsonify({'error': 'Failed to save booking'}), 500
            
    except Exception as e:
        app.logger.error(f"Error in make_booking: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/bookings/<email>')
def get_customer_bookings(email):
    """Get all bookings for a customer by email"""
    try:
        bookings = load_bookings()
        customer_bookings = [b for b in bookings if b['customer_email'] == email]
        customer_bookings.sort(key=lambda x: (x['date'], x['time']))
        return jsonify(customer_bookings)
    except Exception as e:
        app.logger.error(f"Error in get_customer_bookings: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/cancel/<int:booking_id>', methods=['DELETE'])
def cancel_booking(booking_id):
    """Cancel a booking"""
    try:
        bookings = load_bookings()
        
        booking_to_cancel = None
        for booking in bookings:
            if booking['id'] == booking_id:
                booking_to_cancel = booking
                bookings.remove(booking)
                break
        
        if booking_to_cancel:
            if save_bookings(bookings):
                app.logger.info(f"Booking cancelled: {booking_id}")
                return jsonify({'message': f'Booking #{booking_id} cancelled successfully'})
            else:
                return jsonify({'error': 'Failed to cancel booking'}), 500
        else:
            return jsonify({'error': 'Booking not found'}), 404
    except Exception as e:
        app.logger.error(f"Error in cancel_booking: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Only run with gunicorn in production - don't use app.run()
# For local testing only
if __name__ == '__main__':
    # This block only runs when executing directly, not with gunicorn
    app.run(host='0.0.0.0', port=5000, debug=True)
