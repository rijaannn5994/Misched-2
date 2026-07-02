"""
Seed script — run once to populate database with realistic test data.
Usage:  python seed.py
"""

import os
from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, timedelta
from database import engine, SessionLocal, Base
from models import User, UserRole, Module, Enrollment, Lecture, Attendance, AttendanceStatus
from auth import get_password_hash
import random


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already seeded. Clearing and re-seeding...")
            db.query(Attendance).delete()
            db.query(Enrollment).delete()
            db.query(Lecture).delete()
            db.query(Module).delete()
            db.query(User).delete()
            db.commit()

        # USERS
        admin = User(name="Admin User", email="admin@misched.com", password=get_password_hash("admin123"), role=UserRole.ADMIN)
        
        staff_members = [
            User(name="Dr. Sarah Wilson", email="s.wilson@ulster.ac.uk", password=get_password_hash("staff123"), role=UserRole.STAFF),
            User(name="Dr. James Chen", email="j.chen@ulster.ac.uk", password=get_password_hash("staff123"), role=UserRole.STAFF),
            User(name="Prof. Emily Davies", email="e.davies@ulster.ac.uk", password=get_password_hash("staff123"), role=UserRole.STAFF),
        ]
        
        students = [
            User(name="Rijan Maharjan", email="student@misched.com", password=get_password_hash("student123"), role=UserRole.STUDENT),
            User(name="Alex Johnson", email="a.johnson@ulster.ac.uk", password=get_password_hash("student123"), role=UserRole.STUDENT),
            User(name="Maria Garcia", email="m.garcia@ulster.ac.uk", password=get_password_hash("student123"), role=UserRole.STUDENT),
            User(name="David Kim", email="d.kim@ulster.ac.uk", password=get_password_hash("student123"), role=UserRole.STUDENT),
            User(name="Sophie Taylor", email="s.taylor@ulster.ac.uk", password=get_password_hash("student123"), role=UserRole.STUDENT),
            User(name="Oliver Brown", email="o.brown@ulster.ac.uk", password=get_password_hash("student123"), role=UserRole.STUDENT),
            User(name="Emma White", email="e.white@ulster.ac.uk", password=get_password_hash("student123"), role=UserRole.STUDENT),
            User(name="Liam Murphy", email="l.murphy@ulster.ac.uk", password=get_password_hash("student123"), role=UserRole.STUDENT),
        ]

        all_users = [admin] + staff_members + students
        db.add_all(all_users)
        db.commit()
        for u in all_users:
            db.refresh(u)

        print(f"  [OK]  Created {len(all_users)} users")
        print(f"        Admin:    admin@misched.com / admin123")
        print(f"        Staff:    s.wilson@ulster.ac.uk / staff123")
        print(f"        Student:  student@misched.com / student123")

        # MODULES
        modules = [
            Module(module_name="Software Engineering", module_code="COM327"),
            Module(module_name="Database Systems", module_code="COM519"),
            Module(module_name="Web Technologies", module_code="COM125"),
            Module(module_name="Artificial Intelligence", module_code="COM714"),
            Module(module_name="Computer Networks", module_code="COM318"),
        ]
        db.add_all(modules)
        db.commit()
        for m in modules:
            db.refresh(m)
        print(f"  [OK]  Created {len(modules)} modules")

        # ENROLLMENTS
        enrollments = []
        # Enroll each student in 3-4 random modules
        for student in students:
            enrolled_modules = random.sample(modules, k=random.randint(3, 4))
            for module in enrolled_modules:
                enrollments.append(Enrollment(student_id=student.id, module_id=module.id))
        db.add_all(enrollments)
        db.commit()
        print(f"  [OK]  Created {len(enrollments)} enrollments")

        # LECTURES (spread across this week and next)
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        rooms = ["101", "202", "305", "Lab A", "Lab B", "Seminar Room 1"]
        
        lectures = []
        # Assign each staff member specific modules
        staff_module_map = {
            staff_members[0].id: [modules[0], modules[1]],   
            staff_members[1].id: [modules[2], modules[3]],   
            staff_members[2].id: [modules[4], modules[0]],   
        }

        for staff_id, staff_modules in staff_module_map.items():
            for module in staff_modules:
                for day_offset in range(-3, 8):  # Past 3 days to next week
                    lecture_day = today + timedelta(days=day_offset)
                    # Skip weekends
                    if lecture_day.weekday() >= 5:
                        continue
                    
                    hour = random.choice([9, 10, 11, 13, 14, 15])
                    start = lecture_day.replace(hour=hour, minute=0)
                    duration = random.choice([1, 1.5, 2])
                    end = start + timedelta(hours=duration)
                    room = random.choice(rooms)
                    
                    lectures.append(Lecture(
                        module_id=module.id,
                        staff_id=staff_id,
                        room_name=room,
                        start_time=start,
                        end_time=end,
                    ))

        db.add_all(lectures)
        db.commit()
        for l in lectures:
            db.refresh(l)
        print(f"  [OK]  Created {len(lectures)} lectures")

        # ATTENDANCE RECORDS (for past lectures)
        attendance_records = []
        past_lectures = [l for l in lectures if l.start_time < now]
        
        for lecture in past_lectures:
            # Get students enrolled in this lecture's module
            enrolled_students = db.query(Enrollment).filter(
                Enrollment.module_id == lecture.module_id
            ).all()
            
            for enrollment in enrolled_students:
                # Simulate realistic attendance: 70% present, 15% late, 15% absent
                rand = random.random()
                if rand < 0.70:
                    status = AttendanceStatus.PRESENT
                elif rand < 0.85:
                    status = AttendanceStatus.LATE
                else:
                    status = AttendanceStatus.ABSENT
                
                # Simulate GPS coordinates (Belfast area)
                lat = 54.5833 + random.uniform(-0.01, 0.01)
                lng = -5.9333 + random.uniform(-0.01, 0.01)
                
                attendance_records.append(Attendance(
                    lecture_id=lecture.id,
                    student_id=enrollment.student_id,
                    status=status,
                    latitude=round(lat, 6),
                    longitude=round(lng, 6),
                ))

        db.add_all(attendance_records)
        db.commit()
        print(f"  [OK]  Created {len(attendance_records)} attendance records")

        print("\n[SUCCESS] Database seeded successfully!")
        print("  You can now log in with the credentials above.")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
