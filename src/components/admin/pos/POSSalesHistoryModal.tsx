'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  History,
  Receipt,
  RotateCcw,
  Printer,
  Calendar,
  Wallet,
  TrendingUp,
  RefreshCw,
  Search,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { getVentasPOSPaginadas, VentaRegistradaPOS } from '@/lib/pos-service';
import { formatCurrency } from '@/lib/utils';
import { METODOS_PAGO_LABELS } from '@/lib/constants';
import { exportarCierreCajaExcel } from '@/lib/excel-reportes-service';
import { AnularPedidoModal } from '@/components/admin/pedidos/AnularPedidoModal';
import { useSede } from '@/context/SedeContext';
import { useAuth } from '@/context/AuthContext';

interface POSSalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionarParaReimprimir?: (venta: any) => void;
}

// Obtiene la fecha actual en formato YYYY-MM-DD
function getHoyStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Obtiene la fecha de ayer en formato YYYY-MM-DD
function getAyerStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Formatea YYYY-MM-DD a DD/MM/AAAA para etiquetas de visualización
function formatLabelFecha(fechaStr: string): string {
  if (!fechaStr) return 'Historial Completo';
  const parts = fechaStr.split('-');
  if (parts.length !== 3) return fechaStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function POSSalesHistoryModal({
  isOpen,
  onClose,
  onSeleccionarParaReimprimir,
}: POSSalesHistoryModalProps) {
  const { sedeActiva } = useSede();
  const { userMeta } = useAuth();

  // Estados de Filtro
  const hoyStr = getHoyStr();
  const ayerStr = getAyerStr();
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyStr);
  const [modoFecha, setModoFecha] = useState<'HOY' | 'AYER' | 'CUSTOM' | 'TODAS'>('HOY');
  const [busqueda, setBusqueda] = useState('');
  const [incluirAnulados, setIncluirAnulados] = useState(true);

  // Estados de Paginación (10 por página)
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const [ventas, setVentas] = useState<VentaRegistradaPOS[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalVendido, setTotalVendido] = useState(0);
  const [totalTicketsValidos, setTotalTicketsValidos] = useState(0);
  const [totalAnulados, setTotalAnulados] = useState(0);

  // Estados de UI y Modales
  const [loading, setLoading] = useState(true);
  const [isExportando, setIsExportando] = useState(false);
  const [ventaParaAnular, setVentaParaAnular] = useState<any | null>(null);

  // Carga paginada desde Supabase
  const cargarVentas = useCallback(async () => {
    setLoading(true);
    try {
      const fechaParam = modoFecha === 'TODAS' ? '' : fechaSeleccionada;
      const res = await getVentasPOSPaginadas({
        sedeId: sedeActiva === 'huancayo' ? 'huancayo' : 'ica',
        fecha: fechaParam,
        busqueda: busqueda.trim(),
        pagina,
        porPagina,
        incluirAnulados,
      });

      setVentas(res.ventas);
      setTotalRegistros(res.totalRegistros);
      setTotalPaginas(res.totalPaginas);
      setTotalVendido(res.totalVendido);
      setTotalTicketsValidos(res.totalTicketsValidos);
      setTotalAnulados(res.totalAnulados);
    } catch (err) {
      console.error('Error al cargar ventas paginadas:', err);
    } finally {
      setLoading(false);
    }
  }, [sedeActiva, fechaSeleccionada, modoFecha, busqueda, pagina, incluirAnulados]);

  // Recarga al abrir o al cambiar filtros
  useEffect(() => {
    if (isOpen) {
      cargarVentas();
    }
  }, [isOpen, cargarVentas]);

  // Eventos en vivo
  useEffect(() => {
    if (!isOpen) return;
    const handleVenta = () => cargarVentas();
    window.addEventListener('galindo_pos_venta_realizada', handleVenta);
    window.addEventListener('galindo_pedido_web_realizado', handleVenta);
    return () => {
      window.removeEventListener('galindo_pos_venta_realizada', handleVenta);
      window.removeEventListener('galindo_pedido_web_realizado', handleVenta);
    };
  }, [isOpen, cargarVentas]);

  // Exportar Cierre de Caja en Excel sincronizado con la fecha seleccionada
  const handleExportarCierre = async () => {
    setIsExportando(true);
    try {
      const fechaParam = modoFecha === 'TODAS' ? undefined : fechaSeleccionada;
      await exportarCierreCajaExcel({
        sedeId: sedeActiva === 'huancayo' ? 'huancayo' : 'ica',
        cajeroNombre: userMeta?.nombre || 'Cajero Galindo',
        fechaFiltro: fechaParam,
      });
    } catch (err) {
      console.error('Error al exportar cierre de caja:', err);
      alert('Ocurrió un error al generar el archivo Excel de cierre de caja.');
    } finally {
      setIsExportando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 border border-zinc-200 z-10 space-y-4 max-h-[94vh] flex flex-col"
      >
        {/* ENCABEZADO PRINCIPAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-xs shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-zinc-950 uppercase tracking-tight">
                  Ventas & Arqueo de Caja
                </h3>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                  Sede {sedeActiva}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono">
                {modoFecha === 'TODAS'
                  ? 'Historial consolidado sin límite de fecha'
                  : `Caja del día: ${formatLabelFecha(fechaSeleccionada)}`}
              </p>
            </div>
          </div>

          {/* Botones Cabecera: Exportar Excel Sincronizado & Cerrar */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportarCierre}
              disabled={isExportando || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title={`Descargar arqueo y cierre diario de caja (${modoFecha === 'TODAS' ? 'Historial' : formatLabelFecha(fechaSeleccionada)})`}
            >
              {isExportando ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>
                {isExportando
                  ? 'Generando...'
                  : modoFecha === 'TODAS'
                  ? 'Cierre de Caja (.xlsx)'
                  : `Cierre del ${formatLabelFecha(fechaSeleccionada).slice(0, 5)} (.xlsx)`}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 TARJETAS RESUMEN / KPIS DEL DÍA FILTRADO */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">
              Total Cobrado {modoFecha !== 'TODAS' && `(${formatLabelFecha(fechaSeleccionada).slice(0, 5)})`}
            </span>
            <span className="text-xl font-black font-mono text-zinc-950">
              {formatCurrency(totalVendido)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">
              Tickets Emitidos
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black font-mono text-zinc-950">
                {totalTicketsValidos} válidos
              </span>
              {totalAnulados > 0 && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 font-mono">
                  +{totalAnulados} anulados
                </span>
              )}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block font-mono">
              Fecha Activa
            </span>
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mt-1 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-mono">
                {modoFecha === 'HOY'
                  ? `Hoy (${formatLabelFecha(hoyStr)})`
                  : modoFecha === 'AYER'
                  ? `Ayer (${formatLabelFecha(ayerStr)})`
                  : modoFecha === 'TODAS'
                  ? 'Todo el Historial'
                  : formatLabelFecha(fechaSeleccionada)}
              </span>
            </span>
          </div>
        </div>

        {/* BARRA DE FILTROS: PRESETS DE FECHA + SELECTOR DE CALENDARIO + BUSCADOR */}
        <div className="space-y-2.5 bg-zinc-50/90 p-3 rounded-2xl border border-zinc-200/90">
          {/* Fila 1: Botones rápidos de fecha + Selector de Calendario */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setFechaSeleccionada(hoyStr);
                  setModoFecha('HOY');
                  setPagina(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modoFecha === 'HOY'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${modoFecha === 'HOY' ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
                <span>Turno de Hoy</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFechaSeleccionada(ayerStr);
                  setModoFecha('AYER');
                  setPagina(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modoFecha === 'AYER'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Ayer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoFecha('TODAS');
                  setPagina(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modoFecha === 'TODAS'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <History className="w-3.5 h-3.5 text-zinc-400" />
                <span>Todo el Historial</span>
              </button>
            </div>

            {/* Input Date Picker para elegir cualquier día libremente */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-2.5 py-1 focus-within:border-zinc-900 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] font-bold text-zinc-500 font-mono">Día:</span>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => {
                  if (e.target.value) {
                    setFechaSeleccionada(e.target.value);
                    setModoFecha('CUSTOM');
                    setPagina(1);
                  }
                }}
                className="text-xs font-bold text-zinc-900 outline-none bg-transparent cursor-pointer font-mono"
                title="Seleccionar fecha específica en el calendario"
              />
            </div>
          </div>

          {/* Fila 2: Buscador por texto + Switch de Anulados */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-200/60">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar por ticket #, nombre de cliente o DNI..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 outline-none focus:border-zinc-900 shadow-2xs font-medium"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('');
                    setPagina(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={incluirAnulados}
                onChange={(e) => {
                  setIncluirAnulados(e.target.checked);
                  setPagina(1);
                }}
                className="w-3.5 h-3.5 rounded text-zinc-900 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px]">Ver tickets anulados</span>
            </label>
          </div>
        </div>

        {/* LISTADO DE VENTAS PAGINADAS (10 POR PÁGINA) */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center text-zinc-400 text-xs font-mono space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-400" />
              <p>Consultando base de datos...</p>
            </div>
          ) : ventas.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 text-xs space-y-2">
              <Receipt className="w-9 h-9 text-zinc-300 mx-auto" />
              <p className="font-bold text-zinc-700 text-sm">No se encontraron ventas</p>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                {modoFecha === 'TODAS'
                  ? 'No hay tickets registrados en el historial de esta sede con el filtro aplicado.'
                  : `No hay ventas registradas para el día ${formatLabelFecha(fechaSeleccionada)}.`}
              </p>
            </div>
          ) : (
            ventas.map((v) => {
              const metaLabel = METODOS_PAGO_LABELS[v.metodo_pago] || {
                label: v.metodo_pago,
                color: 'bg-zinc-800 text-white',
              };

              const fechaObj = new Date(v.creado_en);
              const horaTexto = fechaObj.toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const fechaTexto = `${fechaObj.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })} • ${horaTexto}`;

              const esAnulado = v.estado === 'CANCELADO';

              return (
                <div
                  key={v.id || v.codigo_pedido}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs ${
                    esAnulado
                      ? 'bg-rose-50/40 border-rose-200/80 opacity-90'
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {/* Información del Ticket */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs text-black bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                        #{v.codigo_pedido}
                      </span>

                      <span className="text-[10px] text-zinc-500 font-mono">
                        {fechaTexto}
                      </span>

                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${metaLabel.color}`}>
                        {metaLabel.label}
                      </span>

                      {/* Estado del pedido */}
                      {esAnulado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Anulado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Entregado</span>
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-zinc-900 truncate">
                      {v.cliente_nombre || 'Cliente Mostrador'}
                      {v.cliente_dni && (
                        <span className="font-mono text-[10px] text-zinc-400 ml-1.5">
                          (DNI: {v.cliente_dni})
                        </span>
                      )}
                      {v.cliente_telefono && (
                        <span className="font-mono text-[10px] text-zinc-400 ml-1.5">
                          (Tel: {v.cliente_telefono})
                        </span>
                      )}
                    </div>

                    {v.items_resumen && (
                      <p className="text-[10px] text-zinc-500 font-mono truncate">
                        {v.items_resumen}
                      </p>
                    )}
                  </div>

                  {/* Total y Acciones */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 shrink-0">
                    <div className="text-right pr-1">
                      <span className="text-[10px] text-zinc-400 block font-mono">Total</span>
                      <span
                        className={`font-mono font-black text-sm ${
                          esAnulado ? 'text-zinc-400 line-through' : 'text-zinc-950'
                        }`}
                      >
                        {formatCurrency(v.total)}
                      </span>
                    </div>

                    {/* Botón Reimprimir Ticket */}
                    {onSeleccionarParaReimprimir && (v as any).ventaCompleta && (
                      <button
                        type="button"
                        onClick={() => onSeleccionarParaReimprimir((v as any).ventaCompleta)}
                        className="p-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Reimprimir Ticket oficial"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Ticket</span>
                      </button>
                    )}

                    {/* Botón Anular Venta (solo disponible si no está anulado ya) */}
                    {!esAnulado ? (
                      <button
                        type="button"
                        onClick={() =>
                          setVentaParaAnular({
                            id: v.id,
                            codigo_pedido: v.codigo_pedido,
                            total: v.total,
                            sede_nombre: sedeActiva === 'huancayo' ? 'Huancayo' : 'Ica',
                            cliente_nombre: v.cliente_nombre || 'Cliente Mostrador',
                            items: [],
                          })
                        }
                        className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Anular esta venta y devolver productos al inventario"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        <span className="hidden sm:inline text-[11px]">Anular</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-500 font-mono px-2 py-1 bg-rose-50/50 rounded-lg border border-rose-100">
                        Anulada
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PIE DEL MODAL: PAGINACIÓN PROFESIONAL */}
        <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-zinc-500 font-mono text-[11px]">
            {totalRegistros > 0 ? (
              <>
                Mostrando del <span className="font-bold text-zinc-900">{(pagina - 1) * porPagina + 1}</span> al{' '}
                <span className="font-bold text-zinc-900">{Math.min(pagina * porPagina, totalRegistros)}</span> de{' '}
                <span className="font-bold text-zinc-900">{totalRegistros}</span> tickets
              </>
            ) : (
              '0 registros encontrados'
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || loading}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold cursor-pointer text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-zinc-100 font-mono font-bold text-zinc-800 text-[11px]">
              Página {pagina} de {Math.max(1, totalPaginas)}
            </span>

            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || loading}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold cursor-pointer text-xs"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal de Anulación Formal con Auditoría y Kardex */}
        {ventaParaAnular && (
          <AnularPedidoModal
            isOpen={Boolean(ventaParaAnular)}
            onClose={() => setVentaParaAnular(null)}
            pedido={ventaParaAnular}
            usuarioActual={userMeta?.nombre || 'Administrador Galindo'}
            onAnulacionExitosa={() => {
              setVentaParaAnular(null);
              cargarVentas();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('galindo_pos_venta_realizada'));
                window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
              }
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
