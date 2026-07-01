from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole, AttendanceStatus


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole


class UserMeResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class ModuleCreate(BaseModel):
    module_name: str
    module_code: str


class ModuleResponse(BaseModel):
    id: int
    module_name: str
    module_code: str

    class Config:
        from_attributes = True


class EnrollmentRequest(BaseModel):
    student_id: int
    module_id: int


class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    module_id: int

    class Config:
        from_attributes = True


class LectureCreate(BaseModel):
    module_id: int
    staff_id: int
    room_name: str
    start_time: datetime
    end_time: datetime


class LectureResponse(BaseModel):
    id: int
    module_id: int
    staff_id: int
    room_name: str
    start_time: datetime
    end_time: datetime
    module_code: Optional[str] = None
    module_name: Optional[str] = None
    staff_name: Optional[str] = None

    class Config:
        from_attributes = True


class AttendanceMarkRequest(BaseModel):
    student_id: int
    lecture_id: int
    status: AttendanceStatus
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AttendanceResponse(BaseModel):
    id: int
    lecture_id: int
    student_id: int
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class AnalyticsResponse(BaseModel):
    total_present: int
    total_late: int
    total_absent: int
    total_records: int
    attendance_rate: float
    chronic_absentees: List[dict] = []
    per_module: List[dict] = []


class NotificationCreate(BaseModel):
    title: str
    message: str
    target_role: str  # "student", "staff", or "all"


class NotificationResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    title: str
    message: str
    target_role: str
    created_at: datetime
    is_read: bool = False

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class AdminResetPasswordRequest(BaseModel):
    user_id: int
    new_password: str


class UniversityLocationCreate(BaseModel):
    name: Optional[str] = "University"
    latitude: float
    longitude: float
    radius_meters: int = 100


class UniversityLocationResponse(BaseModel):
    id: int
    name: Optional[str]
    latitude: float
    longitude: float
    radius_meters: int

    class Config:
        from_attributes = True


class StudentCheckinRequest(BaseModel):
    lecture_id: int
    latitude: float
    longitude: float


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupUpdate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupMemberAdd(BaseModel):
    student_id: int


class GroupMemberResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    member_count: int = 0

    class Config:
        from_attributes = True
