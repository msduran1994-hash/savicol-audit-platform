"use client";
import { useAuditStore } from "@/store/audit.store";
import { AUDITORS, AUDIT_AREAS, AUDIT_STATUS, MONTHS_2026 } from "@/lib/constants";
import { Search } from "lucide-react";

export function AuditFilters() {
  const { filters, setFilters } = useAuditStore();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569]" />
        <input
          value={filters.search}
          onChange={e => setFilters({ search: e.target.value })}
          placeholder="Buscar actividad, área, auditor..."
          className="input-base pl-9 py-2 text-xs w-56"
        />
      </div>

      {/* Auditor */}
      <select
        value={filters.auditorId}
        onChange={e => setFilters({ auditorId: e.target.value })}
        className="input-base py-2 text-xs w-40"
      >
        <option value="">Todos los auditores</option>
        {AUDITORS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={e => setFilters({ status: e.target.value })}
        className="input-base py-2 text-xs w-36"
      >
        <option value="">Todos los estados</option>
        {Object.values(AUDIT_STATUS).map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Month */}
      <select
        value={filters.month ?? ""}
        onChange={e => setFilters({ month: e.target.value ? Number(e.target.value) : null })}
        className="input-base py-2 text-xs w-32"
      >
        <option value="">Todos los meses</option>
        {MONTHS_2026.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Area */}
      <select
        value={filters.area}
        onChange={e => setFilters({ area: e.target.value })}
        className="input-base py-2 text-xs w-44"
      >
        <option value="">Todas las áreas</option>
        {AUDIT_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}
