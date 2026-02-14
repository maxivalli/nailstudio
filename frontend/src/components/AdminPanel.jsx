import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import './AdminPanel.css';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
};

const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const statusConfig = {
  confirmed: { label: 'Confirmado', color: '#27ae60' },
  cancelled: { label: 'Cancelado', color: '#e74c3c' },
  completed: { label: 'Completado', color: '#8C7B6E' },
};

const AdminPanel = ({ onClose }) => {
  const [view, setView] = useState('week'); // 'week' | 'list'
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({});
  const [updating, setUpdating] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);

  const fetchAll = useCallback(async () => {
    const [apptRes, statsRes] = await Promise.all([
      api.getAllAppointments(),
      api.getStats(),
    ]);
    if (apptRes.success) setAppointments(apptRes.data);
    if (statsRes.success) setStats(statsRes.data);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // SSE
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.addEventListener('calendar_update', fetchAll);
    es.onerror = () => es.close();
    return () => es.close();
  }, [fetchAll]);

  const handleStatus = async (id, status) => {
    setUpdating(id);
    await api.updateStatus(id, status);
    await fetchAll();
    setUpdating(null);
    setSelectedAppt(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este turno permanentemente?')) return;
    setUpdating(id);
    await api.deleteAppointment(id);
    await fetchAll();
    setUpdating(null);
    setSelectedAppt(null);
  };

  // Build map: dateStr → hour → appointment
  const apptMap = {};
  appointments.forEach(a => {
    const key = typeof a.appointment_date === 'string'
      ? a.appointment_date.slice(0, 10)
      : toDateStr(new Date(a.appointment_date));
    if (!apptMap[key]) apptMap[key] = {};
    apptMap[key][a.appointment_hour] = a;
  });

  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const today = new Date(); today.setHours(0,0,0,0);

  const weekLabel = () => {
    const from = weekStart;
    const to = addDays(weekStart, 5);
    return `${from.getDate()} — ${to.getDate()} de ${MONTH_NAMES[from.getMonth()]} ${from.getFullYear()}`;
  };

  // List filtered to current week
  const weekFrom = toDateStr(weekStart);
  const weekTo = toDateStr(addDays(weekStart, 5));
  const weekAppts = appointments.filter(a => {
    const d = typeof a.appointment_date === 'string' ? a.appointment_date.slice(0,10) : toDateStr(new Date(a.appointment_date));
    return d >= weekFrom && d <= weekTo;
  }).sort((a,b) => {
    const da = (typeof a.appointment_date === 'string' ? a.appointment_date.slice(0,10) : toDateStr(new Date(a.appointment_date)));
    const db = (typeof b.appointment_date === 'string' ? b.appointment_date.slice(0,10) : toDateStr(new Date(b.appointment_date)));
    return da.localeCompare(db) || a.appointment_hour - b.appointment_hour;
  });

  return (
    <div className="admin-overlay fade-in">
      <div className="admin-panel">
        {/* Header */}
        <div className="admin-panel__header">
          <div>
            <div className="admin-panel__eyebrow">Panel de</div>
            <h2 className="admin-panel__title">Administración</h2>
          </div>
          <button className="admin-panel__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3L15 15M15 3L3 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat__n admin-stat__n--green">{stats.today_confirmed || 0}</span>
            <span className="admin-stat__l">Hoy</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__n">{stats.upcoming || 0}</span>
            <span className="admin-stat__l">Próximos</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__n">{stats.total_completed || 0}</span>
            <span className="admin-stat__l">Completados</span>
          </div>
        </div>

        {/* Week nav */}
        <div className="admin-week-nav">
          <button className="bc-nav-btn" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="admin-week-nav__label">{weekLabel()}</span>
          <button className="bc-nav-btn" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          {/* Toggle view */}
          <div className="admin-view-toggle">
            <button className={`admin-view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="0.5" y="0.5" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                <rect x="8.5" y="0.5" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                <rect x="0.5" y="8.5" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                <rect x="8.5" y="8.5" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </button>
            <button className={`admin-view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1 2.5H12M1 6.5H12M1 10.5H12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="admin-body">
          {/* Week grid view */}
          {view === 'week' && (
            <div className="admin-grid">
              {/* Column headers */}
              <div className="admin-grid__corner" />
              {days.map(day => {
                const dateStr = toDateStr(day);
                const isToday = day.getTime() === today.getTime();
                return (
                  <div key={dateStr} className={`admin-grid__day-header ${isToday ? 'admin-grid__day-header--today' : ''}`}>
                    <span className="admin-grid__day-name">{DAY_NAMES[day.getDay()]}</span>
                    <span className="admin-grid__day-num">{day.getDate()}</span>
                  </div>
                );
              })}

              {/* Hour rows */}
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="admin-grid__hour">{String(hour).padStart(2,'0')}:00</div>
                  {days.map(day => {
                    const dateStr = toDateStr(day);
                    const appt = apptMap[dateStr]?.[hour];
                    const isPastSlot = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:00:00`) < new Date();

                    return (
                      <div
                        key={`${dateStr}-${hour}`}
                        className={`admin-grid__cell ${isPastSlot ? 'admin-grid__cell--past' : ''} ${appt ? `admin-grid__cell--${appt.status}` : ''}`}
                        onClick={() => appt && setSelectedAppt(appt)}
                      >
                        {appt && (
                          <div className="admin-cell-appt">
                            <span className="admin-cell-appt__name">{appt.name}</span>
                            <span className="admin-cell-appt__wa">{appt.whatsapp}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* List view */}
          {view === 'list' && (
            <div className="admin-list">
              {weekAppts.length === 0 ? (
                <div className="admin-empty">No hay turnos esta semana</div>
              ) : weekAppts.map(appt => {
                const dateStr = typeof appt.appointment_date === 'string'
                  ? appt.appointment_date.slice(0,10)
                  : toDateStr(new Date(appt.appointment_date));
                const d = new Date(dateStr + 'T12:00:00');
                const h = appt.appointment_hour;
                return (
                  <div
                    key={appt.id}
                    className={`admin-list-item admin-list-item--${appt.status}`}
                    onClick={() => setSelectedAppt(appt)}
                  >
                    <div className="admin-list-item__left">
                      <div className="admin-list-item__date">
                        {DAY_NAMES[d.getDay()]} {d.getDate()}/{d.getMonth()+1}
                      </div>
                      <div className="admin-list-item__time">
                        {String(h).padStart(2,'0')}:00 – {String(h+1).padStart(2,'0')}:00
                      </div>
                    </div>
                    <div className="admin-list-item__center">
                      <div className="admin-list-item__name">{appt.name}</div>
                      <div className="admin-list-item__wa">{appt.whatsapp}</div>
                    </div>
                    <span className={`admin-status admin-status--${appt.status}`}>
                      {statusConfig[appt.status]?.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail drawer */}
        {selectedAppt && (
          <div className="admin-drawer fade-in">
            <div className="admin-drawer__header">
              <div className="admin-drawer__title">{selectedAppt.name}</div>
              <button className="admin-drawer__close" onClick={() => setSelectedAppt(null)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="admin-drawer__info">
              <span>{selectedAppt.whatsapp}</span>
              <span>
                {(() => {
                  const ds = typeof selectedAppt.appointment_date === 'string'
                    ? selectedAppt.appointment_date.slice(0,10) : toDateStr(new Date(selectedAppt.appointment_date));
                  const d = new Date(ds + 'T12:00:00');
                  const h = selectedAppt.appointment_hour;
                  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth()+1} · ${String(h).padStart(2,'0')}:00`;
                })()}
              </span>
              <span className={`admin-status admin-status--${selectedAppt.status}`}>
                {statusConfig[selectedAppt.status]?.label}
              </span>
            </div>
            <div className="admin-drawer__actions">
              {selectedAppt.status === 'confirmed' && (
                <button
                  className="admin-btn admin-btn--done"
                  disabled={updating === selectedAppt.id}
                  onClick={() => handleStatus(selectedAppt.id, 'completed')}
                >Completar</button>
              )}
              {selectedAppt.status === 'confirmed' && (
                <button
                  className="admin-btn admin-btn--cancel"
                  disabled={updating === selectedAppt.id}
                  onClick={() => handleStatus(selectedAppt.id, 'cancelled')}
                >Cancelar</button>
              )}
              {selectedAppt.status === 'cancelled' && (
                <button
                  className="admin-btn admin-btn--call"
                  disabled={updating === selectedAppt.id}
                  onClick={() => handleStatus(selectedAppt.id, 'confirmed')}
                >Restaurar</button>
              )}
              <button
                className="admin-btn admin-btn--delete"
                disabled={updating === selectedAppt.id}
                onClick={() => handleDelete(selectedAppt.id)}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1.5 3H11.5M4.5 3V2H8.5V3M4.5 5.5V9.5M8.5 5.5V9.5M2.5 3L3 11H10L10.5 3" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
