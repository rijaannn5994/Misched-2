import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotificationSSE } from '../hooks/useNotificationSSE';
import api from '../api';
import { format, isToday } from 'date-fns';
import {
  BookIcon, InboxIcon, BellIcon, SendIcon, MegaphoneIcon, CheckIcon, CalendarIcon, DoorIcon,
} from '../components/Icons';

const Staff = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const light = theme === 'light';
  const [activeTab, setActiveTab] = useState('today');
  const [lectures, setLectures] = useState([]);
  const [todayLectures, setTodayLectures] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [students, setStudents] = useState([]);
  const [toast, setToast] = useState(null);
  const [markingStudent, setMarkingStudent] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifForm, setNotifForm] = useState({ title: '', message: '', target_role: 'student' });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useNotificationSSE((notif) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notif.id)) return prev;
      return [notif, ...prev];
    });
    showToast(`🔔 ${notif.title}: ${notif.message}`);
  });

  const fetchLectures = useCallback(async () => {
    try {
      const [allRes, todayRes] = await Promise.all([
        api.get('/staff/lectures'),
        api.get('/staff/lectures/today'),
      ]);
      setLectures(allRes.data);
      setTodayLectures(todayRes.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate('/login');
    }
  }, [navigate]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/staff/notifications');
      setNotifications(res.data);
    } catch {}
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/staff/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  useEffect(() => {
    fetchLectures();
    fetchNotifications();
  }, [fetchLectures, fetchNotifications]);

  const selectLecture = async (lectureId) => {
    const lecture = [...todayLectures, ...lectures].find(l => l.id === lectureId);
    setSelectedLecture(lecture);
    try {
      const res = await api.get(`/staff/lecture/${lectureId}/students`);
      setStudents(res.data);
    } catch (err) {
      showToast('Error loading students', 'error');
    }
  };

  // ─── Geolocation Attendance Flow ───
  const markAttendance = async (studentId, status) => {
    if (!selectedLecture) return;
    setMarkingStudent(studentId);

    // Step 1: Check if Geolocation API is available
    if (!navigator.geolocation) {
      // FALLBACK: Geolocation not supported (older browsers)
      console.warn('Geolocation API not available — marking without GPS');
      await submitAttendance(studentId, status, null, null);
      return;
    }

    // Step 2: Request GPS coordinates
    navigator.geolocation.getCurrentPosition(
      // GPS ALLOWED
      async (position) => {
        const { latitude, longitude } = position.coords;
        await submitAttendance(studentId, status, latitude, longitude);
      },
      // GPS DENIED
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          showToast('Location access required. Please enable location permissions.', 'error');
          setMarkingStudent(null);
        } else {
          // Other GPS errors — use fallback
          console.warn('GPS error:', error.message, '— marking without GPS');
          submitAttendance(studentId, status, null, null);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submitAttendance = async (studentId, status, latitude, longitude) => {
    try {
      const res = await api.post('/attendance/mark', {
        student_id: studentId,
        lecture_id: selectedLecture.id,
        status: status,
        latitude: latitude,
        longitude: longitude,
      });

      // Update UI immediately
      setStudents(prev => prev.map(s =>
        s.id === studentId ? { ...s, attendance_status: status } : s
      ));

      const studentName = students.find(s => s.id === studentId)?.name || 'Student';
      showToast(`Marked ${studentName} as ${status.charAt(0).toUpperCase() + status.slice(1)}`);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Error marking attendance';
      showToast(detail, 'error');
    } finally {
      setMarkingStudent(null);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await api.post('/staff/notifications/send', notifForm);
      showToast('Alert sent to students');
      setNotifForm({ title: '', message: '', target_role: 'student' });
      fetchNotifications();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error sending alert', 'error');
    }
  };

  const getStatusStyle = (currentStatus, buttonStatus) => {
    const isActive = currentStatus === buttonStatus;
    const colors = {
      present: { bg: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-500/40', text: 'text-white' },
      late: { bg: 'from-amber-500 to-amber-600', ring: 'ring-amber-500/40', text: 'text-white' },
      absent: { bg: 'from-red-500 to-red-600', ring: 'ring-red-500/40', text: 'text-white' },
    };
    if (isActive) {
      return `bg-gradient-to-r ${colors[buttonStatus].bg} ${colors[buttonStatus].text} shadow-lg ring-2 ${colors[buttonStatus].ring}`;
    }
    return 'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08] hover:text-slate-200';
  };

  const staffNavItems = [
    { id: 'today',         icon: <BookIcon size={20} />,      label: 'Today' },
    { id: 'attendance',    icon: <CheckIcon size={20} />,     label: 'Attendance' },
    { id: 'schedule',      icon: <CalendarIcon size={20} />,  label: 'Schedule' },
    { id: 'notifications', icon: <BellIcon size={20} />,      label: 'Alerts',
      badge: notifications.filter(n => !n.is_read).length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen mobile-page-pad md:pb-8"
      style={{
        paddingTop: 'calc(3.75rem + env(safe-area-inset-top))',
        background: light
          ? 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 40%, #fdf4ff 100%)'
          : 'linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0d1b2a 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'} animate-slide-down`}>
            {toast.msg}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 md:px-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-100 mb-1">
          Staff <span className="gradient-text">Schedule</span>
        </h1>
        <p className="text-slate-500 text-sm">{getGreeting()}, {user?.name || 'Staff'}</p>
      </div>

      {/* Desktop tabs (hidden on mobile — uses bottom nav) */}
      <div className="hidden md:flex tabs mb-6">
        {[
          { id: 'today', label: "Today's Lectures" },
          { id: 'attendance', label: 'Mark Attendance' },
          { id: 'schedule', label: 'Full Schedule' },
          { id: 'notifications', label: 'Notifications',
            badge: notifications.filter(n => !n.is_read).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab relative ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{ position:'absolute', top:'4px', right:'4px', background:'#ef4444', color:'white', fontSize:'0.6rem', fontWeight:'700', borderRadius:'9999px', minWidth:'16px', height:'16px', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/*  TODAY'S LECTURES  */}
      {activeTab === 'today' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {todayLectures.length > 0 ? todayLectures.map(lec => (
            <div key={lec.id} className="glass-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
                  <BookIcon size={22} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-100 mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="badge badge-blue">{lec.module_code}</span>
                    <span className="truncate">{lec.module_name}</span>
                  </div>
                  <div className="text-slate-400 text-sm">
                    Room {lec.room_name} &bull; {format(new Date(lec.start_time), 'p')} – {format(new Date(lec.end_time), 'p')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setActiveTab('attendance'); setTimeout(() => selectLecture(lec.id), 100); }}
                className="btn btn-primary btn-sm w-full sm:w-auto flex-shrink-0"
              >
                Take Attendance
              </button>
            </div>
          )) : (
            <div className="glass-card-static text-center py-12">
              <InboxIcon size={36} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No lectures scheduled for today.</p>
            </div>
          )}
        </motion.div>
      )}

      {/*  MARK ATTENDANCE  */}
      {activeTab === 'attendance' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {/* Lecture selector */}
          <div className="glass-card-static">
            <label className="label">Select Lecture</label>
            <select
              className="input"
              onChange={(e) => selectLecture(parseInt(e.target.value))}
              value={selectedLecture?.id || ''}
            >
              <option value="" disabled>Choose a lecture</option>
              {lectures.map(l => (
                <option key={l.id} value={l.id}>
                  {l.module_code} — {l.module_name} — {format(new Date(l.start_time), 'PPp')}
                </option>
              ))}
            </select>
          </div>

          {/* Student roster */}
          {selectedLecture && (
            <div className="glass-card-static">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-100 mb-0.5">
                    {selectedLecture.module_code} — Attendance
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {format(new Date(selectedLecture.start_time), 'PPp')} &bull; Room {selectedLecture.room_name}
                  </p>
                </div>
                <span className="badge badge-blue">{students.length} student{students.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex flex-col gap-3">
                {students.map(s => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-sm font-bold text-blue-400 flex-shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 text-sm truncate">{s.name}</div>
                        <div className="text-slate-500 text-xs truncate">{s.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:flex-shrink-0">
                      {['present', 'late', 'absent'].map(status => (
                        <button
                          key={status}
                          onClick={() => markAttendance(s.id, status)}
                          disabled={markingStudent === s.id}
                          className={`flex-1 sm:flex-initial px-3 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${getStatusStyle(s.attendance_status, status)} ${markingStudent === s.id ? 'opacity-50' : ''}`}
                        >
                          {markingStudent === s.id && s.attendance_status !== status ? '…' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No students enrolled in this module</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/*  FULL SCHEDULE  */}
      {activeTab === 'schedule' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
          {lectures.length > 0 ? lectures.map(lec => {
            const isLecToday = isToday(new Date(lec.start_time));
            return (
              <div key={lec.id} className={`glass-card flex items-center justify-between ${isLecToday ? 'ring-1 ring-blue-500/30' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
                    <BookIcon size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 mb-0.5">
                      <span className="badge badge-blue mr-2">{lec.module_code}</span>
                      {lec.module_name}
                      {isLecToday && <span className="badge badge-green ml-2">Today</span>}
                    </div>
                    <div className="text-slate-400 text-sm">
                      Room {lec.room_name} &bull; {format(new Date(lec.start_time), 'EEEE, MMM d')} &bull; {format(new Date(lec.start_time), 'p')} - {format(new Date(lec.end_time), 'p')}
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="glass-card-static text-center py-12">
              <InboxIcon size={36} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No lectures assigned to you yet.</p>
            </div>
          )}
        </motion.div>
      )}

      {/*  NOTIFICATIONS  */}
      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          {/* Send Alert to Students */}
          <div className="glass-card-static">
            <h2 className="section-title flex items-center gap-2">
              <SendIcon size={18} className="text-blue-400" /> Send Alert to Students
            </h2>
            <form onSubmit={handleSendNotification} className="flex flex-col gap-3">
              <div>
                <label className="label">Title</label>
                <input className="input" type="text" placeholder="Alert title" value={notifForm.title} onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })} required />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea className="input" rows={3} placeholder="Write your alert message..." value={notifForm.message} onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })} required style={{ resize: 'vertical', minHeight: '80px' }} />
              </div>
              <button type="submit" className="btn btn-primary w-full flex items-center justify-center gap-2">
                <SendIcon size={16} /> Send Alert
              </button>
            </form>
          </div>

          {/* Received Notifications (from Admin) */}
          <div className="glass-card-static">
            <h2 className="section-title flex items-center gap-2">
              <MegaphoneIcon size={18} className="text-cyan-400" /> Received Notifications
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="badge badge-red text-[0.65rem]">{notifications.filter(n => !n.is_read).length} unread</span>
              )}
            </h2>
            <div className="flex flex-col gap-3">
              {notifications.length > 0 ? notifications.map(n => (
                <div key={n.id} className={`p-4 rounded-xl border transition-all duration-200 ${n.is_read ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-blue-500/[0.05] border-blue-500/20'}`}>
                  <div className="flex flex-col gap-1.5 mb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1" />}
                        <span className={`text-sm ${n.is_read ? 'font-medium text-slate-200' : 'font-semibold text-slate-100'}`}>{n.title}</span>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          title="Mark as read"
                          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[0.7rem] font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all duration-150"
                        >
                          <CheckIcon size={11} /> Read
                        </button>
                      )}
                    </div>
                    <span className="text-slate-500 text-xs ml-4">{format(new Date(n.created_at), 'PPp')}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{n.message}</p>
                  <div className="text-xs text-slate-600 mt-2 flex items-center gap-2">
                    From {n.sender_name || 'Unknown'}
                    <span className="badge badge-purple text-[0.6rem]">{n.sender_role || 'admin'}</span>
                    {n.is_read && <span className="text-slate-600">· Read</span>}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <BellIcon size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No notifications received yet.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      </div>{/* end max-w-5xl */}

      {/* ═══════ MOBILE BOTTOM NAV ═══════ */}
      <nav className="misched-bottom-nav mobile-bottom-nav md:hidden bg-[rgba(10,10,20,0.95)] backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around h-16 px-2">
          {staffNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-all duration-200 min-w-[4rem] ${
                activeTab === item.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-[0.6rem] font-medium">{item.label}</span>
              {item.badge > 0 && (
                <span style={{ position:'absolute', top:'2px', right:'6px', background:'#ef4444', color:'white', fontSize:'0.55rem', fontWeight:'700', borderRadius:'9999px', minWidth:'14px', height:'14px', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 2px' }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-all duration-200 min-w-[4rem] text-slate-500 hover:text-red-400"
          >
            <DoorIcon size={20} />
            <span className="text-[0.6rem] font-medium">Sign Out</span>
          </button>
        </div>
      </nav>
    </motion.div>
  );
};

export default Staff;