import { useState } from "react";

const C = {
  bg: "#F5F0EB",
  bgCard: "#FDFAF7",
  bgCardAlt: "#F0EBE3",
  border: "#DDD5C8",
  borderLight: "#EAE3D9",
  text: "#2C2416",
  textMid: "#6B5E4E",
  textLight: "#9E8E7E",
  accent: "#5C4B32",
  accentWarm: "#8B6C42",
  green: "#2D6A4F",
  greenBg: "#EAF4EE",
  greenBorder: "#A8D5B5",
  yellow: "#92650A",
  yellowBg: "#FDF3DC",
  yellowBorder: "#E8C97A",
  red: "#8B2635",
  redBg: "#FAEAEC",
  redBorder: "#D4909A",
};

const RISK = {
  green: { label: "OPERACIÓN NORMAL", color: C.green, bg: C.greenBg, border: C.greenBorder, action: "Continuar operación. Programar próxima inspección según calendario establecido.", icon: "●" },
  yellow: { label: "INSPECCIÓN REQUERIDA", color: C.yellow, bg: C.yellowBg, border: C.yellowBorder, action: "Programar inspección técnica en los próximos 15 días. Aumentar frecuencia de monitoreo.", icon: "◆" },
  red: { label: "RIESGO CRÍTICO", color: C.red, bg: C.redBg, border: C.redBorder, action: "Detener operación de inmediato. Requiere reparación antes de retomar servicio.", icon: "■" },
};

const LOAD_TYPES = ["Carga estática", "Carga dinámica leve", "Carga dinámica severa", "Carga de impacto"];
const MATERIALS = ["AISI 316L", "AISI 304", "ASTM A514 Gr B", "ASTM A36 Gr 50", "ASTM A572 Gr 50", "AR400", "AR450", "AR500", "Strenx 700"];
const ENV_CONDITIONS = [
  "Minería a cielo abierto — clima seco (Cerrejón)",
  "Minería a cielo abierto — clima húmedo (Drummond / Calenturitas)",
  "Taller — exterior / intemperie (Barranquilla)",
  "Taller — interior ventilado (Barranquilla)",
];

const SINTOMAS = [
  { key: "grietasVisibles", label: "Grietas visibles en soldadura", penalty: 0.15 },
  { key: "deformaciones", label: "Deformaciones plásticas", penalty: 0.10 },
  { key: "corrosion", label: "Corrosión superficial", penalty: 0.06 },
  { key: "ruidosAnomales", label: "Ruidos anómalos en operación", penalty: 0.05 },
  { key: "perdidaRigidez", label: "Pérdida de rigidez percibida", penalty: 0.04 },
];

function GaugeChart({ percent, color }) {
  const r = 64;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = arc * (percent / 100);
  const offset = circ * 0.125;
  return (
    <svg width="170" height="130" viewBox="0 0 170 130">
      <circle cx="85" cy="92" r={r} fill="none" stroke={C.borderLight} strokeWidth="12"
        strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={-offset} strokeLinecap="round" />
      <circle cx="85" cy="92" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={-offset} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x="85" y="88" textAnchor="middle" fill={C.text} fontSize="30"
        fontFamily="Georgia, serif" fontWeight="700">{percent}%</text>
      <text x="85" y="106" textAnchor="middle" fill={C.textLight} fontSize="9"
        fontFamily="Georgia, serif" letterSpacing="2">VIDA ÚTIL RESTANTE</text>
    </svg>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ height: 6, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 1s ease" }} />
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    horasUso: "", vidaDiseno: "", tiposCarga: "", material: "",
    condicion: "", temperatura: "",
    grietasVisibles: false, deformaciones: false, corrosion: false,
    ruidosAnomales: false, perdidaRigidez: false, descripcionLibre: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function calcular() {
    const horasUso = parseFloat(form.horasUso) || 0;
    const vidaDiseno = parseFloat(form.vidaDiseno) || 1;
    const usoPct = horasUso / vidaDiseno;
    const loadPenalty = { "Carga estática": 0.0, "Carga dinámica leve": 0.08, "Carga dinámica severa": 0.18, "Carga de impacto": 0.30 }[form.tiposCarga] ?? 0.05;
    const loadF = loadPenalty; // kept for display
    const envPenalty = {
      "Minería a cielo abierto — clima seco (Cerrejón)": 0.10,
      "Minería a cielo abierto — clima húmedo (Drummond / Calenturitas)": 0.15,
      "Taller — exterior / intemperie (Barranquilla)": 0.04,
      "Taller — interior ventilado (Barranquilla)": 0.0,
    }[form.condicion] ?? 0.0;
    const envF = envPenalty;
    const tempPenalty = parseFloat(form.temperatura) > 100 ? 0.10 : 0.0;
    const sintomasPenalty = SINTOMAS.reduce((acc, s) => acc + (form[s.key] ? s.penalty : 0), 0);
    const dano = Math.min(usoPct + loadPenalty + envPenalty + tempPenalty + sintomasPenalty, 1.0);
    const vidaRestante = Math.max(Math.round((1 - dano) * 100), 0);
    const riskLevel = vidaRestante >= 50 ? "green" : vidaRestante >= 20 ? "yellow" : "red";
    return { vidaRestante, riskLevel, dano, sintomasPenalty, usoPct, loadF, envF };
  }

  async function analizar() {
    setLoading(true);
    const calc = calcular();
    const sintomasActivos = SINTOMAS.filter(s => form[s.key]).map(s => s.label);
    const prompt = `Eres un ingeniero experto en integridad estructural de maquinaria pesada con 20 años de experiencia en análisis de fatiga en estructuras soldadas.

DATOS DEL COMPONENTE:
- Horas operación: ${form.horasUso}h de ${form.vidaDiseno}h de vida de diseño (${Math.round(calc.usoPct * 100)}% consumido)
- Tipo de carga: ${form.tiposCarga}
- Material: ${form.material}
- Condición ambiental: ${form.condicion}
- Temperatura: ${form.temperatura}°C
- Síntomas observados: ${sintomasActivos.length > 0 ? sintomasActivos.join(", ") : "ninguno"}
${form.descripcionLibre ? `- Observaciones: ${form.descripcionLibre}` : ""}

MODELO (Ley de Miner): D = ${calc.dano.toFixed(3)} — Vida restante: ${calc.vidaRestante}% — Riesgo: ${calc.riskLevel.toUpperCase()}

Proporciona análisis técnico breve con:
1. DIAGNÓSTICO (2-3 oraciones sobre el estado actual)
2. FACTORES CRÍTICOS (3 bullets con los factores que más afectan la vida útil)
3. RECOMENDACIÓN TÉCNICA (acción específica con criterio de ingeniería)

Tono técnico y profesional. Máximo 180 palabras.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const aiText = data.content?.map(b => b.text || "").join("\n") || "No se pudo obtener análisis.";
      setResult({ ...calc, aiText });
    } catch {
      setResult({ ...calc, aiText: "Error de conexión. Los valores calculados siguen siendo válidos." });
    }
    setLoading(false);
    setStep(3);
  }

  const S = {
    app: { minHeight: "100vh", background: C.bg, fontFamily: "Georgia, serif", color: C.text },
    header: {
      background: C.accent, padding: "18px 40px",
      display: "flex", alignItems: "center", gap: 14,
    },
    logoBox: {
      width: 38, height: 38, background: "rgba(255,255,255,0.12)",
      borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, color: "white",
    },
    headerTitle: { fontSize: 14, letterSpacing: 3, color: "white", fontWeight: "bold" },
    headerSub: { fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.55)", marginTop: 3 },
    container: { maxWidth: 700, margin: "0 auto", padding: "40px 24px" },
    steps: { display: "flex", alignItems: "center", marginBottom: 36 },
    card: {
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 28, marginBottom: 16,
      boxShadow: "0 1px 4px rgba(44,36,22,0.06)",
    },
    sectionLabel: {
      fontSize: 9, letterSpacing: 3, color: C.accentWarm,
      marginBottom: 20, display: "block", textTransform: "uppercase",
    },
    label: { fontSize: 10, color: C.textLight, marginBottom: 6, display: "block", letterSpacing: 1 },
    input: {
      width: "100%", background: C.bg,
      border: `1px solid ${C.border}`, borderRadius: 7,
      color: C.text, padding: "10px 14px", fontSize: 13,
      fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box",
    },
    select: {
      width: "100%", background: C.bg,
      border: `1px solid ${C.border}`, borderRadius: 7,
      color: C.text, padding: "10px 14px", fontSize: 13,
      fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box",
    },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
    btn: {
      width: "100%", padding: "14px 0",
      background: C.accent, border: "none", borderRadius: 9,
      color: "white", fontSize: 11, letterSpacing: 3,
      fontFamily: "Georgia, serif", cursor: "pointer",
      fontWeight: "bold", marginTop: 8,
    },
    btnBack: {
      padding: "11px 22px", background: "transparent",
      border: `1px solid ${C.border}`, borderRadius: 8,
      color: C.textMid, fontSize: 10, letterSpacing: 2,
      fontFamily: "Georgia, serif", cursor: "pointer",
    },
  };

  const stepNames = ["DATOS OPERACIONALES", "INSPECCIÓN VISUAL", "DIAGNÓSTICO"];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.logoBox}>⚙</div>
        <div>
          <div style={S.headerTitle}>STRUCTURAL LIFE PREDICTOR</div>
          <div style={S.headerSub}>ANÁLISIS DE FATIGA · ESTRUCTURAS SOLDADAS · MAQUINARIA PESADA</div>
        </div>
      </div>

      <div style={S.container}>
        {/* Step indicator */}
        <div style={S.steps}>
          {stepNames.map((name, i) => (
            <div key={name} style={{ display: "flex", alignItems: "center", flex: i < stepNames.length - 1 ? 1 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: step >= i + 1 ? 1 : 0.35 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: step > i + 1 ? C.accentWarm : step === i + 1 ? C.accent : "transparent",
                  border: `2px solid ${step >= i + 1 ? C.accent : C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: step >= i + 1 ? "white" : C.textMid, flexShrink: 0,
                }}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 10, letterSpacing: 2, color: step === i + 1 ? C.accent : C.textLight, fontWeight: step === i + 1 ? "bold" : "normal" }}>
                  {name}
                </span>
              </div>
              {i < stepNames.length - 1 && (
                <div style={{ flex: 1, height: 1, background: C.border, margin: "0 12px" }} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div style={S.card}>
              <span style={S.sectionLabel}>01 · Parámetros de Operación</span>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>HORAS DE USO ACUMULADAS</label>
                  <input style={S.input} type="number" placeholder="ej: 4500"
                    value={form.horasUso} onChange={e => set("horasUso", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>VIDA DE DISEÑO (HORAS)</label>
                  <input style={S.input} type="number" placeholder="ej: 10000"
                    value={form.vidaDiseno} onChange={e => set("vidaDiseno", e.target.value)} />
                </div>
              </div>
              {form.horasUso && form.vidaDiseno && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: C.textLight, letterSpacing: 1 }}>USO OPERACIONAL</span>
                    <span style={{ fontSize: 10, color: C.accentWarm, fontWeight: "bold" }}>
                      {Math.round((parseFloat(form.horasUso) / parseFloat(form.vidaDiseno)) * 100)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={parseFloat(form.horasUso)} max={parseFloat(form.vidaDiseno)}
                    color={parseFloat(form.horasUso) / parseFloat(form.vidaDiseno) < 0.6 ? C.green : parseFloat(form.horasUso) / parseFloat(form.vidaDiseno) < 0.85 ? C.yellow : C.red}
                  />
                </div>
              )}
            </div>

            <div style={S.card}>
              <span style={S.sectionLabel}>02 · Condiciones de Servicio</span>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>TIPO DE CARGA PREDOMINANTE</label>
                <select style={S.select} value={form.tiposCarga} onChange={e => set("tiposCarga", e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {LOAD_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>MATERIAL BASE</label>
                  <select style={S.select} value={form.material} onChange={e => set("material", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {MATERIALS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>CONDICIÓN AMBIENTAL</label>
                  <select style={S.select} value={form.condicion} onChange={e => set("condicion", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {ENV_CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={S.label}>TEMPERATURA DE OPERACIÓN (°C)</label>
                <input style={S.input} type="number" placeholder="ej: 45"
                  value={form.temperatura} onChange={e => set("temperatura", e.target.value)} />
              </div>
            </div>
            <button style={S.btn} onClick={() => setStep(2)}>CONTINUAR → INSPECCIÓN VISUAL</button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <div style={S.card}>
              <span style={S.sectionLabel}>03 · Síntomas Observados</span>
              <p style={{ fontSize: 12, color: C.textLight, marginBottom: 18, lineHeight: 1.6 }}>
                Marque todos los síntomas visualmente identificados en el componente durante la inspección.
              </p>
              {SINTOMAS.map(s => (
                <div key={s.key}
                  onClick={() => set(s.key, !form[s.key])}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 14px", borderRadius: 8, cursor: "pointer", marginBottom: 8,
                    background: form[s.key] ? "#EEE7DC" : C.bg,
                    border: `1px solid ${form[s.key] ? C.accentWarm : C.borderLight}`,
                    transition: "all 0.2s",
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${form[s.key] ? C.accentWarm : C.border}`,
                    background: form[s.key] ? C.accentWarm : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "white",
                  }}>
                    {form[s.key] && "✓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: C.text }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>
                      Penalidad: +{Math.round(s.penalty * 100)}% de daño acumulado
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <span style={S.sectionLabel}>04 · Observaciones del Operador</span>
              <label style={S.label}>DESCRIPCIÓN LIBRE (OPCIONAL)</label>
              <textarea
                style={{ ...S.input, minHeight: 90, resize: "vertical", lineHeight: 1.6 }}
                placeholder="Describa cualquier anomalía adicional observada..."
                value={form.descripcionLibre}
                onChange={e => set("descripcionLibre", e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button style={S.btnBack} onClick={() => setStep(1)}>← Volver</button>
              <button style={{ ...S.btn, flex: 1, marginTop: 0 }} onClick={analizar} disabled={loading}>
                {loading ? "ANALIZANDO COMPONENTE..." : "GENERAR DIAGNÓSTICO →"}
              </button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && result && (() => {
          const risk = RISK[result.riskLevel];
          return (
            <>
              <div style={{
                ...S.card, background: risk.bg,
                border: `1px solid ${risk.border}`,
                textAlign: "center", padding: "36px 28px",
              }}>
                <div style={{
                  display: "inline-block", padding: "5px 18px",
                  background: "rgba(255,255,255,0.6)", border: `1px solid ${risk.border}`,
                  borderRadius: 20, marginBottom: 20,
                }}>
                  <span style={{ fontSize: 10, letterSpacing: 3, color: risk.color, fontWeight: "bold" }}>
                    {risk.icon} {risk.label}
                  </span>
                </div>

                <GaugeChart percent={result.vidaRestante} color={risk.color} />

                <div style={{ maxWidth: 380, margin: "20px auto 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: C.textLight, letterSpacing: 1 }}>DAÑO ACUMULADO — LEY DE MINER</span>
                    <span style={{ fontSize: 10, color: risk.color, fontWeight: "bold" }}>D = {result.dano.toFixed(3)}</span>
                  </div>
                  <ProgressBar value={result.dano * 100} max={100} color={risk.color} />
                  <div style={{ fontSize: 10, color: C.textLight, marginTop: 6, textAlign: "left" }}>
                    Falla estructural cuando D ≥ 1.000
                  </div>
                </div>

                <div style={{
                  marginTop: 24, padding: "14px 20px",
                  background: "rgba(255,255,255,0.6)", borderRadius: 8,
                  border: `1px solid ${risk.border}`, textAlign: "left",
                  maxWidth: 420, margin: "24px auto 0",
                }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: risk.color, marginBottom: 6 }}>ACCIÓN RECOMENDADA</div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{risk.action}</div>
                </div>
              </div>

              <div style={S.card}>
                <span style={S.sectionLabel}>Resumen de Factores</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Uso Operacional", value: `${Math.round(result.usoPct * 100)}%`, sub: "horas consumidas" },
                    { label: "Factor de Carga", value: `×${result.loadF.toFixed(1)}`, sub: "multiplicador" },
                    { label: "Penalidad Síntomas", value: `+${Math.round(result.sintomasPenalty * 100)}%`, sub: "daño adicional" },
                  ].map(f => (
                    <div key={f.label} style={{
                      textAlign: "center", padding: "16px 10px",
                      background: C.bgCardAlt, borderRadius: 8, border: `1px solid ${C.borderLight}`,
                    }}>
                      <div style={{ fontSize: 22, fontWeight: "bold", color: C.accent }}>{f.value}</div>
                      <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>{f.label}</div>
                      <div style={{ fontSize: 9, color: C.textLight, marginTop: 2, letterSpacing: 1 }}>{f.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={S.card}>
                <span style={S.sectionLabel}>Análisis IA · Ingeniero Estructural</span>
                <div style={{
                  fontSize: 13, lineHeight: 1.9, color: C.textMid,
                  whiteSpace: "pre-wrap", borderLeft: `3px solid ${C.accentWarm}`,
                  paddingLeft: 18,
                }}>
                  {result.aiText}
                </div>
              </div>

              <button style={S.btn} onClick={() => {
                setStep(1); setResult(null);
                setForm({ horasUso: "", vidaDiseno: "", tiposCarga: "", material: "", condicion: "", temperatura: "", grietasVisibles: false, deformaciones: false, corrosion: false, ruidosAnomales: false, perdidaRigidez: false, descripcionLibre: "" });
              }}>
                NUEVO ANÁLISIS
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );
}
