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

function saludo(name: string | null): string {
  if (!name) return "cliente";
  const parts = name.trim().split(" ");
  return `Sr. ${parts[0]}`;
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
  const heroImage    = firstMachine?.image_url ?? "";
  const advisorName  = data.advisor?.name  ?? "Equipo Comercial";
  const advisorEmail = data.advisor?.email ?? "comercial@coninmaq.com";
  const advisorPhone = data.advisor?.phone ?? "+57 316 381 5694";
  const waLink = `https://wa.me/573163815694?text=Hola%2C+me+interesa+la+cotizaci%C3%B3n+${data.quotation_number}`;
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

        .topbar { position: sticky; top: 0; z-index: 100; background: rgba(250,250,249,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--gray-4); display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 56px; }
        .topbar__brand { font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; color: var(--black); }
        .topbar__brand span { color: var(--yellow); }
        .topbar__meta { font-size: 12px; color: var(--gray-2); }
        .topbar__cta { background: var(--black); color: var(--white); font-size: 12px; font-weight: 600; letter-spacing: .5px; padding: 9px 20px; border-radius: 6px; text-decoration: none; white-space: nowrap; }

        .hero { display: grid; grid-template-columns: 1fr 1fr; min-height: 88vh; max-height: 860px; }
        .hero__left { background: var(--black); color: var(--white); display: flex; flex-direction: column; justify-content: flex-end; padding: 64px 56px; position: relative; overflow: hidden; }
        .hero__left::before { content: ''; position: absolute; inset: 0; background: url('${heroImage}') center/cover no-repeat; opacity: .18; }
        .hero__eyebrow { position: relative; z-index: 1; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: var(--yellow); margin-bottom: 20px; }
        .hero__machine { position: relative; z-index: 1; font-size: clamp(40px,5vw,68px); font-weight: 900; line-height: 1.05; margin-bottom: 24px; }
        .hero__pills { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 40px; }
        .hero__pill { font-size: 11px; font-weight: 500; color: rgba(255,255,255,.55); border: 1px solid rgba(255,255,255,.15); border-radius: 100px; padding: 5px 14px; }
        .hero__pill strong { color: var(--white); font-weight: 600; }
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

        .s-carta { padding: 80px 0; background: var(--white); }
        .s-carta__inner { max-width: 720px; margin: 0 auto; }
        .s-carta__date { font-size: 12px; color: var(--gray-3); margin-bottom: 36px; }
        .s-carta__saludo { font-size: 20px; font-weight: 600; margin-bottom: 28px; }
        .s-carta__body { font-size: 15px; color: var(--gray-1); line-height: 1.9; }
        .s-carta__body p + p { margin-top: 20px; }
        .s-carta__firma { margin-top: 48px; padding-top: 36px; border-top: 1px solid var(--gray-4); }
        .s-carta__firma-nombre { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .s-carta__firma-cargo { font-size: 12px; color: var(--gray-3); margin-bottom: 20px; }
        .s-carta__firma-contacto { display: flex; flex-wrap: wrap; gap: 6px 24px; }
        .s-carta__firma-contacto a { font-size: 13px; color: var(--gray-2); text-decoration: none; }

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
        .s-features__grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; }
        .s-features__card { padding: 32px 28px; background: #1A1A1A; }
        .s-features__name { font-size: 14px; font-weight: 600; color: var(--white); }

        .s-gallery { padding: 80px 0; }
        .s-gallery__grid { display: grid; grid-template-columns: 2fr 1fr 1fr; grid-template-rows: 240px 240px; gap: 8px; border-radius: var(--radius); overflow: hidden; }
        .s-gallery__item { overflow: hidden; }
        .s-gallery__item:first-child { grid-row: 1 / 3; }
        .s-gallery__item img { width: 100%; height: 100%; object-fit: cover; }

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
        .s-investment__card { background: var(--black); border-radius: var(--radius); padding: 56px 56px 48px; color: var(--white); display: grid; grid-template-columns: 1fr auto; gap: 48px; align-items: start; }
        .s-investment__row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.1); font-size: 14px; color: rgba(255,255,255,.6); }
        .s-investment__row span:last-child { font-weight: 500; color: rgba(255,255,255,.85); }
        .s-investment__total { display: flex; justify-content: space-between; align-items: baseline; padding: 24px 0 0; gap: 16px; }
        .s-investment__total-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,.4); margin-bottom: 8px; }
        .s-investment__total-amount { font-size: clamp(32px,4vw,48px); font-weight: 900; color: var(--yellow); line-height: 1; letter-spacing: -1px; }
        .s-investment__total-currency { font-size: 16px; color: rgba(255,255,255,.4); font-weight: 400; margin-left: 6px; }
        .s-investment__right { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }
        .s-investment__validity-note { font-size: 12px; color: rgba(255,255,255,.35); line-height: 1.7; max-width: 200px; text-align: right; }
        .s-investment__cta { display: inline-block; background: var(--yellow); color: var(--black); font-size: 13px; font-weight: 700; padding: 16px 28px; border-radius: 8px; text-decoration: none; text-align: center; }

        .s-footer { border-top: 1px solid var(--gray-4); background: var(--bg); padding: 48px 0; }
        .s-footer__inner { max-width: 960px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
        .s-footer__brand { font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
        .s-footer__brand span { color: var(--yellow); }
        .s-footer__links { display: flex; gap: 32px; flex-wrap: wrap; }
        .s-footer__link { font-size: 13px; color: var(--gray-2); text-decoration: none; }
        .s-footer__copy { font-size: 12px; color: var(--gray-3); width: 100%; padding-top: 24px; border-top: 1px solid var(--gray-4); }

        @media (max-width: 768px) {
          .topbar { padding: 0 20px; } .topbar__meta { display: none; }
          .hero { grid-template-columns: 1fr; min-height: auto; max-height: none; }
          .hero__left { padding: 48px 28px 40px; min-height: 60vh; }
          .hero__right { padding: 36px 28px; }
          .s-about__grid { grid-template-columns: 1fr; gap: 40px; }
          .s-features__grid { grid-template-columns: 1fr 1fr; }
          .s-gallery__grid { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
          .s-gallery__item:first-child { grid-row: auto; }
          .s-investment__card { grid-template-columns: 1fr; padding: 36px 28px; }
          .s-investment__total-amount { font-size: 36px; }
          .s-investment__right { align-items: flex-start; }
          .s-investment__validity-note { text-align: left; max-width: none; }
        }
        @media (max-width: 480px) {
          .s-features__grid { grid-template-columns: 1fr; }
          .s-gallery__grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />

      {/* Topbar */}
      <nav className="topbar">
        <a className="topbar__brand" href="#">CONIN<span>MAQ</span></a>
        <span className="topbar__meta">{data.quotation_number} · Válida hasta {fmtDateShort(data.expires_at)}</span>
        <a className="topbar__cta" href={waLink} target="_blank" rel="noopener">Hablar con un asesor →</a>
      </nav>

      {/* Hero */}
      {firstMachine && (
        <div className="hero">
          <div className="hero__left">
            <p className="hero__eyebrow">Cotización exclusiva · Lonking Colombia</p>
            <h1 className="hero__machine">{firstMachine.category}<br />{firstMachine.code}</h1>
            <div className="hero__pills">
              {firstMachine.specs.slice(0, 4).map((s, i) => (
                <span key={i} className="hero__pill"><strong>{s.value}</strong> {s.label}</span>
              ))}
            </div>
          </div>
          <div className="hero__right">
            <div>
              {data.client && (
                <p className="hero__greeting">
                  Estimado/a <strong>{data.client.name ?? "cliente"}</strong>,<br /><br />
                  A continuación encontrará nuestra propuesta comercial preparada especialmente para usted —
                  con condiciones de inversión, ficha técnica y todo lo que necesita para tomar su decisión con confianza.
                </p>
              )}
              <div>
                {data.client?.company && (
                  <div className="hero__detail">
                    <span className="hero__detail-label">Empresa</span>
                    <span className="hero__detail-value">{data.client.company}</span>
                  </div>
                )}
                <div className="hero__detail">
                  <span className="hero__detail-label">Equipo</span>
                  <span className="hero__detail-value">
                    {data.items.map((it, i) => (
                      <span key={i}>{it.producto} · Und. {it.cantidad}{i < data.items.length - 1 ? <br /> : null}</span>
                    ))}
                  </span>
                </div>
                {data.advisor && (
                  <div className="hero__detail">
                    <span className="hero__detail-label">Asesor</span>
                    <span className="hero__detail-value">
                      {data.advisor.name}<br />
                      <small style={{ color: "#9CA3AF" }}>{data.advisor.email}</small>
                    </span>
                  </div>
                )}
                <div className="hero__detail">
                  <span className="hero__detail-label">N° Cotización</span>
                  <span className="hero__detail-value" style={{ fontFamily: "monospace", fontSize: 12 }}>{data.quotation_number}</span>
                </div>
              </div>
            </div>
            <div className="hero__validity">
              <strong>Vigencia:</strong> Esta cotización es válida hasta el <strong>{fmtDate(data.expires_at)}</strong>.
              Precio sujeto a disponibilidad de divisas.
            </div>
          </div>
        </div>
      )}

      {/* Carta */}
      <section className="s-carta">
        <div className="s-carta__inner">
          <p className="s-carta__date">Medellín, {fmtDate(data.quotation_date)}</p>
          <p className="s-carta__saludo">Estimado {saludo(data.client?.name ?? null)},</p>
          <div className="s-carta__body">
            <p>Agradecemos sinceramente su interés en nuestros equipos LONKING. En CONINMAQ S.A.S llevamos más de 10 años siendo líderes en maquinaria pesada en Colombia, respaldando a empresas constructoras, mineras e industriales con equipos de alta calidad, soporte técnico especializado y acompañamiento postventa a nivel nacional.</p>
            <p>Nuestra misión es entregar soluciones confiables y eficientes que impulsen la productividad de cada obra. Cada equipo LONKING que comercializamos cuenta con garantía oficial, capacitación al operador y red de repuestos disponible en todo el país.</p>
            <p>A continuación le presentamos nuestra propuesta comercial para el equipo de su interés. Hemos preparado esta cotización con las condiciones más favorables disponibles a la fecha, y quedamos a su entera disposición para resolver cualquier inquietud, gestionar una visita de demostración o avanzar en el proceso de negociación.</p>
          </div>
          <div className="s-carta__firma">
            <p className="s-carta__firma-nombre">{advisorName} · CONINMAQ S.A.S</p>
            <p className="s-carta__firma-cargo">Cordialmente,</p>
            <div className="s-carta__firma-contacto">
              <a href={`tel:${advisorPhone}`}>{advisorPhone}</a>
              <a href={`mailto:${advisorEmail}`}>{advisorEmail}</a>
              <a href="https://coninmaqsas.com" target="_blank" rel="noopener">coninmaqsas.com</a>
            </div>
          </div>
        </div>
      </section>

      <hr className="s-divider" />

      {/* Secciones por equipo */}
      {data.items.map((item, idx) => item.machine && (
        <div key={idx}>
          <section className="s-about">
            <div className="container">
              <div className="section-header">
                <div className="section-header__num">1</div>
                <div>
                  <p className="section-header__label">El equipo</p>
                  <h2 className="section-header__title">{item.machine.brand} {item.machine.code}</h2>
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

          {item.machine.highlights.length > 0 && (
            <section className="s-features">
              <div className="container">
                <div className="section-header">
                  <div className="section-header__num">2</div>
                  <div>
                    <p className="section-header__label">Características</p>
                    <h2 className="section-header__title">Lo que la diferencia</h2>
                  </div>
                </div>
                <div className="s-features__grid">
                  {item.machine.highlights.map((h, i) => (
                    <div key={i} className="s-features__card">
                      <p className="s-features__name">{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {item.machine.images.length > 0 && (
            <section className="s-gallery">
              <div className="container">
                <div className="section-header">
                  <div className="section-header__num">3</div>
                  <div>
                    <p className="section-header__label">Galería</p>
                    <h2 className="section-header__title">Vista del equipo</h2>
                  </div>
                </div>
                <div className="s-gallery__grid">
                  {item.machine.images.slice(0, 5).map((img, i) => (
                    <div key={i} className="s-gallery__item">
                      <img src={img.url} alt={item.machine!.model} loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {item.machine.videos.length > 0 && (
            <section className="s-video">
              <div className="container">
                <div className="section-header">
                  <div className="section-header__num">4</div>
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
                  <div className="section-header__num">5</div>
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
            <div className="section-header__num">6</div>
            <div>
              <p className="section-header__label">Propuesta económica</p>
              <h2 className="section-header__title">Costo de la inversión</h2>
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
                  <span>IVA 19%</span><span>{COP(data.iva_total)}</span>
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

      {/* Footer */}
      <footer className="s-footer">
        <div className="s-footer__inner">
          <span className="s-footer__brand">CONIN<span>MAQ</span></span>
          <nav className="s-footer__links">
            <a className="s-footer__link" href="tel:+573163815694">+57 316 381 5694</a>
            <a className="s-footer__link" href="mailto:comercial@coninmaq.com">comercial@coninmaq.com</a>
            <a className="s-footer__link" href="https://coninmaqsas.com" target="_blank" rel="noopener">coninmaqsas.com</a>
          </nav>
          <p className="s-footer__copy">© {new Date().getFullYear()} CONINMAQ S.A.S · Todos los derechos reservados</p>
        </div>
      </footer>
    </>
  );
}
