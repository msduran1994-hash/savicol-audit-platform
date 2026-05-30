import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuditStatus, AuditorId } from "../lib/constants";
import { apiPost, apiPatch, apiDelete } from "../lib/api";
import { AUDIT_STATUS_TO_DB, toDB } from "../lib/enum-labels";

function activityToDB(a: Partial<AuditActivity>): any {
  return { ...a, ...(a.status && { status: toDB(a.status, AUDIT_STATUS_TO_DB) }) };
}

export interface AuditActivity {
  id: string;
  item: number;
  area: string;
  auditorId: AuditorId;
  auditorName: string;
  activity: string;
  activityType: string;
  startDate: string;    // ISO date
  endDate: string;      // ISO date
  status: AuditStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

interface AuditFilters {
  search: string;
  auditorId: string;
  status: string;
  area: string;
  month: number | null;
  activityType: string;
}

interface AuditState {
  activities: AuditActivity[];
  filters: AuditFilters;
  selectedActivity: AuditActivity | null;
  isLoading: boolean;

  // Hydration desde API (reemplaza dataset entero)
  hydrateActivities: (a: AuditActivity[]) => void;

  setActivities: (a: AuditActivity[]) => void;
  addActivity: (a: AuditActivity) => void;
  updateActivity: (id: string, updates: Partial<AuditActivity>) => void;
  removeActivity: (id: string) => void;
  setFilters: (f: Partial<AuditFilters>) => void;
  resetFilters: () => void;
  setSelected: (a: AuditActivity | null) => void;
  setLoading: (v: boolean) => void;
}

const defaultFilters: AuditFilters = {
  search: "", auditorId: "", status: "", area: "", month: null, activityType: "",
};

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      activities: [],
      filters: defaultFilters,
      selectedActivity: null,
      isLoading: false,

      hydrateActivities: (activities) => set({ activities }),
      setActivities:     (activities) => set({ activities }),

      // ── CRUD con persistencia API ──
      addActivity: async (a) => {
        const tempId = `tmp_${Date.now()}`;
        const optimistic = { ...a, id: tempId, item: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as AuditActivity;
        set((s) => ({ activities: [...s.activities, optimistic] }));
        try {
          const real = await apiPost<AuditActivity>("/audit-activities", activityToDB(a));
          set((s) => ({ activities: s.activities.map((x) => x.id === tempId ? { ...optimistic, id: real.id, item: real.item, createdAt: real.createdAt, updatedAt: real.updatedAt } : x) }));
        } catch (e) {
          set((s) => ({ activities: s.activities.filter((x) => x.id !== tempId) }));
          console.error("addActivity failed:", e);
        }
      },
      updateActivity: async (id, updates) => {
        let snapshot: AuditActivity | undefined;
        set((s) => {
          snapshot = s.activities.find((a) => a.id === id);
          return { activities: s.activities.map((a) => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a) };
        });
        if (id.startsWith("tmp_")) return;
        try { await apiPatch<AuditActivity>(`/audit-activities/${id}`, activityToDB(updates)); }
        catch (e) {
          if (snapshot) set((s) => ({ activities: s.activities.map((a) => a.id === id ? snapshot! : a) }));
          console.error("updateActivity failed:", e);
        }
      },
      removeActivity: async (id) => {
        let snapshot: AuditActivity[] = [];
        set((s) => { snapshot = s.activities; return { activities: s.activities.filter((a) => a.id !== id) }; });
        if (id.startsWith("tmp_")) return;
        try { await apiDelete(`/audit-activities/${id}`); }
        catch (e) { set({ activities: snapshot }); console.error("removeActivity failed:", e); }
      },

      setFilters:   (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: ()  => set({ filters: defaultFilters }),
      setSelected:  (selectedActivity) => set({ selectedActivity }),
      setLoading:   (isLoading) => set({ isLoading }),
    }),
    {
      name: "savicol-audit-store",
      partialize: (s) => ({ activities: s.activities }),
    }
  )
);

// ─── DERIVED SELECTORS ────────────────────────────────────────────────────────
export function selectFilteredActivities(state: AuditState): AuditActivity[] {
  const { activities, filters } = state;
  return activities.filter((a) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!a.activity.toLowerCase().includes(q) &&
          !a.area.toLowerCase().includes(q) &&
          !a.auditorName.toLowerCase().includes(q)) return false;
    }
    if (filters.auditorId && a.auditorId !== filters.auditorId) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.area && a.area !== filters.area) return false;
    if (filters.month !== null) {
      const month = new Date(a.startDate).getMonth() + 1;
      if (month !== filters.month) return false;
    }
    if (filters.activityType && a.activityType !== filters.activityType) return false;
    return true;
  });
}
