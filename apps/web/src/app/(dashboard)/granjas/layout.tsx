// Layout pass-through del módulo Granjas
// El sidebar ya se adapta automáticamente cuando detecta la ruta /granjas/*
export default function GranjasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
