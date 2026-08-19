import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type QuotationPageData } from "../../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = (n: number) => `$${n.toLocaleString("es-CO")}`;

const MESES = ["","enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth() + 1]} de ${d.getUTCFullYear()}`;
}

function fmtDateShort(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth() + 1]?.slice(0, 3)} ${d.getUTCFullYear()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuotationPage() {
  const { quotationNumber } = useParams<{ quotationNumber: string }>();
  const [data, setData]     = useState<QuotationPageData | null>(null);
  const [error, setError]   = useState(false);

  useEffect(() => {
    if (!quotationNumber) return;
    api.quotations.getPage(quotationNumber)
      .then(setData)
      .catch(() => setError(true));
  }, [quotationNumber]);

  if (error) return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", padding: "80px 24px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Cotización no encontrada</h1>
      <p style={{ color: "#6B7280" }}>El número <strong>{quotationNumber}</strong> no existe o ya no está disponible.</p>
    </div>
  );

  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", color: "#6B7280" }}>
      Cargando cotización...
    </div>
  );

  const firstItem    = data.items[0] ?? null;
  const firstMachine = firstItem?.machine ?? null;
  const advisorName  = data.advisor?.name  ?? "Equipo Comercial";
  const advisorEmail = data.advisor?.email ?? "comercial@coninmaq.com";
  const advisorPhone = data.advisor?.phone ?? "+57 316 381 5694";
  const waAccept = `https://wa.me/573163815694?text=Hola%2C+quiero+avanzar+con+la+cotizaci%C3%B3n+${data.quotation_number}`;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --yellow: #FFC837; --black: #111111;
          --gray-1: #374151; --gray-2: #6B7280; --gray-3: #9CA3AF;
          --gray-4: #E8E6E3; --bg: #FAFAF9; --white: #FFFFFF; --radius: 10px;
        }
        html { scroll-behavior: smooth; }
        body { font-family: 'Poppins', sans-serif; color: var(--black); background: var(--bg); -webkit-font-smoothing: antialiased; line-height: 1.6; }
        img, video { display: block; max-width: 100%; }
        a { color: inherit; }

        .topbar { position: sticky; top: 0; z-index: 100; background: rgba(250,250,249,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--gray-4); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 60px; }
        .topbar__logo { height: 32px; width: auto; display: block; }
        .topbar__meta { font-size: 12px; color: var(--gray-2); }

        .hero { display: grid; grid-template-columns: 1fr 1fr; min-height: 88vh; max-height: 860px; }
        .hero__left { position: relative; overflow: hidden; background: var(--gray-4); }
        .hero__left img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
        .hero__right { background: var(--white); display: flex; flex-direction: column; justify-content: space-between; padding: 56px 52px; }
        .hero__greeting { font-size: 14px; color: var(--gray-2); line-height: 1.8; margin-bottom: 32px; }
        .hero__greeting strong { color: var(--black); font-weight: 600; }
        .hero__detail { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid var(--gray-4); gap: 16px; }
        .hero__detail:last-child { border-bottom: none; }
        .hero__detail-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: var(--gray-3); flex-shrink: 0; }
        .hero__detail-value { font-size: 13px; font-weight: 500; color: var(--black); text-align: right; }
        .hero__validity { margin-top: 32px; padding: 16px 20px; background: #FFF8E7; border-left: 3px solid var(--yellow); border-radius: 0 6px 6px 0; font-size: 12px; color: var(--gray-1); line-height: 1.6; }
        .hero__validity strong { color: var(--black); }

        .container { max-width: 960px; margin: 0 auto; padding: 0 24px; }
        .section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 40px; }
        .section-header__num { width: 32px; height: 32px; border-radius: 50%; background: var(--black); color: var(--white); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .section-header__label { font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: var(--gray-3); margin-bottom: 2px; }
        .section-header__title { font-size: 28px; font-weight: 700; color: var(--black); line-height: 1.2; }
        .s-divider { border: none; border-top: 1px solid var(--gray-4); margin: 0; }

        .s-statband { background: var(--black); border-top: 1px solid rgba(255,255,255,.06); }
        .s-statband__inner { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        .s-statband__stat { padding: 44px 32px; border-right: 1px solid rgba(255,255,255,.07); text-align: center; }
        .s-statband__stat:last-child { border-right: none; }
        .s-statband__value { font-size: clamp(28px,3.5vw,48px); font-weight: 900; color: var(--yellow); line-height: 1; letter-spacing: -1px; margin-bottom: 10px; }
        .s-statband__label { font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(255,255,255,.35); }

        .s-intro { background: var(--white); overflow: hidden; }
        .s-intro__inner { display: grid; grid-template-columns: 1fr 1fr; min-height: 520px; }
        .s-intro__image { overflow: hidden; background: var(--gray-4); position: relative; }
        .s-intro__image img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
        .s-intro__overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.18) 55%, transparent 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 36px 32px; }
        .s-intro__badge { display: inline-flex; align-items: center; gap: 6px; background: var(--yellow); color: var(--black); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 14px; border-radius: 100px; width: fit-content; margin-bottom: 20px; }
        .s-intro__content { padding: 56px 52px; display: flex; flex-direction: column; justify-content: space-between; }
        .s-intro__ministats { display: flex; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--gray-4); }
        .s-intro__ministat { flex: 1; padding: 0 20px; border-right: 1px solid var(--gray-4); }
        .s-intro__ministat:first-child { padding-left: 0; }
        .s-intro__ministat:last-child { border-right: none; }
        .s-intro__ministat-value { font-size: 26px; font-weight: 900; color: var(--black); line-height: 1; margin-bottom: 5px; }
        .s-intro__ministat-label { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--gray-3); }
        .s-intro__hi { font-size: 24px; font-weight: 700; margin-bottom: 8px; line-height: 1.2; }
        .s-intro__company { font-size: 13px; font-weight: 600; color: var(--gray-2); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
        .s-intro__sub { font-size: 14px; color: var(--gray-1); line-height: 1.8; margin-bottom: 28px; }
        .s-intro__bullets { list-style: none; display: flex; flex-direction: column; }
        .s-intro__bullets li { display: flex; align-items: flex-start; gap: 12px; padding: 13px 0; border-bottom: 1px solid var(--gray-4); font-size: 13px; color: var(--gray-1); line-height: 1.5; }
        .s-intro__bullets li:last-child { border-bottom: none; }
        .s-intro__check { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--black); color: var(--white); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
        .s-intro__firma { padding-top: 24px; border-top: 1px solid var(--gray-4); margin-top: 8px; }
        .s-intro__firma-nombre { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        .s-intro__firma-cargo { font-size: 11px; color: var(--gray-3); margin-bottom: 10px; }
        .s-intro__firma-links { display: flex; flex-wrap: wrap; gap: 4px 16px; }
        .s-intro__firma-links a { font-size: 12px; color: var(--gray-2); text-decoration: none; }

        .s-about { padding: 80px 0; }
        .s-about__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
        .s-about__body { font-size: 15px; color: var(--gray-1); line-height: 1.85; }
        .s-about__spec { display: grid; grid-template-columns: 1fr auto; padding: 14px 0; border-bottom: 1px solid var(--gray-4); align-items: center; gap: 16px; }
        .s-about__spec:first-child { border-top: 1px solid var(--gray-4); }
        .s-about__spec-name { font-size: 13px; color: var(--gray-2); }
        .s-about__spec-val { font-size: 13px; font-weight: 600; text-align: right; }

        .s-features { padding: 80px 0; background: var(--black); }
        .s-features .section-header__num { background: var(--yellow); color: var(--black); }
        .s-features .section-header__label { color: rgba(255,255,255,.35); }
        .s-features .section-header__title { color: var(--white); }
        .s-features__intro { font-size: 15px; color: rgba(255,255,255,.45); max-width: 540px; margin-bottom: 40px; line-height: 1.75; }
        .s-features__grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 1px; }
        .s-features__card { padding: 40px 36px; background: #161616; border: 1px solid rgba(255,255,255,.06); border-left: 3px solid var(--yellow); min-height: 140px; display: flex; align-items: center; transition: background .25s; }
        .s-features__card:hover { background: #1e1e1e; }
        .s-features__name { font-size: 18px; font-weight: 600; color: var(--white); line-height: 1.45; }

        .s-video { padding: 80px 0; background: var(--black); }
        .s-video .section-header__num { background: var(--yellow); color: var(--black); }
        .s-video .section-header__label { color: rgba(255,255,255,.35); }
        .s-video .section-header__title { color: var(--white); }
        .s-video__wrap { width: 100%; border-radius: var(--radius); overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,.5); display: flex; justify-content: center; background: #000; }
        .s-video__wrap video { display: block; width: 100%; height: auto; max-height: 80vh; object-fit: contain; }

        .s-brochure { padding: 80px 0; }
        .s-brochure__frame { width: 100%; aspect-ratio: 297/210; border-radius: var(--radius); overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,.1); border: 1px solid var(--gray-4); }
        .s-brochure__frame iframe { width: 100%; height: 100%; border: none; display: block; }
        .s-brochure__dl { display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; font-size: 13px; font-weight: 600; text-decoration: none; border-bottom: 2px solid var(--yellow); padding-bottom: 2px; }

        .s-investment { padding: 80px 0; background: var(--white); }
        .s-investment__card { background: var(--black); border-radius: var(--radius); padding: 64px 64px 56px; color: var(--white); display: grid; grid-template-columns: 1fr auto; gap: 56px; align-items: start; }
        .s-investment__row { display: flex; justify-content: space-between; padding: 18px 0; border-bottom: 1px solid rgba(255,255,255,.1); font-size: 16px; color: rgba(255,255,255,.6); }
        .s-investment__row span:last-child { font-weight: 500; color: rgba(255,255,255,.85); }
        .s-investment__total { display: flex; justify-content: space-between; align-items: baseline; padding: 28px 0 0; gap: 16px; }
        .s-investment__total-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,.4); margin-bottom: 10px; }
        .s-investment__total-amount { font-size: clamp(40px,5vw,64px); font-weight: 900; color: var(--yellow); line-height: 1; letter-spacing: -2px; }
        .s-investment__total-currency { font-size: 20px; color: rgba(255,255,255,.4); font-weight: 400; margin-left: 8px; }
        .s-investment__right { display: flex; flex-direction: column; gap: 20px; padding-top: 8px; }
        .s-investment__validity-note { font-size: 13px; color: rgba(255,255,255,.35); line-height: 1.7; max-width: 220px; text-align: right; }
        .s-investment__cta { display: inline-block; background: var(--yellow); color: var(--black); font-size: 14px; font-weight: 700; padding: 18px 32px; border-radius: 8px; text-decoration: none; text-align: center; }

        .s-conditions { padding: 80px 0; background: var(--bg); }
        .s-conditions__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 56px; }
        .s-conditions__card { background: var(--white); border: 1px solid var(--gray-4); border-radius: var(--radius); padding: 32px 36px; }
        .s-conditions__card-title { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--gray-3); margin-bottom: 14px; }
        .s-conditions__card-body { font-size: 14px; color: var(--gray-1); line-height: 1.8; }
        .s-conditions__warranty { background: var(--black); border-radius: var(--radius); padding: 48px 56px; }
        .s-conditions__warranty-title { font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: var(--yellow); margin-bottom: 12px; }
        .s-conditions__warranty-heading { font-size: 22px; font-weight: 700; color: var(--white); margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,.1); }
        .s-conditions__warranty-body { font-size: 15px; color: rgba(255,255,255,.7); line-height: 1.9; }
        .s-conditions__warranty-body strong { color: var(--yellow); font-weight: 600; }

        .s-footer { background: var(--black); padding: 64px 0 40px; }
        .s-footer__inner { max-width: 960px; margin: 0 auto; padding: 0 32px; }
        .s-footer__top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 40px; padding-bottom: 48px; border-bottom: 1px solid rgba(255,255,255,.1); }
        .s-footer__logo { height: 36px; width: auto; display: block; margin-bottom: 16px; }
        .s-footer__tagline { font-size: 13px; color: rgba(255,255,255,.4); line-height: 1.7; max-width: 260px; }
        .s-footer__headline { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.3px; margin-bottom: 8px; max-width: 260px; }
        .s-footer__col-title { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(255,255,255,.3); margin-bottom: 16px; }
        .s-footer__links { display: flex; flex-direction: column; gap: 10px; }
        .s-footer__link { font-size: 13px; color: rgba(255,255,255,.55); text-decoration: none; transition: color .15s; }
        .s-footer__link:hover { color: var(--yellow); }
        .s-footer__wa { display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; background: #25D366; color: #fff; font-size: 12px; font-weight: 600; padding: 10px 18px; border-radius: 6px; text-decoration: none; }
        .s-footer__bottom { padding-top: 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .s-footer__copy { font-size: 12px; color: rgba(255,255,255,.25); }
        .s-footer__legal { font-size: 12px; color: rgba(255,255,255,.25); }

        @media (max-width: 768px) {
          .topbar { padding: 0 20px; } .topbar__meta { display: none; }
          .hero { grid-template-columns: 1fr; min-height: auto; max-height: none; }
          .hero__left { min-height: 55vw; }
          .hero__right { padding: 32px 24px; }
          .container { padding: 0 20px; }
          .s-statband__inner { grid-template-columns: 1fr 1fr; }
          .s-statband__stat { padding: 32px 20px; }
          .s-intro__inner { grid-template-columns: 1fr; min-height: auto; }
          .s-intro__image { min-height: 260px; max-height: 320px; }
          .s-intro__content { padding: 32px 20px; }
          .s-intro__ministats { flex-direction: column; gap: 0; border-bottom: none; margin-bottom: 20px; padding-bottom: 0; }
          .s-intro__ministat { padding: 10px 0; border-right: none; border-bottom: 1px solid var(--gray-4); }
          .s-intro__ministat:last-child { border-bottom: none; }
          .s-intro__ministat-value { font-size: 20px; }
          .s-intro__hi { font-size: 20px; }
          .section-header__title { font-size: 22px; }
          .s-about { padding: 48px 0; } .s-about__grid { grid-template-columns: 1fr; gap: 32px; }
          .s-features { padding: 48px 0; } .s-features__grid { grid-template-columns: 1fr !important; }
          .s-features__card { padding: 28px 24px; min-height: auto; }
          .s-features__name { font-size: 15px; }
          .s-video { padding: 48px 0; }
          .s-brochure { padding: 48px 0; }
          .s-investment { padding: 48px 0; }
          .s-investment__card { grid-template-columns: 1fr; padding: 32px 20px; gap: 32px; }
          .s-investment__total-amount { font-size: 40px; }
          .s-investment__right { align-items: flex-start; }
          .s-investment__validity-note { text-align: left; max-width: none; }
          .s-conditions { padding: 48px 0; }
          .s-conditions__grid { grid-template-columns: 1fr; gap: 16px; }
          .s-conditions__warranty { padding: 32px 20px; }
          .s-footer__inner { padding: 0 20px; }
          .s-footer__top { flex-direction: column; gap: 32px; }
          .s-footer__tagline { max-width: none; }
        }
        @media (max-width: 480px) {
          .s-features__grid { grid-template-columns: 1fr !important; }
          .s-gallery__grid { grid-template-columns: 1fr; }
          .hero__machine { font-size: 36px; }
          .s-intro__sub { font-size: 13px; }
          .s-intro__bullets li { font-size: 12px; }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />

      {/* Topbar */}
      <nav className="topbar">
        <a href="https://coninmaqsas.com" target="_blank" rel="noopener">
          <img className="topbar__logo" src="/logo.png" alt="CONINMAQ" />
        </a>
        <span className="topbar__meta">{data.quotation_number} · Válida hasta {fmtDateShort(data.expires_at)}</span>
      </nav>


      {/* Intro con imagen */}
      <section className="s-intro">
        <div className="s-intro__inner">
          <div className="s-intro__image">
            {firstMachine?.image_url
              ? <img src={firstMachine.image_url} alt={firstMachine.code} />
              : <div style={{ background: "var(--gray-4)", width: "100%", height: "100%" }} />
            }
          </div>
          <div className="s-intro__content">
            <div>
              <p className="s-intro__hi">Hola, <strong>{data.client?.name ?? data.client?.representative ?? "cliente"}</strong> 👋</p>
              {data.client?.company && (
                <p className="s-intro__company">{data.client.company}</p>
              )}
              <p className="s-intro__sub">Todo lo que necesitas para decir sí con confianza está en esta oferta comercial: precio, ficha técnica, garantía y el respaldo de quienes más saben de maquinaria pesada en Colombia. Nuestro equipo comercial está listo para acompañarle en cada paso.</p>
              <div className="s-intro__ministats">
                {[
                  { value: "+10",  label: "Años de experiencia" },
                  { value: "+500", label: "Máquinas vendidas" },
                  { value: "#1",   label: "En posventa en Colombia" },
                ].map((s, i) => (
                  <div key={i} className="s-intro__ministat">
                    <p className="s-intro__ministat-value">{s.value}</p>
                    <p className="s-intro__ministat-label">{s.label}</p>
                  </div>
                ))}
              </div>
              <ul className="s-intro__bullets">
                {[
                  <>Equipos de <strong>alta calidad probados en Colombia</strong> — minas, canteras y obras de las condiciones más severas del país</>,
                  <>Componentes <strong>compatibles con el mercado nacional</strong>: motor, bombas hidráulicas y motores de traslación de marcas reconocidas</>,
                  <>Soporte técnico <strong>profesional y especializado</strong> — técnicos certificados, respuesta oportuna y seguimiento real postventa</>,
                  <>Más de <strong>10 años</strong> respaldando operaciones en construcción, minería e industria a nivel nacional</>,
                  <><strong>Repuestos originales</strong> disponibles en todo el país — para que su equipo no pare cuando más lo necesita</>,
                ].map((txt, i) => (
                  <li key={i}>
                    <span className="s-intro__check">✓</span>
                    <span>{txt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="s-intro__firma">
              <p className="s-intro__firma-nombre">{advisorName}</p>
              <p className="s-intro__firma-cargo">Asesor Comercial · CONINMAQ S.A.S</p>
              <div className="s-intro__firma-links">
                <a href={`tel:${advisorPhone}`}>{advisorPhone}</a>
                <a href={`mailto:${advisorEmail}`}>{advisorEmail}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="s-divider" />

      {/* Secciones por equipo */}
      {data.items.map((item, idx) => item.machine && (
        <div key={idx}>
          {item.machine.highlights.length > 0 && (
            <section className="s-features">
              <div className="container">
                <div className="section-header">
                  <div className="section-header__num">1</div>
                  <div>
                    <p className="section-header__label">Características</p>
                    <h2 className="section-header__title">Lo que la diferencia</h2>
                  </div>
                </div>
                <p className="s-features__intro">
                  No todas las máquinas están hechas para lo mismo. Esto es lo que hace que la {item.machine.brand} {item.machine.code} trabaje cuando otros paran.
                </p>
                <div
                  className="s-features__grid"
                  style={{ gridTemplateColumns: `repeat(${item.machine.highlights.length <= 3 ? item.machine.highlights.length : 2}, 1fr)` }}
                >
                  {item.machine.highlights.map((h, i) => (
                    <div key={i} className="s-features__card">
                      <p className="s-features__name">{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <hr className="s-divider" />

          <section className="s-about">
            <div className="container">
              <div className="section-header">
                <div className="section-header__num">2</div>
                <div>
                  <p className="section-header__label">El equipo</p>
                  <h2 className="section-header__title">{item.machine.brand} {item.machine.code}</h2>
                  {item.machine.model && (
                    <p style={{ fontSize: 14, color: "var(--gray-2)", marginTop: 4 }}>{item.machine.model}</p>
                  )}
                </div>
              </div>
              <div className="s-about__grid">
                <div className="s-about__body"><p>{item.machine.description}</p></div>
                <div>
                  {item.machine.specs.map((s, i) => (
                    <div key={i} className="s-about__spec">
                      <span className="s-about__spec-name">{s.label}</span>
                      <span className="s-about__spec-val">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <hr className="s-divider" />

          {item.machine.videos.length > 0 && (
            <section className="s-video">
              <div className="container">
                <div className="section-header">
                  <div className="section-header__num">3</div>
                  <div>
                    <p className="section-header__label">En acción</p>
                    <h2 className="section-header__title">Véala trabajar</h2>
                  </div>
                </div>
                <div className="s-video__wrap">
                  <video src={item.machine.videos[0].url} controls playsInline preload="metadata" />
                </div>
              </div>
            </section>
          )}

          {item.machine.pdf_url && (
            <section className="s-brochure">
              <div className="container">
                <div className="section-header">
                  <div className="section-header__num">4</div>
                  <div>
                    <p className="section-header__label">Documentación</p>
                    <h2 className="section-header__title">Ficha técnica completa</h2>
                  </div>
                </div>
                <div className="s-brochure__frame">
                  <iframe src={`${item.machine.pdf_url}#toolbar=0&navpanes=0&scrollbar=0`} title={`Ficha técnica ${item.machine.code}`} />
                </div>
                <a className="s-brochure__dl" href={item.machine.pdf_url} target="_blank" rel="noopener" download>
                  ↓ Descargar ficha técnica (PDF)
                </a>
              </div>
            </section>
          )}
        </div>
      ))}

      <hr className="s-divider" />

      {/* Inversión */}
      <section className="s-investment">
        <div className="container">
          <div className="section-header">
            <div className="section-header__num">5</div>
            <div>
              <p className="section-header__label">Propuesta económica</p>
              <h2 className="section-header__title">Inversión</h2>
            </div>
          </div>
          <div className="s-investment__card">
            <div>
              {data.items.map((item, i) => (
                <div key={i} className="s-investment__row">
                  <span>{item.producto} · Und. {item.cantidad}</span>
                  <span>{COP(item.sale_price)}</span>
                </div>
              ))}
              {data.iva_total > 0 && (
                <div className="s-investment__row">
                  <span>IVA {(() => {
                    const rates = [...new Set(data.items.filter(i => i.tax_value > 0).map(i => Math.round(i.tax_rate * 100)))];
                    return rates.length === 1 ? `${rates[0]}%` : "mixto";
                  })()}</span><span>{COP(data.iva_total)}</span>
                </div>
              )}
              {data.discount_total > 0 && (
                <div className="s-investment__row">
                  <span>Descuento</span><span>-{COP(data.discount_total)}</span>
                </div>
              )}
              <div className="s-investment__total">
                <div>
                  <p className="s-investment__total-label">Total inversión</p>
                  <p className="s-investment__total-amount">
                    {COP(data.total)}<span className="s-investment__total-currency">COP</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="s-investment__right">
              <p className="s-investment__validity-note">
                Cotización válida hasta el<br />
                <strong style={{ color: "rgba(255,255,255,.7)" }}>{fmtDate(data.expires_at)}</strong>.<br /><br />
                Precio sujeto a disponibilidad de divisas.
              </p>
              <a className="s-investment__cta" href={waAccept} target="_blank" rel="noopener">
                Quiero este equipo →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Condiciones y Garantía */}
      <section className="s-conditions">
        <div className="container">
          <div className="section-header">
            <div className="section-header__num">6</div>
            <div>
              <p className="section-header__label">Términos</p>
              <h2 className="section-header__title">Condiciones y garantía</h2>
            </div>
          </div>
          <div className="s-conditions__grid">
            <div className="s-conditions__card">
              <p className="s-conditions__card-title">Condiciones de entrega</p>
              <p className="s-conditions__card-body">
                Toda entrega de maquinaria a realizar por fuera de las instalaciones de CONINMAQ tiene un costo adicional
                no incluido en el precio cotizado. Este será definido por el Departamento de Servicios una vez
                se concrete el lugar de entrega.
              </p>
              {data.observations && (
                <>
                  <span style={{ display: "block", marginTop: 16, fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--yellow)", marginBottom: 6 }}>Observaciones</span>
                  <span style={{ display: "block", fontSize: 14, color: "var(--gray-1)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{data.observations}</span>
                </>
              )}
            </div>
            <div className="s-conditions__card">
              <p className="s-conditions__card-title">Soporte al producto</p>
              <p className="s-conditions__card-body">
                Contamos con soporte postventa a nivel nacional, con técnicos especializados y disponibilidad
                de repuestos originales LONKING en todo el país.
              </p>
            </div>
          </div>
          <div className="s-conditions__warranty">
            <p className="s-conditions__warranty-title">Garantía comercial LONKING</p>
            <p className="s-conditions__warranty-heading">Garantía de 12 meses o 2.000 horas de operación</p>
            <p className="s-conditions__warranty-body">
              Cubre la reparación y reposición de partes o componentes por defectos de diseño, fabricación o ensamble
              a expensas del fabricante, durante un período previamente establecido, bajo condiciones normales de
              operación y mantenimiento. <strong>Lo primero que ocurra</strong>, siempre y cuando los mantenimientos
              y la compra de repuestos sea directamente con <strong>CONINMAQ S.A.S.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="s-footer">
        <div className="s-footer__inner">
          <div className="s-footer__top">
            <div>
              <img className="s-footer__logo" src="/logo-yellow-r.png" alt="CONINMAQ" />
              <p className="s-footer__headline">#1 en posventa en Colombia</p>
              <p className="s-footer__tagline">Soluciones en maquinaria pesada con respaldo, potencia y tecnología de clase mundial. Equipos nuevos, repuestos y soporte especializado para construcción, minería e industria.</p>
            </div>
            <div>
              <p className="s-footer__col-title">Contacto</p>
              <nav className="s-footer__links">
                <a className="s-footer__link" href={`tel:${advisorPhone}`}>{advisorPhone}</a>
                <a className="s-footer__link" href={`mailto:${advisorEmail}`}>{advisorEmail}</a>
                <a className="s-footer__link" href="https://coninmaqsas.com" target="_blank" rel="noopener">coninmaqsas.com</a>
              </nav>
            </div>
            <div>
              <p className="s-footer__col-title">¿Listo para avanzar?</p>
              <a className="s-footer__wa" href={waAccept} target="_blank" rel="noopener">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Quiero este equipo
              </a>
            </div>
          </div>
          <div className="s-footer__bottom">
            <p className="s-footer__copy">© {new Date().getFullYear()} CONINMAQ S.A.S · Todos los derechos reservados</p>
            <p className="s-footer__legal">Medellín, Colombia</p>
          </div>
        </div>
      </footer>
    </>
  );
}
