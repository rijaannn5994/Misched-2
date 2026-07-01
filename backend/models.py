from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import relationship
from database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    STUDENT = "student"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    LATE = "late"
    ABSENT = "absent"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)  # hashed with bcrypt
    role = Column(SAEnum(UserRole), nullable=False)

    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    lectures_taught = relationship("Lecture", back_populates="staff", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    group_memberships = relationship("GroupMembership", back_populates="student", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_name = Column(String, nullable=False)
    module_code = Column(String, unique=True, nullable=False, index=True)

    enrollments = relationship("Enrollment", back_populates="module", cascade="all, delete-orphan")
    lectures = relationship("Lecture", back_populates="module", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)

    student = relationship("User", back_populates="enrollments")
    module = relationship("Module", back_populates="enrollments")


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    staff_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)

    module = relationship("Module", back_populates="lectures")
    staff = relationship("User", back_populates="lectures_taught")
    attendance_records = relationship("Attendance", back_populates="lecture", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(AttendanceStatus), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    lecture = relationship("Lecture", back_populates="attendance_records")
    student = relationship("User", back_populates="attendance_records")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    target_role = Column(String, nullable=False)  # "student", "staff", or "all"
    created_at = Column(DateTime, nullable=False)

    sender = relationship("User")


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, nullable=False)
    user_name = Column(String, nullable=True)
    requested_at = Column(DateTime, nullable=False)
    is_resolved = Column(Boolean, nullable=False, default=False)


class NotificationRead(Base):
    __tablename__ = "notification_reads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(DateTime, nullable=False)


class EmailSent(Base):
    # tracks which reminder emails have been sent so we don't email the same student twice per lecture
    __tablename__ = "email_sent"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sent_at = Column(DateTime, nullable=False)


class UniversitySettings(Base):
    __tablename__ = "university_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=True, default="University")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_meters = Column(Integer, nullable=True, default=100)


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False)

    members = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")


class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)

    student = relationship("User", back_populates="group_memberships")
    group = relationship("Group", back_populates="members")
