// ═══════════════════════════════════════════════════════════════════════════════
// SEED · Audit Platform Savicol
// ═══════════════════════════════════════════════════════════════════════════════
// Ejecuta: pnpm --filter @savicol/api prisma db seed
//
// Crea:
//   1. ADMIN inicial (desde ADMIN_EMAIL/ADMIN_PASSWORD en .env)
//   2. 6 técnicos veterinarios
//   3. 6 granjas demo + 3 hallazgos + 4 KPIs + 3 auditorías
//   4. 8 rutas + 6 vehículos + 5 conductores + 4 auxiliares + 8 clientes
//   5. 6 acompañamientos demo + 4 acciones de cumplimiento
//
// Todo lo demo lleva el flag isDemo=true para identificación/limpieza.
// ═══════════════════════════════════════════════════════════════════════════════
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ADMIN inicial
  // ─────────────────────────────────────────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL    ?? "admin@savicol.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "SavicolAdmin2026!";
  const adminName     = process.env.ADMIN_NAME     ?? "Administrador Savicol";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  const forceReset = process.env.SEED_RESET_ADMIN === "true";

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email:        adminEmail,
        name:         adminName,
        passwordHash,
        role:         "ADMIN",
        mfaEnabled:   false,
        isActive:     true,
      },
    });
    console.log(`✅ ADMIN creado: ${adminEmail}`);
  } else if (forceReset) {
    // Reset password + role + isActive (emergency recovery via env var)
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });
    // Invalidar todas las sesiones activas del admin
    await prisma.session.deleteMany({
      where: { userId: existing.id },
    });
    console.log(`🔐 ADMIN reseteado: ${adminEmail} · pwd=${adminPassword.slice(0,4)}*** · sesiones invalidadas`);
  } else {
    console.log(`ℹ️  ADMIN ya existe: ${adminEmail}`);
  }

  const seedDemo = process.env.SEED_DEMO_DATA !== "false";
  if (!seedDemo) {
    console.log("\n⏭️  SEED_DEMO_DATA=false → saltando datos demo.");
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Técnicos veterinarios
  // ─────────────────────────────────────────────────────────────────────────
  const veterinariosData = [
    { id: "VET-01", nombre: "Dra. María Fernanda López",  color: "#10B981" },
    { id: "VET-02", nombre: "Dr. Carlos Andrés Restrepo", color: "#3B82F6" },
    { id: "VET-03", nombre: "Dra. Ana Lucía Cárdenas",    color: "#8B5CF6" },
    { id: "VET-04", nombre: "Dr. Juan Pablo Mendoza",     color: "#F59E0B" },
  ];
  for (const v of veterinariosData) {
    await prisma.tecnicoVeterinario.upsert({
      where:  { id: v.id },
      create: { ...v, activo: true },
      update: {},
    });
  }
  console.log(`✅ ${veterinariosData.length} técnicos veterinarios`);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Granjas demo
  // ─────────────────────────────────────────────────────────────────────────
  const granjasData = [
    { id: "DEMO_GRJ_001", codigo: "SAVICOL-ANT-001", nombre: "Granja San José",       estado: "ACTIVA",     region: "Antioquia",       vereda: "El Carmen",          administrador: "Carlos Restrepo Mejía",   tecnicoVeterinarioId: "VET-01", telefono: "+57 300 123 4567", tipoGranja: "PROPIA",    tipoOperativo: "ENGORDE",      nivelRiesgo: "BAJO",  capacidadAves: 24000, estadoSanitario: "OPTIMO",  notas: "Granja modelo con certificación ICA vigente", ubicacionGoogleMaps: "https://maps.google.com/?q=6.2442,-75.5812" },
    { id: "DEMO_GRJ_002", codigo: "SAVICOL-CUN-002", nombre: "Granja La Esperanza",   estado: "ACTIVA",     region: "Cundinamarca",     vereda: "San Francisco",      administrador: "Marisol Vargas Caicedo",  tecnicoVeterinarioId: "VET-02", telefono: "+57 311 234 5678", tipoGranja: "INTEGRADA", tipoOperativo: "REPRODUCTORA", nivelRiesgo: "MEDIO", capacidadAves: 18500, estadoSanitario: "ALERTA",  notas: "Lote anterior con incidente sanitario menor" },
    { id: "DEMO_GRJ_003", codigo: "SAVICOL-SAN-003", nombre: "Granja Los Almendros",  estado: "ACTIVA",     region: "Santander",        vereda: "Vereda La Pradera",  administrador: "Jaime Andrés Quiroga",    tecnicoVeterinarioId: "VET-03", telefono: "+57 322 345 6789", tipoGranja: "ARRENDADA", tipoOperativo: "ENGORDE",      nivelRiesgo: "ALTO",  capacidadAves: 32000, estadoSanitario: "CRITICO", notas: "Requiere intervención inmediata sanitaria" },
    { id: "DEMO_GRJ_004", codigo: "SAVICOL-BOY-004", nombre: "Granja El Mirador",     estado: "ACTIVA",     region: "Boyacá",            vereda: "Tres Esquinas",       administrador: "Liliana Patricia Bohórquez", tecnicoVeterinarioId: "VET-04", telefono: "+57 318 456 7890", tipoGranja: "PROPIA",    tipoOperativo: "REPRODUCTORA", nivelRiesgo: "BAJO",  capacidadAves: 28000, estadoSanitario: "OPTIMO" },
    { id: "DEMO_GRJ_005", codigo: "SAVICOL-VAL-005", nombre: "Granja Villa María",    estado: "CUARENTENA", region: "Valle del Cauca",   vereda: "El Naranjo",          administrador: "Roberto Carlos Salinas",  tecnicoVeterinarioId: "VET-01", telefono: "+57 305 567 8901", tipoGranja: "INTEGRADA", tipoOperativo: "ENGORDE",      nivelRiesgo: "ALTO",  capacidadAves: 22000, estadoSanitario: "CRITICO", notas: "Cuarentena preventiva por brote en granjas vecinas" },
    { id: "DEMO_GRJ_006", codigo: "SAVICOL-TOL-006", nombre: "Granja San Pedro",      estado: "ACTIVA",     region: "Tolima",            vereda: "La Florida",          administrador: "Diego Mauricio Cifuentes", tecnicoVeterinarioId: "VET-02", telefono: "+57 313 678 9012", tipoGranja: "ARRENDADA", tipoOperativo: "ENGORDE",      nivelRiesgo: "MEDIO", capacidadAves: 19500, estadoSanitario: "ALERTA" },
  ];
  for (const g of granjasData) {
    await prisma.granja.upsert({
      where:  { id: g.id },
      create: { ...(g as any), isDemo: true },
      update: {},
    });
  }
  console.log(`✅ ${granjasData.length} granjas demo`);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Hallazgos demo
  // ─────────────────────────────────────────────────────────────────────────
  // SQLite: tiposRiesgo es JSON string
  const hallazgosData = [
    { id: "DEMO_HAL_001", titulo: "Pediluvio inoperativo en galpón 3", granjaId: "DEMO_GRJ_003", auditorId: "MD", auditorNombre: "Michael Duran",     tipoGranja: "ARRENDADA", tipoOperativo: "ENGORDE",      fechaVisita: new Date("2026-05-10"), categoria: "BIOSEGURIDAD", tiposRiesgo: JSON.stringify(["CONTAGIO","OPERATIVO"]),                       criticidad: "CRITICA", estado: "ABIERTO",   descripcion: "El pediluvio del galpón 3 se encuentra sin solución desinfectante hace al menos 5 días.",          recomendacionesIA: "Reponer solución de yodo activo al 2% inmediatamente. Capacitar al personal sobre frecuencia de recambio." },
    { id: "DEMO_HAL_002", titulo: "Mortalidad acumulada > 5%",        granjaId: "DEMO_GRJ_005", auditorId: "KH", auditorNombre: "Kerling Hernandez", tipoGranja: "INTEGRADA", tipoOperativo: "ENGORDE",      fechaVisita: new Date("2026-05-22"), categoria: "MORTALIDAD",   tiposRiesgo: JSON.stringify(["OPERATIVO","FINANCIERO","REPUTACIONAL"]),     criticidad: "ALTA",    estado: "EN_PLAN",   descripcion: "Mortalidad acumulada del lote es de 7.2%, supera umbral aceptable.",                                 recomendacionesIA: "Realizar necropsia inmediata. Revisar protocolo de vacunación. Aislar aves sospechosas." },
    { id: "DEMO_HAL_003", titulo: "Vacunas vencidas en bodega",        granjaId: "DEMO_GRJ_002", auditorId: "JG", auditorNombre: "Jaider Gonzalez",   tipoGranja: "INTEGRADA", tipoOperativo: "REPRODUCTORA", fechaVisita: new Date("2026-05-18"), categoria: "SANITARIO",    tiposRiesgo: JSON.stringify(["LEGAL","OPERATIVO"]),                          criticidad: "ALTA",    estado: "CERRADO",   descripcion: "Se encontraron 3 frascos de vacuna Newcastle vencidos hace 2 semanas.",                              recomendacionesIA: "Eliminar producto vencido siguiendo protocolo. Reforzar control de inventario." },
  ];
  for (const h of hallazgosData) {
    await prisma.hallazgo.upsert({
      where:  { id: h.id },
      create: { ...(h as any), isDemo: true },
      update: {},
    });
  }
  console.log(`✅ ${hallazgosData.length} hallazgos demo`);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. KPIs demo
  // ─────────────────────────────────────────────────────────────────────────
  const kpisData = [
    { id: "DEMO_KPI_001", hallazgoId: "DEMO_HAL_001", granjaId: "DEMO_GRJ_003", accion: "Reposición y mantenimiento de pediluvios",     seguimiento: "Inspección semanal del nivel de desinfectante",       fechaCompromiso: new Date("2026-06-05"), fechaProximaVisita: new Date("2026-06-12"), planAccionVeterinario: "Auditar cumplimiento del protocolo de bioseguridad nivel galpón",  estado: "EN_CURSO",    responsable: "Jaime Andrés Quiroga",   porcentajeAvance: 40 },
    { id: "DEMO_KPI_002", hallazgoId: "DEMO_HAL_002", granjaId: "DEMO_GRJ_005", accion: "Investigación de mortalidad anómala",          seguimiento: "Resultados de necropsia y análisis laboratorio",      fechaCompromiso: new Date("2026-06-01"), fechaProximaVisita: new Date("2026-06-03"), planAccionVeterinario: "Diagnóstico diferencial completo + acciones correctivas",         estado: "EN_CURSO",    responsable: "Roberto Carlos Salinas",  porcentajeAvance: 65 },
    { id: "DEMO_KPI_003",                              granjaId: "DEMO_GRJ_002", accion: "Renovación de inventario sanitario",           seguimiento: "Compra de vacunas y registro en Kardex",              fechaCompromiso: new Date("2026-05-25"), fechaCumplimiento: new Date("2026-05-21"),  planAccionVeterinario: "Plan de auditoría mensual de inventario",                          estado: "COMPLETADO",  responsable: "Marisol Vargas Caicedo", porcentajeAvance: 100 },
    { id: "DEMO_KPI_004",                              granjaId: "DEMO_GRJ_004", accion: "Mejora de sistema de ventilación galpón 2",   seguimiento: "Instalación de extractores nuevos",                   fechaCompromiso: new Date("2026-06-20"),                                                    planAccionVeterinario: "Verificar calidad del aire post-instalación",                      estado: "NO_INICIADO", responsable: "Liliana Patricia Bohórquez", porcentajeAvance: 0 },
  ];
  for (const k of kpisData) {
    await prisma.kPI.upsert({
      where:  { id: k.id },
      create: { ...(k as any), isDemo: true },
      update: {},
    });
  }
  console.log(`✅ ${kpisData.length} KPIs demo`);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Catálogos para RUTAS
  // ─────────────────────────────────────────────────────────────────────────
  const rutasData = [
    { id: "RT-001", codigo: "MED-NORTE-01", nombre: "Medellín Norte",         ciudad: "Medellín",    region: "Antioquia" },
    { id: "RT-002", codigo: "MED-SUR-01",   nombre: "Medellín Sur",           ciudad: "Medellín",    region: "Antioquia" },
    { id: "RT-003", codigo: "BOG-NORTE-01", nombre: "Bogotá Norte",           ciudad: "Bogotá",      region: "Cundinamarca" },
    { id: "RT-004", codigo: "BOG-OCCID-01", nombre: "Bogotá Occidente",       ciudad: "Bogotá",      region: "Cundinamarca" },
    { id: "RT-005", codigo: "BUC-SAB-01",   nombre: "Bucaramanga Sabana",     ciudad: "Bucaramanga", region: "Santander" },
    { id: "RT-006", codigo: "CAL-CENT-01",  nombre: "Cali Centro",            ciudad: "Cali",        region: "Valle del Cauca" },
    { id: "RT-007", codigo: "PER-EJE-01",   nombre: "Pereira Eje",            ciudad: "Pereira",     region: "Risaralda" },
    { id: "RT-008", codigo: "IBA-MET-01",   nombre: "Ibagué Metropolitana",   ciudad: "Ibagué",      region: "Tolima" },
  ];
  for (const r of rutasData) {
    await prisma.ruta.upsert({ where: { id: r.id }, create: { ...r, isDemo: true }, update: {} });
  }
  console.log(`✅ ${rutasData.length} rutas`);

  const vehiculosData = [
    { id: "VH-001", placa: "ABC-123", tipo: "Camión Refrigerado",       capacidadKg: 3500, color: "#3B82F6" },
    { id: "VH-002", placa: "DEF-456", tipo: "Camión Furgón",            capacidadKg: 2800, color: "#10B981" },
    { id: "VH-003", placa: "GHI-789", tipo: "Camioneta Doble Cabina",   capacidadKg: 1500, color: "#F59E0B" },
    { id: "VH-004", placa: "JKL-012", tipo: "Camión Refrigerado",       capacidadKg: 4200, color: "#8B5CF6" },
    { id: "VH-005", placa: "MNO-345", tipo: "Camión Furgón",            capacidadKg: 3000, color: "#EF4444" },
    { id: "VH-006", placa: "PQR-678", tipo: "Camioneta Doble Cabina",   capacidadKg: 1200, color: "#06B6D4" },
  ];
  for (const v of vehiculosData) {
    await prisma.vehiculo.upsert({ where: { id: v.id }, create: { ...v, isDemo: true }, update: {} });
  }
  console.log(`✅ ${vehiculosData.length} vehículos`);

  const conductoresData = [
    { id: "CN-001", nombre: "Pedro Antonio Ramírez", documento: "71234567", licencia: "C2" },
    { id: "CN-002", nombre: "Luis Eduardo Castaño",  documento: "80345678", licencia: "C2" },
    { id: "CN-003", nombre: "José Manuel Salazar",   documento: "71456789", licencia: "C3" },
    { id: "CN-004", nombre: "Andrés Felipe Ortiz",   documento: "80567890", licencia: "C2" },
    { id: "CN-005", nombre: "Carlos Mario Henao",    documento: "71678901", licencia: "C3" },
  ];
  for (const c of conductoresData) {
    await prisma.conductor.upsert({ where: { id: c.id }, create: { ...c, isDemo: true }, update: {} });
  }
  console.log(`✅ ${conductoresData.length} conductores`);

  const auxiliaresData = [
    { id: "AX-001", nombre: "Wilson David Pérez",    documento: "1001234" },
    { id: "AX-002", nombre: "Brayan Esteban Gómez",  documento: "1002345" },
    { id: "AX-003", nombre: "Daniel Felipe Morales", documento: "1003456" },
    { id: "AX-004", nombre: "Sebastián Cardona",     documento: "1004567" },
  ];
  for (const a of auxiliaresData) {
    await prisma.auxiliar.upsert({ where: { id: a.id }, create: { ...a, isDemo: true }, update: {} });
  }
  console.log(`✅ ${auxiliaresData.length} auxiliares`);

  const clientesData = [
    { id: "CL-001", nombre: "Supermercados La Vaquita",      tipo: "Supermercado",    ciudad: "Medellín" },
    { id: "CL-002", nombre: "Distribuidora El Trébol",        tipo: "Distribuidor",    ciudad: "Bogotá" },
    { id: "CL-003", nombre: "Carnes Premium S.A.S",           tipo: "Comercializador", ciudad: "Cali" },
    { id: "CL-004", nombre: "Mercado Central Bogotá",         tipo: "Mercado",         ciudad: "Bogotá" },
    { id: "CL-005", nombre: "Restaurante La Brasa",           tipo: "Restaurante",     ciudad: "Medellín" },
    { id: "CL-006", nombre: "Tiendas D1 Norte",               tipo: "Cadena",          ciudad: "Bucaramanga" },
    { id: "CL-007", nombre: "Hoteles Estelar",                tipo: "Hotelería",       ciudad: "Cartagena" },
    { id: "CL-008", nombre: "Distribuidora El Pollo Feliz",   tipo: "Distribuidor",    ciudad: "Pereira" },
  ];
  for (const c of clientesData) {
    await prisma.cliente.upsert({ where: { id: c.id }, create: { ...c, isDemo: true }, update: {} });
  }
  console.log(`✅ ${clientesData.length} clientes`);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Acompañamientos demo
  // ─────────────────────────────────────────────────────────────────────────
  const acompanamientosData = [
    { id: "DEMO_AC_001", fecha: new Date("2026-05-12"), auditorId: "MD", auditorNombre: "Michael Duran",     clienteId: "CL-001", rutaId: "RT-001", vehiculoId: "VH-001", conductorId: "CN-001", auxiliarId: "AX-001", motivo: "PRODUCTO_VENCIDO",   valorDevueltoCOP: 1245000, cantidadKgDevueltos: 87.5, observacionAuditor: "Se identificó lote vencido en estante de pollo crudo. Cliente reportó hace 2 días.",            riesgosAsociados: JSON.stringify(["LEGAL","REPUTACIONAL","CONTAGIO"]),           criticidad: "CRITICO", estado: "CON_HALLAZGOS" },
    { id: "DEMO_AC_002", fecha: new Date("2026-05-15"), auditorId: "KH", auditorNombre: "Kerling Hernandez", clienteId: "CL-002", rutaId: "RT-003", vehiculoId: "VH-004", conductorId: "CN-004",                       motivo: "CADENA_FRIO_ROTA",   valorDevueltoCOP: 3800000, cantidadKgDevueltos: 215,  observacionAuditor: "Termógrafo del camión reportó temperatura > 4°C durante 3 horas. Cliente rechazó pedido completo.", riesgosAsociados: JSON.stringify(["LEGAL","OPERATIVO","FINANCIERO","CONTAGIO"]), criticidad: "CRITICO", estado: "CON_HALLAZGOS" },
    { id: "DEMO_AC_003", fecha: new Date("2026-05-18"), auditorId: "JG", auditorNombre: "Jaider Gonzalez",   clienteId: "CL-004", rutaId: "RT-004", vehiculoId: "VH-002", conductorId: "CN-002", auxiliarId: "AX-002", motivo: "EMPAQUE_DANADO",     valorDevueltoCOP:  380000, cantidadKgDevueltos:  22,  observacionAuditor: "Empaque al vacío con perforaciones detectadas durante recepción. Solo 4 unidades afectadas.",     riesgosAsociados: JSON.stringify(["REPUTACIONAL","OPERATIVO"]),                  criticidad: "MEDIO",   estado: "COMPLETADO" },
    { id: "DEMO_AC_004", fecha: new Date("2026-05-20"), auditorId: "HB", auditorNombre: "Hilary Basto",      clienteId: "CL-005", rutaId: "RT-002", vehiculoId: "VH-003", conductorId: "CN-003",                       motivo: "DIFERENCIA_PESO",    valorDevueltoCOP:  215000, cantidadKgDevueltos:  12.5,observacionAuditor: "Diferencia 0.5 kg en pedido de 13 kg. Recepción del cliente con balanza certificada.",         riesgosAsociados: JSON.stringify(["FINANCIERO","REPUTACIONAL"]),                  criticidad: "BAJO",    estado: "CERRADO" },
    { id: "DEMO_AC_005", fecha: new Date("2026-05-22"), auditorId: "AT", auditorNombre: "Alexander Tellez",  clienteId: "CL-006", rutaId: "RT-005", vehiculoId: "VH-005", conductorId: "CN-005", auxiliarId: "AX-003", motivo: "ENTREGA_TARDIA",     valorDevueltoCOP:       0, cantidadKgDevueltos:   0,  observacionAuditor: "Entrega 3h después del horario pactado por congestión vehicular. No hubo devolución, sólo nota negativa.", riesgosAsociados: JSON.stringify(["REPUTACIONAL"]),                              criticidad: "MEDIO",   estado: "CERRADO" },
    { id: "DEMO_AC_006", fecha: new Date("2026-05-24"), auditorId: "IB", auditorNombre: "Ivan Bonilla",      clienteId: "CL-008", rutaId: "RT-007", vehiculoId: "VH-006", conductorId: "CN-001",                       motivo: "CALIDAD_NO_CONFORME",valorDevueltoCOP:  920000, cantidadKgDevueltos:  58,  observacionAuditor: "Coloración irregular en pechugas, posible problema en aturdimiento. Lote completo rechazado.",  riesgosAsociados: JSON.stringify(["LEGAL","REPUTACIONAL","OPERATIVO"]),          criticidad: "ALTO",    estado: "CON_HALLAZGOS" },
  ];
  for (const a of acompanamientosData) {
    await prisma.acompanamiento.upsert({
      where:  { id: a.id },
      create: { ...(a as any), isDemo: true },
      update: {},
    });
  }
  console.log(`✅ ${acompanamientosData.length} acompañamientos demo`);

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Acciones de cumplimiento demo
  // ─────────────────────────────────────────────────────────────────────────
  const accionesData = [
    { id: "DEMO_AK_001", acompanamientoId: "DEMO_AC_001", planAccion: "Implementar control FIFO con etiquetado de color por fecha de vencimiento",     responsable: "Coordinador de Despacho · Medellín", estado: "EN_PROCESO",   porcentajeAvance: 60,  fechaCompromiso: new Date("2026-06-05"),                                                                              reincidencia: false },
    { id: "DEMO_AK_002", acompanamientoId: "DEMO_AC_002", planAccion: "Mantenimiento mensual de equipo de refrigeración + alerta automática SMS",       responsable: "Jefe de Flota",                       estado: "VERIFICACION", porcentajeAvance: 85,  fechaCompromiso: new Date("2026-05-30"),                                            evidenciaCorreccion: "Reporte de mantenimiento adjunto", reincidencia: true  },
    { id: "DEMO_AK_003", acompanamientoId: "DEMO_AC_003", planAccion: "Auditoría a proveedor de empaques + reemplazo de proveedor reincidente",          responsable: "Coordinador de Compras",              estado: "CERRADO",      porcentajeAvance: 100, fechaCompromiso: new Date("2026-05-25"), fechaCumplimiento: new Date("2026-05-23"), evidenciaCorreccion: "Contrato firmado con nuevo proveedor", validadoPor: "Jaider Gonzalez", reincidencia: false },
    { id: "DEMO_AK_004", acompanamientoId: "DEMO_AC_006", planAccion: "Revisión del procedimiento de aturdimiento en planta + capacitación operarios", responsable: "Jefe de Planta",                      estado: "PENDIENTE",    porcentajeAvance: 0,   fechaCompromiso: new Date("2026-06-15"),                                                                              reincidencia: false },
  ];
  for (const a of accionesData) {
    await prisma.accionCumplimiento.upsert({
      where:  { id: a.id },
      create: { ...(a as any), isDemo: true },
      update: {},
    });
  }
  console.log(`✅ ${accionesData.length} acciones de cumplimiento demo`);

  // ─────────────────────────────────────────────────────────────────────────
  // 9. CEDIS demo + auditorías + hallazgos
  // ─────────────────────────────────────────────────────────────────────────
  const cedisData = [
    { id: "DEMO_CED_001", codigo: "CEDI-BOG-01", nombre: "CEDI Bogotá Norte",     ciudad: "Bogotá",      region: "Cundinamarca",     administrador: "Camilo Andrés Rojas",     telefono: "+57 311 100 1001", direccion: "Calle 80 #45-22",   capacidad: 8500 },
    { id: "DEMO_CED_002", codigo: "CEDI-MED-01", nombre: "CEDI Medellín Central", ciudad: "Medellín",    region: "Antioquia",         administrador: "Patricia Elena Ramos",    telefono: "+57 314 200 2002", direccion: "Cra 50 #65-30",     capacidad: 7200 },
    { id: "DEMO_CED_003", codigo: "CEDI-CAL-01", nombre: "CEDI Cali Sur",         ciudad: "Cali",        region: "Valle del Cauca",   administrador: "Ricardo Alonso Pérez",    telefono: "+57 318 300 3003", direccion: "Av. Roosevelt #14", capacidad: 6500 },
    { id: "DEMO_CED_004", codigo: "CEDI-BUC-01", nombre: "CEDI Bucaramanga",      ciudad: "Bucaramanga", region: "Santander",         administrador: "Adriana Lucía Sandoval",  telefono: "+57 313 400 4004", direccion: "Cl 56 #21-08",      capacidad: 4800 },
    { id: "DEMO_CED_005", codigo: "CEDI-PER-01", nombre: "CEDI Pereira",          ciudad: "Pereira",     region: "Risaralda",         administrador: "Mauricio Andrés Cano",    telefono: "+57 320 500 5005", direccion: "Av. Circunvalar 28",capacidad: 3900 },
  ];
  for (const c of cedisData) {
    await prisma.cedi.upsert({ where: { id: c.id }, create: { ...(c as any), isDemo: true }, update: {} });
  }
  console.log(`✅ ${cedisData.length} CEDIS demo`);

  const auditoriasCediData = [
    { id: "DEMO_AUC_001", cediId: "DEMO_CED_001", fechaVisita: new Date("2026-05-10"), auditorId: "MD", auditorNombre: "Michael Duran",     administrador: "Camilo Andrés Rojas",   tipoRiesgo: "OPERATIVO",   observacionRiesgo: "Inconsistencias en inventario físico vs sistema",                                  observacionInventario: "Diferencias de 0.3% en stock de producto. Aceptable pero requiere ajuste.", observacionCaja: "Caja General correctamente cuadrada.", criticidad: "MEDIA",   estado: "EN_PLAN" },
    { id: "DEMO_AUC_002", cediId: "DEMO_CED_003", fechaVisita: new Date("2026-05-18"), auditorId: "KH", auditorNombre: "Kerling Hernandez", administrador: "Ricardo Alonso Pérez",  tipoRiesgo: "CONTAGIO",    observacionRiesgo: "Pediluvio sin desinfectante adecuado durante 3 días",                              observacionBioseguridad: "Falla crítica en pediluvio. EPP del personal en buen estado.", observacionInfraestructura: "Cuartos fríos a temperatura correcta.", criticidad: "CRITICA", estado: "ABIERTO" },
    { id: "DEMO_AUC_003", cediId: "DEMO_CED_002", fechaVisita: new Date("2026-05-22"), auditorId: "JG", auditorNombre: "Jaider Gonzalez",   administrador: "Patricia Elena Ramos",  tipoRiesgo: "FINANCIERO",  observacionRiesgo: "Cartera con vencidos a más de 60 días por COP 2.3M",                              observacionCartera: "Vencimientos por edades requieren plan de cobranza urgente.", observacionCaja: "Caja Vehículos con diferencia de COP 45.000.", criticidad: "ALTA",    estado: "EN_VERIFICACION" },
    { id: "DEMO_AUC_004", cediId: "DEMO_CED_004", fechaVisita: new Date("2026-05-25"), auditorId: "HB", auditorNombre: "Hilary Basto",      administrador: "Adriana Lucía Sandoval",tipoRiesgo: "REPUTACIONAL",observacionRiesgo: "Encuestas cliente ruta muestran baja satisfacción (62%)",                          observacionLogistica: "Tiempos de entrega 22% por encima del estándar. Devoluciones en aumento.", criticidad: "ALTA",    estado: "EN_PLAN" },
  ];
  for (const a of auditoriasCediData) {
    await prisma.auditoriaCedi.upsert({ where: { id: a.id }, create: { ...(a as any), isDemo: true }, update: {} });
  }
  console.log(`✅ ${auditoriasCediData.length} auditorías CEDIS demo`);

  const hallazgosCediData = [
    { id: "DEMO_HAC_001", auditoriaId: "DEMO_AUC_002", cediId: "DEMO_CED_003", titulo: "Pediluvio inoperante 3 días",        categoria: "BIOSEGURIDAD",   subItem: "Pediluvio",                    descripcion: "Pediluvio sin solución desinfectante. Riesgo de contagio cruzado.", tipoRiesgo: "CONTAGIO",     criticidad: "CRITICA", estado: "ABIERTO",         recomendacionIA: "Reabastecer solución de yodo activo al 2% inmediatamente.", responsable: "Ricardo Alonso Pérez",  fechaCompromiso: new Date("2026-06-01"), porcentajeAvance: 25, reincidente: true },
    { id: "DEMO_HAC_002", auditoriaId: "DEMO_AUC_003", cediId: "DEMO_CED_002", titulo: "Cartera vencida > 60 días",          categoria: "CARTERA",        subItem: "Vencimiento por edades",       descripcion: "COP 2.300.000 en cartera vencida a más de 60 días.",               tipoRiesgo: "FINANCIERO",   criticidad: "ALTA",    estado: "EN_VERIFICACION", recomendacionIA: "Activar plan de cobranza estratégico con 3 niveles de seguimiento.", responsable: "Patricia Elena Ramos",  fechaCompromiso: new Date("2026-06-10"), porcentajeAvance: 60, reincidente: false },
    { id: "DEMO_HAC_003", auditoriaId: "DEMO_AUC_004", cediId: "DEMO_CED_004", titulo: "Tiempos de entrega +22%",            categoria: "LOGISTICA",      subItem: "Tiempos Entrega",              descripcion: "Promedio de entrega 22% por encima del estándar Savicol.",          tipoRiesgo: "REPUTACIONAL", criticidad: "ALTA",    estado: "EN_PLAN",         recomendacionIA: "Replanificar rutas. Capacitación a conductores.",                       responsable: "Adriana Lucía Sandoval", fechaCompromiso: new Date("2026-06-15"), porcentajeAvance: 40, reincidente: false },
    { id: "DEMO_HAC_004", auditoriaId: "DEMO_AUC_001", cediId: "DEMO_CED_001", titulo: "Diferencia inventario 0.3%",          categoria: "INVENTARIO",     subItem: "Inventario físico producto",   descripcion: "Diferencia físico vs sistema dentro del margen aceptable.",         tipoRiesgo: "OPERATIVO",    criticidad: "MEDIA",   estado: "EN_PLAN",         recomendacionIA: "Ajuste contable inmediato + análisis de causa raíz.",                  responsable: "Camilo Andrés Rojas",   fechaCompromiso: new Date("2026-06-05"), porcentajeAvance: 80, reincidente: false },
  ];
  for (const h of hallazgosCediData) {
    await prisma.hallazgoCedi.upsert({ where: { id: h.id }, create: { ...(h as any), isDemo: true }, update: {} });
  }
  console.log(`✅ ${hallazgosCediData.length} hallazgos CEDIS demo`);

  console.log("\n🌱 Seed completado.\n");
  console.log(`   Login: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   (Cambiar después del primer login)\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
