import { useEffect, useState } from "react";
import { Plus, Loader2, Truck, Bike, ClipboardCheck, Trash2, Eye, Download, X } from "lucide-react";
import { toast } from "sonner";
import { api, type MotoInspectionOut, type VehicleInspectionOut, type VehicleOut } from "../../../services/api";
import NuevaInspeccionCarroDrawer from "./NuevaInspeccionCarroDrawer";
import NuevaInspeccionMotoDrawer from "./NuevaInspeccionMotoDrawer";
import InspeccionCarroDetail from "./InspeccionCarroDetail";
import InspeccionMotoDetail from "./InspeccionMotoDetail";
import DatePicker from "../../../components/ui/DatePicker";

interface Props {
  vehicle: VehicleOut;
}

export default function InspeccionesTab({ vehicle }: Props) {
  const isMoto = vehicle.tipo === "moto";
  const [carroList, setCarroList] = useState<VehicleInspectionOut[]>([]);
  const [motoList, setMotoList] = useState<MotoInspectionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        vehicle_id: vehicle.id,
        date_from: dateFrom ?? undefined,
        date_to: dateTo ?? undefined,
      };
      if (isMoto) {
        const data = await api.motoInspections.list(params);
        setMotoList(data);
      } else {
        const data = await api.vehicleInspections.list(params);
        setCarroList(data);
      }
    } catch (e: any) {
      toast.error(e.detail ?? "Error al cargar inspecciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [vehicle.id, isMoto, dateFrom, dateTo]);

  const clearFilters = () => { setDateFrom(null); setDateTo(null); };
  const hasFilters = !!(dateFrom || dateTo);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta inspección?")) return;
    setDeletingId(id);
    try {
      if (isMoto) {
        await api.motoInspections.delete(id);
        setMotoList(prev => prev.filter(x => x.id !== id));
      } else {
        await api.vehicleInspections.delete(id);
        setCarroList(prev => prev.filter(x => x.id !== id));
      }
      toast.success("Inspección eliminada");
    } catch (e: any) {
      toast.error(e.detail ?? "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const list = isMoto ? motoList : carroList;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">Inspecciones preoperacionales</h3>
          <p className="text-[11px] text-fg-6 mt-0.5">
            {isMoto ? "Formato FOR-SST-005" : "Formato FOR-SST-006 (diario)"}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-black text-xs font-semibold hover:bg-accent/90 transition-colors"
        >
          <Plus size={12} /> Nueva inspección
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-end gap-2 mb-4 flex-wrap">
        <div className="w-40">
          <label className="text-[10px] text-fg-5 block mb-1 uppercase tracking-wider">Desde</label>
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="dd/mm/aaaa" compact />
        </div>
        <div className="w-40">
          <label className="text-[10px] text-fg-5 block mb-1 uppercase tracking-wider">Hasta</label>
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="dd/mm/aaaa" compact />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-2 text-[11px] text-fg-5 hover:text-fg border border-border hover:border-fg-4 transition-colors"
          >
            <X size={11} /> Limpiar
          </button>
        )}
        {!loading && (
          <span className="text-[11px] text-fg-6 ml-auto">
            {list.length} {list.length === 1 ? "resultado" : "resultados"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={16} className="animate-spin text-fg-6" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-fg-6 gap-2">
          {isMoto ? <Bike size={40} strokeWidth={1} /> : <Truck size={40} strokeWidth={1} />}
          <p className="text-xs">Sin inspecciones registradas</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-2 flex items-center gap-1.5 px-3 py-2 border border-dashed border-fg-6 text-fg-5 text-xs hover:border-accent hover:text-accent transition-colors"
          >
            <Plus size={12} /> Registrar primera inspección
          </button>
        </div>
      ) : (
        <div className="border border-border">
          <div className="grid grid-cols-[110px_1fr_120px_100px] gap-2 px-3 py-2 bg-surface-3 text-[10px] font-semibold text-fg-5 uppercase tracking-wider border-b border-border">
            <div>Fecha</div>
            <div>Conductor</div>
            <div>Ítems</div>
            <div className="text-right">Acciones</div>
          </div>
          {list.map((insp) => {
            const totalItems = insp.items.length;
            const okItems = isMoto
              ? (insp as MotoInspectionOut).items.filter(i => i.status === "bueno").length
              : (insp as VehicleInspectionOut).items.filter(i => i.is_ok).length;
            return (
              <div
                key={insp.id}
                className="grid grid-cols-[110px_1fr_120px_100px] gap-2 items-center px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-surface-3/40 transition-colors"
              >
                <div className="text-xs font-mono text-fg-3">{insp.inspection_date}</div>
                <div className="text-xs text-fg-3 truncate" title={insp.driver_name ?? ""}>
                  {insp.driver_name ?? <span className="text-fg-6">—</span>}
                </div>
                <div className="text-[11px] text-fg-5 flex items-center gap-1">
                  <ClipboardCheck size={11} className="text-emerald-400" />
                  {okItems}/{totalItems} OK
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setDetailId(insp.id)}
                    className="p-1.5 text-fg-5 hover:text-accent hover:bg-accent-muted transition-colors"
                    title="Ver detalle"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (isMoto) await api.motoInspections.downloadPdf(insp.id);
                        else await api.vehicleInspections.downloadPdf(insp.id);
                      } catch (e: any) {
                        toast.error(e.detail ?? "No se pudo abrir el PDF");
                      }
                    }}
                    className="p-1.5 text-fg-5 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    title="Descargar PDF"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(insp.id)}
                    disabled={deletingId === insp.id}
                    className="p-1.5 text-fg-5 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                    title="Eliminar"
                  >
                    {deletingId === insp.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer nueva inspección */}
      {showNew && !isMoto && (
        <NuevaInspeccionCarroDrawer
          vehicle={vehicle}
          onClose={() => setShowNew(false)}
          onCreated={(insp) => { setCarroList(prev => [insp, ...prev]); setShowNew(false); }}
        />
      )}
      {showNew && isMoto && (
        <NuevaInspeccionMotoDrawer
          vehicle={vehicle}
          onClose={() => setShowNew(false)}
          onCreated={(insp) => { setMotoList(prev => [insp, ...prev]); setShowNew(false); }}
        />
      )}

      {/* Detalle */}
      {detailId !== null && !isMoto && (
        <InspeccionCarroDetail id={detailId} onClose={() => setDetailId(null)} />
      )}
      {detailId !== null && isMoto && (
        <InspeccionMotoDetail id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}
