import React, { useState, useEffect, useCallback } from "react";
import { api, getAdminSSEUrl } from "../api";
import "./AdminPanel.css";

const HOURS = [8, 10, 12, 14, 16, 18]; // Turnos de 2 horas
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const statusConfig = {
  confirmed: { label: "Confirmado", color: "#27ae60" },
  cancelled: { label: "Cancelado", color: "#e74c3c" },
  completed: { label: "Completado", color: "#8C7B6E" },
};

const AdminPanel = ({ onClose }) => {
  const [view, setView] = useState("week"); // 'week' | 'list'
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({});
  const [updating, setUpdating] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [activeTab, setActiveTab] = useState("turnos"); // 'turnos' | 'servicios'
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null); // {id, name, price, category} | null
  const [newService, setNewService] = useState({
    name: "",
    price: "",
    category: "manicuria",
  });
  const [savingService, setSavingService] = useState(false);

  // Analytics state
  const [serviceStats, setServiceStats] = useState([]);
  const [frequentClients, setFrequentClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientHistory, setClientHistory] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);

  const fetchServices = useCallback(async () => {
    const res = await api.getServices();
    if (res.success) setServices(res.data);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleSaveService = async () => {
    if (!newService.name) return;
    setSavingService(true);
    await api.createService({
      ...newService,
      price: newService.price !== "" && newService.price !== null ? parseInt(newService.price) : null,
    });
    setNewService({ name: "", price: "", category: "manicuria" });
    await fetchServices();
    setSavingService(false);
  };

  const handleUpdateService = async (id, data) => {
    const normalized = {
      ...data,
      price: data.price !== "" && data.price !== null && data.price !== undefined
        ? parseInt(data.price) || null
        : null,
    };
    await api.updateService(id, normalized);
    setEditingService(null);
    await fetchServices();
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm("¿Eliminar este servicio?")) return;
    await api.deleteService(id);
    await fetchServices();
  };

  const fetchAll = useCallback(async () => {
    const [apptRes, statsRes] = await Promise.all([
      api.getAllAppointments(),
      api.getStats(),
    ]);
    if (apptRes.success) setAppointments(apptRes.data);
    if (statsRes.success) setStats(statsRes.data);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // SSE con reconexión automática
  useEffect(() => {
    let es;
    let retryTimeout;

    const connect = () => {
      const sseUrl = getAdminSSEUrl();
      // Si no hay token (sesión expirada o logout), no reintentar
      if (!sseUrl) return;
      es = new EventSource(sseUrl);
      es.addEventListener("calendar_update", (e) => {
        fetchAll();
        // Invalidar analytics para que se refresquen la próxima vez que se abra el tab
        setServiceStats([]);
        setFrequentClients([]);
      });
      es.onerror = () => {
        es.close();
        // Solo reintentar si aún hay token válido
        if (getAdminSSEUrl()) {
          retryTimeout = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      if (es) es.close();
      clearTimeout(retryTimeout);
    };
  }, [fetchAll]);

  const loadAnalytics = useCallback(async () => {
    // Siempre recarga al abrir el tab (los datos se invalidan via SSE calendar_update)
    setLoadingAnalytics(true);
    try {
      const [svc, clients] = await Promise.all([
        api.getServiceStats(),
        api.getFrequentClients(),
      ]);
      if (svc.success) setServiceStats(svc.data);
      if (clients.success) setFrequentClients(clients.data);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const searchClient = async () => {
    if (!clientSearch.trim()) return;
    setSearchingClient(true);
    setClientHistory(null);
    try {
      const res = await api.getClientHistory(clientSearch.trim());
      if (res.success) setClientHistory(res.data);
    } finally {
      setSearchingClient(false);
    }
  };

  const formatDateShort = (dateStr) => {
    const d = new Date(String(dateStr).split("T")[0] + "T12:00:00");
    const days = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const handleStatus = async (id, status) => {
    setUpdating(id);
    const res = await api.updateStatus(id, status);
    await fetchAll();
    setUpdating(null);
    if (res.success) setSelectedAppt(res.data);
    else setSelectedAppt(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este turno permanentemente?")) return;
    setUpdating(id);
    await api.deleteAppointment(id);
    await fetchAll();
    setUpdating(null);
    setSelectedAppt(null);
  };

  // Build map: dateStr → hour → appointment
  const apptMap = {};
  appointments.forEach((a) => {
    const key =
      typeof a.appointment_date === "string"
        ? a.appointment_date.slice(0, 10)
        : toDateStr(new Date(a.appointment_date));
    if (!apptMap[key]) apptMap[key] = {};
    apptMap[key][a.appointment_hour] = a;
  });

  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLabel = () => {
    const from = weekStart;
    const to = addDays(weekStart, 5);
    return `${from.getDate()} — ${to.getDate()} de ${MONTH_NAMES[from.getMonth()]} ${from.getFullYear()}`;
  };

  // List filtered to current week
  const weekFrom = toDateStr(weekStart);
  const weekTo = toDateStr(addDays(weekStart, 5));
  const weekAppts = appointments
    .filter((a) => {
      const d =
        typeof a.appointment_date === "string"
          ? a.appointment_date.slice(0, 10)
          : toDateStr(new Date(a.appointment_date));
      return d >= weekFrom && d <= weekTo;
    })
    .sort((a, b) => {
      const da =
        typeof a.appointment_date === "string"
          ? a.appointment_date.slice(0, 10)
          : toDateStr(new Date(a.appointment_date));
      const db =
        typeof b.appointment_date === "string"
          ? b.appointment_date.slice(0, 10)
          : toDateStr(new Date(b.appointment_date));
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
              <path
                d="M3 3L15 15M15 3L3 15"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat__n admin-stat__n--green">
              {stats.today_confirmed || 0}
            </span>
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

        <div className="admin-body">
          {/* Tab switcher */}
          <div
            className="admin-tabs"
            style={{
              position: "sticky",
              top: 0,
              background: "var(--white)",
              zIndex: 10,
            }}
          >
            <button
              className={`admin-tab ${activeTab === "turnos" ? "admin-tab--active" : ""}`}
              onClick={() => setActiveTab("turnos")}
            >
              Turnos
            </button>
            <button
              className={`admin-tab ${activeTab === "servicios" ? "admin-tab--active" : ""}`}
              onClick={() => setActiveTab("servicios")}
            >
              Servicios
            </button>
            <button
              className={`admin-tab ${activeTab === "estadisticas" ? "admin-tab--active" : ""}`}
              onClick={() => { setActiveTab("estadisticas"); loadAnalytics(); }}
            >
              Estadísticas
            </button>
          </div>

          {activeTab === "servicios" && (
            <div className="admin-services">
              <div className="admin-services__form">
                <h3 className="admin-services__subtitle">Agregar servicio</h3>
                <div className="admin-services__row">
                  <input
                    className="admin-services__input"
                    placeholder="Nombre del servicio"
                    value={newService.name}
                    onChange={(e) =>
                      setNewService((s) => ({ ...s, name: e.target.value }))
                    }
                  />
                  <input
                    className="admin-services__input admin-services__input--price"
                    placeholder="Precio"
                    type="number"
                    value={newService.price}
                    onChange={(e) =>
                      setNewService((s) => ({ ...s, price: e.target.value }))
                    }
                  />
                  <select
                    className="admin-services__select"
                    value={newService.category}
                    onChange={(e) =>
                      setNewService((s) => ({ ...s, category: e.target.value }))
                    }
                  >
                    <option value="manicuria">Manicuria</option>
                    <option value="nail art">Nail Art</option>
                    <option value="esculpidas">Esculpidas</option>
                    <option value="servicio">Otro</option>
                  </select>
                  <button
                    className="admin-btn admin-btn--done"
                    onClick={handleSaveService}
                    disabled={savingService || !newService.name}
                  >
                    Agregar
                  </button>
                </div>
              </div>
              <div className="admin-services__list">
                {services.map((s) => (
                  <div key={s.id} className="admin-service-item">
                    {editingService?.id === s.id ? (
                      <div className="admin-services__row">
                        <input
                          className="admin-services__input"
                          value={editingService.name}
                          onChange={(e) =>
                            setEditingService((v) => ({
                              ...v,
                              name: e.target.value,
                            }))
                          }
                        />
                        <input
                          className="admin-services__input admin-services__input--price"
                          type="number"
                          value={editingService.price}
                          onChange={(e) =>
                            setEditingService((v) => ({
                              ...v,
                              price: e.target.value,
                            }))
                          }
                        />
                        <select
                          className="admin-services__select"
                          value={editingService.category}
                          onChange={(e) =>
                            setEditingService((v) => ({
                              ...v,
                              category: e.target.value,
                            }))
                          }
                        >
                          <option value="manicuria">Manicuria</option>
                          <option value="nail art">Nail Art</option>
                          <option value="esculpidas">Esculpidas</option>
                          <option value="servicio">Otro</option>
                        </select>
                        <button
                          className="admin-btn admin-btn--done"
                          onClick={() =>
                            handleUpdateService(s.id, editingService)
                          }
                        >
                          Guardar
                        </button>
                        <button
                          className="admin-btn"
                          onClick={() => setEditingService(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="admin-service-item__info">
                          <span className="admin-service-item__cat">
                            {s.category}
                          </span>
                          <span className="admin-service-item__name">
                            {s.name}
                          </span>
                        </div>
                        <div className="admin-service-item__right">
                          <span className="admin-service-item__price">
                            {s.price
                              ? `$${parseInt(s.price).toLocaleString("es-AR")}`
                              : "Sin precio"}
                          </span>
                          <button
                            className="admin-btn"
                            onClick={() => setEditingService({ ...s })}
                          >
                            Editar
                          </button>
                          <button
                            className="admin-btn admin-btn--delete"
                            onClick={() => handleDeleteService(s.id)}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 13 13"
                              fill="none"
                            >
                              <path
                                d="M1.5 3H11.5M4.5 3V2H8.5V3M4.5 5.5V9.5M8.5 5.5V9.5M2.5 3L3 11H10L10.5 3"
                                stroke="currentColor"
                                strokeWidth="0.9"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "estadisticas" && (
            <div className="admin-analytics">
              {loadingAnalytics ? (
                <div className="admin-analytics__loading">Cargando estadísticas...</div>
              ) : (
                <>
                  {/* Servicios más pedidos */}
                  <div className="admin-analytics__section">
                    <h3 className="admin-analytics__title">Servicios más pedidos</h3>
                    {serviceStats.length === 0 ? (
                      <p className="admin-analytics__empty">Todavía no hay datos de servicios.</p>
                    ) : (
                      <div className="admin-analytics__list">
                        {serviceStats.map((s, i) => {
                          const max = serviceStats[0].total;
                          const pct = Math.round((s.total / max) * 100);
                          return (
                            <div key={i} className="admin-analytics__item">
                              <div className="admin-analytics__item-header">
                                <span className="admin-analytics__item-name">{s.service_name}</span>
                                <span className="admin-analytics__item-count">{s.total} turnos</span>
                              </div>
                              <div className="admin-analytics__bar-bg">
                                <div className="admin-analytics__bar" style={{ width: pct + "%" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Clientas frecuentes */}
                  <div className="admin-analytics__section">
                    <h3 className="admin-analytics__title">Clientas frecuentes</h3>
                    {frequentClients.length === 0 ? (
                      <p className="admin-analytics__empty">Todavía no hay datos.</p>
                    ) : (
                      <div className="admin-analytics__clients">
                        {frequentClients.map((c, i) => (
                          <div key={i} className="admin-analytics__client"
                            onClick={() => { setClientSearch(c.whatsapp); setActiveTab("estadisticas"); }}>
                            <div className="admin-analytics__client-rank">#{i + 1}</div>
                            <div className="admin-analytics__client-info">
                              <span className="admin-analytics__client-name">{c.name}</span>
                              <span className="admin-analytics__client-meta">{c.whatsapp} · {c.total_appointments} turnos · última visita {formatDateShort(c.last_visit)}</span>
                            </div>
                            <div className="admin-analytics__client-badge">{c.total_appointments}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Historial por clienta */}
                  <div className="admin-analytics__section">
                    <h3 className="admin-analytics__title">Historial de clienta</h3>
                    <div className="admin-analytics__search">
                      <input
                        className="admin-analytics__search-input"
                        placeholder="Número de WhatsApp..."
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && searchClient()}
                      />
                      <button
                        className="admin-analytics__search-btn"
                        onClick={searchClient}
                        disabled={searchingClient}
                      >
                        {searchingClient ? "..." : "Buscar"}
                      </button>
                    </div>
                    {clientHistory !== null && (
                      clientHistory.length === 0 ? (
                        <p className="admin-analytics__empty">No se encontraron turnos para ese número.</p>
                      ) : (
                        <div className="admin-analytics__history">
                          <p className="admin-analytics__history-name">{clientHistory[0].name} — {clientHistory.length} turno{clientHistory.length !== 1 ? "s" : ""}</p>
                          {clientHistory.map((a, i) => (
                            <div key={i} className={`admin-analytics__history-item admin-analytics__history-item--${a.status}`}>
                              <span className="admin-analytics__history-date">{formatDateShort(a.appointment_date)} {String(a.appointment_hour).padStart(2,"0")}:00</span>
                              <span className="admin-analytics__history-service">{a.service_name || "Sin servicio"}</span>
                              <span className="admin-analytics__history-status">{a.status === "confirmed" ? "Confirmado" : a.status === "completed" ? "Completado" : "Cancelado"}</span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "turnos" && (
            <>
              {/* Week grid view */}
              {view === "week" && (
                <div className="admin-week-nav">
                  <button className="admin-week-nav__btn" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <span className="admin-week-nav__label">{weekLabel()}</span>
                  <button className="admin-week-nav__btn" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )}

              {view === "week" && (
                <div className="admin-grid">
                  {/* Column headers */}
                  <div className="admin-grid__corner" />
                  {days.map((day) => {
                    const dateStr = toDateStr(day);
                    const isToday = day.getTime() === today.getTime();
                    return (
                      <div
                        key={dateStr}
                        className={`admin-grid__day-header ${isToday ? "admin-grid__day-header--today" : ""}`}
                      >
                        <span className="admin-grid__day-name">
                          {DAY_NAMES[day.getDay()]}
                        </span>
                        <span className="admin-grid__day-num">
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}

                  {/* Hour rows */}
                  {HOURS.map((hour) => (
                    <React.Fragment key={hour}>
                      <div className="admin-grid__hour">
                        {String(hour).padStart(2, "0")}:00
                      </div>
                      {days.map((day) => {
                        const dateStr = toDateStr(day);
                        const appt = apptMap[dateStr]?.[hour];
                        const isPastSlot =
                          new Date(
                            `${dateStr}T${String(hour).padStart(2, "0")}:00:00`,
                          ) < new Date();

                        return (
                          <div
                            key={`${dateStr}-${hour}`}
                            className={`admin-grid__cell ${isPastSlot ? "admin-grid__cell--past" : ""} ${appt ? `admin-grid__cell--${appt.status}` : ""}`}
                            onClick={() => appt && setSelectedAppt(appt)}
                          >
                            {appt && (
                              <div className="admin-cell-appt">
                                <span className="admin-cell-appt__name">
                                  {appt.name}
                                </span>
                                {appt.service_name && (
                                  <span className="admin-cell-appt__service">
                                    {appt.service_name}
                                  </span>
                                )}
                                <span className="admin-cell-appt__wa">
                                  {appt.whatsapp}
                                </span>
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
              {view === "list" && (
                <div className="admin-list">
                  {weekAppts.length === 0 ? (
                    <div className="admin-empty">No hay turnos esta semana</div>
                  ) : (
                    weekAppts.map((appt) => {
                      const dateStr =
                        typeof appt.appointment_date === "string"
                          ? appt.appointment_date.slice(0, 10)
                          : toDateStr(new Date(appt.appointment_date));
                      const d = new Date(dateStr + "T12:00:00");
                      const h = appt.appointment_hour;
                      return (
                        <div
                          key={appt.id}
                          className={`admin-list-item admin-list-item--${appt.status}`}
                          onClick={() => setSelectedAppt(appt)}
                        >
                          <div className="admin-list-item__left">
                            <div className="admin-list-item__date">
                              {DAY_NAMES[d.getDay()]} {d.getDate()}/
                              {d.getMonth() + 1}
                            </div>
                            <div className="admin-list-item__time">
                              {String(h).padStart(2, "0")}:00 –{" "}
                              {String(h + 2).padStart(2, "0")}:00
                            </div>
                          </div>
                          <div className="admin-list-item__center">
                            <div className="admin-list-item__name">
                              {appt.name}
                            </div>
                            {appt.service_name && (
                              <div className="admin-list-item__service">
                                {appt.service_name}
                              </div>
                            )}
                            <div className="admin-list-item__wa">
                              {appt.whatsapp}
                            </div>
                          </div>
                          <span
                            className={`admin-status admin-status--${appt.status}`}
                          >
                            {statusConfig[appt.status]?.label}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail drawer */}
        {selectedAppt && (
          <div className="admin-drawer fade-in">
            <div className="admin-drawer__header">
              <div className="admin-drawer__title">{selectedAppt.name}</div>
              <button
                className="admin-drawer__close"
                onClick={() => setSelectedAppt(null)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 2L12 12M12 2L2 12"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="admin-drawer__info">
              <span>{selectedAppt.whatsapp}</span>
              {selectedAppt.service_name && (
                <span className="admin-drawer__service">💅 {selectedAppt.service_name}</span>
              )}
              <span>
                {(() => {
                  const ds =
                    typeof selectedAppt.appointment_date === "string"
                      ? selectedAppt.appointment_date.slice(0, 10)
                      : toDateStr(new Date(selectedAppt.appointment_date));
                  const d = new Date(ds + "T12:00:00");
                  const h = selectedAppt.appointment_hour;
                  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} · ${String(h).padStart(2, "0")}:00`;
                })()}
              </span>
              <span
                className={`admin-status admin-status--${selectedAppt.status}`}
              >
                {statusConfig[selectedAppt.status]?.label}
              </span>
            </div>
            <div className="admin-drawer__actions">
              {selectedAppt.status === "confirmed" && (
                <button
                  className="admin-btn admin-btn--done"
                  disabled={updating === selectedAppt.id}
                  onClick={() => handleStatus(selectedAppt.id, "completed")}
                >
                  Completar
                </button>
              )}
              {selectedAppt.status === "confirmed" && (
                <button
                  className="admin-btn admin-btn--cancel"
                  disabled={updating === selectedAppt.id}
                  onClick={() => handleStatus(selectedAppt.id, "cancelled")}
                >
                  Cancelar
                </button>
              )}
              {selectedAppt.status === "cancelled" && (
                <button
                  className="admin-btn admin-btn--call"
                  disabled={updating === selectedAppt.id}
                  onClick={() => handleStatus(selectedAppt.id, "confirmed")}
                >
                  Restaurar
                </button>
              )}
              <button
                className="admin-btn admin-btn--delete"
                disabled={updating === selectedAppt.id}
                onClick={() => handleDelete(selectedAppt.id)}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M1.5 3H11.5M4.5 3V2H8.5V3M4.5 5.5V9.5M8.5 5.5V9.5M2.5 3L3 11H10L10.5 3"
                    stroke="currentColor"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                  />
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