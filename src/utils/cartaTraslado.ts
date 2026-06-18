import type { MachineInfoResponse } from "../services/api";

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatDate(): string {
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const d = new Date();
  return `Medellín, ${d.getDate()} de ${months[d.getMonth()]} del ${d.getFullYear()}`;
}

export async function generateCartaTraslado(
  machine: MachineInfoResponse,
  desde: string,
  hasta: string,
): Promise<void> {
  const [logoBase64, firmaBase64] = await Promise.all([
    toBase64("/logo.png"),
    toBase64("/firma.png"),
  ]);
  const category = machine.category ?? "máquina";
  const dateStr    = formatDate();

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Carta de Traslado — ${machine.plate}</title>
  <style>
    @page { size: A4; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      position: relative;
      background: #fff;
      overflow: hidden;
    }

    /* ── Decoraciones ── */
    .deco-top {
      position: absolute;
      top: 0; left: 0;
      pointer-events: none;
    }
    .deco-bottom {
      position: absolute;
      bottom: 30px; right: 0;
      pointer-events: none;
    }

    /* ── Cabecera derecha ── */
    .header {
      display: flex;
      justify-content: flex-end;
      padding: 22px 32px 0 0;
    }
    .header-right {
      width: 215px;
    }
    .logo {
      width: 185px;
      display: block;
      margin-bottom: 2px;
    }
    .nit {
      font-size: 13pt;
      font-weight: bold;
      letter-spacing: 1px;
      color: #1a1a1a;
      text-align: center;
      margin-bottom: 8px;
    }
    .divider {
      border: none;
      border-top: 1px solid #ccc;
      margin: 5px 0 8px;
    }
    .contact-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 10pt;
      color: #333;
      margin-bottom: 7px;
      line-height: 1.4;
    }
    .contact-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #e8e8e8;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .contact-icon svg {
      width: 11px;
      height: 11px;
      fill: #555;
    }

    /* ── Cuerpo ── */
    .body {
      padding: 28px 55px 0 58px;
      position: relative;
      z-index: 1;
    }
    .date {
      font-size: 11pt;
      margin-bottom: 28px;
    }
    .salutation {
      font-size: 11pt;
      line-height: 1.5;
    }
    .subject {
      font-size: 11pt;
      margin: 22px 0 28px;
    }
    .paragraph {
      font-size: 11pt;
      line-height: 1.65;
      text-align: justify;
      margin-bottom: 28px;
    }
    .closing {
      font-size: 11pt;
      margin-top: 10px;
    }
    .sig-block {
      margin-top: 68px;
      font-size: 11pt;
      line-height: 1.75;
    }
    .sig-img {
      width: 160px;
      display: block;
      margin-bottom: -8px;
    }
    .sig-line {
      width: 165px;
      border-top: 1.5px solid #000;
      margin-bottom: 6px;
    }

    /* ── Pie de página ── */
    .footer-bar {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 30px;
      background: #111;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .footer-bar span {
      color: #fff;
      font-size: 9pt;
      letter-spacing: 1.5px;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Decoración superior izquierda -->
  <div class="deco-top">
    <svg width="145" height="195" xmlns="http://www.w3.org/2000/svg">
      <polygon points="-5,0 100,0 75,195 -5,195" fill="#FDD835"/>
      <polygon points="-5,0 65,0 40,195 -5,195" fill="#F9A825"/>
    </svg>
  </div>

  <!-- Cabecera derecha -->
  <div class="header">
    <div class="header-right">
      <img src="${logoBase64}" class="logo" alt="CONINMAQ"/>
      <div class="nit">9012734421</div>
      <hr class="divider"/>
      <!-- Teléfono -->
      <div class="contact-row">
        <div class="contact-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.22.49 2.55.76 3.92.76a1 1 0 011 1V20a1 1 0 01-1 1C9.39 21 3 14.61 3 7a1 1 0 011-1h3.5a1 1 0 011 1c0 1.38.27 2.7.76 3.92a1 1 0 01-.24 1.07l-2.4 2.4z"/>
          </svg>
        </div>
        <span>+57 301 445 5236</span>
      </div>
      <!-- Email -->
      <div class="contact-row">
        <div class="contact-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </div>
        <span>comercioexterior@<br/>coninmaqsas.com</span>
      </div>
      <!-- Dirección -->
      <div class="contact-row">
        <div class="contact-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z"/>
          </svg>
        </div>
        <span>KM 20 Autopista norte<br/>Copacabana a Girardota</span>
      </div>
    </div>
  </div>

  <!-- Cuerpo -->
  <div class="body">
    <p class="date">${dateStr}</p>

    <p class="salutation">Señores,</p>
    <p class="salutation">A quien pueda interesar</p>

    <p class="subject">Asunto: Traslado de ${category} ${machine.model}</p>

    <p class="paragraph">
      Nosotros CONSTRUCCIONES INVERSIONES Y MAQUINARIA S.A.S. identificados
      con NIT 901.273.442-1 autorizamos el transporte de la ${category} ${machine.model}
      ${machine.machine_serial}, desde ${desde} hasta ${hasta}, en forma de
      demostración y/o exhibición.
    </p>

    <p class="paragraph">
      Si requieren de alguna información adicional por favor comunicarse con Camilo Gomez
      Escobar al celular 3163815694.
    </p>

    <p class="closing">Atentamente,</p>

    <div class="sig-block">
      <img src="${firmaBase64}" class="sig-img" alt="Firma"/>
      <div class="sig-line"></div>
      <p>Camilo Gomez Escobar</p>
      <p>C.C. 1017211675</p>
      <p>Representante Legal</p>
      <p>CONINMAQ S.A.S.</p>
      <p>Nit 901.273.442-1</p>
      <p>cgomez@coninmaqsas.com</p>
    </div>
  </div>

  <!-- Decoración inferior derecha -->
  <div class="deco-bottom">
    <svg width="145" height="155" xmlns="http://www.w3.org/2000/svg">
      <polygon points="45,0 150,0 150,155 70,155" fill="#FDD835"/>
      <polygon points="85,0 150,0 150,155 110,155" fill="#F9A825"/>
    </svg>
  </div>

  <!-- Pie de página -->
  <div class="footer-bar">
    <span>www.coninmaqsas.com</span>
  </div>

</div>
<script>
  window.onload = function () { setTimeout(function () { window.print(); }, 400); };
</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=1150");
  if (!win) {
    alert("Permite las ventanas emergentes para generar el PDF.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
