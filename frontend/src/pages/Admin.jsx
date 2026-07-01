import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api";
import { format } from "date-fns";
import {
  SettingsIcon,
  UsersIcon,
  ChartIcon,
  BellIcon,
  KeyIcon,
  DoorIcon,
  WarningIcon,
  SendIcon,
  MegaphoneIcon,
  CalendarIcon,
  LocationPinIcon,
  TrashIcon,
  GroupIcon,
  GraduationCapIcon,
} from "../components/Icons";
import LocationPicker from "../components/LocationPicker";
import DateTimePicker from "../components/DateTimePicker";

const ManualResetForm = ({ users, onReset }) => {
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !newPassword) return;
    setLoading(true);
    const ok = await onReset(parseInt(userId), newPassword);
    if (ok) {
      setUserId("");
      setNewPassword("");
    }
    setLoading(false);
  };

  const nonAdminUsers = users.filter((u) => u.role !== "admin");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="label">Select User</label>
        <select
          className="input"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        >
          <option value="">Choose a user...</option>
          {nonAdminUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email}) — {u.role}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">New Password</label>
        <input
          type="password"
          className="input"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={4}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={loading || !userId}
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const light = theme === "light";
  const overlayStyle = {
    background: light ? "rgba(71,85,105,0.35)" : "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
  };
  const [activeSection, setActiveSection] = useState("manage");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [filterLectureStaff, setFilterLectureStaff] = useState('');
  const [filterLectureModule, setFilterLectureModule] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [toast, setToast] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifForm, setNotifForm] = useState({
    title: "",
    message: "",
    target_role: "student",
  });

  // Forgot password / reset requests
  const [resetRequests, setResetRequests] = useState([]);
  const [resetPasswordMap, setResetPasswordMap] = useState({});
  const [resettingId, setResettingId] = useState(null);

  // Enrollments
  const [enrollments, setEnrollments] = useState([]);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollView, setEnrollView] = useState("module"); // 'module' | 'student'

  // Edit user modal
  const [editUser, setEditUser] = useState(null); // { id, name, email, role }
  const [editSaving, setEditSaving] = useState(false);

  // Delete user confirm
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  // Email reminders
  const [emailHours, setEmailHours] = useState(24);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  // University location
  const [uniLocation, setUniLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius_meters: 100,
  });
  const [locationSaving, setLocationSaving] = useState(false);

  // Groups
  const [groups, setGroups] = useState([]);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [addMemberStudentId, setAddMemberStudentId] = useState("");
  const [exportGroupId, setExportGroupId] = useState("");

  // User directory search
  const [userSearch, setUserSearch] = useState("");

  // Forms
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [newModule, setNewModule] = useState({
    module_name: "",
    module_code: "",
  });
  const [enrollment, setEnrollment] = useState({
    student_id: "",
    module_id: "",
  });
  const [lectureForm, setLectureForm] = useState({
    module_id: "",
    staff_id: "",
    room_name: "",
    lec_date: "",
    lec_time: "",
    start_time: "",
    end_time: "",
    semester_months: 0,
  });
  const [lectureScheduling, setLectureScheduling] = useState(false);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, modulesRes, lecturesRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/modules"),
        api.get("/admin/lectures"),
      ]);
      setUsers(usersRes.data);
      setModules(modulesRes.data);
      setLectures(lecturesRes.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403)
        navigate("/login");
    }
  }, [navigate]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get("/admin/analytics/attendance");
      setAnalytics(res.data);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/admin/notifications");
      setNotifications(res.data);
    } catch {}
  }, []);

  const fetchResetRequests = useCallback(async () => {
    try {
      const res = await api.get("/admin/password-reset-requests");
      setResetRequests(res.data);
    } catch {}
  }, []);

  const fetchEnrollments = useCallback(async () => {
    try {
      const res = await api.get("/admin/enrollments");
      setEnrollments(res.data);
    } catch {}
  }, []);

  const fetchUniLocation = useCallback(async () => {
    try {
      const res = await api.get("/admin/location");
      setUniLocation(res.data);
      setLocationForm({
        name: res.data.name || "",
        latitude: res.data.latitude,
        longitude: res.data.longitude,
        radius_meters: res.data.radius_meters,
      });
    } catch {}
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get("/admin/groups");
      setGroups(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchAnalytics();
    fetchNotifications();
    fetchResetRequests();
    fetchUniLocation();
    fetchEnrollments();
    fetchGroups();
  }, [
    fetchData,
    fetchAnalytics,
    fetchNotifications,
    fetchResetRequests,
    fetchUniLocation,
    fetchEnrollments,
    fetchGroups,
  ]);

  // ─── Handlers ───
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/users/create", newUser);
      showToast(`User "${newUser.name}" created successfully`);
      setNewUser({ name: "", email: "", password: "", role: "student" });
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : err.message || "Error creating user";
      showToast(msg, "error");
    }
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/modules/create", newModule);
      showToast(`Module "${newModule.module_name}" created`);
      setNewModule({ module_name: "", module_code: "" });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || "Error creating module", "error");
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/enrollments/assign", {
        student_id: parseInt(enrollment.student_id),
        module_id: parseInt(enrollment.module_id),
      });
      showToast("Student enrolled successfully");
      setEnrollment({ student_id: "", module_id: "" });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || "Error enrolling", "error");
    }
  };

  const setDuration = (hours) => {
    if (!lectureForm.start_time) return;
    const start = new Date(lectureForm.start_time);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setLectureForm({
      ...lectureForm,
      end_time: format(end, "yyyy-MM-dd'T'HH:mm"),
    });
  };

  // Returns list of {start, end} LOCAL datetime strings for every weekly occurrence.
  // We use format() instead of toISOString() to avoid UTC conversion (toISOString shifts
  // BST times back 1 hour before sending, causing the stored time to be wrong).
  const buildSemesterDates = (startTime, endTime, months) => {
    const dates = [];
    const semEnd = new Date(startTime);
    semEnd.setMonth(semEnd.getMonth() + months);
    let curStart = new Date(startTime);
    let curEnd = new Date(endTime);
    while (curStart <= semEnd) {
      dates.push({
        start: format(curStart, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(curEnd, "yyyy-MM-dd'T'HH:mm:ss"),
      });
      curStart.setDate(curStart.getDate() + 7);
      curEnd.setDate(curEnd.getDate() + 7);
    }
    return dates;
  };

  const semesterLectureCount = (() => {
    const months = parseInt(lectureForm.semester_months) || 0;
    if (!lectureForm.start_time || months === 0) return 1;
    return buildSemesterDates(
      lectureForm.start_time,
      lectureForm.start_time,
      months,
    ).length;
  })();

  const handleScheduleLecture = async (e) => {
    e.preventDefault();
    const months = parseInt(lectureForm.semester_months) || 0;
    // Keep local time — append seconds so backend parses correctly as naive datetime
    const startLocal = lectureForm.start_time + ":00";
    const endLocal = lectureForm.end_time + ":00";

    const dates =
      months === 0
        ? [{ start: startLocal, end: endLocal }]
        : buildSemesterDates(
            new Date(lectureForm.start_time),
            new Date(lectureForm.end_time),
            months,
          );

    setLectureScheduling(true);
    let successCount = 0;
    let skipped = 0;
    let lastConflictReason = "";
    for (const { start, end } of dates) {
      try {
        await api.post("/admin/lectures/schedule", {
          module_id: parseInt(lectureForm.module_id),
          staff_id: parseInt(lectureForm.staff_id),
          room_name: lectureForm.room_name,
          start_time: start,
          end_time: end,
        });
        successCount++;
      } catch (err) {
        skipped++;
        lastConflictReason = err.response?.data?.detail || "";
      }
    }
    setLectureScheduling(false);

    if (successCount > 0) {
      const msg =
        months > 0
          ? `${successCount} lecture${successCount !== 1 ? "s" : ""} scheduled over ${months} months${skipped > 0 ? ` (${skipped} skipped — conflicts)` : ""}`
          : "Lecture scheduled successfully";
      showToast(msg);
      setLectureForm({
        module_id: "",
        staff_id: "",
        room_name: "",
        lec_date: "",
        lec_time: "",
        start_time: "",
        end_time: "",
        semester_months: 0,
      });
      fetchData();
    } else {
      const reason = lastConflictReason || "all slots have conflicts";
      showToast(
        months > 0
          ? `Could not schedule any lectures — ${reason}`
          : `Scheduling conflict: ${reason}`,
        "error",
      );
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast("Notification deleted");
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Error deleting notification",
        "error",
      );
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/notifications/send", notifForm);
      showToast(
        `Notification sent to ${notifForm.target_role === "all" ? "everyone" : notifForm.target_role + "s"}`,
      );
      setNotifForm({ title: "", message: "", target_role: "student" });
      fetchNotifications();
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Error sending notification",
        "error",
      );
    }
  };

  const deleteModule = async (id) => {
    if (
      !window.confirm(
        "Delete this module? This will also remove all related lectures and enrollments.",
      )
    )
      return;
    try {
      await api.delete(`/admin/modules/${id}`);
      showToast("Module deleted");
      fetchData();
      fetchAnalytics();
    } catch (err) {
      showToast("Error deleting module", "error");
    }
  };

  const deleteLecture = async (id) => {
    if (!window.confirm("Delete this lecture?")) return;
    try {
      await api.delete(`/admin/lectures/${id}`);
      showToast("Lecture deleted");
      fetchData();
    } catch (err) {
      showToast("Error deleting", "error");
    }
  };

  const [exportModuleId, setExportModuleId] = useState("");

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (exportModuleId) params.append("module_id", exportModuleId);
      if (exportGroupId) params.append("group_id", exportGroupId);
      const query = params.toString() ? `?${params}` : "";
      const response = await api.get(`/admin/export-csv${query}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const mod = modules.find((m) => String(m.id) === String(exportModuleId));
      const grp = groups.find((g) => String(g.id) === String(exportGroupId));
      const parts = [mod?.module_code, grp?.name].filter(Boolean);
      const filename = parts.length ? `attendance_${parts.join("_")}.csv` : "attendance_all.csv";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("CSV exported successfully");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to export CSV", "error");
    }
  };

  const handleResetPassword = async (userId, requestId) => {
    const newPassword = resetPasswordMap[requestId];
    if (!newPassword || newPassword.trim().length < 4) {
      showToast("Password must be at least 4 characters", "error");
      return;
    }
    setResettingId(requestId);
    try {
      const res = await api.post("/admin/reset-password", {
        user_id: userId,
        new_password: newPassword,
      });
      showToast(res.data.message || "Password reset successfully");
      setResetPasswordMap((prev) => {
        const n = { ...prev };
        delete n[requestId];
        return n;
      });
      fetchResetRequests();
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Error resetting password",
        "error",
      );
    } finally {
      setResettingId(null);
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setLocationSaving(true);
    try {
      const res = await api.post("/admin/location", {
        name: locationForm.name || "University",
        latitude: parseFloat(locationForm.latitude),
        longitude: parseFloat(locationForm.longitude),
        radius_meters: parseInt(locationForm.radius_meters),
      });
      setUniLocation(res.data);
      showToast("Campus location saved");
    } catch (err) {
      showToast(err.response?.data?.detail || "Error saving location", "error");
    } finally {
      setLocationSaving(false);
    }
  };

  // ─── Group Handlers ───
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/groups", groupForm);
      showToast(`Group "${groupForm.name}" created`);
      setGroupForm({ name: "", description: "" });
      fetchGroups();
    } catch (err) {
      showToast(err.response?.data?.detail || "Error creating group", "error");
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm("Delete this group? Students will not be deleted.")) return;
    try {
      await api.delete(`/admin/groups/${id}`);
      showToast("Group deleted");
      if (selectedGroup?.id === id) { setSelectedGroup(null); setGroupMembers([]); }
      fetchGroups();
    } catch {
      showToast("Error deleting group", "error");
    }
  };

  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    setAddMemberStudentId("");
    try {
      const res = await api.get(`/admin/groups/${group.id}/members`);
      setGroupMembers(res.data);
    } catch {}
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !addMemberStudentId) return;
    try {
      await api.post(`/admin/groups/${selectedGroup.id}/members`, {
        student_id: parseInt(addMemberStudentId),
      });
      showToast("Student added to group");
      setAddMemberStudentId("");
      const res = await api.get(`/admin/groups/${selectedGroup.id}/members`);
      setGroupMembers(res.data);
      fetchGroups();
    } catch (err) {
      showToast(err.response?.data?.detail || "Error adding student", "error");
    }
  };

  const handleRemoveMember = async (studentId) => {
    if (!selectedGroup) return;
    try {
      await api.delete(`/admin/groups/${selectedGroup.id}/members/${studentId}`);
      showToast("Student removed from group");
      setGroupMembers((prev) => prev.filter((m) => m.id !== studentId));
      fetchGroups();
    } catch {
      showToast("Error removing student", "error");
    }
  };

  const detectMyLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        showToast("Location detected — review and save");
      },
      () => {
        showToast(
          "Could not get location. Allow browser location access.",
          "error",
        );
        setDetectingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  // ─── Sidebar items ───
  const sidebarItems = [
    {
      id: "manage",
      label: "Manage System",
      icon: <SettingsIcon size={18} />,
      primary: true,
    },
    { id: "users", label: "User Directory", icon: <UsersIcon size={18} /> },
    { id: "analytics", label: "Analytics", icon: <ChartIcon size={18} /> },
    {
      id: "notifications",
      label: "Notifications",
      icon: <BellIcon size={18} />,
    },
    { id: "enrollments", label: "Enrollments", icon: <GraduationCapIcon size={18} /> },
    { id: "groups", label: "Groups", icon: <GroupIcon size={18} /> },
    {
      id: "location",
      label: "Location Settings",
      icon: <LocationPinIcon size={18} />,
    },
    { id: "forgot", label: "Forgot Password", icon: <KeyIcon size={18} /> },
    { id: "email", label: "Email Reminders", icon: <SendIcon size={18} /> },
  ];

  const totalAtt = analytics ? analytics.total_records : 0;

  const getTargetBadge = (target) => {
    switch (target) {
      case "student":
        return <span className="badge badge-green">Students</span>;
      case "staff":
        return <span className="badge badge-blue">Staff</span>;
      case "all":
        return <span className="badge badge-purple">Everyone</span>;
      default:
        return <span className="badge">{target}</span>;
    }
  };

  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
  ];

  const pickedDuration = (() => {
    if (!lectureForm.start_time || !lectureForm.end_time) return null;
    const diff =
      (new Date(lectureForm.end_time) - new Date(lectureForm.start_time)) /
      3600000;
    return diff > 0 ? diff : null;
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen mobile-page-pad md:pb-0"
      style={{
        paddingTop: "calc(3.75rem + env(safe-area-inset-top))",
        background: light
          ? "linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 40%, #fdf4ff 100%)"
          : "linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0d1b2a 100%)",
        minHeight: "100vh",
      }}
    >
      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div
            className={`alert ${toast.type === "error" ? "alert-error" : "alert-success"} animate-slide-down`}
          >
            {toast.msg}
          </div>
        </div>
      )}

      <div className="flex">
        {/* ═══════ SIDEBAR ═══════ */}
        <aside
          className="misched-sidebar hidden md:flex flex-col"
          style={{
            width: sidebarCollapsed ? '68px' : '240px',
            minWidth: sidebarCollapsed ? '68px' : '240px',
            transition: 'width 0.22s ease, min-width 0.22s ease',
            top: "calc(3.75rem + env(safe-area-inset-top))",
            height: "calc(100vh - 3.75rem - env(safe-area-inset-top))",
            position: 'sticky',
            background: light ? 'rgba(255,255,255,0.7)' : 'rgba(15,12,41,0.7)',
            backdropFilter: 'blur(20px)',
            borderRight: light ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.06)',
            padding: '0.75rem 0.5rem',
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          {/* Header row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: '0.25rem 0.5rem 0.75rem',
            marginBottom: '0.25rem',
          }}>
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src="/images/logo.png" alt="MiSched" style={{ height: '1.6rem', width: 'auto' }} />
                <span style={{
                  fontWeight: '800', fontSize: '1rem',
                  background: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', whiteSpace: 'nowrap',
                }}>Admin</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem',
                borderRadius: '0.45rem', color: light ? '#64748b' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.background = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {sidebarCollapsed ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              )}
            </button>
          </div>

          {/* Nav items */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sidebarItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  title={sidebarCollapsed ? item.label : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: sidebarCollapsed ? '0.65rem' : '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    background: active
                      ? light ? 'rgba(59,130,246,0.1)' : 'rgba(99,102,241,0.15)'
                      : 'transparent',
                    color: active
                      ? light ? '#3b82f6' : '#818cf8'
                      : light ? '#475569' : '#94a3b8',
                    fontSize: '0.875rem',
                    fontWeight: active ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    width: '100%',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center',
                    color: active ? (light ? '#3b82f6' : '#818cf8') : (light ? '#64748b' : '#64748b'),
                  }}>{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            title={sidebarCollapsed ? 'Sign Out' : ''}
            style={{
              display: 'flex', alignItems: 'center',
              gap: '0.75rem',
              padding: sidebarCollapsed ? '0.65rem' : '0.65rem 0.85rem',
              borderRadius: '0.6rem', border: 'none',
              background: 'transparent',
              color: '#f87171',
              fontSize: '0.875rem', fontWeight: '500',
              cursor: 'pointer', transition: 'all 0.15s ease',
              textAlign: 'left', width: '100%',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              whiteSpace: 'nowrap', overflow: 'hidden',
              fontFamily: "'Inter', sans-serif",
              marginTop: '0.25rem',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><DoorIcon size={18} /></span>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </aside>

        {/* ═══════ MAIN CONTENT ═══════ */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-100 mb-1">
              Admin <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-slate-500 text-sm">
              {getGreeting()}, {user?.name || "Admin"}
            </p>
          </div>

          {/* ═══════ MANAGE SYSTEM ═══════ */}
          {activeSection === "manage" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT PANEL */}
                <div className="flex flex-col gap-6">
                  {/* Create Account */}
                  <div className="glass-card-static">
                    <h2 className="section-title">Create Account</h2>
                    <form
                      onSubmit={handleCreateUser}
                      className="flex flex-col gap-3"
                    >
                      <div>
                        <label className="label">Role</label>
                        <select
                          className="input"
                          value={newUser.role}
                          onChange={(e) =>
                            setNewUser({ ...newUser, role: e.target.value })
                          }
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Full Name</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="Full name"
                          value={newUser.name}
                          onChange={(e) =>
                            setNewUser({ ...newUser, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Email</label>
                        <input
                          className="input"
                          type="email"
                          placeholder="email@university.com"
                          value={newUser.email}
                          onChange={(e) =>
                            setNewUser({ ...newUser, email: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Password</label>
                        <input
                          className="input"
                          type="password"
                          placeholder="Password"
                          value={newUser.password}
                          onChange={(e) =>
                            setNewUser({ ...newUser, password: e.target.value })
                          }
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-full">
                        Create
                      </button>
                    </form>
                  </div>

                  {/* Create Module */}
                  <div className="glass-card-static">
                    <h2 className="section-title">Create Module</h2>
                    <form
                      onSubmit={handleCreateModule}
                      className="flex flex-col gap-3"
                    >
                      <div>
                        <label className="label">Module Name</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="e.g. Software Engineering"
                          value={newModule.module_name}
                          onChange={(e) =>
                            setNewModule({
                              ...newModule,
                              module_name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Module Code</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="e.g. COM327"
                          value={newModule.module_code}
                          onChange={(e) =>
                            setNewModule({
                              ...newModule,
                              module_code: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-full">
                        Create
                      </button>
                    </form>
                  </div>

                  {/* Enroll Student */}
                  <div className="glass-card-static">
                    <h2 className="section-title">Enroll Student in Module</h2>
                    <form
                      onSubmit={handleEnroll}
                      className="flex flex-col gap-3"
                    >
                      <div>
                        <label className="label">Student</label>
                        <select
                          className="input"
                          value={enrollment.student_id}
                          onChange={(e) =>
                            setEnrollment({
                              ...enrollment,
                              student_id: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select Student</option>
                          {users
                            .filter((u) => u.role === "student")
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.email})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Module</label>
                        <select
                          className="input"
                          value={enrollment.module_id}
                          onChange={(e) =>
                            setEnrollment({
                              ...enrollment,
                              module_id: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select Module</option>
                          {modules.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.module_name} ({m.module_code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-success w-full">
                        Enroll
                      </button>
                    </form>
                  </div>
                </div>

                {/* RIGHT PANEL — Create Lecture */}
                <div className="flex flex-col gap-6">
                  <div className="glass-card-static">
                    <h2 className="section-title">Create Lecture</h2>
                    <form
                      onSubmit={handleScheduleLecture}
                      className="flex flex-col gap-3"
                    >
                      {/* ── Semester selector ── */}
                      <div
                        style={{
                          paddingBottom: "0.75rem",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <label className="label">Semester Duration</label>
                        <select
                          className="input"
                          value={lectureForm.semester_months}
                          onChange={(e) =>
                            setLectureForm({
                              ...lectureForm,
                              semester_months: parseInt(e.target.value),
                            })
                          }
                        >
                          <option value={0}>One-off (single lecture)</option>
                          <option value={3}>3 Months</option>
                          <option value={4}>4 Months</option>
                          <option value={6}>6 Months</option>
                          <option value={8}>8 Months</option>
                          <option value={12}>12 Months</option>
                        </select>
                        {lectureForm.semester_months > 0 &&
                          lectureForm.start_time && (
                            <p
                              className="text-xs mt-1.5"
                              style={{ color: "#60a5fa" }}
                            >
                              Will create{" "}
                              <strong>{semesterLectureCount}</strong> weekly
                              lectures over {lectureForm.semester_months} months
                            </p>
                          )}
                        {lectureForm.semester_months > 0 &&
                          !lectureForm.start_time && (
                            <p className="text-xs mt-1.5 text-slate-500">
                              Set the first lecture date below to see the total
                              count
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="label">Module</label>
                        <select
                          className="input"
                          value={lectureForm.module_id}
                          onChange={(e) =>
                            setLectureForm({
                              ...lectureForm,
                              module_id: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select</option>
                          {modules.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.module_name} ({m.module_code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Room Number</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="eg. 101"
                          value={lectureForm.room_name}
                          onChange={(e) =>
                            setLectureForm({
                              ...lectureForm,
                              room_name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Staff</label>
                        <select
                          className="input"
                          value={lectureForm.staff_id}
                          onChange={(e) =>
                            setLectureForm({
                              ...lectureForm,
                              staff_id: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Prof. Name</option>
                          {users
                            .filter((u) => u.role === "staff")
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      {/* ── Date & Time picker ── */}
                      <div>
                        <label className="label">
                          {lectureForm.semester_months > 0 ? "First Lecture Date & Time" : "Date & Time"}
                        </label>
                        <DateTimePicker
                          value={lectureForm.lec_date}
                          timeValue={lectureForm.lec_time}
                          label={lectureForm.semester_months > 0 ? "first lecture date & time" : "date & time"}
                          onConfirm={(date, time) => {
                            const combined = `${date}T${time}`;
                            setLectureForm({
                              ...lectureForm,
                              lec_date: date,
                              lec_time: time,
                              start_time: combined,
                              end_time: "",
                            });
                          }}
                          onCancel={() => {}}
                        />
                      </div>

                      {/* ── Duration pills ── */}
                      <div>
                        <label className="label">Duration</label>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(5, 1fr)",
                            gap: "0.3rem",
                          }}
                        >
                          {[1, 1.5, 2, 2.5, 3].map((h) => {
                            const active = pickedDuration === h;
                            return (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setDuration(h)}
                                disabled={!lectureForm.start_time}
                                style={{
                                  padding: "0.45rem 0.15rem",
                                  borderRadius: "0.45rem",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  border: `1px solid ${active ? "#10b981" : "rgba(255,255,255,0.06)"}`,
                                  background: active
                                    ? "linear-gradient(135deg,#10b981,#06b6d4)"
                                    : "rgba(255,255,255,0.02)",
                                  color: active
                                    ? "#fff"
                                    : lectureForm.start_time
                                      ? "#94a3b8"
                                      : "#3f4f60",
                                  cursor: lectureForm.start_time
                                    ? "pointer"
                                    : "not-allowed",
                                  transition: "all 0.12s ease",
                                  boxShadow: active
                                    ? "0 2px 10px rgba(16,185,129,0.3)"
                                    : "none",
                                }}
                              >
                                {h}h
                              </button>
                            );
                          })}
                        </div>
                        {!lectureForm.start_time && (
                          <p className="text-slate-600 text-xs mt-1">
                            Pick a date and time first
                          </p>
                        )}
                      </div>

                      {/* ── Preview card ── */}
                      {lectureForm.start_time && lectureForm.end_time && (
                        <div
                          style={{
                            padding: "0.875rem 1rem",
                            borderRadius: "0.75rem",
                            background: "rgba(59,130,246,0.07)",
                            border: "1px solid rgba(59,130,246,0.18)",
                          }}
                        >
                          <p
                            className="text-xs font-semibold uppercase tracking-widest mb-2"
                            style={{ color: "#60a5fa" }}
                          >
                            {lectureForm.semester_months > 0
                              ? "First Session Preview"
                              : "Lecture Preview"}
                          </p>
                          <p className="text-slate-100 font-semibold text-sm">
                            {format(
                              new Date(lectureForm.start_time),
                              "EEEE, MMMM d, yyyy",
                            )}
                          </p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {format(new Date(lectureForm.start_time), "p")}
                            {" → "}
                            {format(new Date(lectureForm.end_time), "p")}
                            {lectureForm.room_name && (
                              <span className="ml-2 text-slate-500">
                                · Room {lectureForm.room_name}
                              </span>
                            )}
                          </p>
                          {lectureForm.semester_months > 0 && (
                            <p
                              className="text-xs mt-1.5"
                              style={{ color: "#60a5fa" }}
                            >
                              + {semesterLectureCount - 1} more weekly sessions
                              &nbsp;·&nbsp; {lectureForm.semester_months} months
                              total
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary w-full mt-1"
                        disabled={
                          lectureScheduling ||
                          !lectureForm.start_time ||
                          !lectureForm.end_time
                        }
                        style={{
                          opacity:
                            lectureScheduling ||
                            !lectureForm.start_time ||
                            !lectureForm.end_time
                              ? 0.5
                              : 1,
                        }}
                      >
                        {lectureScheduling
                          ? "Scheduling..."
                          : lectureForm.semester_months > 0
                            ? `Schedule ${semesterLectureCount} Lectures`
                            : "Schedule Lecture"}
                      </button>
                    </form>
                  </div>

                  {/* Modules List */}
                  <div className="glass-card-static">
                    <h2 className="section-title">
                      Modules ({modules.length})
                    </h2>
                    <div className="flex flex-col gap-2">
                      {modules.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                        >
                          <div>
                            <span className="font-semibold text-slate-100 text-sm">
                              {m.module_name}
                            </span>
                            <span className="ml-2 badge badge-blue">
                              {m.module_code}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteModule(m.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                      {modules.length === 0 && (
                        <p className="text-slate-500 text-center py-4 text-sm">
                          No modules created yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scheduled Lectures Table */}
              <div className="glass-card-static mt-6">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h2 className="section-title" style={{ margin: 0 }}>
                    Scheduled Lectures {(filterLectureStaff || filterLectureModule) ? `(${(() => {
                      let f = lectures;
                      if (filterLectureStaff) f = f.filter(l => String(l.staff_id) === filterLectureStaff);
                      if (filterLectureModule) f = f.filter(l => String(l.module_id) === filterLectureModule);
                      return f.length;
                    })()})` : ''}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select
                      className="input"
                      style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                      value={filterLectureStaff}
                      onChange={e => setFilterLectureStaff(e.target.value)}
                    >
                      <option value="">Filter by Staff…</option>
                      {users.filter(u => u.role === 'staff').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <select
                      className="input"
                      style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                      value={filterLectureModule}
                      onChange={e => setFilterLectureModule(e.target.value)}
                    >
                      <option value="">Filter by Module…</option>
                      {modules.map(m => (
                        <option key={m.id} value={m.id}>{m.module_name} ({m.module_code})</option>
                      ))}
                    </select>
                    {(filterLectureStaff || filterLectureModule) && (
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => { setFilterLectureStaff(''); setFilterLectureModule(''); }}
                      >Clear</button>
                    )}
                  </div>
                </div>

                {!(filterLectureStaff || filterLectureModule) ? (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0', fontSize: '0.9rem' }}>
                    Select a staff member or module above to view scheduled lectures
                  </p>
                ) : (
                  <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Module</th>
                          <th>Staff</th>
                          <th>Room</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let filtered = lectures;
                          if (filterLectureStaff) filtered = filtered.filter(l => String(l.staff_id) === filterLectureStaff);
                          if (filterLectureModule) filtered = filtered.filter(l => String(l.module_id) === filterLectureModule);
                          return filtered.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center text-slate-500 py-8">
                                No lectures found for this selection
                              </td>
                            </tr>
                          ) : filtered.map((lec) => (
                            <tr key={lec.id}>
                              <td>
                                <span className="badge badge-blue">
                                  {lec.module_code || lec.module_name}
                                </span>
                              </td>
                              <td className="text-slate-300">
                                {lec.staff_name || `Staff #${lec.staff_id}`}
                              </td>
                              <td>{lec.room_name}</td>
                              <td>{format(new Date(lec.start_time), "PPp")}</td>
                              <td>{format(new Date(lec.end_time), "p")}</td>
                              <td>
                                <button
                                  onClick={() => deleteLecture(lec.id)}
                                  className="btn btn-danger btn-sm"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════ USER DIRECTORY ═══════ */}
          {activeSection === "users" &&
            (() => {
              const q = userSearch.trim().toLowerCase();
              const filtered = q
                ? users.filter(
                    (u) =>
                      u.name.toLowerCase().includes(q) ||
                      u.email.toLowerCase().includes(q) ||
                      String(u.id).includes(q),
                  )
                : null;

              const roleBadge = (role) => {
                if (role === "staff")
                  return <span className="badge badge-blue">Staff</span>;
                if (role === "student")
                  return <span className="badge badge-green">Student</span>;
                return <span className="badge badge-purple">Admin</span>;
              };

              const UserRow = ({ u }) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-600 text-xs font-mono w-8 flex-shrink-0">
                      #{u.id}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-100 block truncate">
                        {u.name}
                      </span>
                      <span className="text-slate-500 text-xs truncate block">
                        {u.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {roleBadge(u.role)}
                    <button
                      title="Edit user"
                      onClick={() => setEditUser({ ...u })}
                      className="p-1.5 rounded-md text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {u.role !== "admin" && (
                      <button
                        title="Delete user"
                        onClick={() => {
                          setDeleteUserId(u.id);
                          setDeleteConfirmName(u.name);
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-6"
                >
                  {/* Search bar */}
                  <div className="glass-card-static">
                    <div style={{ position: "relative" }}>
                      <input
                        className="input"
                        type="text"
                        placeholder="Search by name, email or ID..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        style={{ paddingLeft: "2.5rem" }}
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          position: "absolute",
                          left: "0.75rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#64748b",
                          pointerEvents: "none",
                        }}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      {userSearch && (
                        <button
                          onClick={() => setUserSearch("")}
                          style={{
                            position: "absolute",
                            right: "0.75rem",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            fontSize: "1rem",
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {q && (
                      <p className="text-slate-500 text-xs mt-2">
                        {filtered.length} result
                        {filtered.length !== 1 ? "s" : ""} for &ldquo;
                        {userSearch.trim()}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Search results — flat list */}
                  {filtered && (
                    <div className="glass-card-static">
                      <h2 className="section-title">
                        Search Results ({filtered.length})
                      </h2>
                      <div className="flex flex-col gap-2">
                        {filtered.length > 0 ? (
                          filtered.map((u) => <UserRow key={u.id} u={u} />)
                        ) : (
                          <p className="text-slate-500 text-center py-6 text-sm">
                            No users match your search.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Default grouped view — shown when no search query */}
                  {!filtered && (
                    <>
                      <div className="glass-card-static">
                        <h2 className="section-title">
                          Staff Members (
                          {users.filter((u) => u.role === "staff").length})
                        </h2>
                        <div className="flex flex-col gap-2">
                          {users
                            .filter((u) => u.role === "staff")
                            .map((u) => (
                              <UserRow key={u.id} u={u} />
                            ))}
                          {users.filter((u) => u.role === "staff").length ===
                            0 && (
                            <p className="text-slate-500 text-center py-4">
                              No staff members yet
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="glass-card-static">
                        <h2 className="section-title">
                          Students (
                          {users.filter((u) => u.role === "student").length})
                        </h2>
                        <div className="flex flex-col gap-2">
                          {users
                            .filter((u) => u.role === "student")
                            .map((u) => (
                              <UserRow key={u.id} u={u} />
                            ))}
                          {users.filter((u) => u.role === "student").length ===
                            0 && (
                            <p className="text-slate-500 text-center py-4">
                              No students yet
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="glass-card-static">
                        <h2 className="section-title">
                          Administrators (
                          {users.filter((u) => u.role === "admin").length})
                        </h2>
                        <div className="flex flex-col gap-2">
                          {users
                            .filter((u) => u.role === "admin")
                            .map((u) => (
                              <UserRow key={u.id} u={u} />
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })()}

          {/* ═══════ ENROLLMENTS ═══════ */}
          {activeSection === "enrollments" &&
            (() => {
              const q = enrollSearch.trim().toLowerCase();

              // Filter by search
              const filtered = q
                ? enrollments.filter(
                    (e) =>
                      e.student_name?.toLowerCase().includes(q) ||
                      e.module_name?.toLowerCase().includes(q) ||
                      e.module_code?.toLowerCase().includes(q),
                  )
                : enrollments;

              const handleUnenroll = async (
                enrollmentId,
                studentName,
                moduleName,
              ) => {
                if (
                  !window.confirm(`Remove ${studentName} from ${moduleName}?`)
                )
                  return;
                try {
                  await api.delete(`/admin/enrollments/${enrollmentId}`);
                  setEnrollments((prev) =>
                    prev.filter((e) => e.id !== enrollmentId),
                  );
                  showToast(`${studentName} removed from ${moduleName}`);
                } catch (err) {
                  showToast(
                    err.response?.data?.detail || "Failed to unenroll",
                    "error",
                  );
                }
              };

              // Group by module
              const byModule = {};
              filtered.forEach((e) => {
                const key = e.module_code;
                if (!byModule[key])
                  byModule[key] = {
                    name: e.module_name,
                    code: e.module_code,
                    students: [],
                  };
                byModule[key].students.push(e);
              });

              // Group by student
              const byStudent = {};
              filtered.forEach((e) => {
                const key = e.student_id;
                if (!byStudent[key])
                  byStudent[key] = {
                    name: e.student_name,
                    id: e.student_id,
                    modules: [],
                  };
                byStudent[key].modules.push(e);
              });

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-4"
                >
                  {/* Header + search + toggle */}
                  <div className="glass-card-static flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h2 className="section-title mb-0">Enrollments</h2>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {enrollments.length} total enrollment
                          {enrollments.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {/* View toggle */}
                      <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
                        {["module", "student"].map((v) => (
                          <button
                            key={v}
                            onClick={() => setEnrollView(v)}
                            className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors ${enrollView === v ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                          >
                            By {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search */}
                    <div style={{ position: "relative" }}>
                      <input
                        className="input"
                        placeholder="Search by student, module name or code…"
                        value={enrollSearch}
                        onChange={(e) => setEnrollSearch(e.target.value)}
                        style={{ paddingLeft: "2.5rem" }}
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          position: "absolute",
                          left: "0.75rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#64748b",
                          pointerEvents: "none",
                        }}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      {enrollSearch && (
                        <button
                          onClick={() => setEnrollSearch("")}
                          style={{
                            position: "absolute",
                            right: "0.75rem",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            fontSize: "1rem",
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BY MODULE view */}
                  {enrollView === "module" &&
                    (Object.keys(byModule).length === 0 ? (
                      <div className="glass-card-static text-center py-10 text-slate-500 text-sm">
                        No enrollments found.
                      </div>
                    ) : (
                      Object.values(byModule).map((mod) => (
                        <div key={mod.code} className="glass-card-static">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="badge badge-blue text-xs">
                              {mod.code}
                            </span>
                            <h3 className="font-semibold text-slate-200">
                              {mod.name}
                            </h3>
                            <span className="text-slate-500 text-xs ml-auto">
                              {mod.students.length} student
                              {mod.students.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {mod.students.map((e) => (
                              <div
                                key={e.id}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                              >
                                <span className="text-slate-300 text-sm">
                                  {e.student_name}
                                </span>
                                <button
                                  onClick={() =>
                                    handleUnenroll(
                                      e.id,
                                      e.student_name,
                                      mod.name,
                                    )
                                  }
                                  className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ))}

                  {/* BY STUDENT view */}
                  {enrollView === "student" &&
                    (Object.keys(byStudent).length === 0 ? (
                      <div className="glass-card-static text-center py-10 text-slate-500 text-sm">
                        No enrollments found.
                      </div>
                    ) : (
                      Object.values(byStudent).map((stu) => (
                        <div key={stu.id} className="glass-card-static">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-slate-200">
                              {stu.name}
                            </h3>
                            <span className="text-slate-500 text-xs ml-auto">
                              {stu.modules.length} module
                              {stu.modules.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {stu.modules.map((e) => (
                              <div
                                key={e.id}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20"
                              >
                                <span className="text-indigo-300 text-xs font-medium">
                                  {e.module_code}
                                </span>
                                <span className="text-slate-300 text-xs">
                                  {e.module_name}
                                </span>
                                <button
                                  onClick={() =>
                                    handleUnenroll(
                                      e.id,
                                      stu.name,
                                      e.module_name,
                                    )
                                  }
                                  className="text-slate-500 hover:text-red-400 transition-colors ml-1 text-xs leading-none"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ))}
                </motion.div>
              );
            })()}

          {/* ═══════ GROUPS ═══════ */}
          {activeSection === "groups" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create Group */}
                <div className="glass-card-static">
                  <h2 className="section-title flex items-center gap-2">
                    <GroupIcon size={18} className="text-blue-400" /> Create Group
                  </h2>
                  <form onSubmit={handleCreateGroup} className="flex flex-col gap-3">
                    <div>
                      <label className="label">Group Name</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. Group A"
                        value={groupForm.name}
                        onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Description (optional)</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. Morning cohort"
                        value={groupForm.description}
                        onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary w-full">
                      Create Group
                    </button>
                  </form>
                </div>

                {/* Group List */}
                <div className="glass-card-static flex flex-col gap-2">
                  <h2 className="section-title flex items-center gap-2">
                    <UsersIcon size={18} className="text-cyan-400" /> All Groups
                    <span className="ml-auto badge badge-blue">{groups.length}</span>
                  </h2>
                  {groups.length === 0 ? (
                    <p className="text-slate-500 text-sm">No groups yet. Create one to get started.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {groups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => handleSelectGroup(g)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-all duration-200 border ${
                            selectedGroup?.id === g.id
                              ? "bg-blue-500/10 border-blue-500/30 text-slate-100"
                              : "bg-white/[0.02] border-white/[0.05] text-slate-300 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{g.name}</div>
                            {g.description && (
                              <div className="text-xs text-slate-500 mt-0.5">{g.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            <span className="badge badge-blue text-xs">{g.member_count} student{g.member_count !== 1 ? "s" : ""}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }}
                              className="text-slate-600 hover:text-red-400 transition-colors"
                              title="Delete group"
                            >
                              <TrashIcon size={15} />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Group Member Management */}
              {selectedGroup && (
                <motion.div
                  key={selectedGroup.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card-static"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="section-title mb-0">
                      {selectedGroup.name} — Members
                    </h2>
                    <button
                      onClick={() => { setSelectedGroup(null); setGroupMembers([]); }}
                      className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* Add student */}
                  <form onSubmit={handleAddMember} className="flex gap-2 mb-5">
                    <select
                      className="input flex-1"
                      value={addMemberStudentId}
                      onChange={(e) => setAddMemberStudentId(e.target.value)}
                      required
                    >
                      <option value="">Select a student to add...</option>
                      {users
                        .filter((u) => u.role === "student" && !groupMembers.some((m) => m.id === u.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.email}
                          </option>
                        ))}
                    </select>
                    <button type="submit" className="btn btn-primary flex-shrink-0">
                      Add
                    </button>
                  </form>

                  {/* Member list */}
                  {groupMembers.length === 0 ? (
                    <p className="text-slate-500 text-sm">No students in this group yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {groupMembers.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-200">{m.name}</div>
                            <div className="text-xs text-slate-500">{m.email}</div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors ml-4 flex-shrink-0"
                            title="Remove from group"
                          >
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══════ ANALYTICS ═══════ */}
          {activeSection === "analytics" && analytics && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Records",
                    value: analytics.total_records,
                    color: "#60a5fa",
                  },
                  {
                    label: "Present",
                    value: analytics.total_present,
                    color: "#34d399",
                  },
                  {
                    label: "Late",
                    value: analytics.total_late,
                    color: "#fbbf24",
                  },
                  {
                    label: "Absent",
                    value: analytics.total_absent,
                    color: "#f87171",
                  },
                ].map((s, i) => (
                  <div key={i} className="glass-card text-center p-5">
                    <div
                      className="text-3xl font-extrabold mb-1"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                      {s.label}
                    </div>
                    {totalAtt > 0 && s.label !== "Total Records" && (
                      <div className="mt-3 h-1 rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            background: s.color,
                            width: `${(s.value / totalAtt) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Overall Rate */}
              <div className="glass-card-static text-center p-8">
                <h3 className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-4">
                  Overall Attendance Rate
                </h3>
                <div className="relative w-36 h-36 mx-auto">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    style={{ transform: "rotate(-90deg)" }}
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#adminGrad)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${analytics.attendance_rate * 2.64} ${264 - analytics.attendance_rate * 2.64}`}
                      style={{ transition: "stroke-dasharray 1s ease" }}
                    />
                    <defs>
                      <linearGradient
                        id="adminGrad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-extrabold text-slate-100">
                      {analytics.attendance_rate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Per-Module Breakdown */}
              {analytics.per_module && analytics.per_module.length > 0 && (
                <div className="glass-card-static">
                  <h2 className="section-title">Attendance by Module</h2>
                  <div className="flex flex-col gap-4">
                    {analytics.per_module.map((m, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-semibold text-slate-100">
                              {m.module_name}
                            </span>
                            <span className="ml-2 badge badge-blue">
                              {m.module_code}
                            </span>
                          </div>
                          <span
                            className="text-sm font-bold"
                            style={{
                              color:
                                m.attendance_rate >= 80
                                  ? "#34d399"
                                  : m.attendance_rate >= 60
                                    ? "#fbbf24"
                                    : "#f87171",
                            }}
                          >
                            {m.attendance_rate}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden flex">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${m.total > 0 ? (m.present / m.total) * 100 : 0}%`,
                              background:
                                "linear-gradient(90deg, #10b981, #34d399)",
                            }}
                          />
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${m.total > 0 ? (m.late / m.total) * 100 : 0}%`,
                              background:
                                "linear-gradient(90deg, #f59e0b, #fbbf24)",
                            }}
                          />
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${m.total > 0 ? (m.absent / m.total) * 100 : 0}%`,
                              background:
                                "linear-gradient(90deg, #ef4444, #f87171)",
                            }}
                          />
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                          <span>Present: {m.present}</span>
                          <span>Late: {m.late}</span>
                          <span>Absent: {m.absent}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chronic Absentees */}
              {analytics.chronic_absentees &&
                analytics.chronic_absentees.length > 0 && (
                  <div className="glass-card-static">
                    <h2 className="section-title flex items-center gap-2">
                      <span className="text-red-400">
                        <WarningIcon size={18} />
                      </span>{" "}
                      Chronic Absenteeism
                    </h2>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Absences</th>
                            <th>Total Records</th>
                            <th>Absence Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.chronic_absentees.map((s, i) => (
                            <tr key={i}>
                              <td className="font-medium text-slate-200">
                                {s.student_name}
                              </td>
                              <td>{s.student_email}</td>
                              <td>
                                <span className="badge badge-red">
                                  {s.absent_count}
                                </span>
                              </td>
                              <td>{s.total_records}</td>
                              <td>
                                <span className="font-bold text-red-400">
                                  {s.absence_rate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Export */}
              <div className="glass-card-static">
                <h3 className="font-bold text-slate-100 mb-0.5">
                  Export Attendance Report
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  Download a CSV file of attendance records. Filter by module,
                  group, or both — leave blank for all records.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="label">Filter by Module</label>
                    <select
                      className="input"
                      value={exportModuleId}
                      onChange={(e) => setExportModuleId(e.target.value)}
                    >
                      <option value="">All Modules</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.module_code} — {m.module_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Filter by Group</label>
                    <select
                      className="input"
                      value={exportGroupId}
                      onChange={(e) => setExportGroupId(e.target.value)}
                    >
                      <option value="">All Groups</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}{g.member_count ? ` (${g.member_count})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={exportCSV}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  Download CSV
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════ NOTIFICATIONS ═══════ */}
          {activeSection === "notifications" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              {/* Send Notification Form */}
              <div className="glass-card-static">
                <h2 className="section-title flex items-center gap-2">
                  <SendIcon size={18} className="text-blue-400" /> Send
                  Notification
                </h2>
                <form
                  onSubmit={handleSendNotification}
                  className="flex flex-col gap-3"
                >
                  <div>
                    <label className="label">Target Audience</label>
                    <select
                      className="input"
                      value={notifForm.target_role}
                      onChange={(e) =>
                        setNotifForm({
                          ...notifForm,
                          target_role: e.target.value,
                        })
                      }
                    >
                      <option value="student">Students Only</option>
                      <option value="staff">Staff Only</option>
                      <option value="all">Everyone (Staff & Students)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Title</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Notification title"
                      value={notifForm.title}
                      onChange={(e) =>
                        setNotifForm({ ...notifForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Message</label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Write your message here..."
                      value={notifForm.message}
                      onChange={(e) =>
                        setNotifForm({ ...notifForm, message: e.target.value })
                      }
                      required
                      style={{ resize: "vertical", minHeight: "80px" }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <SendIcon size={16} /> Send Notification
                  </button>
                </form>
              </div>

              {/* Sent Notifications List */}
              <div className="glass-card-static">
                <h2 className="section-title flex items-center gap-2">
                  <MegaphoneIcon size={18} className="text-cyan-400" /> Sent
                  Notifications ({notifications.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-100 text-sm">
                              {n.title}
                            </span>
                            {getTargetBadge(n.target_role)}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-slate-500 text-xs">
                              {format(new Date(n.created_at), "PPp")}
                            </span>
                            <button
                              onClick={() => handleDeleteNotification(n.id)}
                              title="Delete notification"
                              className="flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150"
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-400 text-sm">{n.message}</p>
                        <div className="text-xs text-slate-600 mt-2">
                          Sent by {n.sender_name || "Unknown"} (
                          {n.sender_role || "admin"})
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <BellIcon
                        size={32}
                        className="text-slate-600 mx-auto mb-3"
                      />
                      <p className="text-slate-500 text-sm">
                        No notifications sent yet.
                      </p>
                      <p className="text-slate-600 text-xs mt-1">
                        Use the form above to send your first notification.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════ LOCATION SETTINGS ═══════ */}
          {activeSection === "location" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              {/* Current location status card */}
              <div className="glass-card-static">
                <h2 className="section-title flex items-center gap-2">
                  <LocationPinIcon size={18} className="text-emerald-400" />{" "}
                  Campus Geofence
                </h2>
                {uniLocation ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Name", value: uniLocation.name || "—" },
                        {
                          label: "Radius",
                          value: `${uniLocation.radius_meters} m`,
                        },
                        {
                          label: "Latitude",
                          value: uniLocation.latitude?.toFixed(6),
                        },
                        {
                          label: "Longitude",
                          value: uniLocation.longitude?.toFixed(6),
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                        >
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                            {label}
                          </div>
                          <div className="text-slate-100 font-semibold text-sm">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${uniLocation.latitude},${uniLocation.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 text-xs underline underline-offset-2"
                    >
                      View on Google Maps ↗
                    </a>
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                      Students must be within{" "}
                      <strong>{uniLocation.radius_meters}m</strong> of this
                      point to check in as Present.
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <LocationPinIcon
                      size={32}
                      className="text-slate-600 mx-auto mb-3"
                    />
                    <p className="text-slate-500 text-sm">
                      No campus location set yet.
                    </p>
                    <p className="text-slate-600 text-xs mt-1">
                      Use the form below to configure the geofence.
                    </p>
                  </div>
                )}
              </div>

              {/* Edit form */}
              <div className="glass-card-static max-w-lg">
                <h2 className="section-title">
                  {uniLocation ? "Update Location" : "Set Campus Location"}
                </h2>
                <form
                  onSubmit={handleSaveLocation}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label className="label">Campus / Building Name</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Ulster University Belfast"
                      value={locationForm.name}
                      onChange={(e) =>
                        setLocationForm({
                          ...locationForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Location picker — address search or interactive map */}
                  <div>
                    <label className="label">Campus Location</label>
                    <LocationPicker
                      lat={locationForm.latitude}
                      lng={locationForm.longitude}
                      name={locationForm.name}
                      onChange={(lat, lng, pickedName) =>
                        setLocationForm((f) => ({
                          ...f,
                          latitude: lat,
                          longitude: lng,
                          ...(pickedName ? { name: pickedName } : {}),
                        }))
                      }
                    />
                  </div>

                  {/* Radius slider */}
                  <div>
                    <label className="label">
                      Allowed Radius —{" "}
                      <span className="text-blue-400 font-bold">
                        {locationForm.radius_meters} m
                      </span>
                    </label>
                    <input
                      type="range"
                      min="25"
                      max="500"
                      step="25"
                      value={locationForm.radius_meters}
                      onChange={(e) =>
                        setLocationForm({
                          ...locationForm,
                          radius_meters: parseInt(e.target.value),
                        })
                      }
                      style={{ width: "100%", accentColor: "#3b82f6" }}
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>25 m (strict)</span>
                      <span>500 m (loose)</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={
                      locationSaving ||
                      !locationForm.latitude ||
                      !locationForm.longitude
                    }
                    style={{
                      opacity:
                        locationSaving ||
                        !locationForm.latitude ||
                        !locationForm.longitude
                          ? 0.5
                          : 1,
                    }}
                  >
                    {locationSaving ? "Saving…" : "Save Campus Location"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ═══════ FORGOT PASSWORD ═══════ */}
          {activeSection === "forgot" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              {/* Pending requests */}
              <div className="glass-card-static">
                <h2 className="section-title flex items-center gap-2">
                  <KeyIcon size={18} className="text-yellow-400" />
                  Password Reset Requests ({resetRequests.length})
                </h2>

                {resetRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <KeyIcon
                      size={32}
                      className="text-slate-600 mx-auto mb-3"
                    />
                    <p className="text-slate-500 text-sm">
                      No pending password reset requests.
                    </p>
                    <p className="text-slate-600 text-xs mt-1">
                      Users can submit a request from the login page.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {resetRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-semibold text-slate-100">
                              {req.user_name || req.email}
                            </span>
                            <span className="text-slate-500 ml-2 text-sm">
                              {req.email}
                            </span>
                            {req.user_role && (
                              <span
                                className={`ml-2 badge ${req.user_role === "staff" ? "badge-blue" : "badge-green"}`}
                              >
                                {req.user_role}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 text-xs">
                            {new Date(req.requested_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="password"
                            className="input flex-1"
                            placeholder="Enter new password"
                            value={resetPasswordMap[req.id] || ""}
                            onChange={(e) =>
                              setResetPasswordMap((prev) => ({
                                ...prev,
                                [req.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={resettingId === req.id || !req.user_id}
                            onClick={() =>
                              handleResetPassword(req.user_id, req.id)
                            }
                          >
                            {resettingId === req.id
                              ? "Saving..."
                              : "Save Password"}
                          </button>
                        </div>
                        {!req.user_id && (
                          <p className="text-red-400 text-xs mt-2">
                            User account not found for this email.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual reset for any user */}
              <div className="glass-card-static max-w-md">
                <h2 className="section-title">Manual Password Reset</h2>
                <p className="text-slate-500 text-sm mb-4">
                  Reset any user's password directly without a request.
                </p>
                <ManualResetForm
                  users={users}
                  onReset={async (userId, newPassword) => {
                    try {
                      const res = await api.post("/admin/reset-password", {
                        user_id: userId,
                        new_password: newPassword,
                      });
                      showToast(
                        res.data.message || "Password reset successfully",
                      );
                      fetchResetRequests();
                      return true;
                    } catch (err) {
                      showToast(
                        err.response?.data?.detail ||
                          "Error resetting password",
                        "error",
                      );
                      return false;
                    }
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* ═══════ EMAIL REMINDERS ═══════ */}
          {activeSection === "email" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              <div className="glass-card-static max-w-xl">
                <h2 className="section-title">Email Lecture Reminders</h2>

                {/* Auto-send status banner */}
                <div className="flex items-start gap-3 mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span
                    className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                    style={{ marginTop: "6px" }}
                  />
                  <div>
                    <p className="text-emerald-300 text-sm font-semibold">
                      Auto-send is active
                    </p>
                    <p className="text-emerald-400/70 text-xs mt-0.5">
                      The server automatically emails enrolled students whenever
                      a lecture is within 24 hours. Emails run every 30 minutes
                      and each student is notified only once per lecture.
                    </p>
                  </div>
                </div>

                <p className="text-slate-400 text-sm mb-5">
                  You can also trigger a manual send below for a specific time
                  window.
                </p>

                {/* Time window picker */}
                <div className="mb-5">
                  <label className="label">
                    Send reminders for lectures starting within
                  </label>
                  <select
                    className="input mt-1"
                    value={emailHours}
                    onChange={(e) => setEmailHours(Number(e.target.value))}
                  >
                    <option value={1}>Next 1 hour</option>
                    <option value={3}>Next 3 hours</option>
                    <option value={6}>Next 6 hours</option>
                    <option value={12}>Next 12 hours</option>
                    <option value={24}>Next 24 hours</option>
                    <option value={48}>Next 48 hours</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary w-full"
                  disabled={emailSending}
                  onClick={async () => {
                    setEmailSending(true);
                    setEmailResult(null);
                    try {
                      const res = await api.post(
                        `/admin/email-reminders?hours_ahead=${emailHours}`,
                      );
                      setEmailResult({ ok: true, msg: res.data.message });
                    } catch (err) {
                      setEmailResult({
                        ok: false,
                        msg:
                          err.response?.data?.detail ||
                          "Failed to send emails.",
                      });
                    } finally {
                      setEmailSending(false);
                    }
                  }}
                >
                  {emailSending ? "Sending…" : "Send Reminder Emails"}
                </button>

                {emailResult && (
                  <div
                    className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${emailResult.ok ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
                  >
                    {emailResult.msg}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* ══ MOBILE BOTTOM BAR (Admin) ══ */}
      <div className="mobile-bottom-nav md:hidden bg-[rgba(10,10,20,0.95)] backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { id: "manage", icon: <SettingsIcon size={20} />, label: "Manage" },
            { id: "users", icon: <UsersIcon size={20} />, label: "Users" },
            {
              id: "notifications",
              icon: <BellIcon size={20} />,
              label: "Alerts",
            },
            {
              id: "analytics",
              icon: <ChartIcon size={20} />,
              label: "Analytics",
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-all duration-200 min-w-[4rem] ${activeSection === item.id ? "text-blue-400" : "text-slate-500"}`}
            >
              {item.icon}
              <span className="text-[0.6rem] font-medium">{item.label}</span>
            </button>
          ))}
          {/* More button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-all duration-200 min-w-[4rem] text-slate-500 hover:text-slate-300"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
            <span className="text-[0.6rem] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* ══ MOBILE MENU OVERLAY ══ */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={overlayStyle}
          onClick={() => setMobileMenuOpen(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="misched-sheet absolute bottom-0 left-0 right-0 bg-[rgba(10,10,24,0.98)] border-t border-white/[0.08] rounded-t-2xl px-4 pt-4"
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3 px-1">
              Navigation
            </p>
            <div className="grid grid-cols-2 gap-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left ${
                    activeSection === item.id
                      ? item.primary
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                        : "bg-white/[0.10] text-white"
                      : "text-slate-400 bg-white/[0.03] hover:bg-white/[0.07]"
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={overlayStyle}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-static w-full max-w-md"
          >
            <h2 className="section-title mb-4">Edit User</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEditSaving(true);
                try {
                  const res = await api.put(`/admin/users/${editUser.id}`, {
                    name: editUser.name,
                    email: editUser.email,
                    role: editUser.role,
                  });
                  setUsers((prev) =>
                    prev.map((u) => (u.id === editUser.id ? res.data : u)),
                  );
                  setEditUser(null);
                  showToast("User updated successfully");
                } catch (err) {
                  showToast(
                    err.response?.data?.detail || "Failed to update user",
                    "error",
                  );
                } finally {
                  setEditSaving(false);
                }
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={editUser.name}
                  onChange={(e) =>
                    setEditUser((u) => ({ ...u, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={editUser.email}
                  onChange={(e) =>
                    setEditUser((u) => ({ ...u, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={editUser.role}
                  onChange={(e) =>
                    setEditUser((u) => ({ ...u, role: e.target.value }))
                  }
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={editSaving}
                >
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setEditUser(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Delete User Confirm ── */}
      {deleteUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={overlayStyle}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-static w-full max-w-sm text-center"
          >
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                <TrashIcon size={22} />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-slate-100 mb-1">
              Delete User?
            </h2>
            <p className="text-slate-400 text-sm mb-5">
              <strong>{deleteConfirmName}</strong> will be permanently removed
              along with all their attendance records. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                className="btn flex-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                onClick={async () => {
                  try {
                    await api.delete(`/admin/users/${deleteUserId}`);
                    setUsers((prev) =>
                      prev.filter((u) => u.id !== deleteUserId),
                    );
                    showToast(`${deleteConfirmName} deleted`);
                  } catch (err) {
                    showToast(
                      err.response?.data?.detail || "Failed to delete user",
                      "error",
                    );
                  } finally {
                    setDeleteUserId(null);
                    setDeleteConfirmName("");
                  }
                }}
              >
                Delete
              </button>
              <button
                className="btn btn-secondary flex-1"
                onClick={() => {
                  setDeleteUserId(null);
                  setDeleteConfirmName("");
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Admin;
