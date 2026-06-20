"use client";
// ═══════════════════════════════════════════════════════════════════════════
// ForgotPasswordModal · Instrucciones de recuperación de contraseña
// El restablecimiento lo gestiona el administrador (no hay endpoint backend).
// ═══════════════════════════════════════════════════════════════════════════
interface Props {
  open: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0D1526", border: "1px solid rgba(196,18,48,.3)",
          borderRadius: 16, maxWidth: 400, width: "100%", padding: 24,
          animation: "splashFade .3s ease",
        }}
      >
        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 17, margin: 0, marginBottom: 12 }}>
          Recuperar contraseña
        </h3>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, lineHeight: 1.6, margin: 0, marginBottom: 18 }}>
          Por seguridad, el restablecimiento de contraseña lo gestiona el administrador
          de la plataforma. Escribe a{" "}
          <strong style={{ color: "#4A7AFF" }}>auditoriasavicol@gmail.com</strong>{" "}
          con tu correo corporativo y te ayudaremos a restablecer el acceso.
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "11px", borderRadius: 10, border: "none",
            background: "#C41230", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
