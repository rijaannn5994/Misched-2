import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotificationSSE } from '../hooks/useNotificationSSE';
import api from '../api';
import { format, isTomorrow, isFuture, isToday } from 'date-fns';
import {
  ClipboardIcon, ProfileIcon, HomeIcon, BellIcon, DoorIcon,
  CalendarIcon, WarningIcon, LocationPinIcon, CheckIcon,
} from '../components/Icons';

const Student = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const light = theme === 'light';
  const [activeView, setActiveView] = useState('home');
  const [lectures, setLectures] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [modules, setModules] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [studentGroups, setStudentGroups] = useState([]);
  const [checkingIn, setCheckingIn] = useState(null);       // lecture id being processed
  const [checkinResults, setCheckinResults] = useState({}); // lectureId → { ok, msg }
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useNotificationSSE((notif) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notif.id)) return prev;
      return [notif, ...prev];
    });
    showToast(`🔔 ${notif.title}: ${notif.message}`, 'info');
  });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchData = useCallback(async () => {
    try {
      const [timetableRes, attendanceRes, modulesRes] = await Promise.all([
        api.get('/student/timetable'),
        api.get('/student/attendance'),
        api.get('/student/modules'),
      ]);
      const lectureData = timetableRes.data;
      setLectures(lectureData);
      setAttendance(attendanceRes.data);
      setModules(modulesRes.data);

      // Pre-populate check-in results — only from verified on-campus check-ins or absent records
      const statusMsg = { present: 'Checked in as present.', late: 'Checked in as late.', absent: 'Marked absent — you were not on campus.' };
      const preloaded = {};
      lectureData.forEach(lec => {
        if (lec.checkin_status && lec.checkin_verified) {
          preloaded[lec.id] = { status: lec.checkin_status, msg: statusMsg[lec.checkin_status] || lec.checkin_status };
        }
      });
      setCheckinResults(preloaded);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate('/login');
    }
  }, [navigate]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/student/notifications');
      setNotifications(res.data);
    } catch {}
  }, []);

  const fetchStudentGroups = useCallback(async () => {
    try {
      const res = await api.get('/student/groups');
      setStudentGroups(res.data);
    } catch {}
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/student/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  useEffect(() => {
    fetchData();
    fetchNotifications();
    fetchStudentGroups();
  }, [fetchData, fetchNotifications, fetchStudentGroups]);

  const upcomingLectures = lectures.filter(l => {
    const start = new Date(l.start_time);
    return isFuture(start) || isToday(start);
  });

  const tomorrowLectures = lectures.filter(l => isTomorrow(new Date(l.start_time)));

  const totalAttendance = attendance ? (attendance.present + attendance.late + attendance.absent) : 0;
  const attendanceRate = totalAttendance > 0
    ? Math.round(((attendance.present + attendance.late) / totalAttendance) * 100)
    : 0;

  const handleCheckin = (lectureId) => {
    if (!navigator.geolocation) {
      setCheckinResults((r) => ({ ...r, [lectureId]: { ok: false, msg: 'Geolocation not supported by your browser.' } }));
      return;
    }
    setCheckingIn(lectureId);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post('/student/checkin', {
            lecture_id: lectureId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setCheckinResults((r) => ({ ...r, [lectureId]: { status: res.data.status, msg: res.data.message } }));
          fetchData();
        } catch (err) {
          const detail = err.response?.data?.detail || 'Check-in failed.';
          setCheckinResults((r) => ({ ...r, [lectureId]: { status: 'error', msg: detail } }));
        } finally {
          setCheckingIn(null);
        }
      },
      () => {
        setCheckinResults((r) => ({ ...r, [lectureId]: { status: 'error', msg: 'Location access denied. Allow it in your browser settings.' } }));
        setCheckingIn(null);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  // Bottom nav items with SVG icons
  const navItems = [
    { id: 'schedule', icon: <ClipboardIcon size={20} />, label: 'Schedule' },
    { id: 'profile', icon: <ProfileIcon size={20} />, label: 'Profile' },
    { id: 'home', icon: <HomeIcon size={20} />, label: 'Home' },
    { id: 'notifications', icon: <BellIcon size={20} />, label: 'Alerts' },
    { id: 'signout', icon: <DoorIcon size={20} />, label: 'Sign Out' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen mobile-page-pad md:pb-0"
      style={{
        paddingTop: 'calc(3.75rem + env(safe-area-inset-top))',
        background: light
          ? 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 40%, #fdf4ff 100%)'
          : 'linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0d1b2a 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Real-time notification toast */}
      {toast && (
        <div className="toast-container">
          <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'} animate-slide-down`}>
            {toast.msg}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-extrabold text-slate-100 mb-1">
            Student <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-slate-500 text-sm">{getGreeting()}, {user?.name || 'Student'}.</p>
        </motion.div>

        {/* ═══ Desktop Tab Navigation (hidden on mobile — uses bottom nav instead) ═══ */}
        <div className="hidden md:flex items-center gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
          {[
            { id: 'home', icon: <HomeIcon size={16} />, label: 'Home' },
            { id: 'schedule', icon: <ClipboardIcon size={16} />, label: 'Schedule' },
            { id: 'notifications', icon: <BellIcon size={16} />, label: 'Notifications', badge: notifications.filter(n => !n.is_read).length },
            { id: 'profile', icon: <ProfileIcon size={16} />, label: 'Profile' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeView === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.6rem',
                  fontWeight: '700',
                  borderRadius: '9999px',
                  minWidth: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
          >
            <DoorIcon size={16} /> Sign Out
          </button>
        </div>

        {/* Reminder Banner */}
        {tomorrowLectures.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="alert alert-warning mb-6"
          >
            <span className="text-lg flex-shrink-0"><BellIcon size={20} /></span>
            <span>
              <strong>Lecture Reminder:</strong> You have {tomorrowLectures.length} lecture{tomorrowLectures.length > 1 ? 's' : ''} scheduled for tomorrow. Don't forget to attend!
            </span>
          </motion.div>
        )}

        {/* ═══════ HOME VIEW ═══════ */}
        {activeView === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Your Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-4"
            >
              <div className="glass-card-static">
                <h2 className="section-title">Your Schedule</h2>
                <div className="flex flex-col gap-3">
                  {upcomingLectures.length > 0 ? upcomingLectures.slice(0, 8).map(lec => {
                    const lecIsToday = isToday(new Date(lec.start_time));
                    const now = new Date();
                    const active = now >= new Date(lec.start_time) && now <= new Date(lec.end_time);
                    const result = checkinResults[lec.id];
                    return (
                      <div key={lec.id} className={`p-3.5 rounded-xl bg-white/[0.02] border transition-all duration-200 hover:bg-white/[0.04] ${active ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' : lecIsToday ? 'border-blue-500/20 ring-1 ring-blue-500/10' : 'border-white/[0.04]'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="badge badge-blue">{lec.module_code}</span>
                            {active && <span className="badge badge-green text-[0.65rem]">Live Now</span>}
                            {!active && lecIsToday && <span className="badge text-[0.65rem]" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>Today</span>}
                          </div>
                          <span className="text-slate-500 text-xs">Room {lec.room_name}</span>
                        </div>
                        <div className="text-slate-200 font-medium text-sm mb-1">{lec.module_name}</div>
                        <div className="text-slate-400 text-xs">
                          {format(new Date(lec.start_time), 'EEEE, MMM d')} &bull; {format(new Date(lec.start_time), 'p')} - {format(new Date(lec.end_time), 'p')}
                        </div>
                        {lec.staff_name && (
                          <div className="text-slate-500 text-xs mt-1">Lecturer: {lec.staff_name}</div>
                        )}

                        {/* Check-in button — only for live lectures not yet successfully checked in */}
                        {active && result?.status !== 'present' && result?.status !== 'late' && (
                          <button
                            onClick={() => handleCheckin(lec.id)}
                            disabled={checkingIn === lec.id}
                            className="mt-2.5 w-full btn btn-success btn-sm flex items-center justify-center gap-1.5"
                            style={{ opacity: checkingIn === lec.id ? 0.7 : 1 }}
                          >
                            <LocationPinIcon size={14} />
                            {checkingIn === lec.id ? 'Getting location…' : 'Check In with Location'}
                          </button>
                        )}
                        {result && (
                          <div className={`mt-2.5 p-2 rounded-lg text-xs font-medium ${
                            result.status === 'present' || result.status === 'late'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : result.status === 'absent'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-300 border border-red-500/20'
                          }`}>
                            {result.msg}
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="text-center py-8">
                      <CalendarIcon size={28} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No lectures are scheduled for your modules at this time.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Enrolled Modules */}
              <div className="glass-card-static">
                <h2 className="section-title">Enrolled Modules</h2>
                {modules.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {modules.map(m => (
                      <span key={m.id} className="badge badge-blue text-xs px-3 py-1.5">
                        {m.module_name} ({m.module_code})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">You are not enrolled in any modules yet.</p>
                )}
              </div>
            </motion.div>

            {/* RIGHT: Attendance Profile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* Attendance Rate Circle */}
              <div className="glass-card-static text-center">
                <h2 className="section-title text-left">Attendance Profile</h2>
                <div className="relative w-36 h-36 mx-auto my-4">
                  <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="url(#studentGrad)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${attendanceRate * 2.64} ${264 - attendanceRate * 2.64}`}
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                    <defs>
                      <linearGradient id="studentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-extrabold text-slate-100">{attendanceRate}%</span>
                    <span className="text-[0.65rem] text-slate-500 uppercase tracking-wider">Overall</span>
                  </div>
                </div>
                {attendanceRate < 70 && totalAttendance > 0 && (
                  <p className="text-amber-400 text-xs mt-2 font-medium flex items-center justify-center gap-1">
                    <WarningIcon size={14} /> Your attendance is below 70%. Consider attending more lectures to avoid academic penalties.
                  </p>
                )}
              </div>

              {/* Stat Cards */}
              {attendance && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass-card text-center p-4">
                    <div className="text-2xl font-extrabold text-emerald-400">{attendance.present}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Present</div>
                  </div>
                  <div className="glass-card text-center p-4">
                    <div className="text-2xl font-extrabold text-amber-400">{attendance.late}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Late</div>
                  </div>
                  <div className="glass-card text-center p-4">
                    <div className="text-2xl font-extrabold text-red-400">{attendance.absent}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Absent</div>
                  </div>
                </div>
              )}

              {/* Breakdown Bar */}
              {totalAttendance > 0 && attendance && (
                <div className="glass-card-static">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Breakdown</h3>
                  <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden flex">
                    <div className="h-full transition-all duration-500" style={{ width: `${(attendance.present / totalAttendance) * 100}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
                    <div className="h-full transition-all duration-500" style={{ width: `${(attendance.late / totalAttendance) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
                    <div className="h-full transition-all duration-500" style={{ width: `${(attendance.absent / totalAttendance) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)' }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>Present {Math.round((attendance.present / totalAttendance) * 100)}%</span>
                    <span>Late {Math.round((attendance.late / totalAttendance) * 100)}%</span>
                    <span>Absent {Math.round((attendance.absent / totalAttendance) * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Per-Module Attendance */}
              {attendance?.per_module && attendance.per_module.length > 0 && (
                <div className="glass-card-static">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">By Module</h3>
                  <div className="flex flex-col gap-3">
                    {attendance.per_module.map((m, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{m.module_name}</span>
                            <span className="badge badge-blue text-[0.6rem]">{m.module_code}</span>
                          </div>
                          <span className="text-sm font-bold" style={{
                            color: m.attendance_rate >= 80 ? '#34d399' : m.attendance_rate >= 60 ? '#fbbf24' : '#f87171'
                          }}>
                            {m.attendance_rate}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden flex">
                          <div className="h-full" style={{ width: `${m.total > 0 ? (m.present / m.total * 100) : 0}%`, background: '#10b981' }} />
                          <div className="h-full" style={{ width: `${m.total > 0 ? (m.late / m.total * 100) : 0}%`, background: '#f59e0b' }} />
                          <div className="h-full" style={{ width: `${m.total > 0 ? (m.absent / m.total * 100) : 0}%`, background: '#ef4444' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ═══════ SCHEDULE VIEW ═══════ */}
        {activeView === 'schedule' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="glass-card-static">
              <h2 className="section-title">Full Schedule</h2>
              {lectures.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {lectures.map(lec => (
                    <div key={lec.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="badge badge-blue">{lec.module_code}</span>
                        <span className="text-slate-500 text-xs">Room {lec.room_name}</span>
                      </div>
                      <div className="text-slate-200 font-medium text-sm">{lec.module_name}</div>
                      <div className="text-slate-400 text-xs mt-1">
                        {format(new Date(lec.start_time), 'EEEE, MMM d, yyyy')} &bull; {format(new Date(lec.start_time), 'p')} - {format(new Date(lec.end_time), 'p')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon size={28} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No lectures are scheduled for your modules at this time.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/*  NOTIFICATIONS VIEW  */}
        {activeView === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass-card-static">
              <h2 className="section-title flex items-center gap-2">
                <BellIcon size={18} className="text-blue-400" /> Notifications
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
                      <span className={`badge text-[0.6rem] ${n.sender_role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>{n.sender_role || 'admin'}</span>
                      {n.is_read && <span className="text-slate-600">· Read</span>}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <BellIcon size={32} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No notifications at this time.</p>
                    <p className="text-slate-600 text-xs mt-1">You'll see alerts from your lecturers and administrators here.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/*  PROFILE VIEW  */}
        {activeView === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass-card-static max-w-md">
              <h2 className="section-title">Profile</h2>
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Name</div>
                  <div className="text-slate-200 font-medium">{user?.name}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</div>
                  <div className="text-slate-200 font-medium">{user?.email}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Role</div>
                  <div className="text-slate-200 font-medium capitalize">{user?.role}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Enrolled Modules</div>
                  <div className="text-slate-200 font-medium">{modules.length}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">My Groups</div>
                  {studentGroups.length === 0 ? (
                    <div className="text-slate-500 text-sm">Not assigned to any group yet</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {studentGroups.map((g) => (
                        <span
                          key={g.id}
                          className="badge badge-blue text-xs"
                          title={g.description || undefined}
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/*  BOTTOM NAVIGATION BAR (Mobile)  */}
      <nav className="misched-bottom-nav mobile-bottom-nav md:hidden bg-[rgba(10,10,20,0.95)] backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => item.id === 'signout' ? handleSignOut() : setActiveView(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-all duration-200 ${
                activeView === item.id
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-[0.6rem] font-medium">{item.label}</span>
              {item.id === 'notifications' && notifications.filter(n => !n.is_read).length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '6px',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.55rem',
                  fontWeight: '700',
                  borderRadius: '9999px',
                  minWidth: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 2px',
                }}>
                  {notifications.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </motion.div>
  );
};

export default Student;