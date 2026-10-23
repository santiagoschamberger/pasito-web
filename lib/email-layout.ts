// Shared Pasito email shell ("carta de Santi"): green logo header, plain text body, quiet
// footer. Every transactional/marketing email should render through this so
// they all look the same. Supabase Auth templates (supabase/templates/*.html)
// are generated from it too — see auth-email-templates.ts.

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BRAND_GREEN = "#006D42";
const TEXT_MAIN = "#1F1F1A";
const TEXT_MUTED = "#8A8A7C";
const LINE = "#EDEDE8";
// White wordmark shared with the listmonk campaigns (Gmail blocks data: URIs
// and SVG). Source: supabase/templates/assets/pasito-logo-blanco.png.
// Rules: Linear PAS-261 "Mails de Pasito · Reglas y plantilla".
export const LOGO_URL =
  "https://mail.pasito.app/uploads/pasito-logo-blanco.png";
const LOGO_WIDTH = 76;
const LOGO_HEIGHT = 18;
const FOOTER_ADDRESS = "Pasito · Buenos Aires, Argentina";

export interface PasitoEmailInput {
  title: string;
  preview: string;
  /** Trusted HTML built with the helpers below (they escape their input). */
  bodyHtml: string;
  /** Trusted HTML; keep it to one or two short sentences. */
  footerHtml: string;
}

export interface EmailStep {
  title: string;
  body?: string;
}

export interface EmailDetail {
  label: string;
  value: string;
}

export function renderPasitoEmail(input: PasitoEmailInput): string {
  const title = escapeHtml(input.title);
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${title}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>td,p,a,span,div{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0 !important; padding:0 !important; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
  .t-main { overflow-wrap:anywhere; word-break:break-word; }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  @media screen and (max-width:620px) {
    .container { width:100% !important; }
    .px { padding-left:24px !important; padding-right:24px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .bg-page { background-color:#121210 !important; }
    .t-main, .t-main p { color:#EDEDE8 !important; }
    .t-muted, .t-muted a { color:#9C9C8E !important; }
    .t-link { color:#93ECAB !important; }
    .t-main .t-code { color:#93ECAB !important; }
    .line { border-color:#2C2C26 !important; }
  }
  [data-ogsc] .t-main, [data-ogsc] .t-main p { color:#EDEDE8 !important; }
  [data-ogsc] .t-link { color:#93ECAB !important; }
  [data-ogsc] .t-main .t-code { color:#93ECAB !important; }
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background-color:#FFFFFF;">
<div role="article" aria-roledescription="email" aria-label="${title}" lang="es">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${
    escapeHtml(input.preview)
  }&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background-color:#FFFFFF;">
  <tr>
    <td align="center" style="padding:0;">
      <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" class="container" style="width:560px;max-width:560px;">
        <tr>
          <td class="px" bgcolor="${BRAND_GREEN}" style="background-color:${BRAND_GREEN};padding:18px 32px;">
            <img src="${LOGO_URL}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="Pasito" border="0" style="display:block;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>
        <tr>
          <td class="px t-main" style="padding:36px 32px 8px;font-family:${FONT_STACK};font-size:16px;line-height:26px;color:${TEXT_MAIN};">
${input.bodyHtml}
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:16px 32px 40px;">
            <div class="line" style="border-top:1px solid ${LINE};font-size:0;line-height:0;">&nbsp;</div>
            <p class="t-muted" style="margin:16px 0 0;font-family:${FONT_STACK};font-size:12px;line-height:18px;color:${TEXT_MUTED};">${input.footerHtml}<br>${FOOTER_ADDRESS}</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</div>
</body>
</html>
`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 18px;">${escapeHtml(text)}</p>\n`;
}

export function emailSteps(steps: EmailStep[]): string {
  return steps.map((step, index) =>
    `<p style="margin:0 0 18px;"><strong>${index + 1}. ${
      escapeHtml(step.title)
    }</strong>${step.body == null ? "" : `<br>${escapeHtml(step.body)}`}</p>\n`
  ).join("");
}

export function emailDetails(details: EmailDetail[]): string {
  const rows = details.map((detail) => `
  <tr>
    <td class="line t-muted" style="padding:10px 0;border-top:1px solid ${LINE};font-size:14px;line-height:20px;color:${TEXT_MUTED};">${
    escapeHtml(detail.label)
  }</td>
    <td class="line" align="right" style="padding:10px 0;border-top:1px solid ${LINE};font-size:14px;line-height:20px;font-weight:700;">${
    escapeHtml(detail.value)
  }</td>
  </tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;margin:0 0 18px;">${rows}
</table>\n`;
}

export function emailCode(code: string): string {
  return `<p class="t-code" style="margin:0 0 18px;color:${BRAND_GREEN};font-size:24px;line-height:32px;font-weight:700;letter-spacing:4px;">${
    escapeHtml(code)
  }</p>\n`;
}

export function emailActionLink(label: string, url: string): string {
  assertEmailUrl(url);
  return `<p style="margin:0 0 18px;"><a href="${
    escapeHtml(url)
  }" class="t-link" style="color:${BRAND_GREEN};font-weight:700;text-decoration:underline;">${
    escapeHtml(label)
  } →</a></p>\n`;
}

const SIGNATURE_TEXT = "Caminando pasan cosas lindas,\nSanti\nPasito";

export function emailSignature(): string {
  return `<p style="margin:0 0 18px;">Caminando pasan cosas lindas,<br>Santi<br><span class="t-muted" style="color:${TEXT_MUTED};">Pasito</span></p>\n`;
}

export type EmailBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "steps"; steps: EmailStep[] }
  | { kind: "details"; details: EmailDetail[] }
  | { kind: "code"; code: string }
  | { kind: "link"; label: string; url: string }
  | { kind: "signature" };

/** Renders content blocks to matching HTML body and plain-text versions. */
export function renderEmailBlocks(
  blocks: EmailBlock[],
): { bodyHtml: string; text: string } {
  const html: string[] = [];
  const text: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "paragraph":
        html.push(emailParagraph(block.text));
        text.push(block.text);
        break;
      case "steps":
        html.push(emailSteps(block.steps));
        text.push(
          block.steps.map((step, index) =>
            `${index + 1}. ${step.title}${
              step.body == null ? "" : `\n${step.body}`
            }`
          ).join("\n"),
        );
        break;
      case "details":
        html.push(emailDetails(block.details));
        text.push(
          block.details.map((d) => `${d.label}: ${d.value}`).join("\n"),
        );
        break;
      case "code":
        html.push(emailCode(block.code));
        text.push(block.code);
        break;
      case "link":
        html.push(emailActionLink(block.label, block.url));
        text.push(`${block.label}: ${block.url}`);
        break;
      case "signature":
        html.push(emailSignature());
        text.push(SIGNATURE_TEXT);
        break;
    }
  }
  return { bodyHtml: html.join(""), text: text.join("\n\n") };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const EMAIL_SIGNATURE = "Caminando pasan cosas lindas,\nSanti\nPasito";
export const EMAIL_ADDRESS = "Pasito · Buenos Aires, Argentina";

export function assertEmailUrl(value: string): void {
  // The generator uses placeholders; actual sends must provide a concrete URL.
  if (/^\{\{\{[A-Z_]+\}\}\}$/.test(value) || value.includes("{{ .ConfirmationURL }}")) return;
  const url = new URL(value);
  if (!["https:", "mailto:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("El enlace del mail debe usar HTTPS o mailto.");
  }
}

export function emailTrackingUrl(value: string, campaign: string, content = "principal"): string {
  assertEmailUrl(value);
  const url = new URL(value);
  if (url.protocol !== "https:") return value;
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", content);
  return url.toString();
}

export function emailValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function emailSubject(value: string): string {
  return Array.from(value.replace(/[\r\n]+/g, " ").trim()).slice(0, 50).join("");
}

/** Last local gate before delivery. Network and business evidence are separate. */
export function assertPasitoEmail(input: { subject: string; html: string; text?: string }): void {
  if (!input.text?.trim() || !input.text.includes(EMAIL_SIGNATURE)) throw new Error("Falta el texto plano o la firma del mail.");
  if (!input.subject.trim() || Array.from(input.subject).length > 50) throw new Error("El asunto del mail supera el límite.");
  if ([input.subject, input.html, input.text].some(value => value.includes("{{"))) throw new Error("El mail tiene variables sin completar.");
  if (new TextEncoder().encode(input.html).length >= 100_000) throw new Error("El mail supera 100 KB.");
  if ((input.html.match(/<img\b/gi) ?? []).length !== 1 || !input.html.includes(`src="${LOGO_URL}"`)) throw new Error("El mail debe tener solo el logo de Pasito.");
  if (!input.html.includes('bgcolor="#006D42"') || !input.html.includes("prefers-color-scheme: dark")) throw new Error("El mail no usa el diseño aprobado de Pasito.");
}

export function buildPasitoLetter(input: {
  subject: string;
  preview: string;
  paragraphs: string[];
  details?: EmailDetail[];
  steps?: EmailStep[];
  action?: { label: string; url: string };
  /** Auth and signed links are preserved byte-for-byte. */
  preserveActionUrl?: boolean;
  campaign: string;
  footer?: string;
}): { subject: string; html: string; text: string } {
  const subject = emailSubject(input.subject);
  const preview = Array.from(input.preview).slice(0, 90).join("");
  const footer = input.footer ?? "Te llega este mail porque tu comercio está en Pasito.";
  const blocks: EmailBlock[] = input.paragraphs.map(text => ({ kind: "paragraph", text }));
  if (input.details?.length) blocks.push({ kind: "details", details: input.details });
  if (input.steps?.length) blocks.push({ kind: "steps", steps: input.steps });
  if (input.action) blocks.push({
    kind: "link", label: input.action.label,
    url: input.preserveActionUrl ? input.action.url : emailTrackingUrl(input.action.url, input.campaign),
  });
  blocks.push({ kind: "signature" });
  const { bodyHtml, text } = renderEmailBlocks(blocks);
  const html = renderPasitoEmail({ title: subject, preview, bodyHtml, footerHtml: escapeHtml(footer) });
  if (new TextEncoder().encode(html).length >= 100_000) throw new Error("El mail supera 100 KB.");
  const email = { subject, html, text: `${text}\n\n${footer}\n${EMAIL_ADDRESS}` };
  assertPasitoEmail(email);
  return email;
}
