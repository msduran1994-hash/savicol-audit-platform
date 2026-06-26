import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// ════════════════════════════════════════════════════════════════════════════
// Proxy de imágenes de Evidencias → base64 (para incrustar en el PDF ejecutivo)
// Descarga la imagen server-side (sin CORS) normalizando enlaces de proveedores
// comunes (Google Drive, Dropbox) y la devuelve como data URL base64.
// Si el recurso no es una imagen accesible, responde 422 y el cliente lo deja
// como referencia con enlace (no rompe la generación del informe).
// ════════════════════════════════════════════════════════════════════════════

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Normaliza enlaces de proveedores a una URL de descarga directa de imagen.
function candidatos(raw: string): string[] {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();

    // Google Drive
    if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
      let id = "";
      const m1 = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (m1) id = m1[1];
      if (!id) id = u.searchParams.get("id") ?? "";
      if (id) {
        return [
          `https://drive.google.com/uc?export=download&id=${id}`,
          `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
        ];
      }
    }

    // Dropbox → descarga directa
    if (host.includes("dropbox.com")) {
      const direct = raw.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace(/([?&])dl=0/, "$1dl=1");
      return [direct.includes("dl=1") ? direct : direct + (direct.includes("?") ? "&dl=1" : "?dl=1")];
    }

    // OneDrive / SharePoint con enlace ya "download"
    if (host.includes("1drv.ms") || host.includes("sharepoint.com") || host.includes("onedrive.live.com")) {
      return [raw.includes("download=1") ? raw : raw + (raw.includes("?") ? "&download=1" : "?download=1"), raw];
    }

    return [raw];
  } catch {
    return [raw];
  }
}

// Detecta tipo de imagen por firma binaria si falta el content-type.
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

async function fetchImagen(url: string): Promise<{ dataUrl: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Savicol Audit Platform PDF)" },
    });
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    if (ab.byteLength === 0 || ab.byteLength > MAX_BYTES) return null;
    const buf = Buffer.from(ab);

    let ct = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!ct.startsWith("image/")) {
      const sn = sniff(buf);
      if (!sn) return null; // p.ej. página HTML de login de Drive → no es imagen
      ct = sn;
    }
    return { dataUrl: `data:${ct};base64,${buf.toString("base64")}` };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return NextResponse.json({ error: "Parámetro 'url' inválido" }, { status: 400 });
  }

  for (const cand of candidatos(raw)) {
    const res = await fetchImagen(cand);
    if (res) return NextResponse.json(res, { status: 200 });
  }
  return NextResponse.json({ error: "No se pudo obtener una imagen accesible desde la URL" }, { status: 422 });
}
