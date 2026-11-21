/**
 * The shared look of every Stride GH email: forest header with the S mark, white card, small footer.
 * Built with tables and inline styles because many email apps (Gmail, Outlook) ignore stylesheets.
 */

export const brand = {
  forest: "#0e3b2c",
  volt: "#c6f24e",
  night: "#111714",
  paper: "#f4f2ec",
  muted: "#5a5f59",
  line: "#e4e1d8",
};

export const siteUrl = () => (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const firstName = (name: string | null | undefined) => (name?.trim() ? name.trim().split(/\s+/)[0] : null);

/** Paragraph of plain text (escaped; blank lines become paragraph breaks). */
export function p(text: string, style = ""): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;${style}">${escape(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td style="background:${brand.forest};border-radius:12px">
<a href="${escape(href)}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${escape(label)}</a></td></tr></table>`;
}

/** A soft box for a quoted note or key details. */
export function panel(innerHtml: string, label?: string): string {
  return `<div style="background:${brand.paper};border-radius:12px;padding:14px 16px;margin:4px 0 18px">${
    label ? `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.2px;color:${brand.muted}">${escape(label.toUpperCase())}</p>` : ""
  }${innerHtml}</div>`;
}

/** Rows of "label: value" for race details. */
export function details(rows: [string, string | null | undefined][]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:15px;line-height:1.5">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:${brand.muted};white-space:nowrap;vertical-align:top">${escape(k)}</td><td style="padding:4px 0;font-weight:600">${escape(v!)}</td></tr>`,
    )
    .join("")}</table>`;
}

export function layout(opts: { preheader: string; title: string; body: string; footnote?: string }): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${brand.paper};font-family:Inter,'Segoe UI',Arial,sans-serif;color:${brand.night}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:${brand.forest};padding:20px 24px">
<span style="display:inline-block;background:${brand.volt};color:${brand.night};font-weight:800;font-size:20px;line-height:1;border-radius:8px;padding:7px 11px">S</span>
<span style="color:#f4f2ec;font-weight:800;font-size:18px;letter-spacing:1.5px;margin-left:10px;vertical-align:middle">STRIDE <span style="background:${brand.volt};color:${brand.night};padding:0 4px">GH</span></span>
</td></tr>
<tr><td style="padding:26px 24px 10px">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;font-weight:800">${escape(opts.title)}</h1>
${opts.body}
</td></tr>
<tr><td style="padding:0 24px 22px;font-size:13px;line-height:1.5;color:${brand.muted}">${opts.footnote ? escape(opts.footnote) : ""}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:${brand.muted}">Stride GH · Races and running gear in Ghana</p>
</td></tr></table></body></html>`;
}

/** The plain-text twin every email needs (some apps and spam filters prefer it). */
export function plain(lines: (string | null | false | undefined)[]): string {
  return [...lines.filter((l): l is string => typeof l === "string"), "", "Stride GH · Races and running gear in Ghana"].join("\n");
}
