-- ==========================================================
-- IRIS 365 Consolidated Database Setup Script
-- Target: Supabase (PostgreSQL) SQL Editor
-- Includes: Core Schema, Performance Indexes, Atomic RPCs, 
-- Hardened RLS policies, and rich Seed Data.
-- ==========================================================

-- ==========================================================
-- SECTION 1: CORE DATABASE SCHEMA
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. INSTITUTIONS
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- school, college, university, center
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    logo_url TEXT,
    plan_tier VARCHAR(50) DEFAULT 'Seed', -- Seed, Campus, University, Enterprise
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS & AUTH (Syncs with Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- SuperAdmin, Admin, Staff, Student, Parent, Warden, Driver, Vendor, Security
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    employee_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_email_per_tenant UNIQUE (institution_id, email)
);

-- 3. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    head_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    semester INTEGER DEFAULT 1,
    batch_year VARCHAR(10) NOT NULL, -- e.g., 2024-2028
    dob DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(20),
    address TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_roll_per_tenant UNIQUE (institution_id, roll_number)
);

-- 5. STAFF
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation VARCHAR(100),
    joining_date DATE,
    salary DECIMAL(12, 2),
    qualification VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. ATTENDANCE SESSIONS
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    subject VARCHAR(150) NOT NULL,
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL, -- e.g. 09:00-10:00
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- Present, Absent, Late, Excused
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    method VARCHAR(50) DEFAULT 'QR', -- QR, Biometric, RFID, Manual
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    device_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_session UNIQUE (student_id, session_id)
);

-- 8. TIMETABLE
CREATE TABLE IF NOT EXISTS timetable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL, -- Monday, Tuesday...
    time_slot VARCHAR(50) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    teacher_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    room VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. FEE STRUCTURES
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- Tuition, Hostel...
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    applicable_to VARCHAR(100) DEFAULT 'All', -- All, CSE, ECE...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. FEE PAYMENTS
CREATE TABLE IF NOT EXISTS fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    method VARCHAR(50) NOT NULL, -- UPI, Card, Netbanking, Cash
    transaction_id VARCHAR(100) UNIQUE,
    status VARCHAR(30) DEFAULT 'Pending', -- Pending, Completed, Failed
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. FEE REMINDERS
CREATE TABLE IF NOT EXISTS fee_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    channel VARCHAR(30) DEFAULT 'WhatsApp' -- Push, WhatsApp, SMS, Email
);

-- 12. NOTICES
CREATE TABLE IF NOT EXISTS notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Academic', -- Academic, Event, Holiday, Urgent
    target_audience VARCHAR(100) DEFAULT 'All', -- All, Staff, Students, HOD
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 13. EXAMS
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- Mid-Term, End-Sem
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(50) DEFAULT 'Written', -- Written, Online, Lab
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. EXAM RESULTS
CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(150) NOT NULL,
    marks_obtained DECIMAL(5, 2) NOT NULL,
    max_marks DECIMAL(5, 2) NOT NULL,
    grade VARCHAR(10),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_exam_subject UNIQUE (student_id, exam_id, subject)
);

-- 15. CANTEEN MENUS
CREATE TABLE IF NOT EXISTS canteen_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Snacks, Beverages, Meals
    price DECIMAL(8, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    allergens VARCHAR(255),
    calories INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. CANTEEN WALLETS
CREATE TABLE IF NOT EXISTS canteen_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0.00),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. CANTEEN ORDERS
CREATE TABLE IF NOT EXISTS canteen_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    items JSONB NOT NULL, -- e.g. [{"menu_id": "...", "qty": 2}]
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'Received', -- Received, Preparing, Ready, Delivered
    order_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pickup_time TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50) DEFAULT 'Wallet'
);

-- 18. MEAL SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS meal_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL, -- Breakfast, Lunch, Complete
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    meals_remaining INTEGER DEFAULT 30,
    amount_paid DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. HOSTEL BLOCKS
CREATE TABLE IF NOT EXISTS hostel_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- Boys, Girls
    total_rooms INTEGER DEFAULT 0,
    warden_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. HOSTEL ROOMS
CREATE TABLE IF NOT EXISTS hostel_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    block_id UUID REFERENCES hostel_blocks(id) ON DELETE CASCADE,
    room_number VARCHAR(30) NOT NULL,
    capacity INTEGER NOT NULL,
    occupied INTEGER DEFAULT 0 CHECK (occupied >= 0),
    amenities TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_room_per_block UNIQUE (block_id, room_number)
);

-- 21. HOSTEL ALLOCATIONS
CREATE TABLE IF NOT EXISTS hostel_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    room_id UUID REFERENCES hostel_rooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    allotted_date DATE NOT NULL,
    vacated_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. HOSTEL COMPLAINTS
CREATE TABLE IF NOT EXISTS hostel_complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    room_id UUID REFERENCES hostel_rooms(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- Plumbing, Electrical...
    description TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Open', -- Open, In Progress, Resolved
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 23. HOSTEL VISITORS
CREATE TABLE IF NOT EXISTS hostel_visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(20) NOT NULL,
    purpose TEXT,
    in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    out_time TIMESTAMP WITH TIME ZONE,
    gate_pass_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 24. BOOKS
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    isbn VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    publisher VARCHAR(255),
    copies_total INTEGER DEFAULT 1,
    copies_available INTEGER DEFAULT 1,
    shelf_location VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 25. BOOK ISSUES
CREATE TABLE IF NOT EXISTS book_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount DECIMAL(8, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'Issued', -- Issued, Returned, Overdue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 26. STUDY ROOM BOOKINGS
CREATE TABLE IF NOT EXISTS study_room_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    room_number VARCHAR(30) NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(30) DEFAULT 'Booked', -- Booked, Checked-In, Cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 27. EVENTS
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- Cultural, Tech
    venue VARCHAR(150),
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    banner_url TEXT,
    status VARCHAR(30) DEFAULT 'Scheduled', -- Scheduled, Ongoing, Completed, Cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 28. EVENT REGISTRATIONS
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    ticket_number VARCHAR(100) UNIQUE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(30) DEFAULT 'Completed', -- Free/Completed/Pending
    attendance_marked BOOLEAN DEFAULT FALSE
);

-- 29. EVENT VOLUNTEERS
CREATE TABLE IF NOT EXISTS event_volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 30. EVENT SPONSORS
CREATE TABLE IF NOT EXISTS event_sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    sponsor_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2),
    tier VARCHAR(50) DEFAULT 'Bronze', -- Gold, Silver, Bronze
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 31. GYM SLOTS
CREATE TABLE IF NOT EXISTS gym_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL,
    trainer_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    booked_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 32. GYM BOOKINGS
CREATE TABLE IF NOT EXISTS gym_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES gym_slots(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    booking_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'Booked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 33. GYM MEMBERSHIPS
CREATE TABLE IF NOT EXISTS gym_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL, -- Monthly, Quarterly, Annual
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 34. EQUIPMENT LOGS
CREATE TABLE IF NOT EXISTS equipment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    equipment_name VARCHAR(150) NOT NULL,
    condition VARCHAR(50) DEFAULT 'Good', -- Good, Repair, Scrapped
    last_serviced DATE,
    next_service DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 34b. FITNESS METRICS (body measurements tracking)
CREATE TABLE IF NOT EXISTS fitness_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    weight_kg DECIMAL(5, 2),
    height_cm DECIMAL(5, 2),
    bmi DECIMAL(5, 2),
    body_fat_percent DECIMAL(5, 2),
    chest_cm DECIMAL(5, 2),
    waist_cm DECIMAL(5, 2),
    hips_cm DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 34c. WORKOUT SESSIONS
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES gym_bookings(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    duration_minutes INTEGER,
    exercises JSONB,
    calories_burned INTEGER DEFAULT 0,
    trainer_notes TEXT,
    self_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 34d. BOOK RESERVATIONS (library)
CREATE TABLE IF NOT EXISTS book_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    reserved_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'completed', 'expired')),
    notified_at TIMESTAMPTZ
);

-- 35. BUS ROUTES
CREATE TABLE IF NOT EXISTS bus_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    stops JSONB NOT NULL,
    schedule TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 36. BUSES
CREATE TABLE IF NOT EXISTS buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    route_id UUID REFERENCES bus_routes(id) ON DELETE SET NULL,
    device_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 37. BUS TRACKING
CREATE TABLE IF NOT EXISTS bus_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DECIMAL(5, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 38. TRANSPORT SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS transport_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    route_id UUID REFERENCES bus_routes(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 39. GATE LOGS
CREATE TABLE IF NOT EXISTS gate_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    person_id UUID REFERENCES users(id) ON DELETE CASCADE,
    person_type VARCHAR(50) NOT NULL, -- Student, Staff
    entry_type VARCHAR(20) NOT NULL, -- IN, OUT
    in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    out_time TIMESTAMP WITH TIME ZONE,
    method VARCHAR(50) DEFAULT 'RFID', -- Biometric, QR, RFID, Override
    gate_number VARCHAR(10)
);

-- 40. VISITOR LOGS
CREATE TABLE IF NOT EXISTS visitor_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    visitor_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    host_id UUID REFERENCES users(id) ON DELETE SET NULL,
    purpose TEXT,
    in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    out_time TIMESTAMP WITH TIME ZONE,
    photo_url TEXT,
    id_type VARCHAR(50) -- Aadhaar, PAN...
);

-- 41. SECURITY INCIDENTS
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    severity VARCHAR(30) DEFAULT 'Medium', -- Low, Medium, High
    status VARCHAR(30) DEFAULT 'Open', -- Open, Investigating, Resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 42. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'Info', -- Info, Alert, Billing
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 43. NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL, -- FCM, WhatsApp, Email
    recipient VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Sent', -- Sent, Failed
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 44. AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    messages JSONB NOT NULL, -- e.g. [{"role": "user", "content": "..."}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 45. AI QUERY LOGS
CREATE TABLE IF NOT EXISTS ai_query_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    module VARCHAR(50),
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_users_institution ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_dept ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_institution ON staff(institution_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_timetable_dept ON timetable(department_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_block ON hostel_rooms(block_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_student ON hostel_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_book_issues_student ON book_issues(student_id);
CREATE INDEX IF NOT EXISTS idx_book_issues_book ON book_issues(book_id);
CREATE INDEX IF NOT EXISTS idx_bus_tracking_bus ON bus_tracking(bus_id);
CREATE INDEX IF NOT EXISTS idx_gate_logs_person ON gate_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);


-- ==========================================================
-- SECTION 2: ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Enable RLS on every table
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_query_logs ENABLE ROW LEVEL SECURITY;

-- Define tenant-isolation helper function (securely looks up from public.users table)
CREATE OR REPLACE FUNCTION get_auth_institution_id()
RETURNS UUID AS $$
DECLARE
    inst_id UUID;
BEGIN
    SELECT institution_id INTO inst_id 
    FROM public.users 
    WHERE email = auth.jwt() ->> 'email' OR id = (auth.jwt() ->> 'sub')::UUID;
    RETURN inst_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Define tenant-isolation role helper (securely looks up from public.users table)
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS VARCHAR AS $$
DECLARE
    u_role VARCHAR;
BEGIN
    SELECT role INTO u_role 
    FROM public.users 
    WHERE email = auth.jwt() ->> 'email' OR id = (auth.jwt() ->> 'sub')::UUID;
    RETURN u_role;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Select Institutions
DROP POLICY IF EXISTS select_institutions ON institutions;
CREATE POLICY select_institutions ON institutions
    FOR SELECT USING (
        id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'
    );

DROP POLICY IF EXISTS all_superadmin_institutions ON institutions;
CREATE POLICY all_superadmin_institutions ON institutions
    FOR ALL USING (
        get_auth_user_role() = 'SuperAdmin'
    );

-- Generic Tenant Isolation Policies
DROP POLICY IF EXISTS tenant_users_policy ON users;
CREATE POLICY tenant_users_policy ON users FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_departments_policy ON departments;
CREATE POLICY tenant_departments_policy ON departments FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_students_policy ON students;
CREATE POLICY tenant_students_policy ON students FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_staff_policy ON staff;
CREATE POLICY tenant_staff_policy ON staff FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_attendance_policy ON attendance;
CREATE POLICY tenant_attendance_policy ON attendance FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_attendance_sessions_policy ON attendance_sessions;
CREATE POLICY tenant_attendance_sessions_policy ON attendance_sessions FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_timetable_policy ON timetable;
CREATE POLICY tenant_timetable_policy ON timetable FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_fee_structures_policy ON fee_structures;
CREATE POLICY tenant_fee_structures_policy ON fee_structures FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_fee_payments_policy ON fee_payments;
CREATE POLICY tenant_fee_payments_policy ON fee_payments FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_canteen_menus_policy ON canteen_menus;
CREATE POLICY tenant_canteen_menus_policy ON canteen_menus FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_canteen_orders_policy ON canteen_orders;
CREATE POLICY tenant_canteen_orders_policy ON canteen_orders FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_hostel_rooms_policy ON hostel_rooms;
CREATE POLICY tenant_hostel_rooms_policy ON hostel_rooms FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_books_policy ON books;
CREATE POLICY tenant_books_policy ON books FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_book_issues_policy ON book_issues;
CREATE POLICY tenant_book_issues_policy ON book_issues FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_events_policy ON events;
CREATE POLICY tenant_events_policy ON events FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_bus_routes_policy ON bus_routes;
CREATE POLICY tenant_bus_routes_policy ON bus_routes FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_buses_policy ON buses;
CREATE POLICY tenant_buses_policy ON buses FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');
DROP POLICY IF EXISTS tenant_notifications_policy ON notifications;
CREATE POLICY tenant_notifications_policy ON notifications FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

-- ==========================================================
-- SECTION 3: HARDENED RLS POLICIES (WARDEN, STUDENT, GUARD)
-- ==========================================================

-- Hostel Allocations Hardened Policy
DROP POLICY IF EXISTS hostel_allocations_security_policy ON hostel_allocations;
CREATE POLICY hostel_allocations_security_policy ON hostel_allocations
    FOR ALL TO authenticated
    USING (
        get_auth_user_role() IN ('SuperAdmin', 'Admin')
        OR (
            get_auth_user_role() = 'Warden'
            AND EXISTS (
                SELECT 1 FROM hostel_rooms hr
                JOIN hostel_blocks hb ON hr.block_id = hb.id
                WHERE hr.id = hostel_allocations.room_id
                  AND hb.warden_id = (auth.jwt() ->> 'sub')::UUID
            )
        )
        OR (
            get_auth_user_role() = 'Student'
            AND student_id = (
                SELECT id FROM students WHERE user_id = (auth.jwt() ->> 'sub')::UUID
            )
        )
    );

-- Hostel Complaints Hardened Policy
DROP POLICY IF EXISTS hostel_complaints_security_policy ON hostel_complaints;
CREATE POLICY hostel_complaints_security_policy ON hostel_complaints
    FOR ALL TO authenticated
    USING (
        get_auth_user_role() IN ('SuperAdmin', 'Admin')
        OR (
            get_auth_user_role() = 'Warden'
            AND (
                assigned_to = (auth.jwt() ->> 'sub')::UUID
                OR EXISTS (
                    SELECT 1 FROM hostel_rooms hr
                    JOIN hostel_blocks hb ON hr.block_id = hb.id
                    WHERE hr.id = hostel_complaints.room_id
                      AND hb.warden_id = (auth.jwt() ->> 'sub')::UUID
                )
            )
        )
        OR (
            get_auth_user_role() = 'Student'
            AND student_id = (
                SELECT id FROM students WHERE user_id = (auth.jwt() ->> 'sub')::UUID
            )
        )
    );

-- Gate Logs Hardened Policy
DROP POLICY IF EXISTS gate_logs_security_policy ON gate_logs;
CREATE POLICY gate_logs_security_policy ON gate_logs
    FOR ALL TO authenticated
    USING (
        get_auth_user_role() IN ('SuperAdmin', 'Admin')
        OR (
            get_auth_user_role() = 'Security'
            AND institution_id = get_auth_institution_id()
        )
        OR (
            get_auth_user_role() IN ('Student', 'Staff')
            AND person_id = (auth.jwt() ->> 'sub')::UUID
        )
    );


-- ==========================================================
-- SECTION 4: ATOMIC TRANSACTION RPCs
-- ==========================================================

CREATE OR REPLACE FUNCTION allocate_room(
  p_institution_id UUID,
  p_room_id UUID,
  p_student_id UUID,
  p_date DATE
) RETURNS JSON AS $$
DECLARE
  v_allocation_id UUID;
  v_room_number VARCHAR;
  v_block_name VARCHAR;
BEGIN
  -- Check if student already has an active allocation
  IF EXISTS (
    SELECT 1 FROM hostel_allocations 
    WHERE student_id = p_student_id AND is_current = TRUE
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Student already has an active hostel allocation.'
    );
  END IF;

  UPDATE hostel_rooms
    SET occupied = occupied + 1
    WHERE id = p_room_id
      AND occupied < capacity
      AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Room is at full capacity or does not exist. Allocation denied.'
    );
  END IF;

  SELECT hr.room_number, hb.name INTO v_room_number, v_block_name
    FROM hostel_rooms hr
    JOIN hostel_blocks hb ON hr.block_id = hb.id
    WHERE hr.id = p_room_id;

  INSERT INTO hostel_allocations (institution_id, room_id, student_id, allotted_date, is_current)
    VALUES (p_institution_id, p_room_id, p_student_id, p_date, TRUE)
    RETURNING id INTO v_allocation_id;

  RETURN json_build_object(
    'success', true,
    'allocation_id', v_allocation_id,
    'room_number', v_room_number,
    'block_name', v_block_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- issue_book_atomic
CREATE OR REPLACE FUNCTION issue_book_atomic(
  p_institution_id UUID,
  p_book_id UUID,
  p_student_id UUID,
  p_issue_date DATE,
  p_due_date DATE
) RETURNS JSON AS $$
DECLARE
  v_issue_id UUID;
  v_title VARCHAR;
  v_copies_remaining INTEGER;
BEGIN
  -- Check if student already has this book issued and unreturned
  IF EXISTS (
    SELECT 1 FROM book_issues 
    WHERE student_id = p_student_id AND book_id = p_book_id AND status = 'Issued'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Student already has an active issue of this book. Duplicate issue denied.'
    );
  END IF;

  UPDATE books
    SET copies_available = copies_available - 1
    WHERE id = p_book_id
      AND copies_available > 0
      AND institution_id = p_institution_id
    RETURNING copies_available, title INTO v_copies_remaining, v_title;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No copies available or book not found in catalogue.'
    );
  END IF;

  INSERT INTO book_issues (institution_id, book_id, student_id, issue_date, due_date, status)
    VALUES (p_institution_id, p_book_id, p_student_id, p_issue_date, p_due_date, 'Issued')
    RETURNING id INTO v_issue_id;

  RETURN json_build_object(
    'success', true,
    'issue_id', v_issue_id,
    'book_title', v_title,
    'copies_remaining', v_copies_remaining
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- return_book_atomic
CREATE OR REPLACE FUNCTION return_book_atomic(
  p_issue_id UUID,
  p_return_date DATE
) RETURNS JSON AS $$
DECLARE
  v_issue RECORD;
  v_fine DECIMAL(8,2) := 0;
  v_days_late INTEGER;
  v_book_title VARCHAR;
BEGIN
  SELECT bi.*, b.title INTO v_issue
    FROM book_issues bi
    JOIN books b ON bi.book_id = b.id
    WHERE bi.id = p_issue_id
    FOR UPDATE OF bi;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Book issue record not found.'
    );
  END IF;

  IF v_issue.status = 'Returned' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Book has already been returned.'
    );
  END IF;

  v_days_late := GREATEST(0, p_return_date - v_issue.due_date);
  v_fine := v_days_late * 5.00;

  UPDATE book_issues
    SET return_date = p_return_date,
        fine_amount = v_fine,
        status = 'Returned'
    WHERE id = p_issue_id;

  UPDATE books
    SET copies_available = copies_available + 1
    WHERE id = v_issue.book_id;

  RETURN json_build_object(
    'success', true,
    'issue_id', p_issue_id,
    'book_title', v_issue.title,
    'fine_amount', v_fine,
    'days_late', v_days_late
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- book_gym_slot_atomic
CREATE OR REPLACE FUNCTION book_gym_slot_atomic(
  p_institution_id UUID,
  p_slot_id UUID,
  p_student_id UUID
) RETURNS JSON AS $$
DECLARE
  v_booking_id UUID;
  v_slot_date DATE;
  v_start_time TIME;
  v_end_time TIME;
BEGIN
  -- Check if student already booked this slot
  IF EXISTS (
    SELECT 1 FROM gym_bookings 
    WHERE student_id = p_student_id AND slot_id = p_slot_id AND status = 'Booked'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Student already has an active booking for this gym slot. Duplicate booking denied.'
    );
  END IF;

  UPDATE gym_slots
    SET booked_count = booked_count + 1
    WHERE id = p_slot_id
      AND booked_count < capacity
      AND institution_id = p_institution_id
    RETURNING date, start_time, end_time INTO v_slot_date, v_start_time, v_end_time;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gym slot is fully booked or does not exist.'
    );
  END IF;

  INSERT INTO gym_bookings (institution_id, slot_id, student_id, booking_date, status)
    VALUES (p_institution_id, p_slot_id, p_student_id, CURRENT_DATE, 'Booked')
    RETURNING id INTO v_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'slot_date', v_slot_date,
    'start_time', v_start_time,
    'end_time', v_end_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- cancel_gym_booking_atomic
CREATE OR REPLACE FUNCTION cancel_gym_booking_atomic(
  p_booking_id UUID
) RETURNS JSON AS $$
DECLARE
  v_slot_id UUID;
BEGIN
  SELECT slot_id INTO v_slot_id
    FROM gym_bookings
    WHERE id = p_booking_id AND status = 'Booked'
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or already cancelled.'
    );
  END IF;

  UPDATE gym_bookings SET status = 'Cancelled' WHERE id = p_booking_id;

  UPDATE gym_slots
    SET booked_count = GREATEST(0, booked_count - 1)
    WHERE id = v_slot_id;

  RETURN json_build_object('success', true, 'message', 'Booking cancelled successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================================
-- SECTION 5: SEED DATA INSERTION
-- ==========================================================

-- Truncate existing tables to start fresh
TRUNCATE TABLE ai_query_logs, ai_conversations, notification_logs, notifications, 
               security_incidents, visitor_logs, gate_logs, transport_subscriptions, 
               bus_tracking, buses, bus_routes, equipment_logs, gym_memberships, 
               gym_bookings, gym_slots, event_sponsors, event_volunteers, 
               event_registrations, events, study_room_bookings, book_issues, books, 
               hostel_complaints, hostel_allocations, hostel_rooms, hostel_blocks, 
               meal_subscriptions, canteen_orders, canteen_wallets, canteen_menus, 
               exam_results, exams, notices, fee_reminders, fee_payments, 
               fee_structures, timetable, attendance, attendance_sessions, staff, 
               students, departments, users, institutions CASCADE;

-- 1. INSTITUTIONS
INSERT INTO institutions (id, name, type, address, city, state, phone, email, logo_url, plan_tier, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'SIN Institute of Engineering & Technology (SIET)',
    'university',
    'Mogra, NH-65, Pali Road',
    'Jodhpur',
    'Rajasthan',
    '+912912760000',
    'info@siet.edu.in',
    'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?q=80&w=200&auto=format&fit=crop',
    'University',
    TRUE
);

-- 2. USERS
INSERT INTO users (id, institution_id, role, name, email, phone, employee_id, is_active) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SuperAdmin', 'Siddharth Singh', 'siddharth@sin.education', '+919876543210', 'SIN-SA-001', TRUE),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Admin', 'Dr. K. R. Sharma', 'director@siet.edu.in', '+919876543211', 'SIET-DIR-002', TRUE),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Staff', 'Prof. Alok Vyas', 'alok.vyas@siet.edu.in', '+919876543212', 'SIET-CSE-003', TRUE),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Staff', 'Dr. Preeti Choudhary', 'preeti.c@siet.edu.in', '+919876543213', 'SIET-ECE-004', TRUE),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Staff', 'Coach Amit Rathi', 'amit.rathi@siet.edu.in', '+919876543214', 'SIET-GYM-005', TRUE),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Student', 'Khushal Gehlot', 'khushal@gmail.com', '+919999988888', NULL, TRUE),
('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Student', 'Aarav Mehta', 'aarav.mehta@siet.edu.in', '+919999988887', NULL, TRUE),
('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Student', 'Aditi Bhati', 'aditi.b@siet.edu.in', '+919999988886', NULL, TRUE),
('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Student', 'Rahul Sen', 'rahul.sen@siet.edu.in', '+919999988885', NULL, TRUE),
('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Student', 'Sneha Goyal', 'sneha.g@siet.edu.in', '+919999988884', NULL, TRUE),
('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Parent', 'Mr. Madanlal Gehlot', 'madanlal@gmail.com', '+919829012345', NULL, TRUE),
('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Warden', 'Jaswant Singh', 'warden@siet.edu.in', '+919829012346', 'SIET-WDN-012', TRUE),
('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'Driver', 'Rajesh Kumar', 'rajesh.driver@siet.edu.in', '+919829012347', 'SIET-DVR-013', TRUE),
('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Vendor', 'Ramesh Canteen Wale', 'canteen@siet.edu.in', '+919829012348', 'SIET-VND-014', TRUE),
('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'Security', 'Guard Sher Singh', 'security@siet.edu.in', '+919829012349', 'SIET-SEC-015', TRUE);

-- Update profile avatars
UPDATE users SET avatar_url = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop' WHERE id = 'b0000000-0000-0000-0000-000000000006';

-- 3. DEPARTMENTS
INSERT INTO departments (id, institution_id, name, head_id) VALUES
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Computer Science & Engineering', 'b0000000-0000-0000-0000-000000000003'),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Electronics & Communication Engineering', 'b0000000-0000-0000-0000-000000000004'),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Mechanical Engineering', NULL);

-- 4. STUDENTS
INSERT INTO students (id, user_id, institution_id, roll_number, department_id, semester, batch_year, dob, gender, blood_group, guardian_name, guardian_phone, address) VALUES
('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '23CSE051', 'd0000000-0000-0000-0000-000000000001', 4, '2022-2026', '2004-05-15', 'Male', 'O+', 'Mr. Madanlal Gehlot', '+919829012345', 'Sardarpura 4th Road, Jodhpur'),
('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '23CSE052', 'd0000000-0000-0000-0000-000000000001', 4, '2022-2026', '2004-09-20', 'Male', 'A+', 'Suresh Mehta', '+919990001112', 'Shastri Nagar, Jodhpur'),
('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '23ECE012', 'd0000000-0000-0000-0000-000000000002', 4, '2022-2026', '2005-01-08', 'Female', 'B+', 'Prakash Bhati', '+919990001113', 'Mandore Road, Jodhpur'),
('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', '23ME005', 'd0000000-0000-0000-0000-000000000003', 4, '2022-2026', '2004-12-11', 'Male', 'AB+', 'Rajendra Sen', '+919990001114', 'Basni, Jodhpur'),
('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', '23CSE015', 'd0000000-0000-0000-0000-000000000001', 4, '2022-2026', '2005-03-30', 'Female', 'O-', 'Kishore Goyal', '+919990001115', 'Paota, Jodhpur');

-- 5. STAFF
INSERT INTO staff (id, user_id, institution_id, department_id, designation, joining_date, salary, qualification) VALUES
('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Professor & HOD', '2015-07-01', 120000.00, 'Ph.D. in Computer Science & Engineering'),
('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Associate Professor & HOD', '2018-01-10', 95000.00, 'Ph.D. in VLSI Systems'),
('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', NULL, 'Fitness Trainer & Gym Incharge', '2021-08-20', 45000.00, 'Master of Physical Education (M.P.Ed)');

-- 6. ATTENDANCE SESSIONS
INSERT INTO attendance_sessions (id, institution_id, department_id, subject, date, time_slot, marked_by) VALUES
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Database Management Systems', CURRENT_DATE, '09:00 - 10:00', 'b0000000-0000-0000-0000-000000000003'),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Compiler Design', CURRENT_DATE, '10:15 - 11:15', 'b0000000-0000-0000-0000-000000000003');

-- 7. ATTENDANCE LOGS
INSERT INTO attendance (institution_id, student_id, session_id, date, status, marked_by, method) VALUES
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'Present', 'b0000000-0000-0000-0000-000000000003', 'QR'),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'Present', 'b0000000-0000-0000-0000-000000000003', 'QR'),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'Absent', 'b0000000-0000-0000-0000-000000000003', 'Manual'),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'Present', 'b0000000-0000-0000-0000-000000000003', 'QR'),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'Present', 'b0000000-0000-0000-0000-000000000003', 'QR'),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'Present', 'b0000000-0000-0000-0000-000000000003', 'QR');

-- 8. TIMETABLE
INSERT INTO timetable (institution_id, department_id, day_of_week, time_slot, subject, teacher_id, room) VALUES
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Monday', '09:00 - 10:00', 'Database Management Systems', 'd0000000-0000-0000-0000-000000000003', 'L-301'),
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Monday', '10:15 - 11:15', 'Compiler Design', 'd0000000-0000-0000-0000-000000000003', 'L-301'),
('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Monday', '11:30 - 12:30', 'Computer Networks', 'd0000000-0000-0000-0000-000000000004', 'Lab-2');

-- 9. FEE STRUCTURES
INSERT INTO fee_structures (id, institution_id, name, amount, due_date, applicable_to) VALUES
('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Academic Tuition Fee - Sem 4', 65000.00, CURRENT_DATE + INTERVAL '30 days', 'All'),
('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Hostel Room & Mess Charges', 45000.00, CURRENT_DATE - INTERVAL '5 days', 'All');

-- 10. FEE PAYMENTS
INSERT INTO fee_payments (institution_id, student_id, fee_structure_id, amount_paid, payment_date, method, transaction_id, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000001', 65000.00, CURRENT_DATE - INTERVAL '15 days', 'UPI', 'TXN_UPI_987654321', 'Completed');

-- 12. NOTICES
INSERT INTO notices (institution_id, title, content, category, target_audience, published_by) VALUES
('a0000000-0000-0000-0000-000000000001', 'Internal Assessment Schedules', 'The first internal test series for Semester 4 will commence from Monday next week. Attendance is mandatory.', 'Academic', 'Students', 'b0000000-0000-0000-0000-000000000002');

-- 15. CANTEEN MENUS
INSERT INTO canteen_menus (id, institution_id, item_name, category, price, is_available, allergens, calories) VALUES
('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Paneer Butter Masala Combo', 'Meals', 120.00, TRUE, 'Dairy, Gluten', 580),
('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Veg Hakka Noodles', 'Meals', 80.00, TRUE, 'Soya, Gluten', 420),
('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Cold Coffee Brew', 'Beverages', 50.00, TRUE, 'Dairy', 220);

-- 16. CANTEEN WALLETS
INSERT INTO canteen_wallets (institution_id, student_id, balance) VALUES
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 450.00),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 120.00);

-- 17. CANTEEN ORDERS
INSERT INTO canteen_orders (institution_id, student_id, items, total_amount, status, payment_method) VALUES
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', '[{"menu_id": "10000000-0000-0000-0000-000000000001", "qty": 1}, {"menu_id": "10000000-0000-0000-0000-000000000003", "qty": 1}]'::jsonb, 170.00, 'Delivered', 'Wallet');

-- 19. HOSTEL BLOCKS
INSERT INTO hostel_blocks (id, institution_id, name, type, total_rooms, warden_id) VALUES
('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ramanujan Hostel (Boys Block A)', 'Boys', 5, 'b0000000-0000-0000-0000-000000000012');

-- 20. HOSTEL ROOMS
INSERT INTO hostel_rooms (id, institution_id, block_id, room_number, capacity, occupied, amenities) VALUES
('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'A-101', 2, 1, 'AC, Double Bed, Study Table, Attached Bathroom'),
('50000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'A-102', 2, 1, 'Non-AC, Double Bed, Study Table, Attached Balcony');

-- 21. HOSTEL ALLOCATIONS
INSERT INTO hostel_allocations (institution_id, room_id, student_id, allotted_date, is_current) VALUES
('a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', '2023-07-15', TRUE),
('a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000007', '2023-07-15', TRUE);

-- 22. HOSTEL COMPLAINTS
INSERT INTO hostel_complaints (institution_id, student_id, room_id, category, description, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000001', 'Electrical', 'Ceiling fan making clicking sound on speed 4', 'Open');

-- 24. BOOKS
INSERT INTO books (id, institution_id, isbn, title, author, category, publisher, copies_total, copies_available, shelf_location) VALUES
('30000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '978-0131103628', 'The C Programming Language', 'Brian W. Kernighan, Dennis M. Ritchie', 'Computer Science', 'Prentice Hall', 5, 4, 'CS-A1-S3'),
('30000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '978-0136086208', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 'Artificial Intelligence', 'Pearson', 4, 4, 'AI-B2-S1'),
('30000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '978-0262033848', 'Introduction to Algorithms', 'Thomas H. Cormen, Charles E. Leiserson', 'Computer Science', 'MIT Press', 8, 8, 'CS-A1-S1'),
('30000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '978-0321125217', 'Domain-Driven Design', 'Eric Evans', 'Software Engineering', 'Addison-Wesley', 3, 3, 'SE-C3-S2'),
('30000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '978-0132350884', 'Clean Code', 'Robert C. Martin', 'Software Engineering', 'Prentice Hall', 6, 5, 'SE-C3-S1'),
('30000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '978-0131429017', 'Compilers: Principles, Techniques, and Tools', 'Alfred V. Aho, Monica S. Lam', 'Computer Science', 'Addison-Wesley', 5, 5, 'CS-A2-S4'),
('30000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '978-0130384744', 'Database System Concepts', 'Abraham Silberschatz, Henry Korth', 'Database Systems', 'McGraw-Hill', 7, 7, 'DB-D1-S1'),
('30000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '978-1492056300', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Computer Science', 'O''Reilly Media', 4, 4, 'CS-A1-S2'),
('30000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', '978-0596007126', 'Head First Design Patterns', 'Eric Freeman, Elisabeth Robson', 'Software Engineering', 'O''Reilly Media', 5, 5, 'SE-C3-S3'),
('30000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', '978-0134092669', 'Computer Networking: A Top-Down Approach', 'James Kurose, Keith Ross', 'Computer Science', 'Pearson', 6, 6, 'CS-A3-S1');

-- 25. BOOK ISSUES
INSERT INTO book_issues (id, institution_id, book_id, student_id, issue_date, due_date, status) VALUES
('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '6 days', 'Issued'),
('40000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000006', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '12 days', 'Issued');

-- 27. EVENTS
INSERT INTO events (id, institution_id, title, description, category, venue, start_datetime, end_datetime, max_participants, created_by, status) VALUES
('90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SIN Hackathon Jodhpur 2026', 'A 36-hour regional level hackathon to solve problems in edtech, healthtech, and logistics.', 'Tech', 'Seminar Hall B, SIET', CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '3 days', 150, 'b0000000-0000-0000-0000-000000000002', 'Scheduled'),
('90000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Spandan 2026 - Cultural Festival', 'The annual mega cultural event of Jodhpur.', 'Cultural', 'Main Open Air Auditorium', CURRENT_TIMESTAMP + INTERVAL '10 days', CURRENT_TIMESTAMP + INTERVAL '12 days', 1000, 'b0000000-0000-0000-0000-000000000002', 'Scheduled');

-- 28. EVENT REGISTRATIONS
INSERT INTO event_registrations (institution_id, event_id, student_id, ticket_number, payment_status) VALUES
('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'TKT-SIN-HACK-8891', 'Completed');

-- 31. GYM SLOTS
INSERT INTO gym_slots (id, institution_id, date, start_time, end_time, capacity, trainer_id, booked_count) VALUES
('60000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '1 day', '06:00:00', '07:00:00', 20, 'd0000000-0000-0000-0000-000000000005', 1),
('60000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '1 day', '07:15:00', '08:15:00', 20, 'd0000000-0000-0000-0000-000000000005', 0),
('60000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '1 day', '17:00:00', '18:00:00', 25, 'd0000000-0000-0000-0000-000000000005', 2),
('60000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '1 day', '18:15:00', '19:15:00', 25, 'd0000000-0000-0000-0000-000000000005', 0);

-- 33. GYM MEMBERSHIPS
INSERT INTO gym_memberships (institution_id, student_id, plan, start_date, end_date, amount_paid, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'Quarterly', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '80 days', 3500.00, 'Active');

-- 32. GYM BOOKINGS
INSERT INTO gym_bookings (institution_id, slot_id, student_id, booking_date, status) VALUES
('a0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', CURRENT_DATE + INTERVAL '1 day', 'Booked');

-- 34. EQUIPMENT LOGS
INSERT INTO equipment_logs (institution_id, equipment_name, condition, last_serviced, next_service) VALUES
('a0000000-0000-0000-0000-000000000001', 'Aerobic Treadmill MT-900', 'Good', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '40 days'),
('a0000000-0000-0000-0000-000000000001', 'Rowing Machine R2', 'Repair', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '5 days');

-- 35. BUS ROUTES
INSERT INTO bus_routes (id, institution_id, name, stops, schedule) VALUES
('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Route A: Sardarpura - Chopasni - SIET Campus', '[{"name": "Sardarpura Gol Building", "time": "07:30 AM"}, {"name": "Chopasni Housing Board", "time": "07:55 AM"}, {"name": "Dhanasni Crossing", "time": "08:15 AM"}, {"name": "SIET Main Gate", "time": "08:35 AM"}]'::jsonb, 'Daily: Mon to Sat'),
('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Route B: Paota - Circuit House - Ratanada - SIET Campus', '[{"name": "Paota Circle", "time": "07:40 AM"}, {"name": "Circuit House Choraha", "time": "07:50 AM"}, {"name": "Ratanada Shiv Temple", "time": "08:05 AM"}, {"name": "SIET Main Gate", "time": "08:35 AM"}]'::jsonb, 'Daily: Mon to Sat');

-- 36. BUSES
INSERT INTO buses (id, institution_id, vehicle_number, capacity, driver_id, route_id, device_id) VALUES
('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'RJ19-PA-1024', 42, 'b0000000-0000-0000-0000-000000000013', '70000000-0000-0000-0000-000000000001', 'GPS-RJ19-PA-1024');

-- 37. BUS TRACKING
INSERT INTO bus_tracking (institution_id, bus_id, latitude, longitude, speed) VALUES
('a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 26.2908, 73.0243, 45.50);

-- 38. TRANSPORT SUBSCRIPTIONS
INSERT INTO transport_subscriptions (institution_id, student_id, route_id, start_date, end_date, amount_paid) VALUES
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '170 days', 12000.00);

-- 39. GATE LOGS
INSERT INTO gate_logs (institution_id, person_id, person_type, entry_type, in_time, out_time, method, gate_number) VALUES
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'Student', 'IN', CURRENT_TIMESTAMP - INTERVAL '90 minutes', NULL, 'RFID', 'Gate 1');

-- 42. NOTIFICATIONS
INSERT INTO notifications (institution_id, user_id, title, body, type, is_read) VALUES
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'Hostel Gate Pass Approved', 'Your gate pass for visiting local market on Saturday has been approved by the Warden.', 'Info', FALSE),
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'Library Fine Pending', 'You have an overdue library book "The C Programming Language" which has accrued standard fines of 5 INR/day.', 'Alert', FALSE);


-- ============================================================
-- MODULE 11: IRIS Admissions
-- Branded Admission Cycles, Multi-Step Applications, Academic
-- Audits, Auto-Merit calculations, Offer letters, and CRM Leads.
-- ============================================================

-- 1. CREATE admission_cycles TABLE
CREATE TABLE IF NOT EXISTS admission_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT CHECK (status IN (
    'upcoming','open','closed','processing','completed'
  )) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CREATE programs TABLE
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  degree_type TEXT,
  duration_years INTEGER,
  total_seats INTEGER,
  reserved_seats JSONB DEFAULT '{}'::jsonb,
  eligibility_criteria JSONB DEFAULT '{}'::jsonb,
  application_fee DECIMAL DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 3. CREATE applicants TABLE
CREATE TABLE IF NOT EXISTS applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES admission_cycles(id) ON DELETE SET NULL,
  application_number TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  category TEXT,
  domicile_state TEXT,
  photo_url TEXT,
  aadhar_number TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_relation TEXT,
  status TEXT CHECK (status IN (
    'draft','submitted','under_review','shortlisted',
    'merit_listed','waitlisted','offered','admitted',
    'rejected','withdrawn'
  )) DEFAULT 'draft',
  merit_score DECIMAL DEFAULT 0.0,
  ai_score DECIMAL DEFAULT 0.0,
  rank_overall INTEGER,
  rank_category INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CREATE applicant_programs TABLE
CREATE TABLE IF NOT EXISTS applicant_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  preference_order INTEGER,
  status TEXT DEFAULT 'pending',
  allocated BOOLEAN DEFAULT false
);

-- 5. CREATE academic_records TABLE
CREATE TABLE IF NOT EXISTS academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  level TEXT NOT NULL, -- '10th', '12th', 'graduation'
  board_university TEXT,
  year_of_passing INTEGER,
  percentage DECIMAL,
  cgpa DECIMAL,
  subjects JSONB DEFAULT '[]'::jsonb,
  marksheet_url TEXT,
  certificate_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_notes TEXT
);

-- 6. CREATE entrance_scores TABLE
CREATE TABLE IF NOT EXISTS entrance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  roll_number TEXT,
  score DECIMAL,
  percentile DECIMAL,
  rank INTEGER,
  scorecard_url TEXT,
  is_verified BOOLEAN DEFAULT false
);

-- 7. CREATE documents TABLE
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  doc_url TEXT NOT NULL,
  file_name TEXT,
  file_size_kb INTEGER,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CREATE merit_lists TABLE
CREATE TABLE IF NOT EXISTS merit_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES admission_cycles(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  round_number INTEGER DEFAULT 1,
  list_type TEXT CHECK (list_type IN ('merit','waitlist','spot')),
  published_at TIMESTAMPTZ,
  cutoff_score DECIMAL,
  is_published BOOLEAN DEFAULT false
);

-- 9. CREATE merit_list_entries TABLE
CREATE TABLE IF NOT EXISTS merit_list_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merit_list_id UUID REFERENCES merit_lists(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  rank INTEGER,
  category TEXT,
  merit_score DECIMAL,
  status TEXT DEFAULT 'listed', -- 'listed', 'offered', 'accepted', 'declined', 'expired'
  offer_sent_at TIMESTAMPTZ,
  offer_accepted_at TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ
);

-- 10. CREATE admission_offers TABLE
CREATE TABLE IF NOT EXISTS admission_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  merit_list_id UUID REFERENCES merit_lists(id) ON DELETE SET NULL,
  offer_letter_url TEXT,
  offered_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'sent', -- 'sent', 'accepted', 'rejected', 'expired'
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- 11. CREATE admission_fees TABLE
CREATE TABLE IF NOT EXISTS admission_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  fee_type TEXT CHECK (fee_type IN ('application','confirmation','enrollment')),
  amount DECIMAL NOT NULL,
  razorpay_order_id TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  paid_at TIMESTAMPTZ,
  receipt_url TEXT
);

-- 12. CREATE counseling_sessions TABLE
CREATE TABLE IF NOT EXISTS counseling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES admission_cycles(id) ON DELETE CASCADE,
  round_number INTEGER,
  scheduled_date DATE,
  mode TEXT CHECK (mode IN ('online','offline','hybrid')),
  venue TEXT,
  meeting_link TEXT,
  status TEXT DEFAULT 'scheduled' -- 'scheduled', 'completed', 'cancelled'
);

-- 13. CREATE counseling_slots TABLE
CREATE TABLE IF NOT EXISTS counseling_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES counseling_sessions(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  slot_time TIMESTAMPTZ,
  officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'assigned', -- 'assigned', 'attended', 'no_show', 'rescheduled'
  attended BOOLEAN DEFAULT false,
  notes TEXT
);

-- 14. CREATE waitlist_movements TABLE
CREATE TABLE IF NOT EXISTS waitlist_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  from_position INTEGER,
  to_position INTEGER,
  reason TEXT,
  moved_at TIMESTAMPTZ DEFAULT now()
);

-- 15. CREATE admission_analytics TABLE
CREATE TABLE IF NOT EXISTS admission_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES admission_cycles(id) ON DELETE CASCADE,
  date DATE,
  applications_received INTEGER DEFAULT 0,
  applications_submitted INTEGER DEFAULT 0,
  documents_pending INTEGER DEFAULT 0,
  merit_listed INTEGER DEFAULT 0,
  offers_sent INTEGER DEFAULT 0,
  offers_accepted INTEGER DEFAULT 0,
  seats_filled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. CREATE crm_leads TABLE
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT, -- 'website', 'social', 'event', 'walkin', 'referral'
  program_interest TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'interested', 'applied', 'admitted', 'lost'
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  last_contacted TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_adm_cycles_inst ON admission_cycles(institution_id);
CREATE INDEX IF NOT EXISTS idx_adm_programs_inst ON programs(institution_id);
CREATE INDEX IF NOT EXISTS idx_applicants_inst ON applicants(institution_id);
CREATE INDEX IF NOT EXISTS idx_applicants_cycle ON applicants(cycle_id);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_inst ON crm_leads(institution_id);
CREATE INDEX IF NOT EXISTS idx_documents_applicant ON documents(applicant_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE merit_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- 1. APPLICANTS POLICIES
DROP POLICY IF EXISTS "applicant_own_data" ON applicants;
CREATE POLICY "applicant_own_data" ON applicants
  FOR SELECT USING (
    email = (SELECT email FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_institution_applicants" ON applicants;
CREATE POLICY "admin_institution_applicants" ON applicants
  FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid())
  );

-- 2. DOCUMENTS POLICIES
DROP POLICY IF EXISTS "applicant_own_documents" ON documents;
CREATE POLICY "applicant_own_documents" ON documents
  FOR ALL USING (
    applicant_id IN (SELECT id FROM applicants WHERE email = (SELECT email FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "admin_institution_documents" ON documents;
CREATE POLICY "admin_institution_documents" ON documents
  FOR ALL USING (
    applicant_id IN (SELECT id FROM applicants WHERE institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()))
  );

-- 3. ADMISSION OFFERS POLICIES
DROP POLICY IF EXISTS "applicant_own_offers" ON admission_offers;
CREATE POLICY "applicant_own_offers" ON admission_offers
  FOR SELECT USING (
    applicant_id IN (SELECT id FROM applicants WHERE email = (SELECT email FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "admin_institution_offers" ON admission_offers;
CREATE POLICY "admin_institution_offers" ON admission_offers
  FOR ALL USING (
    applicant_id IN (SELECT id FROM applicants WHERE institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()))
  );

-- 4. ADMISSION CYCLES POLICIES
DROP POLICY IF EXISTS "tenant_isolation_admission_cycles" ON admission_cycles;
CREATE POLICY "tenant_isolation_admission_cycles" ON admission_cycles
  FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid())
  );

-- 5. PROGRAMS POLICIES
DROP POLICY IF EXISTS "tenant_isolation_programs" ON programs;
CREATE POLICY "tenant_isolation_programs" ON programs
  FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- SEED DATA - ADMISSION CYCLES & PROGRAMS FOR DEMO
-- ============================================================
INSERT INTO admission_cycles (id, institution_id, name, academic_year, start_date, end_date, status) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'Fall Admissions 2026', '2026-27', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '60 days', 'open')
  ON CONFLICT DO NOTHING;

INSERT INTO programs (id, institution_id, name, code, degree_type, duration_years, total_seats, reserved_seats, eligibility_criteria, application_fee) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'Bachelor of Technology in Computer Science (B.Tech CSE)', 'BTECH-CSE', 'UG', 4, 120, '{"general": 60, "obc": 32, "sc": 18, "st": 10}', '{"min_12th_pc": 60.0, "required_subjects": ["Physics", "Mathematics"]}', 1000.00),
  ('a1111111-1111-1111-1111-111111111112', 'a0000000-0000-0000-0000-000000000001', 'Bachelor of Technology in Artificial Intelligence (B.Tech AI-DS)', 'BTECH-AIDS', 'UG', 4, 60, '{"general": 30, "obc": 16, "sc": 9, "st": 5}', '{"min_12th_pc": 65.0, "required_subjects": ["Physics", "Mathematics"]}', 1200.00),
  ('a1111111-1111-1111-1111-111111111113', 'a0000000-0000-0000-0000-000000000001', 'Master of Business Administration (MBA)', 'MBA-CORE', 'PG', 2, 60, '{"general": 30, "obc": 16, "sc": 9, "st": 5}', '{"min_grad_cgpa": 6.0}', 1500.00)
  ON CONFLICT DO NOTHING;


-- ============================================================
-- MODULE 12: IRIS Placements
-- Company CRM, Drives management, Student profile builder, AI
-- interview checks, Offer tracking, and Alumni mentoring network.
-- ============================================================

-- 1. CREATE companies TABLE
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  company_type TEXT CHECK (company_type IN (
    'product','service','startup','mnc','psu','ngo'
  )),
  hr_name TEXT,
  hr_email TEXT,
  hr_phone TEXT,
  linkedin_url TEXT,
  address TEXT,
  tier TEXT CHECK (tier IN ('dream','core','mass')),
  last_visited DATE,
  total_offers_given INTEGER DEFAULT 0,
  relationship_status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CREATE placement_drives TABLE
CREATE TABLE IF NOT EXISTS placement_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  job_description TEXT,
  jd_url TEXT,
  role TEXT NOT NULL,
  department TEXT,
  job_type TEXT CHECK (job_type IN (
    'full_time','internship','ppo','contract'
  )),
  location TEXT[],
  ctc_min DECIMAL,
  ctc_max DECIMAL,
  ctc_display TEXT,
  stipend DECIMAL,
  bond_years INTEGER DEFAULT 0,
  eligibility_criteria JSONB DEFAULT '{}'::jsonb,
  min_cgpa DECIMAL DEFAULT 0.0,
  eligible_branches TEXT[],
  eligible_batches TEXT[],
  backlogs_allowed INTEGER DEFAULT 0,
  application_deadline TIMESTAMPTZ,
  drive_date DATE,
  drive_mode TEXT CHECK (drive_mode IN ('online','offline','hybrid')),
  venue TEXT,
  meeting_link TEXT,
  rounds JSONB DEFAULT '[]'::jsonb,
  status TEXT CHECK (status IN (
    'upcoming','open','closed','processing','completed'
  )) DEFAULT 'upcoming',
  max_applications INTEGER,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CREATE student_profiles TABLE
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  resume_url TEXT,
  resume_updated_at TIMESTAMPTZ,
  cgpa DECIMAL DEFAULT 0.0,
  active_backlogs INTEGER DEFAULT 0,
  total_backlogs INTEGER DEFAULT 0,
  skills TEXT[],
  certifications JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  internships JSONB DEFAULT '[]'::jsonb,
  achievements TEXT[],
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  is_placed BOOLEAN DEFAULT false,
  placed_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  placed_ctc DECIMAL,
  placed_role TEXT,
  placed_at TIMESTAMPTZ,
  placement_type TEXT,
  opted_out BOOLEAN DEFAULT false,
  opt_out_reason TEXT,
  ai_resume_score DECIMAL DEFAULT 0.0,
  ai_resume_feedback TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CREATE drive_applications TABLE
CREATE TABLE IF NOT EXISTS drive_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID REFERENCES placement_drives(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ DEFAULT now(),
  resume_url TEXT,
  cover_letter TEXT,
  status TEXT CHECK (status IN (
    'applied','shortlisted','test_scheduled','interview_scheduled',
    'selected','offered','offer_accepted','offer_rejected',
    'rejected','withdrawn'
  )) DEFAULT 'applied',
  current_round INTEGER DEFAULT 0,
  rejection_reason TEXT,
  feedback TEXT
);

-- 5. CREATE interview_rounds TABLE
CREATE TABLE IF NOT EXISTS interview_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES drive_applications(id) ON DELETE CASCADE,
  drive_id UUID REFERENCES placement_drives(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  round_number INTEGER,
  round_type TEXT CHECK (round_type IN (
    'aptitude','coding','technical','hr','gd','case_study','final'
  )),
  scheduled_at TIMESTAMPTZ,
  venue TEXT,
  meeting_link TEXT,
  interviewer_name TEXT,
  interviewer_email TEXT,
  duration_minutes INTEGER,
  result TEXT CHECK (result IN ('pass','fail','hold','no_show')),
  score DECIMAL,
  feedback TEXT,
  status TEXT DEFAULT 'scheduled'
);

-- 6. CREATE offer_letters TABLE
CREATE TABLE IF NOT EXISTS offer_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES drive_applications(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  drive_id UUID REFERENCES placement_drives(id) ON DELETE CASCADE,
  offer_number TEXT UNIQUE,
  role TEXT,
  ctc DECIMAL,
  joining_date DATE,
  location TEXT,
  offer_letter_url TEXT,
  company_offer_url TEXT,
  status TEXT DEFAULT 'received',
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CREATE placement_stats TABLE
CREATE TABLE IF NOT EXISTS placement_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  batch TEXT,
  branch TEXT,
  total_eligible INTEGER DEFAULT 0,
  total_registered INTEGER DEFAULT 0,
  total_placed INTEGER DEFAULT 0,
  total_companies INTEGER DEFAULT 0,
  avg_ctc DECIMAL DEFAULT 0.0,
  median_ctc DECIMAL DEFAULT 0.0,
  highest_ctc DECIMAL DEFAULT 0.0,
  lowest_ctc DECIMAL DEFAULT 0.0,
  ppo_count INTEGER DEFAULT 0,
  dream_offers INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CREATE mock_interviews TABLE
CREATE TABLE IF NOT EXISTS mock_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  interview_type TEXT,
  questions JSONB DEFAULT '[]'::jsonb,
  responses JSONB DEFAULT '[]'::jsonb,
  ai_feedback TEXT,
  score DECIMAL DEFAULT 0.0,
  duration_minutes INTEGER,
  conducted_at TIMESTAMPTZ DEFAULT now()
);

-- 9. CREATE alumni TABLE
CREATE TABLE IF NOT EXISTS alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  graduation_year INTEGER,
  current_company TEXT,
  "current_role" TEXT,
  current_ctc DECIMAL,
  location TEXT,
  linkedin_url TEXT,
  is_mentor BOOLEAN DEFAULT false,
  mentoring_slots INTEGER DEFAULT 0,
  achievements TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. CREATE alumni_mentorship TABLE
CREATE TABLE IF NOT EXISTS alumni_mentorship (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ,
  duration_minutes INTEGER,
  topic TEXT,
  feedback TEXT,
  student_rating INTEGER,
  status TEXT DEFAULT 'scheduled'
);

-- 11. CREATE placement_notifications TABLE
CREATE TABLE IF NOT EXISTS placement_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID REFERENCES placement_drives(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type TEXT,
  message TEXT,
  sent_via TEXT[],
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_companies_inst ON companies(institution_id);
CREATE INDEX IF NOT EXISTS idx_drives_company ON placement_drives(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_drive ON drive_applications(drive_id);
CREATE INDEX IF NOT EXISTS idx_applications_student ON drive_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_rounds_application ON interview_rounds(application_id);
CREATE INDEX IF NOT EXISTS idx_offers_student ON offer_letters(student_id);
CREATE INDEX IF NOT EXISTS idx_alumni_student ON alumni(student_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_mentorship ENABLE ROW LEVEL SECURITY;

-- 1. COMPANIES POLICY
DROP POLICY IF EXISTS "companies_tenant_access" ON companies;
CREATE POLICY "companies_tenant_access" ON companies 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

-- 2. PLACEMENT DRIVES POLICY
DROP POLICY IF EXISTS "drives_tenant_access" ON placement_drives;
CREATE POLICY "drives_tenant_access" ON placement_drives 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

-- 3. STUDENT PROFILES POLICY
DROP POLICY IF EXISTS "student_own_profile" ON student_profiles;
CREATE POLICY "student_own_profile" ON student_profiles
  FOR ALL USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_all_profiles" ON student_profiles;
CREATE POLICY "admin_all_profiles" ON student_profiles 
  FOR ALL USING (get_auth_user_role() IN ('Admin', 'SuperAdmin', 'TPO'));

-- 4. APPLICATIONS POLICY
DROP POLICY IF EXISTS "student_own_applications" ON drive_applications;
CREATE POLICY "student_own_applications" ON drive_applications
  FOR ALL USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_all_applications" ON drive_applications;
CREATE POLICY "admin_all_applications" ON drive_applications 
  FOR ALL USING (get_auth_user_role() IN ('Admin', 'SuperAdmin', 'TPO', 'Company HR'));

-- 5. INTERVIEW ROUDS POLICY
DROP POLICY IF EXISTS "student_own_rounds" ON interview_rounds;
CREATE POLICY "student_own_rounds" ON interview_rounds
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_all_rounds" ON interview_rounds;
CREATE POLICY "admin_all_rounds" ON interview_rounds 
  FOR ALL USING (get_auth_user_role() IN ('Admin', 'SuperAdmin', 'TPO', 'Company HR'));

-- 6. OFFER LETTERS POLICY
DROP POLICY IF EXISTS "student_own_offers" ON offer_letters;
CREATE POLICY "student_own_offers" ON offer_letters
  FOR ALL USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_all_offers" ON offer_letters;
CREATE POLICY "admin_all_offers" ON offer_letters 
  FOR ALL USING (get_auth_user_role() IN ('Admin', 'SuperAdmin', 'TPO', 'Company HR'));

-- 7. MOCK INTERVIEWS POLICY
DROP POLICY IF EXISTS "student_own_mocks" ON mock_interviews;
CREATE POLICY "student_own_mocks" ON mock_interviews
  FOR ALL USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin_all_mocks" ON mock_interviews;
CREATE POLICY "admin_all_mocks" ON mock_interviews 
  FOR ALL USING (get_auth_user_role() IN ('Admin', 'SuperAdmin', 'TPO'));

-- 8. ALUMNI POLICY
DROP POLICY IF EXISTS "alumni_tenant_access" ON alumni;
CREATE POLICY "alumni_tenant_access" ON alumni 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

-- 9. MENTORSHIP POLICY
DROP POLICY IF EXISTS "mentorship_tenant_access" ON alumni_mentorship;
CREATE POLICY "mentorship_tenant_access" ON alumni_mentorship 
  FOR ALL USING (
    alumni_id IN (SELECT id FROM alumni WHERE institution_id = get_auth_institution_id()) 
    OR get_auth_user_role() = 'SuperAdmin'
  );

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO companies (id, institution_id, name, logo_url, website, industry, company_type, hr_name, hr_email, hr_phone, tier, relationship_status) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Google India', 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=120', 'https://google.com', 'Technology', 'mnc', 'Neha Sen', 'neha.sen@google.com', '+91 99881 23456', 'dream', 'active'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Infosys', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120', 'https://infosys.com', 'IT Services', 'service', 'Rajesh K.', 'rajesh.k@infosys.com', '+91 94140 12891', 'mass', 'active'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ZS Associates', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=120', 'https://zs.com', 'Consulting', 'product', 'Preeti Sharma', 'preeti.sharma@zs.com', '+91 99290 12347', 'core', 'active')
  ON CONFLICT DO NOTHING;

INSERT INTO placement_drives (id, institution_id, company_id, title, role, job_type, location, ctc_min, ctc_max, ctc_display, min_cgpa, eligible_branches, eligible_batches, status, application_deadline, drive_date) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Google SWE Summer Drive 2026', 'Software Engineer (L3)', 'full_time', ARRAY['Bangalore', 'Hyderabad'], 32.0, 42.0, '32 - 42 LPA', 8.0, ARRAY['CSE', 'AIDS'], ARRAY['2026'], 'open', CURRENT_TIMESTAMP + INTERVAL '10 days', CURRENT_DATE + INTERVAL '15 days'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'ZS Consulting Campus Hiring', 'Business Technology Analyst', 'full_time', ARRAY['Pune', 'Gurgaon'], 8.5, 12.0, '8.5 - 12 LPA', 7.0, ARRAY['CSE', 'AIDS', 'ECE'], ARRAY['2026'], 'open', CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_DATE + INTERVAL '8 days')
  ON CONFLICT DO NOTHING;


-- ============================================================
-- MODULE 13: IRIS OBE & NAAC
-- Programs OBE, Courses, COs, POs, CO-PO mappings, CIE assessments, 
-- Attainments logs, NAAC criteria checklists, SSR documents, and Faculty logs.
-- ============================================================

-- 1. CREATE programs_obe TABLE
CREATE TABLE IF NOT EXISTS programs_obe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  program_code TEXT,
  degree_type TEXT,
  duration_years INTEGER,
  vision TEXT,
  mission TEXT,
  peos TEXT[],
  psos TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CREATE courses TABLE
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs_obe(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  semester INTEGER,
  credits INTEGER,
  course_type TEXT CHECK (course_type IN (
    'core','elective','lab','project','audit'
  )),
  teacher_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  academic_year TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 3. CREATE course_outcomes TABLE
CREATE TABLE IF NOT EXISTS course_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  co_number INTEGER NOT NULL,
  co_statement TEXT NOT NULL,
  bloom_level TEXT CHECK (bloom_level IN (
    'remember','understand','apply','analyze','evaluate','create'
  )),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CREATE program_outcomes TABLE
CREATE TABLE IF NOT EXISTS program_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs_obe(id) ON DELETE CASCADE,
  po_number INTEGER NOT NULL,
  po_statement TEXT NOT NULL,
  category TEXT DEFAULT 'po'
);

-- 5. CREATE co_po_mapping TABLE
CREATE TABLE IF NOT EXISTS co_po_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
  po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
  correlation_level INTEGER CHECK (correlation_level IN (1, 2, 3)),
  mapped_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(co_id, po_id)
);

-- 6. CREATE assessment_tools TABLE
CREATE TABLE IF NOT EXISTS assessment_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tool_type TEXT CHECK (tool_type IN (
    'cie','see','assignment','quiz','lab','project','seminar'
  )),
  max_marks DECIMAL,
  weightage DECIMAL,
  conducted_date DATE
);

-- 7. CREATE co_assessments TABLE
CREATE TABLE IF NOT EXISTS co_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES assessment_tools(id) ON DELETE CASCADE,
  co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
  marks_allocated DECIMAL NOT NULL
);

-- 8. CREATE student_co_marks TABLE
CREATE TABLE IF NOT EXISTS student_co_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES assessment_tools(id) ON DELETE CASCADE,
  co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
  marks_obtained DECIMAL,
  max_marks DECIMAL,
  entered_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  entered_at TIMESTAMPTZ DEFAULT now()
);

-- 9. CREATE co_attainment TABLE
CREATE TABLE IF NOT EXISTS co_attainment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  co_id UUID REFERENCES course_outcomes(id) ON DELETE CASCADE,
  academic_year TEXT,
  direct_attainment DECIMAL,
  indirect_attainment DECIMAL,
  final_attainment DECIMAL,
  target_attainment DECIMAL DEFAULT 60,
  is_attained BOOLEAN,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. CREATE po_attainment TABLE
CREATE TABLE IF NOT EXISTS po_attainment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs_obe(id) ON DELETE CASCADE,
  po_id UUID REFERENCES program_outcomes(id) ON DELETE CASCADE,
  academic_year TEXT,
  direct_attainment DECIMAL,
  indirect_attainment DECIMAL,
  final_attainment DECIMAL,
  target_attainment DECIMAL DEFAULT 60,
  is_attained BOOLEAN,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. CREATE naac_criteria TABLE
CREATE TABLE IF NOT EXISTS naac_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  criterion_number TEXT NOT NULL,
  criterion_name TEXT NOT NULL,
  key_indicators JSONB,
  weightage DECIMAL,
  self_score DECIMAL,
  evidence_urls TEXT[],
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- 12. CREATE naac_metrics TABLE
CREATE TABLE IF NOT EXISTS naac_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id UUID REFERENCES naac_criteria(id) ON DELETE CASCADE,
  metric_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  description TEXT,
  data_value TEXT,
  supporting_docs TEXT[],
  status TEXT DEFAULT 'pending',
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT
);

-- 13. CREATE iqac_activities TABLE
CREATE TABLE IF NOT EXISTS iqac_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  activity_type TEXT,
  date DATE,
  description TEXT,
  participants TEXT[],
  outcomes TEXT[],
  documents TEXT[],
  academic_year TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 14. CREATE faculty_development TABLE
CREATE TABLE IF NOT EXISTS faculty_development (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  program_type TEXT CHECK (program_type IN (
    'fdp','workshop','conference','seminar',
    'online_course','research','publication'
  )),
  title TEXT,
  organizing_body TEXT,
  date DATE,
  duration_days INTEGER,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. CREATE research_publications TABLE
CREATE TABLE IF NOT EXISTS research_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  journal_conference TEXT,
  publication_type TEXT,
  year INTEGER,
  doi TEXT,
  isbn_issn TEXT,
  impact_factor DECIMAL,
  indexed_in TEXT[],
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. CREATE student_achievements TABLE
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  achievement_type TEXT CHECK (achievement_type IN (
    'academic','sports','cultural','competitive',
    'research','innovation','award'
  )),
  title TEXT,
  level TEXT CHECK (level IN ('institution','district','state','national','international')),
  date DATE,
  certificate_url TEXT,
  description TEXT
);

-- 17. CREATE feedback_surveys TABLE
CREATE TABLE IF NOT EXISTS feedback_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  survey_type TEXT CHECK (survey_type IN (
    'student_satisfaction','alumni_feedback',
    'employer_feedback','faculty_feedback','parent_feedback'
  )),
  academic_year TEXT,
  questions JSONB,
  is_active BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. CREATE survey_responses TABLE
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES feedback_surveys(id) ON DELETE CASCADE,
  respondent_id UUID,
  respondent_type TEXT,
  responses JSONB,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 19. CREATE ssr_documents TABLE
CREATE TABLE IF NOT EXISTS ssr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  criterion TEXT,
  document_name TEXT,
  document_url TEXT,
  academic_year TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_obe_prog_inst ON programs_obe(institution_id);
CREATE INDEX IF NOT EXISTS idx_obe_courses_prog ON courses(program_id);
CREATE INDEX IF NOT EXISTS idx_obe_co_course ON course_outcomes(course_id);
CREATE INDEX IF NOT EXISTS idx_obe_po_prog ON program_outcomes(program_id);
CREATE INDEX IF NOT EXISTS idx_obe_marks_student ON student_co_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_naac_metrics_crit ON naac_metrics(criterion_id);
CREATE INDEX IF NOT EXISTS idx_faculty_dev_staff ON faculty_development(staff_id);
CREATE INDEX IF NOT EXISTS idx_publications_staff ON research_publications(staff_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE programs_obe ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_po_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_co_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_attainment ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_attainment ENABLE ROW LEVEL SECURITY;
ALTER TABLE naac_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE naac_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE iqac_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_development ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssr_documents ENABLE ROW LEVEL SECURITY;

-- Apply Multi-Tenant Policies
DROP POLICY IF EXISTS "obe_programs_access" ON programs_obe;
CREATE POLICY "obe_programs_access" ON programs_obe 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS "courses_access" ON courses;
CREATE POLICY "courses_access" ON courses 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS "course_outcomes_access" ON course_outcomes;
CREATE POLICY "course_outcomes_access" ON course_outcomes 
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "program_outcomes_access" ON program_outcomes;
CREATE POLICY "program_outcomes_access" ON program_outcomes 
  FOR ALL USING (program_id IN (SELECT id FROM programs_obe WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "co_po_mapping_access" ON co_po_mapping;
CREATE POLICY "co_po_mapping_access" ON co_po_mapping 
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "assessment_tools_access" ON assessment_tools;
CREATE POLICY "assessment_tools_access" ON assessment_tools 
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "co_assessments_access" ON co_assessments;
CREATE POLICY "co_assessments_access" ON co_assessments 
  FOR ALL USING (co_id IN (SELECT id FROM course_outcomes WHERE course_id IN (SELECT id FROM courses WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin')));

DROP POLICY IF EXISTS "student_co_marks_access" ON student_co_marks;
CREATE POLICY "student_co_marks_access" ON student_co_marks 
  FOR ALL USING (student_id IN (SELECT id FROM students WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "co_attainment_access" ON co_attainment;
CREATE POLICY "co_attainment_access" ON co_attainment 
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "po_attainment_access" ON po_attainment;
CREATE POLICY "po_attainment_access" ON po_attainment 
  FOR ALL USING (program_id IN (SELECT id FROM programs_obe WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "naac_criteria_access" ON naac_criteria;
CREATE POLICY "naac_criteria_access" ON naac_criteria 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS "naac_metrics_access" ON naac_metrics;
CREATE POLICY "naac_metrics_access" ON naac_metrics 
  FOR ALL USING (criterion_id IN (SELECT id FROM naac_criteria WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "iqac_activities_access" ON iqac_activities;
CREATE POLICY "iqac_activities_access" ON iqac_activities 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS "faculty_development_access" ON faculty_development;
CREATE POLICY "faculty_development_access" ON faculty_development 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS "research_publications_access" ON research_publications;
CREATE POLICY "research_publications_access" ON research_publications 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS "student_achievements_access" ON student_achievements;
CREATE POLICY "student_achievements_access" ON student_achievements 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS "feedback_surveys_access" ON feedback_surveys;
CREATE POLICY "feedback_surveys_access" ON feedback_surveys 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

DROP POLICY IF EXISTS "survey_responses_access" ON survey_responses;
CREATE POLICY "survey_responses_access" ON survey_responses 
  FOR ALL USING (survey_id IN (SELECT id FROM feedback_surveys WHERE institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin'));

DROP POLICY IF EXISTS "ssr_documents_access" ON ssr_documents;
CREATE POLICY "ssr_documents_access" ON ssr_documents 
  FOR ALL USING (institution_id = get_auth_institution_id() OR get_auth_user_role() = 'SuperAdmin');

-- ============================================================
-- SEED DATA
-- ============================================================
-- Prepopulate NAAC Criteria 1 to 7
INSERT INTO naac_criteria (id, institution_id, criterion_number, criterion_name, weightage, self_score) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '1', 'Curricular Aspects', 100, 3.8),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '2', 'Teaching-Learning and Evaluation', 350, 3.7),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '3', 'Research, Innovations and Extension', 120, 3.5),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '4', 'Infrastructure and Learning Resources', 100, 3.9),
  ('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '5', 'Student Support and Progression', 130, 3.8),
  ('10000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '6', 'Governance, Leadership and Management', 100, 3.6),
  ('10000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '7', 'Institutional Values and Best Practices', 100, 3.9)
  ON CONFLICT DO NOTHING;

-- Seed Demo Program in programs_obe
INSERT INTO programs_obe (id, institution_id, program_name, program_code, degree_type, duration_years, vision, mission, peos, psos) VALUES
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'B.Tech in Computer Science', 'CS-BTECH', 'UG', 4, 
   'To produce globally competent professionals in software engineering and cloud computing.', 
   'By providing high-quality logic training and collaborative research modules.',
   ARRAY['PEO1: Graduate as senior full-stack developers in IT cells', 'PEO2: Establish scalable startups or research systems'],
   ARRAY['PSO1: Build robust microservices and server databases', 'PSO2: Configure cloud architectures and smart interfaces'])
  ON CONFLICT DO NOTHING;

-- Seed Program Outcomes NBA PO1 - PO12
INSERT INTO program_outcomes (id, program_id, po_number, po_statement) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 'Engineering Knowledge: Apply science logic to complex software engineering problems.'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 2, 'Problem Analysis: Analyze and debug complex cloud algorithms.'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 3, 'Design/Development: Architect databases and microservice layers.'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 4, 'Conduct Investigations: Perform performance benchmarks and load testing.'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 5, 'Modern Tool Usage: Command Next.js, Supabase RLS, and React tools.'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 6, 'The Engineer and Society: Build secure and accessible tech portals.'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', 7, 'Environment and Sustainability: Optimize servers energy and efficiency.'),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 8, 'Ethics: Enforce data protection and license agreements.'),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', 9, 'Individual and Team Work: Collaborate in pair programming cells.'),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', 10, 'Communication: Document walkthroughs and implementation designs.'),
  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 11, 'Project Management: Maintain checklists and track tasks budgets.'),
  ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001', 12, 'Life-long Learning: Eagerly load capabilities and train with AI models.')
  ON CONFLICT DO NOTHING;

-- Seed Demo Course
INSERT INTO courses (id, institution_id, program_id, course_code, course_name, semester, credits, course_type, academic_year) VALUES
  ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'CS-401', 'Advanced Web Development', 4, 4, 'core', '2026-27')
  ON CONFLICT DO NOTHING;


-- Migration for Module 14: HR Management

CREATE TABLE employee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  user_id uuid REFERENCES users(id),
  staff_id uuid REFERENCES staff(id),
  employee_code TEXT UNIQUE NOT NULL,
  title TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  personal_email TEXT,
  personal_phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  address_permanent JSONB,
  address_current JSONB,
  photo_url TEXT,
  aadhar_number TEXT,
  pan_number TEXT,
  uan_number TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  bank_ifsc TEXT,
  bank_branch TEXT,
  nationality TEXT DEFAULT 'Indian',
  religion TEXT,
  category TEXT,
  marital_status TEXT,
  disability BOOLEAN DEFAULT false,
  disability_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE employment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES institutions(id),
  department_id uuid REFERENCES departments(id),
  designation TEXT NOT NULL,
  employee_type TEXT CHECK (employee_type IN (
    'permanent','probation','contract','visiting',
    'part_time','adhoc','guest'
  )),
  joining_date DATE NOT NULL,
  confirmation_date DATE,
  retirement_date DATE,
  reporting_to uuid REFERENCES employee_profiles(id),
  work_location TEXT,
  qualification TEXT,
  specialization TEXT,
  experience_years DECIMAL,
  previous_employer TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  name TEXT NOT NULL,
  components JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE employee_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  structure_id uuid REFERENCES salary_structures(id),
  basic DECIMAL NOT NULL,
  hra DECIMAL DEFAULT 0,
  da DECIMAL DEFAULT 0,
  ta DECIMAL DEFAULT 0,
  medical_allowance DECIMAL DEFAULT 0,
  special_allowance DECIMAL DEFAULT 0,
  other_allowances JSONB,
  gross_salary DECIMAL NOT NULL,
  pf_employee DECIMAL DEFAULT 0,
  pf_employer DECIMAL DEFAULT 0,
  esi_employee DECIMAL DEFAULT 0,
  esi_employer DECIMAL DEFAULT 0,
  professional_tax DECIMAL DEFAULT 0,
  tds DECIMAL DEFAULT 0,
  other_deductions JSONB,
  net_salary DECIMAL NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT true
);

CREATE TABLE payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT CHECK (status IN (
    'draft','processing','approved','disbursed','locked'
  )) DEFAULT 'draft',
  total_gross DECIMAL,
  total_deductions DECIMAL,
  total_net DECIMAL,
  employee_count INTEGER,
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, month, year)
);

CREATE TABLE payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  month INTEGER,
  year INTEGER,
  working_days INTEGER,
  present_days DECIMAL,
  absent_days DECIMAL,
  lop_days DECIMAL DEFAULT 0,
  basic DECIMAL,
  hra DECIMAL,
  da DECIMAL,
  ta DECIMAL,
  other_allowances JSONB,
  gross_earnings DECIMAL,
  pf_deduction DECIMAL,
  esi_deduction DECIMAL,
  professional_tax DECIMAL,
  tds_deduction DECIMAL,
  loan_deduction DECIMAL DEFAULT 0,
  other_deductions JSONB,
  total_deductions DECIMAL,
  net_salary DECIMAL,
  pdf_url TEXT,
  is_published BOOLEAN DEFAULT false
);

CREATE TABLE leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  days_per_year INTEGER,
  is_paid BOOLEAN DEFAULT true,
  carry_forward BOOLEAN DEFAULT false,
  max_carry_forward INTEGER DEFAULT 0,
  applicable_to TEXT[],
  encashable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  leave_type_id uuid REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER,
  entitled_days DECIMAL,
  used_days DECIMAL DEFAULT 0,
  remaining_days DECIMAL,
  carried_forward DECIMAL DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  leave_type_id uuid REFERENCES leave_types(id),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days DECIMAL NOT NULL,
  reason TEXT NOT NULL,
  supporting_doc_url TEXT,
  status TEXT CHECK (status IN (
    'pending','approved','rejected','cancelled','recalled'
  )) DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT now(),
  approved_by uuid REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  substitute_id uuid REFERENCES employee_profiles(id),
  handover_notes TEXT
);

CREATE TABLE attendance_hr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  in_time TIMESTAMPTZ,
  out_time TIMESTAMPTZ,
  total_hours DECIMAL,
  status TEXT CHECK (status IN (
    'present','absent','half_day','late','on_leave',
    'work_from_home','holiday','weekly_off'
  )),
  source TEXT DEFAULT 'biometric',
  remarks TEXT,
  UNIQUE(employee_id, date)
);

CREATE TABLE performance_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  name TEXT NOT NULL,
  year INTEGER,
  period_start DATE,
  period_end DATE,
  self_appraisal_deadline DATE,
  hod_review_deadline DATE,
  principal_review_deadline DATE,
  status TEXT DEFAULT 'upcoming'
);

CREATE TABLE performance_appraisals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES performance_cycles(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  self_score DECIMAL,
  self_comments TEXT,
  hod_score DECIMAL,
  hod_comments TEXT,
  principal_score DECIMAL,
  principal_comments TEXT,
  final_score DECIMAL,
  rating TEXT CHECK (rating IN (
    'outstanding','excellent','good','average','below_average'
  )),
  increment_recommended DECIMAL,
  promotion_recommended BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending_self'
);

CREATE TABLE appraisal_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  category TEXT,
  parameter TEXT NOT NULL,
  description TEXT,
  max_score INTEGER,
  weightage DECIMAL,
  applicable_to TEXT[]
);

CREATE TABLE employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  doc_name TEXT,
  doc_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false
);

CREATE TABLE increments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  effective_date DATE,
  previous_basic DECIMAL,
  new_basic DECIMAL,
  increment_amount DECIMAL,
  increment_percent DECIMAL,
  reason TEXT,
  appraisal_id uuid REFERENCES performance_appraisals(id),
  approved_by uuid REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE loan_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  loan_type TEXT,
  amount DECIMAL,
  applied_date DATE,
  approved_amount DECIMAL,
  tenure_months INTEGER,
  emi_amount DECIMAL,
  deduction_start DATE,
  outstanding_balance DECIMAL,
  status TEXT DEFAULT 'pending',
  approved_by uuid REFERENCES users(id)
);

CREATE TABLE holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('national','state','restricted','institution')),
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tds_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employee_profiles(id) ON DELETE CASCADE,
  financial_year TEXT,
  regime TEXT CHECK (regime IN ('old','new')) DEFAULT 'new',
  hra_claimed DECIMAL DEFAULT 0,
  section_80c DECIMAL DEFAULT 0,
  section_80d DECIMAL DEFAULT 0,
  section_80g DECIMAL DEFAULT 0,
  home_loan_interest DECIMAL DEFAULT 0,
  other_deductions DECIMAL DEFAULT 0,
  declarations JSONB,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_declarations ENABLE ROW LEVEL SECURITY;

-- RLS: employee sees own payslip
DROP POLICY IF EXISTS "employee_own_payslip" ON payslips;
CREATE POLICY "employee_own_payslip" ON payslips
  FOR SELECT USING (
    employee_id = (
      SELECT id FROM employee_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Seed defaults
INSERT INTO leave_types (name, code, days_per_year, is_paid, carry_forward, max_carry_forward, encashable)
VALUES 
  ('Casual Leave', 'CL', 12, true, false, 0, false),
  ('Earned Leave', 'EL', 18, true, true, 30, true),
  ('Sick Leave', 'SL', 10, true, true, 15, false)
ON CONFLICT DO NOTHING;

INSERT INTO holidays (institution_id, name, date, type, year)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Independence Day', '2026-08-15', 'national', 2026),
  ('a0000000-0000-0000-0000-000000000001', 'Republic Day', '2026-01-26', 'national', 2026)
ON CONFLICT DO NOTHING;

-- ==========================================================
-- SECTION 5: SECURITY AUDIT INDEXES, PROCEDURES, AND CLEANUP
-- ==========================================================

-- Partial unique indexes to prevent duplicate active entities
CREATE UNIQUE INDEX IF NOT EXISTS idx_hostel_allocations_active_student ON hostel_allocations(student_id) WHERE (is_current = TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_issues_active_student_book ON book_issues(student_id, book_id) WHERE (status = 'Issued');
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_bookings_active_student_slot ON gym_bookings(student_id, slot_id) WHERE (status = 'Booked');

-- Indexes for new tables (fitness_metrics, workout_sessions, book_reservations)
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_student ON fitness_metrics(student_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_student ON workout_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_book_reservations_book ON book_reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reservations_student ON book_reservations(student_id);

-- RLS policies for new tables
ALTER TABLE fitness_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY fitness_metrics_tenant ON fitness_metrics
    USING (student_id IN (SELECT id FROM students WHERE institution_id = get_auth_institution_id()) OR get_auth_user_role() = 'SuperAdmin');

CREATE POLICY workout_sessions_tenant ON workout_sessions
    USING (student_id IN (SELECT id FROM students WHERE institution_id = get_auth_institution_id()) OR get_auth_user_role() = 'SuperAdmin');

CREATE POLICY book_reservations_tenant ON book_reservations
    USING (student_id IN (SELECT id FROM students WHERE institution_id = get_auth_institution_id()) OR get_auth_user_role() = 'SuperAdmin');

-- Performance optimized composite index for transit live tracking queries
CREATE INDEX IF NOT EXISTS idx_bus_tracking_composite ON bus_tracking(bus_id, timestamp DESC);

-- Performance partial index for unread notifications retrieval
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE (is_read = FALSE);

-- Atomic checkout procedure for canteen cashless wallet purchases (Overdraft protection)
CREATE OR REPLACE FUNCTION place_canteen_order_atomic(
  p_student_id UUID,
  p_institution_id UUID,
  p_total_amount DECIMAL,
  p_items JSONB,
  p_payment_method VARCHAR,
  p_special_instructions TEXT,
  p_offer_id UUID,
  p_discount_amount DECIMAL,
  p_order_number VARCHAR
) RETURNS JSON AS $$
DECLARE
  v_wallet_id UUID;
  v_wallet_balance DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
  v_order_id UUID;
BEGIN
  -- If payment method is Wallet, perform atomic balance check and debit
  IF p_payment_method = 'Wallet' THEN
    -- Lock wallet row to prevent concurrent race condition modifications
    SELECT id, balance INTO v_wallet_id, v_wallet_balance
    FROM canteen_wallets
    WHERE student_id = p_student_id AND institution_id = p_institution_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Canteen wallet not found for this student.'
      );
    END IF;

    IF v_wallet_balance < p_total_amount THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient wallet balance for canteen order.'
      );
    END IF;

    v_new_balance := v_wallet_balance - p_total_amount;

    -- Update balance
    UPDATE canteen_wallets
    SET balance = v_new_balance, last_updated = NOW()
    WHERE id = v_wallet_id;

    -- Insert wallet transaction
    INSERT INTO wallet_transactions (institution_id, wallet_id, student_id, type, amount, reference_type, description, balance_after)
    VALUES (p_institution_id, v_wallet_id, p_student_id, 'debit', p_total_amount, 'order_payment', 'Order payment for canteen items', v_new_balance);

  END IF;

  -- Insert order
  INSERT INTO canteen_orders (
    institution_id, student_id, items, total_amount, status, payment_method, special_instructions, offer_id, discount_amount, order_number, order_time
  ) VALUES (
    p_institution_id, p_student_id, p_items, p_total_amount, 'Received', p_payment_method, p_special_instructions, p_offer_id, p_discount_amount, p_order_number, NOW()
  ) RETURNING id INTO v_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Telemetry coordinates data cleanup/archival strategy (logs older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_bus_tracking_data()
RETURNS VOID AS $$
BEGIN
  DELETE FROM bus_tracking
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PERMISSIONS SYSTEM (Feature Toggles + Role-Based Module Permissions)
-- ============================================================

CREATE TABLE IF NOT EXISTS institution_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_institution_features_inst ON institution_features(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_features_key ON institution_features(feature_key);

CREATE TABLE IF NOT EXISTS module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, role, module)
);

CREATE INDEX IF NOT EXISTS idx_module_permissions_inst ON module_permissions(institution_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_role ON module_permissions(role);

ALTER TABLE institution_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "institution_features_select" ON institution_features;
CREATE POLICY "institution_features_select" ON institution_features
  FOR SELECT USING (
    institution_id = get_auth_institution_id()
    OR get_auth_user_role() = 'SuperAdmin'
  );

DROP POLICY IF EXISTS "institution_features_insert" ON institution_features;
CREATE POLICY "institution_features_insert" ON institution_features
  FOR INSERT WITH CHECK (
    get_auth_user_role() = 'Admin'
    AND institution_id = get_auth_institution_id()
  );

DROP POLICY IF EXISTS "institution_features_update" ON institution_features;
CREATE POLICY "institution_features_update" ON institution_features
  FOR UPDATE USING (
    get_auth_user_role() = 'Admin'
    AND institution_id = get_auth_institution_id()
  );

DROP POLICY IF EXISTS "institution_features_delete" ON institution_features;
CREATE POLICY "institution_features_delete" ON institution_features
  FOR DELETE USING (
    get_auth_user_role() = 'SuperAdmin'
  );

DROP POLICY IF EXISTS "module_permissions_select" ON module_permissions;
CREATE POLICY "module_permissions_select" ON module_permissions
  FOR SELECT USING (
    institution_id = get_auth_institution_id()
    OR get_auth_user_role() = 'SuperAdmin'
  );

DROP POLICY IF EXISTS "module_permissions_insert" ON module_permissions;
CREATE POLICY "module_permissions_insert" ON module_permissions
  FOR INSERT WITH CHECK (
    get_auth_user_role() = 'SuperAdmin'
    OR get_auth_user_role() = 'Admin'
  );

DROP POLICY IF EXISTS "module_permissions_update" ON module_permissions;
CREATE POLICY "module_permissions_update" ON module_permissions
  FOR UPDATE USING (
    get_auth_user_role() = 'SuperAdmin'
    OR get_auth_user_role() = 'Admin'
  );

DROP POLICY IF EXISTS "module_permissions_delete" ON module_permissions;
CREATE POLICY "module_permissions_delete" ON module_permissions
  FOR DELETE USING (
    get_auth_user_role() = 'SuperAdmin'
  );

-- Seed defaults
INSERT INTO institution_features (institution_id, feature_key, enabled)
SELECT i.id, f.feature_key, true
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard'), ('admissions'), ('students'), ('attendance'), ('timetable'),
  ('fees'), ('exams'), ('canteen'), ('hostel'), ('library'), ('placements'),
  ('hr'), ('gate'), ('gym'), ('transit'), ('events'), ('notices'), ('idcards'),
  ('ai_concierge'), ('obe'), ('naac'), ('faculty_development'), ('achievements'),
  ('director'), ('parent_portal')
) AS f(feature_key)
ON CONFLICT (institution_id, feature_key) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Admin', m.module, true, true, true
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard'), ('admissions'), ('students'), ('attendance'), ('timetable'),
  ('fees'), ('exams'), ('canteen'), ('hostel'), ('library'), ('placements'),
  ('hr'), ('gate'), ('gym'), ('transit'), ('events'), ('notices'), ('idcards'),
  ('ai_concierge'), ('obe'), ('naac'), ('faculty_development'), ('achievements'),
  ('director'), ('parent_portal')
) AS m(module)
ON CONFLICT (institution_id, role, module) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Staff', m.module, true, m.w, false
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard', true), ('students', true), ('attendance', true), ('timetable', true),
  ('exams', true), ('notices', true), ('obe', true), ('library', true),
  ('canteen', false), ('hostel', false), ('placements', false), ('hr', false),
  ('gate', false), ('gym', false), ('transit', false), ('events', false),
  ('idcards', false), ('ai_concierge', false), ('naac', false),
  ('admissions', false), ('faculty_development', true), ('achievements', false),
  ('director', false), ('parent_portal', false), ('fees', false)
) AS m(module, w)
ON CONFLICT (institution_id, role, module) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Teacher', m.module, true, m.w, false
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard', true), ('students', true), ('attendance', true), ('timetable', true),
  ('exams', true), ('obe', true), ('gym', true), ('library', true),
  ('canteen', false), ('hostel', false), ('placements', false), ('hr', false),
  ('gate', false), ('transit', false), ('events', false), ('notices', false),
  ('idcards', false), ('ai_concierge', false), ('naac', false),
  ('admissions', false), ('faculty_development', false), ('achievements', false),
  ('director', false), ('parent_portal', false), ('fees', false)
) AS m(module, w)
ON CONFLICT (institution_id, role, module) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Student', m.module, true, m.w, false
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard', true), ('attendance', true), ('timetable', true), ('fees', true),
  ('exams', true), ('canteen', true), ('hostel', true), ('library', true),
  ('placements', true), ('events', true), ('notices', true), ('idcards', true),
  ('gym', true), ('transit', true), ('ai_concierge', true),
  ('students', false), ('admissions', false), ('hr', false), ('gate', false),
  ('obe', false), ('naac', false), ('faculty_development', false),
  ('achievements', false), ('director', false), ('parent_portal', false)
) AS m(module, w)
ON CONFLICT (institution_id, role, module) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Warden', m.module, true, m.w, false
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard', true), ('hostel', true), ('gate', true), ('notices', true),
  ('students', true), ('attendance', true),
  ('canteen', false), ('library', false), ('placements', false), ('hr', false),
  ('gym', false), ('transit', false), ('events', false), ('idcards', false),
  ('ai_concierge', false), ('obe', false), ('naac', false),
  ('admissions', false), ('faculty_development', false), ('achievements', false),
  ('director', false), ('parent_portal', false), ('fees', false), ('timetable', false),
  ('exams', false)
) AS m(module, w)
ON CONFLICT (institution_id, role, module) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Parent', m.module, true, false, false
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard'), ('attendance'), ('fees'), ('exams'), ('notices'), ('hostel')
) AS m(module)
ON CONFLICT (institution_id, role, module) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Security', m.module, true, m.w, false
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard', true), ('gate', true), ('transit', true), ('notices', true),
  ('canteen', false), ('hostel', false), ('library', false), ('placements', false),
  ('hr', false), ('gym', false), ('events', false), ('idcards', false),
  ('ai_concierge', false), ('obe', false), ('naac', false),
  ('admissions', false), ('faculty_development', false), ('achievements', false),
  ('director', false), ('parent_portal', false), ('fees', false), ('timetable', false),
  ('students', false), ('attendance', false), ('exams', false)
) AS m(module, w)
ON CONFLICT (institution_id, role, module) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Vendor', m.module, true, m.w, false
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard', true), ('canteen', true),
  ('admissions', false), ('students', false), ('attendance', false), ('timetable', false),
  ('fees', false), ('exams', false), ('hostel', false), ('library', false),
  ('placements', false), ('hr', false), ('gate', false), ('gym', false),
  ('transit', false), ('events', false), ('notices', false), ('idcards', false),
  ('ai_concierge', false), ('obe', false), ('naac', false),
  ('faculty_development', false), ('achievements', false), ('director', false),
  ('parent_portal', false)
) AS m(module, w)
ON CONFLICT (institution_id, role, module) DO NOTHING;

INSERT INTO module_permissions (institution_id, role, module, can_read, can_write, can_delete)
SELECT i.id, 'Driver', m.module, true, m.w, false
FROM institutions i
CROSS JOIN (VALUES
  ('dashboard', true), ('transit', true),
  ('admissions', false), ('students', false), ('attendance', false), ('timetable', false),
  ('fees', false), ('exams', false), ('canteen', false), ('hostel', false),
  ('library', false), ('placements', false), ('hr', false), ('gate', false),
  ('gym', false), ('events', false), ('notices', false), ('idcards', false),
  ('ai_concierge', false), ('obe', false), ('naac', false),
  ('faculty_development', false), ('achievements', false), ('director', false),
  ('parent_portal', false)
) AS m(module, w)
ON CONFLICT (institution_id, role, module) DO NOTHING;

CREATE OR REPLACE FUNCTION update_permissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_institution_features_updated ON institution_features;
CREATE TRIGGER trigger_institution_features_updated
  BEFORE UPDATE ON institution_features
  FOR EACH ROW EXECUTE FUNCTION update_permissions_timestamp();

DROP TRIGGER IF EXISTS trigger_module_permissions_updated ON module_permissions;
CREATE TRIGGER trigger_module_permissions_updated
  BEFORE UPDATE ON module_permissions
  FOR EACH ROW EXECUTE FUNCTION update_permissions_timestamp();
