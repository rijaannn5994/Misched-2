import React, { useState, useEffect, useRef } from 'react';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00',
];

function fmt24to12(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  // 0=Sun..6=Sat → convert to Mon=0..Sun=6
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

export default function DateTimePicker({ value, timeValue, onConfirm, onCancel, label }) {
  const today = new Date();
  const initDate = value ? new Date(value + 'T00:00:00') : null;

  const [viewYear, setViewYear] = useState(initDate ? initDate.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate ? initDate.getMonth() : today.getMonth());
  const [selDate, setSelDate] = useState(value || '');
  const [selTime, setSelTime] = useState(timeValue || '');
  const [open, setOpen] = useState(false);
  const timeRef = useRef(null);
  const wrapRef = useRef(null);

  // Scroll selected time into view when picker opens
  useEffect(() => {
    if (open && timeRef.current) {
      timeRef.current.scrollIntoView({ block: 'center' });
    }
  }, [open, selTime]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const handleDay = (day) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelDate(d);
  };

  const handleConfirm = () => {
    if (!selDate || !selTime) return;
    onConfirm(selDate, selTime);
    setOpen(false);
  };

  const displayValue = selDate && selTime
    ? `${new Date(selDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${fmt24to12(selTime)}`
    : selDate
      ? new Date(selDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      {/* Trigger field */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.55rem 0.85rem',
          borderRadius: '0.6rem',
          border: open ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          color: displayValue ? '#e2e8f0' : '#64748b',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {displayValue || `Pick ${label || 'date & time'}…`}
      </div>

      {/* Popup */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 9999,
          background: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          width: '480px',
          maxWidth: '95vw',
        }}>
          <div style={{ display: 'flex' }}>
            {/* ── Calendar ── */}
            <div style={{ flex: 1, padding: '1.25rem' }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <button type="button" onClick={prevMonth} style={navBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button type="button" onClick={nextMonth} style={navBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.4rem' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', padding: '0.2rem 0' }}>{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selDate === dateStr;
                  const isToday = dateStr === today.toISOString().slice(0, 10);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDay(day)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '50%',
                        border: 'none',
                        background: isSelected ? '#6366f1' : 'transparent',
                        color: isSelected ? '#fff' : isToday ? '#6366f1' : '#1e293b',
                        fontWeight: isSelected || isToday ? '700' : '500',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {day}
                      {isToday && !isSelected && (
                        <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#6366f1', display: 'block' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Time list ── */}
            <div style={{
              width: '120px', borderLeft: '1px solid #f1f5f9',
              overflowY: 'auto', maxHeight: '300px',
              padding: '0.5rem 0',
            }}>
              {TIME_SLOTS.map(slot => {
                const isActive = selTime === slot;
                return (
                  <div
                    key={slot}
                    ref={isActive ? timeRef : null}
                    onClick={() => setSelTime(slot)}
                    style={{
                      padding: '0.55rem 1rem',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? '700' : '500',
                      color: isActive ? '#6366f1' : '#475569',
                      background: isActive ? '#eef2ff' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {fmt24to12(slot)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
          }}>
            <button
              type="button"
              onClick={() => { onCancel?.(); setOpen(false); }}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: '0.6rem',
                border: '1px solid #e2e8f0', background: '#fff',
                color: '#475569', fontSize: '0.82rem', fontWeight: '600',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >Cancel</button>
            <div style={{
              flex: 1, padding: '0.5rem 0.85rem', borderRadius: '0.6rem',
              border: '1px solid #e2e8f0', background: '#fff',
              color: selDate ? '#1e293b' : '#94a3b8', fontSize: '0.82rem', fontWeight: '500',
              textAlign: 'center',
            }}>
              {selDate
                ? new Date(selDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'No date selected'}
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selDate || !selTime}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: '0.6rem',
                border: 'none',
                background: selDate && selTime ? '#6366f1' : '#c7d2fe',
                color: '#fff', fontSize: '0.82rem', fontWeight: '700',
                cursor: selDate && selTime ? 'pointer' : 'not-allowed',
                fontFamily: "'Inter', sans-serif",
                boxShadow: selDate && selTime ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >Schedule</button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = {
  background: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: '0.5rem', width: '2rem', height: '2rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#475569', padding: 0,
  transition: 'all 0.12s ease',
};
