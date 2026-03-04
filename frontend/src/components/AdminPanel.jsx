import React, { useState, useEffect, useCallback } from 'react';
import { api, getSSEUrl } from '../api';
import './AdminPanel.css';

const HOURS = [8, 10, 12, 14, 16, 18];
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CATEGORIES = ['manicuria', 'nail art', 'esculpidas', 'servicio'];

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMonday = (d) => {
  const date = new Date(d);
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
};

const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const statusConfig = {
  confirmed: { label: 'Confirmado' },
  cancelled: { label: 'Cancelado' },
  completed: { label: 'Completado' },
};

const AdminPanel = ({ onClose }) => {
  const [view, setView] = useState('week');
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({});
  const [updating, setUpdating] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [activeTab, setActiveTab] = useState('turnos');
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({ name: '', price: '', category: 'manicuria' });
  const [savingService, setSavingService] = useState(false);

  const fetchAll = useCallback(async () => {
    const [apptRes, statsRes] = await Promise.all([api.getAllAppointments(), api.getStats()]);
    if (apptRes.success) setAppointments(apptRes.data);
    if (statsRes.success) setStats(statsRes.data);
  }, []);

  const fetchServices = useCallback(async () => {
    const res = await api.getServices();
    if (res.success) setServices(res.data);
  }, []);

  useEffect(() => { fetchAll(); fetchServices(); }, [fetchAll, fetchServices]);

  useEffect(() => {
    let es, retryTimeout;
    const connect = () => {
      es = new EventSource(getSSEUrl());
      es.addEventListener('calendar_update', fetchAll);
      es.onerror = () => { es.close(); retryTimeout = setTimeout(connect, 5000); };
    };
    connect();
    return () => { es?.close(); clearTimeout(retryTimeout); };
  }, [fetchAll]);

  const handleStatus = async (id, status) => {
    setUpdating(id);
    const res = await api.updateStatus(id, status);
    await fetchAll();
    setUpdating(null);
    setSelectedAppt(res.success ? res.data : null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este turno permanentemente?')) return;
    setUpdating(id);
    await api.deleteAppointment(id);
    await fetchAll();
    setUpdating(null);
    setSelectedAppt(null);
  };

  const handleSaveService = async () => {
    if (!newService.name || !newService.price) return;
    setSavingService(true);
    await api.createService({ ...newService, price: parseInt(newService.price) });
    setNewService({ name: '', price: '', category: 'manicuria' });
    await fetchServices();
    setSavingService(false);
  };

  const handleUpdateService = async (id, data) => {
    await api.updateService(id, { ...data, price: parseInt(data.price) });
    setEditingService(null);
    await fetchServices();
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('¿Eliminar este servicio?')) return;
    await api.deleteService(id);
    await fetchServices();
  };

  const apptMap = {};
  appointments.forEach(a => {
    const key = typeof a.appointment_date === 'string' ? a.appointment_date.slice(0,10) : toDateStr(new Date(a.appointment_date));
    if (!apptMap[key]) apptMap[key] = {};
    apptMap[key][a.appointment_hour] = a;
  });

  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const today = new Date(); today.setHours(0,0,0,0);
  const weekLabel = () => {
    const to = addDays(weekStart, 5);
    return `${weekStart.getDate()} — ${to.getDate()} de ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  };

  const weekFrom = toDateStr(weekStart);
  const weekTo = toDateStr(addDays(weekStart, 5));
  const weekAppts = appointments
    .filter(a => {
      const d = typeof a.appointment_date === 'string' ? a.appointment_date.slice(0,10) : toDateStr(new Date(a.appointment_date));
      return d >= weekFrom && d <= weekTo;
    })
    .sort((a,b) => {
      const da = typeof a.appointment_date === 'string' ? a.appointment_date.slice(0,10) : toDateStr(new Date(a.appointment_date));
      const db = typeof b.appointment_date === 'string' ? b.appointment_date.slice(0,10) : toDateStr(new Date(b.appointment_date));
      return da.localeCompare(db) || a.appointment_hour - b.appointment_hour;
    });

  return (
    <div className="admin-overlay fade-in">
      <div className="admin-panel">

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

        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'turnos' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('turnos')}>
            Turnos
          </button>
          <button className={`admin-tab ${activeTab === 'servicios' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('servicios')}>
            Servicios del chatbot
          </button>
        </div>

        {activeTab === 'servicios' && (
          <div className="admin-body">
            <div className="admin-services">
              <div className="admin-services__form">
                <h3 className="admin-services__subtitle">Agregar servicio</h3>
                <div className="admin-services__row">
                  <input className="admin-services__input" placeholder="Nombre del servicio" value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} />
                  <input className="admin-services__input admin-services__input--price" placeholder="Precio" type="number" value={newService.price} onChange={e => setNewService(s => ({ ...s, price: e.target.value }))} />
                  <select className="admin-services__select" value={newService.category} onChange={e => setNewService(s => ({ ...s, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="admin-btn admin-btn--done" onClick={handleSaveService} disabled={savingService || !newService.name || !newService.price}>Agregar</button>
                </div>
              </div>
              <div className="admin-services__list">
                {services.map(s => (
                  <div key={s.id} className="admin-service-item">
                    {editingService?.id === s.id ? (
                      <div className="admin-services__row">
                        <input className="admin-services__input" value={editingService.name} onChange={e => setEditingService(v => ({ ...v, name: e.target.value }))} />
                        <input className="admin-services__input admin-services__input--price" type="number" value={editingService.price} onChange={e => setEditingService(v => ({ ...v, price: e.target.value }))} />
                        <select className="admin-services__select" value={editingService.category} onChange={e => setEditingService(v => ({ ...v, category: e.target.value }))}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button className="admin-btn admin-btn--done" onClick={() => handleUpdateService(s.id, editingService)}>Guardar</button>
                        <button className="admin-btn" onClick={() => setEditingService(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <div className="admin-service-item__info">
                          <span className="admin-service-item__cat">{s.category}</span>
                          <span className="admin-service-item__name">{s.name}</span>
                        </div>
                        <div className="admin-service-item__right">
                          <span className="admin-service-item__price">${parseInt(s.price).toLocaleString('es-AR')}</span>
                          <button className="admin-btn" onClick={() => setEditingService({ ...s })}>Editar</button>
                          <button className="admin-btn admin-btn--delete" onClick={() => handleDeleteService(s.id)}>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                              <path d="M1.5 3H11.5M4.5 3V2H8.5V3M4.5 5.5V9.5M8.5 5.5V9.5M2.5 3L3 11H10L10.5 3" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'turnos' && (
          <>
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
              {view === 'week' && (
                <div className="admin-grid">
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

              {view === 'list' && (
                <div className="admin-list">
                  {weekAppts.length === 0 ? (
                    <div className="admin-empty">No hay turnos esta semana</div>
                  ) : weekAppts.map(appt => {
                    const dateStr = typeof appt.appointment_date === 'string' ? appt.appointment_date.slice(0,10) : toDateStr(new Date(appt.appointment_date));
                    const d = new Date(dateStr + 'T12:00:00');
                    const h = appt.appointment_hour;
                    return (
                      <div key={appt.id} className={`admin-list-item admin-list-item--${appt.status}`} onClick={() => setSelectedAppt(appt)}>
                        <div className="admin-list-item__left">
                          <div className="admin-list-item__date">{DAY_NAMES[d.getDay()]} {d.getDate()}/{d.getMonth()+1}</div>
                          <div className="admin-list-item__time">{String(h).padStart(2,'0')}:00 – {String(h+2).padStart(2,'0')}:00</div>
                        </div>
                        <div className="admin-list-item__center">
                          <div className="admin-list-item__name">{appt.name}</div>
                          <div className="admin-list-item__wa">{appt.whatsapp}</div>
                        </div>
                        <span className={`admin-status admin-status--${appt.status}`}>{statusConfig[appt.status]?.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
                      const ds = typeof selectedAppt.appointment_date === 'string' ? selectedAppt.appointment_date.slice(0,10) : toDateStr(new Date(selectedAppt.appointment_date));
                      const d = new Date(ds + 'T12:00:00');
                      const h = selectedAppt.appointment_hour;
                      return `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth()+1} · ${String(h).padStart(2,'0')}:00`;
                    })()}
                  </span>
                  <span className={`admin-status admin-status--${selectedAppt.status}`}>{statusConfig[selectedAppt.status]?.label}</span>
                </div>
                <div className="admin-drawer__actions">
                  {selectedAppt.status === 'confirmed' && (
                    <button className="admin-btn admin-btn--done" disabled={updating === selectedAppt.id} onClick={() => handleStatus(selectedAppt.id, 'completed')}>Completar</button>
                  )}
                  {selectedAppt.status === 'confirmed' && (
                    <button className="admin-btn admin-btn--cancel" disabled={updating === selectedAppt.id} onClick={() => handleStatus(selectedAppt.id, 'cancelled')}>Cancelar</button>
                  )}
                  {selectedAppt.status === 'cancelled' && (
                    <button className="admin-btn admin-btn--call" disabled={updating === selectedAppt.id} onClick={() => handleStatus(selectedAppt.id, 'confirmed')}>Restaurar</button>
                  )}
                  <button className="admin-btn admin-btn--delete" disabled={updating === selectedAppt.id} onClick={() => handleDelete(selectedAppt.id)}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M1.5 3H11.5M4.5 3V2H8.5V3M4.5 5.5V9.5M8.5 5.5V9.5M2.5 3L3 11H10L10.5 3" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;