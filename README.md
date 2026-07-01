# MiSched — Smart University Attendance System

A full-stack web application for managing university attendance with role-based portals for Admins, Staff, and Students.

---

## Features

### Admin Portal
- Create and manage users (students, staff, admins)
- Create modules and schedule lectures
- Enrol students into modules
- View attendance analytics and charts
- Export attendance reports as CSV (filterable by module)
- Send email reminders for upcoming lectures (manual or automatic)
- Set university location and check-in radius on an interactive map
- Manage system notifications
- Handle password reset requests
- Dark / light mode support

### Staff Portal
- View personal lecture schedule
- Mark student attendance (present / late / absent) during live lectures
- View and manage notifications

### Student Portal
- View personal timetable and enrolled modules
- Check in to lectures using GPS location
- View attendance history and percentage per module
- Receive email reminders 24 hours before lectures
- View notifications

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **SQLAlchemy** | ORM for database models |
| **SQLite** | Local database (`misched.db`) |
| **Pydantic** | Data validation and schemas |
| **python-jose** | JWT authentication tokens |
| **passlib / bcrypt** | Password hashing |
| **smtplib + STARTTLS** | Gmail SMTP email sending |
| **APScheduler** | Automatic email reminder background jobs |
| **pandas** | CSV export generation |
| **python-dotenv** | Environment variable management |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Build tool and dev server |
| **React Router v6** | Client-side routing |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Page and component animations |
| **Axios** | HTTP API requests |
| **Leaflet.js** | Interactive map for location picking |
| **date-fns** | Date formatting utilities |

---

## Project Structure

```
computingPRJ2/
├── backend/
│   ├── main.py          # FastAPI app, all API routes
│   ├── models.py        # SQLAlchemy database models
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── database.py      # DB engine, session, init_db()
│   ├── auth.py          # JWT token creation and verification
│   ├── email_utils.py   # Gmail SMTP email sending
│   ├── seed.py          # Database seeder (creates demo data)
│   ├── requirement.txt  # Python dependencies
│   ├── .env             # SMTP credentials (not committed)
│   └── misched.db       # SQLite database file
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── public/
    │   └── images/       # hero.png, logo, feature screenshots
    └── src/
        ├── App.jsx        # Root app with routing
        ├── App.css        # Global styles and theme variables
        ├── api.js         # Axios instance (base URL + auth header)
        ├── context/
        │   ├── AuthContext.jsx   # Login state and JWT storage
        │   └── ThemeContext.jsx  # Dark / light mode toggle
        ├── components/
        │   ├── Navbar.jsx        # Top navigation bar
        │   ├── Icons.jsx         # SVG icon components
        │   └── LocationPicker.jsx # Leaflet map for admin location
        └── pages/
            ├── Home.jsx     # Landing / marketing page
            ├── Login.jsx    # Sign in and forgot password
            ├── Admin.jsx    # Admin dashboard
            ├── Staff.jsx    # Staff dashboard
            └── Student.jsx  # Student dashboard
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Clone the repository
```bash
git clone https://github.com/rijaannn5994/Misched-2
cd Misched-2
```

### 2. Set up the Backend

```bash
cd backend
pip install -r requirement.txt
```

Start the backend:
```bash
python -m uvicorn main:app --reload --port 8000
```

Optionally seed the database with demo data:
```bash
python seed.py
```

### 3. Set up the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

> Keep both terminal windows open while using the app.

---

## Default Roles

After seeding, use these credentials to log in:

| Role | Email | Password |
|---|---|---|
| Admin | admin@misched.com | admin123 |
| Staff | staff@misched.com | staff123 |
| Student | student@misched.com | student123 |

*(Credentials depend on what was entered in seed.py)*

---

## Key Functionality Explained

### Authentication
JWT tokens are issued on login and stored in `localStorage`. Every API request includes the token in the `Authorization: Bearer <token>` header. Protected routes redirect to `/login` if the token is missing or expired.

### Location-Based Check-in
1. The admin sets the university's GPS coordinates and allowed radius (metres) using an interactive Leaflet.js map.
2. When a student checks in, the browser requests their GPS position via `navigator.geolocation`.
3. The backend calculates the distance between the student and the university using the **Haversine formula**.
4. If the student is within the allowed radius, attendance is marked **Present**. Otherwise, check-in is rejected.

### Email Reminders
- **Automatic**: APScheduler runs every 30 minutes, finds lectures within the next 24 hours, and emails enrolled students who haven't already been notified. A record is stored in the `email_sent` table to prevent duplicates.
- **Manual**: Admins can trigger reminders on-demand from the Email Reminders section, with a configurable hours-ahead window.

### Attendance Export
Admins can export a CSV report of all attendance records, optionally filtered by module. The file is generated using pandas and downloads automatically.

### Dark / Light Mode
The theme is stored in `localStorage` and applied via a `data-theme` attribute on the `<html>` element. All colours switch using CSS custom properties and Tailwind class overrides.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users/create` | Create a user |
| PUT | `/api/admin/users/{id}` | Edit a user |
| DELETE | `/api/admin/users/{id}` | Delete a user |
| GET | `/api/admin/modules` | List all modules |
| POST | `/api/admin/modules/create` | Create a module |
| POST | `/api/admin/enroll` | Enrol student in module |
| POST | `/api/admin/lectures/schedule` | Schedule lectures |
| GET | `/api/admin/analytics/attendance` | Attendance analytics |
| GET | `/api/admin/export-csv` | Download CSV report |
| POST | `/api/admin/email-reminders` | Trigger email reminders |
| GET | `/api/staff/lectures` | Staff's lecture schedule |
| POST | `/api/staff/attendance` | Mark attendance |
| GET | `/api/student/timetable` | Student's timetable |
| POST | `/api/student/checkin` | Student GPS check-in |

---

## Environment Variables

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | Gmail address |
| `SMTP_PASSWORD` | Gmail App Password |
| `EMAIL_FROM_NAME` | Sender display name |
| `DATABASE_URL` | Database URL (defaults to SQLite) |
| `SECRET_KEY` | JWT signing secret |

---

## Built With

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)
- [Leaflet.js](https://leafletjs.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [APScheduler](https://apscheduler.readthedocs.io/)
