import os
import asyncio
import json
import math
import threading
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from io import StringIO
from typing import List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, Query as QueryParam, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import pandas as pd

from database import get_db, init_db
from models import (
    User, UserRole, Module, Enrollment, Lecture, Attendance, AttendanceStatus,
    Notification, NotificationRead, PasswordResetRequest, UniversitySettings,
    EmailSent, Group, GroupMembership,
)
from schemas import (
    LoginRequest, TokenResponse,
    UserCreate, UserResponse, UserUpdate, UserMeResponse,
    ModuleCreate, ModuleResponse,
    EnrollmentRequest, EnrollmentResponse,
    LectureCreate, LectureResponse,
    AttendanceMarkRequest, AttendanceResponse,
    AnalyticsResponse,
    NotificationCreate, NotificationResponse,
    ForgotPasswordRequest, AdminResetPasswordRequest,
    UniversityLocationCreate, UniversityLocationResponse,
    StudentCheckinRequest,
    GroupCreate, GroupUpdate, GroupMemberAdd, GroupResponse, GroupMemberResponse,
)
from apscheduler.schedulers.background import BackgroundScheduler
from auth import authenticate_user, create_access_token, get_password_hash
from email_utils import send_email, build_lecture_reminder_html


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # returns distance in metres between two GPS coordinates
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _auto_send_reminders():
    # runs every 30 minutes — sends one reminder email per student per lecture
    # within the next 24 hours, using EmailSent to avoid duplicates
    from database import SessionLocal
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        cutoff = now + timedelta(hours=24)

        upcoming = db.query(Lecture).filter(
            Lecture.start_time >= now,
            Lecture.start_time <= cutoff,
        ).all()

        for lecture in upcoming:
            module = db.query(Module).filter(Module.id == lecture.module_id).first()
            enrollments = db.query(Enrollment).filter(Enrollment.module_id == lecture.module_id).all()

            for enrol in enrollments:
                already_sent = db.query(EmailSent).filter(
                    EmailSent.lecture_id == lecture.id,
                    EmailSent.student_id == enrol.student_id,
                ).first()
                if already_sent:
                    continue

                student = db.query(User).filter(User.id == enrol.student_id).first()
                if not student or not student.email:
                    continue

                lecture_info = {
                    "module": module.module_name if module else "Unknown",
                    "date": lecture.start_time.strftime("%A, %d %B %Y"),
                    "start": lecture.start_time.strftime("%H:%M"),
                    "end": lecture.end_time.strftime("%H:%M") if lecture.end_time else "—",
                    "room": lecture.room_name or "TBC",
                }
                subject = f"Reminder: {lecture_info['module']} on {lecture_info['date']}"
                html = build_lecture_reminder_html(student.name, [lecture_info])

                ok = send_email(student.email, subject, html)
                if ok:
                    db.add(EmailSent(
                        lecture_id=lecture.id,
                        student_id=student.id,
                        sent_at=now,
                    ))
                    db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


_scheduler = BackgroundScheduler(daemon=True)
_scheduler.add_job(_auto_send_reminders, "interval", minutes=30, id="email_reminders", replace_existing=True)

app = FastAPI(title="MiSched API", version="1.0.0")


@app.on_event("startup")
def on_startup():
    init_db()
    _scheduler.start()
    # delay the first email run by 2 minutes so it doesn't compete with early login requests
    threading.Timer(120, _auto_send_reminders).start()


@app.on_event("shutdown")
def on_shutdown():
    _scheduler.shutdown(wait=False)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# connected SSE clients — list of {"role": str, "queue": asyncio.Queue}
_sse_clients: list = []


async def _broadcast_sse(target_role: str, payload: dict):
    targets = list(_sse_clients) if target_role == "all" else [c for c in _sse_clients if c["role"] == target_role]
    for client in targets:
        try:
            client["queue"].put_nowait(payload)
        except asyncio.QueueFull:
            pass


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=[os.getenv("ALGORITHM")])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(required_role: UserRole):
    def role_checker(user: User = Depends(get_current_user)):
        if user.role != required_role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker


def require_admin(user: User = Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_staff(user: User = Depends(get_current_user)):
    if user.role != UserRole.STAFF:
        raise HTTPException(status_code=403, detail="Staff access required")
    return user


def require_student(user: User = Depends(get_current_user)):
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Student access required")
    return user


@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={
        "sub": user.email,
        "role": user.role.value,
        "name": user.name,
    })
    return {"access_token": access_token, "token_type": "bearer", "role": user.role.value}


@app.get("/api/users/me", response_model=UserMeResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserMeResponse(id=user.id, name=user.name, email=user.email, role=user.role.value)


# user management (admin only)

@app.post("/api/admin/users/create", response_model=UserResponse)
def create_user(req: UserCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(
        name=req.name,
        email=req.email,
        password=get_password_hash(req.password),
        role=req.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse(id=new_user.id, name=new_user.name, email=new_user.email, role=new_user.role.value)


@app.get("/api/admin/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    users = db.query(User).all()
    return [UserResponse(id=u.id, name=u.name, email=u.email, role=u.role.value) for u in users]


@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@app.put("/api/admin/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(User).filter(User.email == req.email, User.id != user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use by another user")
    user.name = req.name
    user.email = req.email
    user.role = req.role
    db.commit()
    db.refresh(user)
    return user


# module management (admin only)

@app.post("/api/admin/modules/create", response_model=ModuleResponse)
def create_module(req: ModuleCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    existing = db.query(Module).filter(Module.module_code == req.module_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Module code already exists")
    new_module = Module(module_name=req.module_name, module_code=req.module_code)
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return ModuleResponse(id=new_module.id, module_name=new_module.module_name, module_code=new_module.module_code)


@app.get("/api/admin/modules", response_model=List[ModuleResponse])
def get_modules(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    modules = db.query(Module).all()
    return [ModuleResponse(id=m.id, module_name=m.module_name, module_code=m.module_code) for m in modules]


@app.delete("/api/admin/modules/{module_id}")
def delete_module(module_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    # deleting a module also removes all related lectures and enrollments via cascade
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()
    return {"message": "Module and all related data deleted"}


# lecture scheduling (admin only)

@app.post("/api/admin/lectures/schedule", response_model=LectureResponse)
def schedule_lecture(req: LectureCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    module = db.query(Module).filter(Module.id == req.module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    staff = db.query(User).filter(User.id == req.staff_id, User.role == UserRole.STAFF).first()
    if not staff:
        raise HTTPException(status_code=400, detail="Invalid staff member")

    # check the room isn't already booked at this time
    room_conflict = db.query(Lecture).filter(
        Lecture.room_name == req.room_name,
        Lecture.start_time < req.end_time,
        Lecture.end_time > req.start_time,
    ).first()
    if room_conflict:
        raise HTTPException(
            status_code=409,
            detail=f"Room '{req.room_name}' is already booked for another lecture at this time",
        )

    # check the staff member isn't already teaching at this time
    staff_conflict = db.query(Lecture).filter(
        Lecture.staff_id == req.staff_id,
        Lecture.start_time < req.end_time,
        Lecture.end_time > req.start_time,
    ).first()
    if staff_conflict:
        raise HTTPException(
            status_code=409,
            detail=f"{staff.name} is already scheduled for another lecture at this time",
        )

    # check the module doesn't already have a lecture at this time
    module_conflict = db.query(Lecture).filter(
        Lecture.module_id == req.module_id,
        Lecture.start_time < req.end_time,
        Lecture.end_time > req.start_time,
    ).first()
    if module_conflict:
        raise HTTPException(
            status_code=409,
            detail=f"Module '{module.module_name}' already has a lecture scheduled at this time",
        )

    new_lecture = Lecture(
        module_id=req.module_id,
        staff_id=req.staff_id,
        room_name=req.room_name,
        start_time=req.start_time,
        end_time=req.end_time,
    )
    db.add(new_lecture)
    db.commit()
    db.refresh(new_lecture)
    return LectureResponse(
        id=new_lecture.id,
        module_id=new_lecture.module_id,
        staff_id=new_lecture.staff_id,
        room_name=new_lecture.room_name,
        start_time=new_lecture.start_time,
        end_time=new_lecture.end_time,
        module_code=module.module_code,
        module_name=module.module_name,
        staff_name=staff.name,
    )


@app.get("/api/admin/lectures", response_model=List[LectureResponse])
def get_all_lectures(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    lectures = db.query(Lecture).options(
        joinedload(Lecture.module),
        joinedload(Lecture.staff),
    ).all()
    return [
        LectureResponse(
            id=l.id,
            module_id=l.module_id,
            staff_id=l.staff_id,
            room_name=l.room_name,
            start_time=l.start_time,
            end_time=l.end_time,
            module_code=l.module.module_code if l.module else None,
            module_name=l.module.module_name if l.module else None,
            staff_name=l.staff.name if l.staff else None,
        )
        for l in lectures
    ]


@app.delete("/api/admin/lectures/{lecture_id}")
def delete_lecture(lecture_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    db.delete(lecture)
    db.commit()
    return {"message": "Lecture deleted"}


# enrollment management (admin only)

@app.post("/api/admin/enrollments/assign", response_model=EnrollmentResponse)
def assign_enrollment(req: EnrollmentRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    student = db.query(User).filter(User.id == req.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=400, detail="Invalid student")

    module = db.query(Module).filter(Module.id == req.module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    existing = db.query(Enrollment).filter(
        Enrollment.student_id == req.student_id,
        Enrollment.module_id == req.module_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already enrolled in this module")

    enrollment = Enrollment(student_id=req.student_id, module_id=req.module_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return EnrollmentResponse(id=enrollment.id, student_id=enrollment.student_id, module_id=enrollment.module_id)


@app.delete("/api/admin/enrollments/{enrollment_id}")
def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    db.delete(enrollment)
    db.commit()
    return {"message": "Student unenrolled"}


@app.get("/api/admin/enrollments")
def get_all_enrollments(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    enrollments = db.query(Enrollment).options(
        joinedload(Enrollment.student),
        joinedload(Enrollment.module),
    ).all()
    return [
        {
            "id": e.id,
            "student_id": e.student_id,
            "student_name": e.student.name if e.student else None,
            "module_id": e.module_id,
            "module_name": e.module.module_name if e.module else None,
            "module_code": e.module.module_code if e.module else None,
        }
        for e in enrollments
    ]


# analytics (admin only)

@app.get("/api/admin/analytics/attendance")
def get_analytics(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    # load all attendance in one query then aggregate in Python to avoid N+1
    all_records = db.query(
        Attendance.student_id,
        Attendance.lecture_id,
        Attendance.status,
    ).all()

    total_present = sum(1 for r in all_records if r.status == AttendanceStatus.PRESENT)
    total_late    = sum(1 for r in all_records if r.status == AttendanceStatus.LATE)
    total_absent  = sum(1 for r in all_records if r.status == AttendanceStatus.ABSENT)
    total_records = len(all_records)
    attendance_rate = round(((total_present + total_late) / total_records * 100), 1) if total_records > 0 else 0

    # group by student to find chronic absentees (absence rate > 30% with at least 3 records)
    student_counts = defaultdict(lambda: {"total": 0, "absent": 0})
    for r in all_records:
        student_counts[r.student_id]["total"] += 1
        if r.status == AttendanceStatus.ABSENT:
            student_counts[r.student_id]["absent"] += 1

    students = db.query(User).filter(User.role == UserRole.STUDENT).all()
    student_map = {s.id: s for s in students}
    chronic_absentees = []
    for sid, counts in student_counts.items():
        if counts["total"] >= 3:
            absence_rate = round((counts["absent"] / counts["total"]) * 100, 1)
            if absence_rate > 30 and sid in student_map:
                s = student_map[sid]
                chronic_absentees.append({
                    "student_id": s.id,
                    "student_name": s.name,
                    "student_email": s.email,
                    "total_records": counts["total"],
                    "absent_count": counts["absent"],
                    "absence_rate": absence_rate,
                })

    # map lecture id to module id so we can group attendance by module without extra queries
    lecture_module = {l.id: l.module_id for l in db.query(Lecture.id, Lecture.module_id).all()}
    mod_counts = defaultdict(lambda: {"present": 0, "late": 0, "absent": 0})
    for r in all_records:
        mid = lecture_module.get(r.lecture_id)
        if mid:
            if r.status == AttendanceStatus.PRESENT:
                mod_counts[mid]["present"] += 1
            elif r.status == AttendanceStatus.LATE:
                mod_counts[mid]["late"] += 1
            else:
                mod_counts[mid]["absent"] += 1

    modules = db.query(Module).all()
    per_module = []
    for module in modules:
        c = mod_counts.get(module.id, {})
        if c:
            mod_total = c["present"] + c["late"] + c["absent"]
            per_module.append({
                "module_id": module.id,
                "module_name": module.module_name,
                "module_code": module.module_code,
                "present": c["present"],
                "late": c["late"],
                "absent": c["absent"],
                "total": mod_total,
                "attendance_rate": round(((c["present"] + c["late"]) / mod_total * 100), 1) if mod_total > 0 else 0,
            })

    return {
        "total_present": total_present,
        "total_late": total_late,
        "total_absent": total_absent,
        "total_records": total_records,
        "attendance_rate": attendance_rate,
        "chronic_absentees": chronic_absentees,
        "per_module": per_module,
    }


# CSV export (admin only)

@app.get("/api/admin/export-csv")
def export_csv(
    module_id: Optional[int] = None,
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(Attendance).options(
        joinedload(Attendance.student),
        joinedload(Attendance.lecture).joinedload(Lecture.module),
    )
    if module_id:
        query = query.join(Lecture, Attendance.lecture_id == Lecture.id).filter(Lecture.module_id == module_id)
    if group_id:
        member_ids = [m.student_id for m in db.query(GroupMembership).filter(GroupMembership.group_id == group_id).all()]
        query = query.filter(Attendance.student_id.in_(member_ids if member_ids else [-1]))

    records = query.all()

    # build a lookup of student_id -> group names for the Group column
    all_memberships = db.query(GroupMembership).options(joinedload(GroupMembership.group)).all()
    student_groups: dict = {}
    for m in all_memberships:
        student_groups.setdefault(m.student_id, []).append(m.group.name if m.group else "")

    labels = []
    if module_id:
        mod = db.query(Module).filter(Module.id == module_id).first()
        if mod:
            labels.append(mod.module_code.replace(" ", "_"))
    if group_id:
        grp = db.query(Group).filter(Group.id == group_id).first()
        if grp:
            labels.append(grp.name.replace(" ", "_"))
    filename_label = "_".join(labels) if labels else "all"

    data = []
    for r in records:
        data.append({
            "Student ID": r.student_id,
            "Student Name": r.student.name if r.student else "Unknown",
            "Student Email": r.student.email if r.student else "",
            "Group": ", ".join(student_groups.get(r.student_id, [])) or "—",
            "Module Code": r.lecture.module.module_code if r.lecture and r.lecture.module else "",
            "Module Name": r.lecture.module.module_name if r.lecture and r.lecture.module else "",
            "Lecture Date": r.lecture.start_time.strftime("%Y-%m-%d") if r.lecture else "",
            "Start Time": r.lecture.start_time.strftime("%H:%M") if r.lecture else "",
            "Room": r.lecture.room_name if r.lecture else "",
            "Status": r.status.value,
        })
    df = pd.DataFrame(data)
    output = StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{filename_label}.csv"},
    )


# student endpoints

@app.get("/api/student/timetable")
def get_student_timetable(db: Session = Depends(get_db), student: User = Depends(require_student)):
    enrolled_module_ids = [e.module_id for e in db.query(Enrollment).filter(Enrollment.student_id == student.id).all()]
    if not enrolled_module_ids:
        return []

    lectures = db.query(Lecture).options(
        joinedload(Lecture.module),
        joinedload(Lecture.staff),
    ).filter(Lecture.module_id.in_(enrolled_module_ids)).order_by(Lecture.start_time).all()

    now = datetime.utcnow()

    # auto-mark absent for any past lecture the student never checked into
    for lec in lectures:
        if lec.end_time < now:
            existing = db.query(Attendance).filter(
                Attendance.lecture_id == lec.id,
                Attendance.student_id == student.id,
            ).first()
            if not existing:
                db.add(Attendance(
                    lecture_id=lec.id,
                    student_id=student.id,
                    status=AttendanceStatus.ABSENT,
                    latitude=None,
                    longitude=None,
                ))
    db.commit()

    lecture_ids = [l.id for l in lectures]
    attendance_records = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.lecture_id.in_(lecture_ids),
    ).all()

    uni = db.query(UniversitySettings).first()

    def is_verified(record):
        if record.status not in (AttendanceStatus.PRESENT, AttendanceStatus.LATE):
            return True
        if record.latitude is None:
            return False
        if uni and uni.latitude is not None:
            return haversine_distance(record.latitude, record.longitude, uni.latitude, uni.longitude) <= uni.radius_meters
        return True

    attendance_map = {r.lecture_id: {"status": r.status.value, "verified": is_verified(r)} for r in attendance_records}

    return [
        {
            "id": l.id,
            "module_id": l.module_id,
            "module_code": l.module.module_code if l.module else None,
            "module_name": l.module.module_name if l.module else None,
            "staff_name": l.staff.name if l.staff else None,
            "room_name": l.room_name,
            "start_time": l.start_time.isoformat(),
            "end_time": l.end_time.isoformat(),
            "checkin_status": attendance_map[l.id]["status"] if l.id in attendance_map else None,
            "checkin_verified": attendance_map[l.id]["verified"] if l.id in attendance_map else False,
        }
        for l in lectures
        if l.end_time >= now
    ]


@app.get("/api/student/attendance")
def get_student_attendance(db: Session = Depends(get_db), student: User = Depends(require_student)):
    records = db.query(Attendance).filter(Attendance.student_id == student.id).all()
    total_present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    total_late = sum(1 for r in records if r.status == AttendanceStatus.LATE)
    total_absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)

    enrolled = db.query(Enrollment).options(joinedload(Enrollment.module)).filter(Enrollment.student_id == student.id).all()
    per_module = []
    for enrollment in enrolled:
        module = enrollment.module
        lecture_ids = [l.id for l in db.query(Lecture).filter(Lecture.module_id == module.id).all()]
        if lecture_ids:
            mod_records = db.query(Attendance).filter(
                Attendance.student_id == student.id,
                Attendance.lecture_id.in_(lecture_ids),
            ).all()
            mod_present = sum(1 for r in mod_records if r.status == AttendanceStatus.PRESENT)
            mod_late = sum(1 for r in mod_records if r.status == AttendanceStatus.LATE)
            mod_absent = sum(1 for r in mod_records if r.status == AttendanceStatus.ABSENT)
            mod_total = len(mod_records)
            per_module.append({
                "module_id": module.id,
                "module_name": module.module_name,
                "module_code": module.module_code,
                "present": mod_present,
                "late": mod_late,
                "absent": mod_absent,
                "total": mod_total,
                "attendance_rate": round(((mod_present + mod_late) / mod_total * 100), 1) if mod_total > 0 else 0,
            })

    return {
        "present": total_present,
        "late": total_late,
        "absent": total_absent,
        "total": total_present + total_late + total_absent,
        "per_module": per_module,
    }


@app.get("/api/student/modules")
def get_student_modules(db: Session = Depends(get_db), student: User = Depends(require_student)):
    enrollments = db.query(Enrollment).options(joinedload(Enrollment.module)).filter(Enrollment.student_id == student.id).all()
    return [
        {
            "id": e.module.id,
            "module_name": e.module.module_name,
            "module_code": e.module.module_code,
        }
        for e in enrollments if e.module
    ]


@app.get("/api/student/groups")
def get_student_groups(db: Session = Depends(get_db), student: User = Depends(require_student)):
    memberships = (
        db.query(Group)
        .join(GroupMembership, GroupMembership.group_id == Group.id)
        .filter(GroupMembership.student_id == student.id)
        .order_by(Group.name)
        .all()
    )
    return [{"id": g.id, "name": g.name, "description": g.description} for g in memberships]


@app.post("/api/student/checkin")
def student_checkin(req: StudentCheckinRequest, db: Session = Depends(get_db), student: User = Depends(require_student)):
    lecture = db.query(Lecture).filter(Lecture.id == req.lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student.id,
        Enrollment.module_id == lecture.module_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You are not enrolled in this module")

    now = datetime.now()
    if now < lecture.start_time:
        raise HTTPException(status_code=400, detail="Lecture has not started yet")
    if now > lecture.end_time:
        raise HTTPException(status_code=400, detail="Lecture has already ended")

    # mark late if more than 10 minutes after start
    checkin_status = AttendanceStatus.LATE if now > lecture.start_time + timedelta(minutes=10) else AttendanceStatus.PRESENT
    message = f"Checked in as {checkin_status.value}"
    outside_geofence = False

    uni = db.query(UniversitySettings).first()
    if uni and uni.latitude is not None and uni.longitude is not None:
        dist = haversine_distance(req.latitude, req.longitude, uni.latitude, uni.longitude)
        if dist > uni.radius_meters:
            checkin_status = AttendanceStatus.ABSENT
            outside_geofence = True
            message = f"Marked absent — you are {int(dist)}m from campus (must be within {uni.radius_meters}m)."

    existing = db.query(Attendance).filter(
        Attendance.lecture_id == req.lecture_id,
        Attendance.student_id == student.id,
    ).first()

    # don't allow re-check-in if the student already has a verified on-campus record
    if existing and existing.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE):
        if existing.latitude is not None and uni and uni.latitude is not None:
            existing_dist = haversine_distance(existing.latitude, existing.longitude, uni.latitude, uni.longitude)
            if existing_dist <= uni.radius_meters:
                return {"message": f"Already checked in as {existing.status.value}.", "status": existing.status.value, "outside_geofence": False}
        elif uni is None or uni.latitude is None:
            return {"message": f"Already checked in as {existing.status.value}.", "status": existing.status.value, "outside_geofence": False}

    if existing:
        existing.status = checkin_status
        existing.latitude = req.latitude
        existing.longitude = req.longitude
    else:
        db.add(Attendance(
            lecture_id=req.lecture_id,
            student_id=student.id,
            status=checkin_status,
            latitude=req.latitude,
            longitude=req.longitude,
        ))
    db.commit()
    return {"message": message, "status": checkin_status.value, "outside_geofence": outside_geofence}


@app.get("/api/student/notifications", response_model=List[NotificationResponse])
def student_get_notifications(db: Session = Depends(get_db), student: User = Depends(require_student)):
    notifs = db.query(Notification).options(
        joinedload(Notification.sender)
    ).filter(
        Notification.target_role.in_(["student", "all"])
    ).order_by(Notification.created_at.desc()).all()
    read_ids = {r.notification_id for r in db.query(NotificationRead).filter_by(user_id=student.id).all()}
    return [
        NotificationResponse(
            id=n.id, sender_id=n.sender_id,
            sender_name=n.sender.name if n.sender else None,
            sender_role=n.sender.role.value if n.sender else None,
            title=n.title, message=n.message,
            target_role=n.target_role, created_at=n.created_at,
            is_read=n.id in read_ids,
        )
        for n in notifs
    ]


@app.post("/api/student/notifications/{notification_id}/read")
def student_mark_read(notification_id: int, db: Session = Depends(get_db), student: User = Depends(require_student)):
    if not db.query(NotificationRead).filter_by(user_id=student.id, notification_id=notification_id).first():
        db.add(NotificationRead(user_id=student.id, notification_id=notification_id, read_at=datetime.utcnow()))
        db.commit()
    return {"message": "Marked as read"}


# staff endpoints

@app.get("/api/staff/lectures/today")
def get_staff_lectures_today(db: Session = Depends(get_db), staff: User = Depends(require_staff)):
    today = datetime.utcnow().date()
    lectures = db.query(Lecture).options(
        joinedload(Lecture.module),
    ).filter(
        Lecture.staff_id == staff.id,
        func.date(Lecture.start_time) == today,
    ).order_by(Lecture.start_time).all()
    return [
        {
            "id": l.id,
            "module_id": l.module_id,
            "module_code": l.module.module_code if l.module else None,
            "module_name": l.module.module_name if l.module else None,
            "room_name": l.room_name,
            "start_time": l.start_time.isoformat(),
            "end_time": l.end_time.isoformat(),
        }
        for l in lectures
    ]


@app.get("/api/staff/lectures")
def get_staff_all_lectures(db: Session = Depends(get_db), staff: User = Depends(require_staff)):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    lectures = db.query(Lecture).options(
        joinedload(Lecture.module),
    ).filter(
        Lecture.staff_id == staff.id,
        Lecture.end_time >= now,
    ).order_by(Lecture.start_time).all()
    return [
        {
            "id": l.id,
            "module_id": l.module_id,
            "module_code": l.module.module_code if l.module else None,
            "module_name": l.module.module_name if l.module else None,
            "room_name": l.room_name,
            "start_time": l.start_time.isoformat(),
            "end_time": l.end_time.isoformat(),
        }
        for l in lectures
    ]


@app.get("/api/staff/lecture/{lecture_id}/students")
def get_lecture_students(lecture_id: int, db: Session = Depends(get_db), staff: User = Depends(require_staff)):
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture or lecture.staff_id != staff.id:
        raise HTTPException(status_code=403, detail="Not your lecture")

    enrollments = db.query(Enrollment).options(
        joinedload(Enrollment.student),
    ).filter(Enrollment.module_id == lecture.module_id).all()

    students_data = []
    for e in enrollments:
        if e.student and e.student.role == UserRole.STUDENT:
            att = db.query(Attendance).filter(
                Attendance.lecture_id == lecture_id,
                Attendance.student_id == e.student.id,
            ).first()
            students_data.append({
                "id": e.student.id,
                "name": e.student.name,
                "email": e.student.email,
                "attendance_status": att.status.value if att else None,
            })
    return students_data


@app.post("/api/attendance/mark")
def mark_attendance(req: AttendanceMarkRequest, db: Session = Depends(get_db), staff: User = Depends(require_staff)):
    lecture = db.query(Lecture).filter(Lecture.id == req.lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    if lecture.staff_id != staff.id:
        raise HTTPException(status_code=403, detail="Not your lecture")

    now = datetime.now()
    if now < lecture.start_time or now > lecture.end_time:
        raise HTTPException(status_code=400, detail="Lecture not currently active")

    student = db.query(User).filter(User.id == req.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=400, detail="Invalid student")

    existing = db.query(Attendance).filter(
        Attendance.lecture_id == req.lecture_id,
        Attendance.student_id == req.student_id,
    ).first()

    if existing:
        existing.status = req.status
        existing.latitude = req.latitude
        existing.longitude = req.longitude
    else:
        db.add(Attendance(
            lecture_id=req.lecture_id,
            student_id=req.student_id,
            status=req.status,
            latitude=req.latitude,
            longitude=req.longitude,
        ))

    db.commit()
    return {"message": f"Marked as {req.status.value}"}


@app.get("/api/staff/notifications", response_model=List[NotificationResponse])
def staff_get_notifications(db: Session = Depends(get_db), staff: User = Depends(require_staff)):
    notifs = db.query(Notification).options(
        joinedload(Notification.sender)
    ).filter(
        Notification.target_role.in_(["staff", "all"])
    ).order_by(Notification.created_at.desc()).all()
    read_ids = {r.notification_id for r in db.query(NotificationRead).filter_by(user_id=staff.id).all()}
    return [
        NotificationResponse(
            id=n.id, sender_id=n.sender_id,
            sender_name=n.sender.name if n.sender else None,
            sender_role=n.sender.role.value if n.sender else None,
            title=n.title, message=n.message,
            target_role=n.target_role, created_at=n.created_at,
            is_read=n.id in read_ids,
        )
        for n in notifs
    ]


@app.post("/api/staff/notifications/{notification_id}/read")
def staff_mark_read(notification_id: int, db: Session = Depends(get_db), staff: User = Depends(require_staff)):
    if not db.query(NotificationRead).filter_by(user_id=staff.id, notification_id=notification_id).first():
        db.add(NotificationRead(user_id=staff.id, notification_id=notification_id, read_at=datetime.utcnow()))
        db.commit()
    return {"message": "Marked as read"}


@app.post("/api/staff/notifications/send", response_model=NotificationResponse)
async def staff_send_notification(req: NotificationCreate, db: Session = Depends(get_db), staff: User = Depends(require_staff)):
    notif = Notification(
        sender_id=staff.id,
        title=req.title,
        message=req.message,
        target_role="student",  # staff can only notify students
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    await _broadcast_sse("student", {
        "id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "target_role": "student",
        "sender_name": staff.name,
        "sender_role": staff.role.value,
        "created_at": notif.created_at.isoformat(),
        "is_read": False,
    })
    return NotificationResponse(
        id=notif.id,
        sender_id=notif.sender_id,
        sender_name=staff.name,
        sender_role=staff.role.value,
        title=notif.title,
        message=notif.message,
        target_role=notif.target_role,
        created_at=notif.created_at,
    )


# admin notifications

@app.post("/api/admin/notifications/send", response_model=NotificationResponse)
async def admin_send_notification(req: NotificationCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if req.target_role not in ("student", "staff", "all"):
        raise HTTPException(status_code=400, detail="target_role must be 'student', 'staff', or 'all'")
    notif = Notification(
        sender_id=admin.id,
        title=req.title,
        message=req.message,
        target_role=req.target_role,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    await _broadcast_sse(req.target_role, {
        "id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "target_role": notif.target_role,
        "sender_name": admin.name,
        "sender_role": admin.role.value,
        "created_at": notif.created_at.isoformat(),
        "is_read": False,
    })
    return NotificationResponse(
        id=notif.id,
        sender_id=notif.sender_id,
        sender_name=admin.name,
        sender_role=admin.role.value,
        title=notif.title,
        message=notif.message,
        target_role=notif.target_role,
        created_at=notif.created_at,
    )


@app.delete("/api/admin/notifications/{notification_id}")
def admin_delete_notification(notification_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted"}


@app.get("/api/admin/notifications", response_model=List[NotificationResponse])
def admin_get_notifications(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    notifs = db.query(Notification).options(joinedload(Notification.sender)).order_by(Notification.created_at.desc()).all()
    return [
        NotificationResponse(
            id=n.id,
            sender_id=n.sender_id,
            sender_name=n.sender.name if n.sender else None,
            sender_role=n.sender.role.value if n.sender else None,
            title=n.title,
            message=n.message,
            target_role=n.target_role,
            created_at=n.created_at,
        )
        for n in notifs
    ]


# SSE — token passed as query param because EventSource can't set custom headers

@app.get("/api/sse/notifications")
async def sse_notifications(token: str = QueryParam(...), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=[os.getenv("ALGORITHM")])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401)
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401)
        role = user.role.value
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    client = {"role": role, "queue": queue}
    _sse_clients.append(client)

    async def event_stream():
        try:
            yield "event: ping\ndata: connected\n\n"
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield "event: ping\ndata: keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if client in _sse_clients:
                _sse_clients.remove(client)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# forgot password / reset

@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        reset = PasswordResetRequest(
            email=user.email,
            user_name=user.name,
            requested_at=datetime.utcnow(),
            is_resolved=False,
        )
        db.add(reset)
        db.commit()
    # always return success so we don't reveal whether an email is registered
    return {"message": "If this email is registered, the admin has been notified to reset your password."}


@app.get("/api/admin/password-reset-requests")
def get_password_reset_requests(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    requests = db.query(PasswordResetRequest).filter(
        PasswordResetRequest.is_resolved == False
    ).order_by(PasswordResetRequest.requested_at.desc()).all()
    results = []
    for r in requests:
        user = db.query(User).filter(User.email == r.email).first()
        results.append({
            "id": r.id,
            "email": r.email,
            "user_name": r.user_name,
            "user_id": user.id if user else None,
            "user_role": user.role.value if user else None,
            "requested_at": r.requested_at.isoformat(),
        })
    return results


@app.post("/api/admin/reset-password")
def admin_reset_password(req: AdminResetPasswordRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password = get_password_hash(req.new_password)
    db.query(PasswordResetRequest).filter(
        PasswordResetRequest.email == user.email,
        PasswordResetRequest.is_resolved == False,
    ).update({"is_resolved": True})
    db.commit()
    return {"message": f"Password reset for {user.name}"}


# university campus location settings

@app.get("/api/admin/location", response_model=UniversityLocationResponse)
def get_university_location(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    settings = db.query(UniversitySettings).first()
    if not settings or settings.latitude is None:
        raise HTTPException(status_code=404, detail="University location not set")
    return settings


@app.post("/api/admin/location", response_model=UniversityLocationResponse)
def set_university_location(req: UniversityLocationCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    settings = db.query(UniversitySettings).first()
    if settings:
        settings.name = req.name
        settings.latitude = req.latitude
        settings.longitude = req.longitude
        settings.radius_meters = req.radius_meters
    else:
        settings = UniversitySettings(
            name=req.name,
            latitude=req.latitude,
            longitude=req.longitude,
            radius_meters=req.radius_meters,
        )
        db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


# student groups (admin manages, students can view their own)

@app.get("/api/admin/groups", response_model=List[GroupResponse])
def list_groups(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    groups = db.query(Group).order_by(Group.name).all()
    return [
        GroupResponse(
            id=g.id,
            name=g.name,
            description=g.description,
            created_at=g.created_at,
            member_count=len(g.members),
        )
        for g in groups
    ]


@app.post("/api/admin/groups", response_model=GroupResponse)
def create_group(req: GroupCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if db.query(Group).filter(Group.name == req.name).first():
        raise HTTPException(status_code=400, detail="A group with that name already exists")
    g = Group(name=req.name, description=req.description, created_at=datetime.utcnow())
    db.add(g)
    db.commit()
    db.refresh(g)
    return GroupResponse(id=g.id, name=g.name, description=g.description, created_at=g.created_at, member_count=0)


@app.put("/api/admin/groups/{group_id}", response_model=GroupResponse)
def update_group(group_id: int, req: GroupUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    conflict = db.query(Group).filter(Group.name == req.name, Group.id != group_id).first()
    if conflict:
        raise HTTPException(status_code=400, detail="A group with that name already exists")
    g.name = req.name
    g.description = req.description
    db.commit()
    db.refresh(g)
    return GroupResponse(id=g.id, name=g.name, description=g.description, created_at=g.created_at, member_count=len(g.members))


@app.delete("/api/admin/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(g)
    db.commit()
    return {"message": "Group deleted"}


@app.get("/api/admin/groups/{group_id}/members", response_model=List[GroupMemberResponse])
def get_group_members(group_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    members = (
        db.query(User)
        .join(GroupMembership, GroupMembership.student_id == User.id)
        .filter(GroupMembership.group_id == group_id)
        .order_by(User.name)
        .all()
    )
    return [GroupMemberResponse(id=u.id, name=u.name, email=u.email) for u in members]


@app.post("/api/admin/groups/{group_id}/members")
def add_group_member(group_id: int, req: GroupMemberAdd, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    student = db.query(User).filter(User.id == req.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    existing = db.query(GroupMembership).filter_by(group_id=group_id, student_id=req.student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student is already in this group")
    db.add(GroupMembership(group_id=group_id, student_id=req.student_id))
    db.commit()
    return {"message": "Student added to group"}


@app.delete("/api/admin/groups/{group_id}/members/{student_id}")
def remove_group_member(group_id: int, student_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    membership = db.query(GroupMembership).filter_by(group_id=group_id, student_id=student_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    db.delete(membership)
    db.commit()
    return {"message": "Student removed from group"}


# manual email reminder trigger (admin only)

@app.post("/api/admin/email-reminders")
def send_lecture_reminders(
    hours_ahead: int = 24,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = now + timedelta(hours=hours_ahead)

    upcoming = db.query(Lecture).filter(
        Lecture.start_time >= now,
        Lecture.start_time <= cutoff,
    ).all()

    if not upcoming:
        return {"message": "No upcoming lectures in that window."}

    sent = 0
    skipped = 0

    for lecture in upcoming:
        module = db.query(Module).filter(Module.id == lecture.module_id).first()
        enrollments = db.query(Enrollment).filter(Enrollment.module_id == lecture.module_id).all()

        for enrol in enrollments:
            student = db.query(User).filter(User.id == enrol.student_id).first()
            if not student or not student.email:
                skipped += 1
                continue

            lecture_info = {
                "module": module.module_name if module else "Unknown",
                "date": lecture.start_time.strftime("%A, %d %B %Y"),
                "start": lecture.start_time.strftime("%H:%M"),
                "end": lecture.end_time.strftime("%H:%M") if lecture.end_time else "—",
                "room": lecture.room_name or "TBC",
            }

            html = build_lecture_reminder_html(student.name, [lecture_info])
            subject = f"Reminder: {lecture_info['module']} on {lecture_info['date']}"

            ok = send_email(student.email, subject, html)
            if ok:
                sent += 1
            else:
                skipped += 1

    return {"message": "Mail Sent"}
