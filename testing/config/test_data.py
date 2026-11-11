import time

# Pre-seeded users in SPMS database
DEMO_USER = {
    "email": "mehanna@spms.com",
    "password": "user123",
    "full_name": "Mehanna Reddy",
    "phone": "+91 9123456789",
    "vehicle_number": "TS09 AB 1234"
}

DEMO_ADMIN = {
    "email": "admin@spms.com",
    "password": "admin123",
    "full_name": "Super Admin",
    "phone": "+91 9876543210"
}

DEMO_SECURITY = {
    "email": "operator@spms.com",
    "password": "admin123",
    "full_name": "Security Operator",
    "phone": "+91 9876500001"
}

def generate_unique_user():
    timestamp = int(time.time() * 1000)
    return {
        "full_name": f"Test User {timestamp % 10000}",
        "email": f"auto_test_{timestamp}@spms.test",
        "password": "Password@123",
        "phone": f"+91 9{str(timestamp)[-9:]}",
        "vehicle_number": f"TS{str(timestamp)[-2:]} AB {str(timestamp)[-4:]}",
        "vehicle_type": "four_wheeler",
        "vehicle_model": "Swift Dzire",
        "vehicle_color": "White"
    }

def generate_unique_vehicle():
    timestamp = int(time.time() * 1000)
    return {
        "vehicle_number": f"KA{str(timestamp)[-2:]} XY {str(timestamp)[-4:]}",
        "vehicle_type": "four_wheeler",
        "vehicle_model": "Honda City",
        "vehicle_color": "Silver"
    }

