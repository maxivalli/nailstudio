import React, { useEffect, useRef, useState } from 'react';
import Gallery from '../components/Gallery';
import BookingCalendar from '../components/BookingCalendar';
import NailDesignGenerator from '../components/NailDesignGenerator';
import './Home.css';

const Home = () => {
  const [prefilledDesign, setPrefilledDesign] = useState(null);
  const bookingRef = useRef(null);

  const handleBookWithDesign = (design) => {
    setPrefilledDesign(design);
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };
  useEffect(() => {
    document.title = 'Turnos & Galería — SY Studio';
  }, []);

  return (
    <div className="home">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero__bg" />
        <div className="home-hero__content">
          <div className="home-hero__eyebrow">SY Studio</div>
          <h1 className="home-hero__title">
            Cada detalle,<br />
            <em>una obra de arte.</em>
          </h1>
          <p className="home-hero__text">
            Diseños únicos hechos con pasión y precisión. 
            Reservá tu turno online y te atendemos en el horario que elijas.
          </p>
        </div>
        <div className="home-hero__line" />
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="home-section">
        <div className="home-section__header">
          <div className="home-section__eyebrow">Portafolio</div>
          <h2 className="home-section__title">Trabajos <em>realizados</em></h2>
          <p className="home-section__sub">
            Una selección de nuestros diseños más recientes
          </p>
        </div>
        <div className="home-section__body home-section__body--full">
          <Gallery />
        </div>
      </section>

      {/* Nail Design Generator Section */}
      <section id="generador" className="home-section home-section--alt">
        <div className="home-section__inner">
          <div className="home-section__col">
            <div className="home-section__eyebrow">Powered by IA</div>
            <h2 className="home-section__title">Diseñá tus<br /><em>uñas ideales</em></h2>
            <p className="home-section__sub">
              Elegí un color, un estilo y dejá que la IA cree un diseño personalizado para vos.
              Si te gusta, podés reservar el turno directo.
            </p>
            <div className="home-section__features">
              <div className="home-feature">
                <div className="home-feature__icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1L9.5 5.5L14 6.5L10.5 10L11.5 14.5L7.5 12.5L3.5 14.5L4.5 10L1 6.5L5.5 5.5L7.5 1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>20 colores y 10 estilos</span>
              </div>
              <div className="home-feature">
                <div className="home-feature__icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1"/>
                    <path d="M7.5 4V7.5L10 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </div>
                <span>Resultado en segundos</span>
              </div>
              <div className="home-feature">
                <div className="home-feature__icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="1" y="2" width="13" height="12" rx="1" stroke="currentColor" strokeWidth="1"/>
                    <path d="M1 6H14M5 1V3.5M10 1V3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </div>
                <span>Reservá el turno directo</span>
              </div>
            </div>
          </div>
          <div className="home-section__col home-section__col--form">
            <NailDesignGenerator onBookWithDesign={handleBookWithDesign} />
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="queue" className="home-section" ref={bookingRef}>
        <div className="home-section__inner">
          <div className="home-section__col">
            <div className="home-section__eyebrow">Turnos online</div>
            <h2 className="home-section__title">Elegí tu<br /><em>día y hora</em></h2>
            <p className="home-section__sub">
              Reservá tu turno en el horario que más te convenga.
              Atendemos de lunes a sábado, de 8:00 a 20:00.
            </p>

            <div className="home-section__features">
              <div className="home-feature">
                <div className="home-feature__icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="1" y="2" width="13" height="12" rx="1" stroke="currentColor" strokeWidth="1"/>
                    <path d="M1 6H14M5 1V3.5M10 1V3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </div>
                <span>Calendario Lun – Sáb</span>
              </div>
              <div className="home-feature">
                <div className="home-feature__icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1"/>
                    <path d="M7.5 4V7.5L10 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </div>
                <span>Turnos de 2 horas, 8:00 – 20:00</span>
              </div>
              <div className="home-feature">
                <div className="home-feature__icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M5 7.5L7 9.5L10 5.5M13.5 7.5C13.5 10.8137 10.8137 13.5 7.5 13.5C4.18629 13.5 1.5 10.8137 1.5 7.5C1.5 4.18629 4.18629 1.5 7.5 1.5C10.8137 1.5 13.5 4.18629 13.5 7.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </div>
                <span>Disponibilidad en tiempo real</span>
              </div>
            </div>
          </div>

          <div className="home-section__col home-section__col--form">
            <BookingCalendar prefilledDesign={prefilledDesign} onDesignUsed={() => setPrefilledDesign(null)} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer__inner">
          <div className="home-footer__brand">
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1"/>
              <path d="M24 8 C24 8, 34 18, 34 26 C34 31.5 29.5 36 24 36 C18.5 36 14 31.5 14 26 C14 18 24 8 24 8Z" fill="none" stroke="currentColor" strokeWidth="1"/>
              <circle cx="24" cy="26" r="3" fill="currentColor" opacity="0.4"/>
            </svg>
            <span>SY <em>Studio</em></span>
          </div>
          <p className="home-footer__copy">© {new Date().getFullYear()} SY Studio. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;