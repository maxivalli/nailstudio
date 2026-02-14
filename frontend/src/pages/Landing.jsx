import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

const Landing = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="landing">
      {/* Decorative elements */}
      <div className="landing__grain" />
      <div className="landing__circle landing__circle--1" />
      <div className="landing__circle landing__circle--2" />
      <div className="landing__line landing__line--v1" />
      <div className="landing__line landing__line--v2" />
      <div className="landing__line landing__line--h" />

      <div
        className={`landing__content ${visible ? "landing__content--visible" : ""}`}
      >
        {/* Logo mark */}
        <div className="landing__mark">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle
              cx="24"
              cy="24"
              r="23"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <path
              d="M24 8 C24 8, 34 18, 34 26 C34 31.5 29.5 36 24 36 C18.5 36 14 31.5 14 26 C14 18 24 8 24 8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <circle cx="24" cy="26" r="3" fill="currentColor" opacity="0.4" />
          </svg>
        </div>

        <div className="landing__eyebrow">Bienvenida a</div>

        <h1 className="landing__title">
          <span className="landing__title-line">SY</span>
          <span className="landing__title-line landing__title-line--italic">
            Studio
          </span>
        </h1>

        <p className="landing__tagline">
          Arte y cuidado para tus manos.
          <br />
          Turno online, sin esperas innecesarias.
        </p>

        <div className="landing__actions">
          <button className="landing__cta" onClick={() => navigate("/home")}>
            <span>Sacar turno</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8H13M13 8L9 4M13 8L9 12"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="landing__secondary"
            onClick={() => navigate("/home")}
          >
            Ver trabajos
          </button>
        </div>

        {/* Stats strip */}
        <div className="landing__stats">
          <div className="landing__stat">
            <span className="landing__stat-number">100+</span>
            <span className="landing__stat-label">Clientas felices</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-number">✫✫✫✫✫</span>
            <span className="landing__stat-label">Valoración</span>
          </div>
          <div className="landing__stat-divider" />
          <div className="landing__stat">
            <span className="landing__stat-number">3 años</span>
            <span className="landing__stat-label">De experiencia</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
