import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// ════════════════════════════════════════════════════════════════════════════
// Proxy de imágenes de Evidencias (enlaces externos → imagen accesible)
//   ?url=...          → JSON { dataUrl } base64  (para incrustar en el PDF)
//   ?url=...&raw=1    → bytes de la imagen        (para <img src> en la UI)
// Descarga server-side (sin CORS) normalizando enlaces de Google Drive y Dropbox.
// Si el recurso no es una imagen accesible (privado, no-imagen), responde 422.
// Las evidencias subidas a la plataforma ya son data URLs y NO usan este proxy.
// ════════════════════════════════════════════════════════════════════════════

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function candidatos(raw: string): string[] {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();

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

    if (host.includes("dropbox.com")) {
      const direct = raw.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace(/([?&])dl=0/, "$1dl=1");
      return [direct.includes("dl=1") ? direct : direct + (direct.includes("?") ? "&dl=1" : "?dl=1")];
    }

    if (host.includes("1drv.ms") || host.includes("sharepoint.com") || host.includes("onedrive.live.com")) {
      return [raw.includes("download=1") ? raw : raw + (raw.includes("?") ? "&download=1" : "?download=1"), raw];
    }

    return [raw];
  } catch {
    return [raw];
  }
}

function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

async function descargar(url: string): Promise<{ buf: Buffer; ct: string } | null> {
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
    return { buf, ct };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  const wantRaw = req.nextUrl.searchParams.get("raw") === "1";
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return NextResponse.json({ error: "Parámetro 'url' inválido" }, { status: 400 });
  }

  let img: { buf: Buffer; ct: string } | null = null;
  for (const cand of candidatos(raw)) {
    img = await descargar(cand);
    if (img) break;
  }
  if (!img) {
    return NextResponse.json({ error: "No se pudo obtener una imagen accesible desde la URL" }, { status: 422 });
  }

  if (wantRaw) {
    return new NextResponse(new Uint8Array(img.buf), {
      status: 200,
      headers: {
        "Content-Type": img.ct,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  return NextResponse.json({ dataUrl: `data:${img.ct};base64,${img.buf.toString("base64")}` }, { status: 200 });
}
