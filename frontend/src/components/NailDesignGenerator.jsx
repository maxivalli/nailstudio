import { useState } from "react";
import { api } from "../api";
import "./NailDesignGenerator.css";

const MAX_GENERATIONS = 3;

const COLORS = [
  { id: "blanco",      label: "Blanco",  hex: "#F5F5F0" },
  { id: "nude",        label: "Nude",    hex: "#D4B8A0" },
  { id: "amarillo",    label: "Amarillo",hex: "#F0D060" },
  { id: "naranja",     label: "Naranja", hex: "#E8924A" },
  { id: "terracota",   label: "Terracota",hex:"#C46848" },
  { id: "coral",       label: "Coral",   hex: "#E8836A" },
  { id: "rojo",        label: "Rojo",    hex: "#C0392B" },
  { id: "bordo",       label: "Bordó",   hex: "#7B1C2E" },
  { id: "rosa chicle", label: "Chicle",  hex: "#F060A0" },
  { id: "rosa",        label: "Rosa",    hex: "#F0C4C4" },
  { id: "lila",        label: "Lila",    hex: "#C9B1D9" },
  { id: "celeste",     label: "Celeste", hex: "#A8D4F0" },
  { id: "azul",        label: "Azul",    hex: "#6A9FD4" },
  { id: "azul marino", label: "Marino",  hex: "#1B3A5C" },
  { id: "verde",       label: "Verde",   hex: "#7DBF8C" },
  { id: "verde oscuro",label: "Oliva",   hex: "#4A6741" },
  { id: "dorado",      label: "Dorado",  hex: "#D4AF37" },
  { id: "plateado",    label: "Plata",   hex: "#C0C0C8" },
  { id: "negro",       label: "Negro",   hex: "#2C2C2C" },
  {
    id: "multicolor",
    label: "Multi",
    hex: "linear-gradient(135deg,#F0C4C4,#C9B1D9,#6A9FD4,#7DBF8C)",
  },
];

// Estilos que requieren selección de color
const STYLES_WITH_COLOR = [
  { id: "solido",  label: "Color sólido", icon: "◉" },
  { id: "glitter", label: "Glitter",      icon: "✧" },
  { id: "french",  label: "Francesa",     icon: "◐" },
  { id: "cat eye", label: "Cat Eye",      icon: "◈" },
];

// Todos los estilos (todos requieren color en esta configuración)
const STYLES = STYLES_WITH_COLOR;

const AttemptsIndicator = ({ remaining }) => {
  const dots = Array.from({ length: MAX_GENERATIONS }, (_, i) => i < remaining);
  return (
    <div className="ndg__attempts">
      <div className="ndg__attempts-dots">
        {dots.map((active, i) => (
          <span
            key={i}
            className={`ndg__attempts-dot ${active ? "ndg__attempts-dot--active" : "ndg__attempts-dot--used"}`}
          />
        ))}
      </div>
      <span className="ndg__attempts-label">
        {remaining === 0
          ? "Sin intentos restantes"
          : `${remaining} ${remaining === 1 ? "intento" : "intentos"} restante${remaining === 1 ? "" : "s"}`}
      </span>
    </div>
  );
};

const NailDesignGenerator = ({ onBookWithDesign }) => {
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(MAX_GENERATIONS);

  const canGenerate = selectedColor && selectedStyle && remaining > 0;

  const handleGenerate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setRemaining((prev) => Math.max(0, prev - 1));

    const res = await api.generateNailDesign(
      selectedColor,
      selectedStyle,
      null,
    );

    if (res.success) {
      setResult({ imageUrl: res.imageUrl });
    } else {
      setError(res.error || "Ocurrió un error. Intentá de nuevo.");
      // si el error es de rate limit, el backend manda remaining: 0 y lo respetamos
      if (res.remaining !== undefined) setRemaining(res.remaining);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  return (
    <div className="ndg">
      {!result ? (
        <>
          {/* Color picker */}
          <div className="ndg__section">
            <div className="ndg__section-label">Color</div>
            <div className="ndg__colors">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`ndg__color ${selectedColor === c.id ? "ndg__color--selected" : ""}`}
                  onClick={() => setSelectedColor(c.id)}
                  title={c.label}
                >
                  <span className="ndg__color-swatch" style={{ background: c.hex }} />
                  <span className="ndg__color-label">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style picker */}
          <div className="ndg__section">
            <div className="ndg__section-label">Estilo</div>
            <div className="ndg__styles">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`ndg__style ${selectedStyle === s.id ? "ndg__style--selected" : ""}`}
                  onClick={() => setSelectedStyle(s.id)}
                >
                  <span className="ndg__style-icon">{s.icon}</span>
                  <span className="ndg__style-label">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="ndg__error">{error}</div>}

          {remaining < MAX_GENERATIONS && <AttemptsIndicator remaining={remaining} />}

          <button
            className={[
              "ndg__btn-generate",
              canGenerate && !loading ? "ndg__btn-generate--ready" : "",
              loading ? "ndg__btn-generate--loading" : "",
            ].join(" ")}
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
          >
            {loading ? (
              <span className="ndg__generating">
                <span className="ndg__dots">
                  <span /><span /><span />
                </span>
                Creando tu diseño
              </span>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path
                    d="M7.5 1L9.5 5.5L14 6.5L10.5 10L11.5 14.5L7.5 12.5L3.5 14.5L4.5 10L1 6.5L5.5 5.5L7.5 1Z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                  />
                </svg>
                Generar diseño
              </>
            )}
          </button>

          {loading && (
            <p className="ndg__loading-note">
              La IA está creando tu diseño, puede tardar unos segundos ✨
            </p>
          )}
        </>
      ) : (
        /* Result screen */
        <div className="ndg__result fade-in">
          <div className="ndg__result-img-wrap">
            <img
              src={result.imageUrl}
              alt="Diseño generado"
              className="ndg__result-img"
            />
          </div>

          <div className="ndg__result-info">
            <div className="ndg__result-tags">
              {selectedColor && (
                <span className="ndg__tag">
                  {COLORS.find((c) => c.id === selectedColor)?.label}
                </span>
              )}
              {selectedStyle && (
                <span className="ndg__tag">
                  {STYLES.find((s) => s.id === selectedStyle)?.label}
                </span>
              )}
            </div>
          </div>

          <AttemptsIndicator remaining={remaining} />

          <div className="ndg__result-actions">
            <button
              className="ndg__btn-book"
              onClick={() =>
                onBookWithDesign({
                  color: COLORS.find((c) => c.id === selectedColor)?.label,
                  style: STYLES.find((s) => s.id === selectedStyle)?.label,
                  imageUrl: result.imageUrl,
                })
              }
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1" />
                <path d="M1 5.5H13M4.5 1V3M9.5 1V3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Sacar turno con este diseño
            </button>

            {/* Siempre se muestra: "Generar otro" si quedan intentos, "Volver" si no */}
            <button className="ndg__btn-retry" onClick={handleReset}>
              {remaining > 0 ? "Generar otro" : "Volver"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NailDesignGenerator;