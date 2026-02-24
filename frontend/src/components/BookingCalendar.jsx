import React, { useState, useEffect, useCallback } from "react";
import { api, getSSEUrl } from "../api";
import "./BookingCalendar.css";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8..19
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
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

const isSunday = (d) => d.getDay() === 0;
const isPast = (d, hour) => {
  const now = new Date();
  const argentinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const slot = new Date(d);
  slot.setHours(hour, 0, 0, 0);
  return slot <= argentinaTime;
};

// ─── Step indicator ─────────────────────────────────────────────────────────
const Steps = ({ current }) => (
  <div className="bc-steps">
    {["Elegí el día", "Elegí la hora", "Tus datos"].map((label, i) => (
      <React.Fragment key={i}>
        <div
          className={`bc-step ${current === i ? "bc-step--active" : ""} ${current > i ? "bc-step--done" : ""}`}
        >
          <div className="bc-step__dot">
            {current > i ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5L4.5 7.5L8.5 2.5"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          <span className="bc-step__label">{label}</span>
        </div>
        {i < 2 && (
          <div
            className={`bc-step__line ${current > i ? "bc-step__line--done" : ""}`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Week Calendar ───────────────────────────────────────────────────────────
const WeekCalendar = ({
  weekStart,
  appointments,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}) => {
  const now = new Date();
  const argentinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const today = new Date(argentinaTime.getFullYear(), argentinaTime.getMonth(), argentinaTime.getDate());
  today.setHours(0, 0, 0, 0);
  // Get Mon-Sat (6 days)
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  // Build a set of occupied slots per date
  const occupiedMap = {};
  appointments.forEach((a) => {
    const key =
      typeof a.appointment_date === "string"
        ? a.appointment_date.slice(0, 10)
        : toDateStr(new Date(a.appointment_date));
    if (!occupiedMap[key]) occupiedMap[key] = [];
    occupiedMap[key].push(a.appointment_hour);
  });

  const weekLabel = () => {
    const from = weekStart;
    const to = addDays(weekStart, 5);
    if (from.getMonth() === to.getMonth()) {
      return `${from.getDate()} — ${to.getDate()} de ${MONTH_NAMES[from.getMonth()]} ${from.getFullYear()}`;
    }
    return `${from.getDate()} ${MONTH_NAMES[from.getMonth()]} — ${to.getDate()} ${MONTH_NAMES[to.getMonth()]} ${to.getFullYear()}`;
  };

  return (
    <div className="bc-week">
      {/* Nav */}
      <div className="bc-week__nav">
        <button className="bc-nav-btn" onClick={onPrevWeek}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8L10 13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span className="bc-week__label">{weekLabel()}</span>
        <button className="bc-nav-btn" onClick={onNextWeek}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 3L11 8L6 13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Day grid */}
      <div className="bc-week__grid">
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const isPastDay = day < today;
          const isSelected = selectedDate === dateStr;
          const occupied = occupiedMap[dateStr] || [];
          const totalSlots = 12;
          const freeSlots = totalSlots - occupied.length;
          const allFull = freeSlots === 0;

          return (
            <button
              key={dateStr}
              className={[
                "bc-day",
                isPastDay || allFull ? "bc-day--disabled" : "",
                isSelected ? "bc-day--selected" : "",
                day.getTime() === today.getTime() ? "bc-day--today" : "",
              ].join(" ")}
              onClick={() => !isPastDay && !allFull && onSelectDate(dateStr)}
              disabled={isPastDay || allFull}
            >
              <span className="bc-day__name">{DAY_NAMES[day.getDay()]}</span>
              <span className="bc-day__num">{day.getDate()}</span>
              {/* Slot dots visualization */}
              <div className="bc-day__dots">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className={`bc-day__dot ${occupied.includes(h) ? "bc-day__dot--taken" : ""} ${isPastDay || isPast(day, h) ? "bc-day__dot--past" : ""}`}
                  />
                ))}
              </div>
              {!isPastDay && (
                <span className="bc-day__slots">
                  {allFull
                    ? "Sin lugar"
                    : `${freeSlots} libre${freeSlots !== 1 ? "s" : ""}`}
                </span>
              )}
              {isPastDay && (
                <span className="bc-day__slots bc-day__slots--past">
                  Pasado
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bc-week__legend">
        <div className="bc-legend-item">
          <div className="bc-legend-dot bc-legend-dot--free" />
          <span>Disponible</span>
        </div>
        <div className="bc-legend-item">
          <div className="bc-legend-dot bc-legend-dot--taken" />
          <span>Ocupado</span>
        </div>
        <div className="bc-legend-item">
          <div className="bc-legend-dot bc-legend-dot--past" />
          <span>Pasado</span>
        </div>
      </div>
    </div>
  );
};

// ─── Hour Picker ─────────────────────────────────────────────────────────────
const HourPicker = ({ date, onSelectSlot, onBack }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Función para cargar/recargar slots
  const loadSlots = useCallback(() => {
    setLoading(true);
    api
      .getSlots(date)
      .then((res) => {
        if (res.success && res.data) {
          setSlots(res.data);
        } else {
          console.error("❌ Error en la respuesta:", {
            success: res.success,
            error: res.error,
            fullResponse: res,
          });
          setSlots([]);
        }
      })
      .catch((err) => {
        console.error("❌ Error al cargar horarios:", err);
        setSlots([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [date]);

  // Cargar slots inicialmente
  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Escuchar eventos SSE para actualización en tiempo real
  useEffect(() => {
    const sseUrl = getSSEUrl();
    const es = new EventSource(sseUrl);
    
    const handleUpdate = (event) => {
      // Recargar slots cuando hay un cambio en el calendario
      loadSlots();
    };
    
    es.addEventListener("calendar_update", handleUpdate);
    es.onerror = (err) => {
      console.error("❌ [HourPicker] Error en SSE:", err);
      es.close();
    };
    
    return () => es.close();
  }, [loadSlots]);

  const d = new Date(date + "T12:00:00");
  const dayLabel = `${DAY_NAMES_FULL[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;

  return (
    <div className="bc-hours fade-in">
      <div className="bc-hours__header">
        <button className="bc-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 2L4 7L9 12"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          Volver
        </button>
        <div className="bc-hours__date">{dayLabel}</div>
      </div>

      {loading ? (
        <div className="bc-loading">
          <div className="bc-spinner" />
          <span>Cargando horarios...</span>
        </div>
      ) : (
        <div className="bc-hours__grid">
          {slots.map((slot) => (
            <button
              key={slot.hour}
              className={`bc-slot ${!slot.available ? "bc-slot--taken" : ""}`}
              onClick={() => slot.available && onSelectSlot(slot)}
              disabled={!slot.available}
            >
              <span className="bc-slot__time">{slot.label}</span>
              <span className="bc-slot__end">
                – {(slot.hour + 1).toString().padStart(2, "0")}:00
              </span>
              {!slot.available && (
                <span className="bc-slot__badge">Ocupado</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Booking Form ─────────────────────────────────────────────────────────────
const BookingForm = ({ date, slot, onBack, onSuccess }) => {
  const [form, setForm] = useState({ name: "", whatsapp: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const d = new Date(date + "T12:00:00");
  const dayLabel = `${DAY_NAMES_FULL[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;

  const handleChange = (e) => {
    const val =
      e.target.name === "whatsapp"
        ? e.target.value.replace(/\D/g, "")
        : e.target.value;
    setForm((p) => ({ ...p, [e.target.name]: val }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Ingresá tu nombre");
    if (form.whatsapp.length < 8) return setError("Ingresá un WhatsApp válido");

    setLoading(true);
    try {
      const res = await api.createAppointment({
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        appointment_date: date,
        appointment_hour: slot.hour,
      });
      if (res.success) {
        onSuccess(res.data);
      } else {
        setError(res.error || "Ocurrió un error");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bc-form fade-in">
      <button className="bc-back" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9 2L4 7L9 12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        Volver
      </button>

      {/* Summary card */}
      <div className="bc-summary">
        <div className="bc-summary__item">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect
              x="1.5"
              y="2"
              width="11"
              height="11"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M1.5 5.5H12.5M5 1.5V3.5M9 1.5V3.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
          <span>{dayLabel}</span>
        </div>
        <div className="bc-summary__item">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
              cx="7"
              cy="7"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M7 4V7.5L9.5 9"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
          <span>
            {slot.label} – {(slot.hour + 1).toString().padStart(2, "0")}:00 (1
            hora)
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="bc-form__fields">
        <div className="bc-field">
          <label className="bc-label">Nombre completo</label>
          <input
            className="bc-input"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="¿Cómo te llamás?"
            autoFocus
          />
        </div>
        <div className="bc-field">
          <label className="bc-label">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ opacity: 0.6 }}
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp
          </label>
          <input
            className="bc-input"
            type="tel"
            name="whatsapp"
            value={form.whatsapp}
            onChange={handleChange}
            placeholder="Ej: 3408612345"
          />
        </div>

        {error && (
          <div className="bc-error fade-in">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" />
              <path
                d="M6.5 4V6.5M6.5 8.5V9"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          className={`bc-submit ${loading ? "bc-submit--loading" : ""}`}
          disabled={loading}
        >
          {loading ? (
            <span className="bc-spinner bc-spinner--white" />
          ) : (
            <>
              <span>Confirmar turno</span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path
                  d="M2.5 7.5H12.5M12.5 7.5L8.5 3.5M12.5 7.5L8.5 11.5"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

// ─── Confirmation ─────────────────────────────────────────────────────────────
const Confirmation = ({ appointment, onReset }) => {
  // Parse date correctly - handle both string and Date object
  let d;
  if (typeof appointment.appointment_date === "string") {

    const dateOnly = appointment.appointment_date.split("T")[0];
    d = new Date(dateOnly + "T12:00:00");
  } else {
    d = new Date(appointment.appointment_date);
  }

  const h = appointment.appointment_hour;

  const dayLabel = `${DAY_NAMES_FULL[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <div className="bc-confirm fade-in">
      <div className="bc-confirm__icon">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle
            cx="18"
            cy="18"
            r="17"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M11 18.5L16 23.5L25 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="bc-confirm__title">¡Turno confirmado!</div>
      <div className="bc-confirm__subtitle">
        Te esperamos, {appointment.name}
      </div>

      <div className="bc-confirm__card">
        <div className="bc-confirm__row">
          <span>Día</span>
          <strong>{dayLabel}</strong>
        </div>
        <div className="bc-confirm__row">
          <span>Horario</span>
          <strong>
            {String(h).padStart(2, "0")}:00 – {String(h + 1).padStart(2, "0")}
            :00
          </strong>
        </div>
        <div className="bc-confirm__row">
          <span>WhatsApp</span>
          <strong>{appointment.whatsapp}</strong>
        </div>
      </div>

      <p className="bc-confirm__note">
        Guardá este turno. Si necesitás cancelar, avisanos por WhatsApp.
      </p>

      <button className="bc-confirm__reset" onClick={onReset}>
        Reservar otro turno
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BookingCalendar = () => {
  const [step, setStep] = useState(0); // 0=calendar, 1=hours, 2=form, 3=confirm
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmedAppt, setConfirmedAppt] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger para forzar recarga

  // Fetch appointments for visible range (for the dots on the calendar)
  const fetchAppointments = useCallback(() => {
    const from = toDateStr(weekStart);
    const to = toDateStr(addDays(weekStart, 5));
    api
      .getAppointments(from, to)
      .then((res) => {
        if (res.success) {
          setAppointments(res.data);
        } else {
          console.error('❌ [fetchAppointments] Respuesta sin éxito:', res);
        }
      })
      .catch((err) => {
        console.error('❌ [fetchAppointments] Error:', err);
      });
  }, [weekStart, refreshTrigger]);

  // Cargar appointments inicialmente y cuando cambia la semana o refreshTrigger
  useEffect(() => {
    fetchAppointments();
  }, [weekStart, refreshTrigger, fetchAppointments]);

  // SSE for real-time updates - SOLO SE MONTA UNA VEZ
  useEffect(() => {
    const sseUrl = getSSEUrl();
    const es = new EventSource(sseUrl);
    
    es.onopen = () => {
    };
    
    const handleCalendarUpdate = (event) => {
      
      // Parsear el data del evento
      try {
        const eventData = JSON.parse(event.data);
      } catch (e) {
      }
      
      // Forzar recarga incrementando el trigger
      setRefreshTrigger(prev => {
        return prev + 1;
      });
    };
    
    es.addEventListener("calendar_update", handleCalendarUpdate);
    
    es.onerror = (err) => {
          console.error('Error en SSE:', err);
      es.close();
    };
    
    return () => {
      es.close();
    };
  }, []); // Sin dependencias - se monta solo una vez

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setStep(1);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(2);
  };

  const handleConfirm = (appt) => {
    setConfirmedAppt(appt);
    setStep(3);
    fetchAppointments();
  };

  const handleReset = () => {
    setStep(0);
    setSelectedDate(null);
    setSelectedSlot(null);
    setConfirmedAppt(null);
  };

  const prevWeek = () => {
    const prev = addDays(weekStart, -7);
    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const today = new Date(argentinaTime.getFullYear(), argentinaTime.getMonth(), argentinaTime.getDate());
    today.setHours(0, 0, 0, 0);
    if (getMonday(prev) >= getMonday(today)) setWeekStart(getMonday(prev));
  };

  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  return (
    <div className="booking-calendar">
      <div className="bc-header">
        <div className="bc-header__eyebrow">Reservá tu turno</div>
        <h3 className="bc-header__title">
          {step === 0 && (
            <>
              Elegí el <em>día</em>
            </>
          )}
          {step === 1 && (
            <>
              Elegí el <em>horario</em>
            </>
          )}
          {step === 2 && (
            <>
              Tus <em>datos</em>
            </>
          )}
          {step === 3 && <>¡Listo!</>}
        </h3>
      </div>

      {step < 3 && <Steps current={step} />}

      <div className="bc-body">
        {step === 0 && (
          <WeekCalendar
            weekStart={weekStart}
            appointments={appointments}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onPrevWeek={prevWeek}
            onNextWeek={nextWeek}
          />
        )}
        {step === 1 && (
          <HourPicker
            date={selectedDate}
            onSelectSlot={handleSelectSlot}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <BookingForm
            date={selectedDate}
            slot={selectedSlot}
            onBack={() => setStep(1)}
            onSuccess={handleConfirm}
          />
        )}
        {step === 3 && confirmedAppt && (
          <Confirmation appointment={confirmedAppt} onReset={handleReset} />
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;
