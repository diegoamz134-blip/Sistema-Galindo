'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  X,
  RotateCcw,
  CheckCircle2,
  UserCheck,
  FileText,
  Boxes,
  MapPin,
  Calendar,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import { PedidoCompleto, anularPedidoConKardex } from '@/lib/pedidos-service';
import { formatCurrency } from '@/lib/utils';

interface AnularPedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: PedidoCompleto | any | null;
  usuarioActual?: string;
  onAnulacionExitosa: () => void;
}

const MOTIVOS_PREDETERMINADOS = [
  'Error al digitar productos o monto',
  'Cliente canceló la compra o devolvió mercadería',
  'Cobro duplicado por error de pasarela o POS',
  'Error en método de pago registrado',
  'Otro motivo justificado...',
];

export function AnularPedidoModal({
  isOpen,
  onClose,
  pedido,
  usuarioActual = 'Administrador',
  onAnulacionExitosa,
}: AnularPedidoModalProps) {
  const [responsable, setResponsable] = useState(usuarioActual);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_PREDETERMINADOS[0]);
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResponsable(usuarioActual || 'Administrador');
      setMotivoSeleccionado(MOTIVOS_PREDETERMINADOS[0]);
      setMotivoDetalle('');
      setError(null);
    }
  }, [isOpen, usuarioActual]);

  if (!isOpen || !pedido) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsable.trim()) {
      setError('Debes ingresar el nombre o cargo de quién autoriza la anulación.');
      return;
    }

    const motivoFinal =
      motivoSeleccionado === 'Otro motivo justificado...'
        ? motivoDetalle.trim()
        : motivoDetalle.trim()
        ? `${motivoSeleccionado} (${motivoDetalle.trim()})`
        : motivoSeleccionado;

    if (!motivoFinal) {
      setError('Por favor describe el motivo de la anulación.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await anularPedidoConKardex(pedido.id, responsable.trim(), motivoFinal);
      if (res.ok) {
        onAnulacionExitosa();
        onClose();
      } else {
        setError(res.error || 'No se pudo anular la venta.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al anular la venta.');
    } finally {
      setCargando(false);
    }
  };

  const totalProductos = (pedido.items || []).reduce((acc: number, it: any) => acc + (Number(it.cantidad) || 1), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop con desenfoque de lujo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-zinc-950/75 backdrop-blur-sm transition-all"
      />

      {/* Contenedor del Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden z-10 flex flex-col max-h-[92vh]"
      >
        {/* CABECERA DE ALERTA REFINADA */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-rose-50/70 to-white border-b border-rose-100 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-mono text-xs font-bold tracking-tight shadow-xs">
                {pedido.codigo_pedido}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] font-bold font-mono">
                {formatCurrency(pedido.total)}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                <ShieldAlert className="w-3 h-3" />
                Acción Irreversible
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black text-rose-950 tracking-tight">
              Anular Venta / Comprobante
            </h2>

            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Sede {pedido.sede_nombre}</span>
              <span>•</span>
              <span className="font-bold text-zinc-800">{pedido.cliente_nombre}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-rose-100/70 hover:bg-rose-200 text-rose-600 hover:text-rose-900 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs flex items-start gap-2.5 shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* TARJETA DE IMPACTO CONTABLE & KARDEX */}
          <div className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/90 space-y-2.5 shadow-2xs">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Efectos Automáticos en el Sistema
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex items-start gap-2">
                <Boxes className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-zinc-900 font-bold">Retorno al Kardex:</strong>
                  <span className="text-zinc-600">
                    +{totalProductos} {totalProductos === 1 ? 'unidad regresa' : 'unidades regresan'} a stock en {pedido.sede_nombre}.
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-zinc-900 font-bold">Descuento de Caja:</strong>
                  <span className="text-zinc-600">
                    Se deduce {formatCurrency(pedido.total)} de ingresos y reportes.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RESPONSABLE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>Nombre de quién autoriza la anulación <span className="text-rose-500">*</span></span>
            </label>
            <div className="relative rounded-xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all bg-zinc-50/40 focus-within:bg-white overflow-hidden shadow-2xs">
              <input
                type="text"
                required
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Ej: Diego Galindo / Supervisor de Turno"
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-zinc-900 outline-none bg-transparent"
              />
            </div>
          </div>

          {/* MOTIVO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Motivo principal de la anulación <span className="text-rose-500">*</span></span>
            </label>
            <div className="relative rounded-xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all bg-zinc-50/40 focus-within:bg-white overflow-hidden shadow-2xs">
              <select
                value={motivoSeleccionado}
                onChange={(e) => setMotivoSeleccionado(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-zinc-900 outline-none bg-transparent cursor-pointer"
              >
                {MOTIVOS_PREDETERMINADOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DETALLE ADICIONAL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-600">
              Detalle o justificación adicional (Opcional):
            </label>
            <div className="relative rounded-2xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all bg-zinc-50/40 focus-within:bg-white overflow-hidden shadow-2xs p-1">
              <textarea
                rows={2}
                value={motivoDetalle}
                onChange={(e) => setMotivoDetalle(e.target.value)}
                placeholder="Ej: El cliente solicitó cambio de máquina por garantía..."
                className="w-full p-2.5 text-xs text-zinc-800 outline-none resize-none leading-relaxed bg-transparent"
              />
            </div>
          </div>
        </form>

        {/* PIE DEL MODAL */}
        <div className="p-4 sm:p-5 border-t border-zinc-150 bg-zinc-50/70 flex items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
            Constancia de Auditoría
          </span>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              disabled={cargando}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white text-zinc-700 font-bold hover:bg-zinc-100 transition-all cursor-pointer text-xs shadow-2xs"
            >
              Cancelar
            </button>

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={cargando}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {cargando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirmar Anulación</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
