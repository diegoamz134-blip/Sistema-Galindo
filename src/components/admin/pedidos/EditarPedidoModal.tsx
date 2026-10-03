'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit3,
  User,
  Phone,
  CreditCard,
  FileText,
  Save,
  Check,
  AlertTriangle,
  Banknote,
  Smartphone,
  Building2,
  Layers,
  MapPin,
  Calendar,
  ShoppingBag,
  Store,
  GraduationCap,
  Copy,
  Info,
} from 'lucide-react';
import { PedidoCompleto, editarPedidoAdmin } from '@/lib/pedidos-service';
import { formatCurrency } from '@/lib/utils';

interface EditarPedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: PedidoCompleto | null;
  onPedidoEditado: () => void;
}

const OPCIONES_METODO_PAGO = [
  { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'YAPE', label: 'Yape', icon: Smartphone, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'PLIN', label: 'Plin', icon: Smartphone, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'TRANSFERENCIA', label: 'Transferencia BCP', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'TARJETA', label: 'Tarjeta POS', icon: CreditCard, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'MIXTO', label: 'Pago Mixto', icon: Layers, color: 'text-zinc-700 bg-zinc-100 border-zinc-300' },
] as const;

export function EditarPedidoModal({
  isOpen,
  onClose,
  pedido,
  onPedidoEditado,
}: EditarPedidoModalProps) {
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [notas, setNotas] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiadoCodigo, setCopiadoCodigo] = useState(false);

  useEffect(() => {
    if (pedido && isOpen) {
      setNombre(pedido.cliente_nombre || '');
      setDni(pedido.cliente_dni || '');
      setTelefono(pedido.cliente_telefono || '');
      setMetodoPago(pedido.metodo_pago || 'EFECTIVO');
      setNotas(pedido.notas || '');
      setError(null);
    }
  }, [pedido, isOpen]);

  if (!isOpen || !pedido) return null;

  const handleCopiarCodigo = () => {
    navigator.clipboard.writeText(pedido.codigo_pedido);
    setCopiadoCodigo(true);
    setTimeout(() => setCopiadoCodigo(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre o razón social del cliente no puede estar vacío.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await editarPedidoAdmin(pedido.id, {
        cliente_nombre: nombre.trim(),
        cliente_dni: dni.trim(),
        cliente_telefono: telefono.trim(),
        metodo_pago: metodoPago,
        notas: notas.trim(),
      });

      if (res.ok) {
        onPedidoEditado();
        onClose();
      } else {
        setError(res.error || 'No se pudo guardar los cambios en la base de datos.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al guardar los cambios.');
    } finally {
      setCargando(false);
    }
  };

  const canalBadge = {
    ACADEMIA: { label: 'Academia & Matrícula', icon: GraduationCap, bg: 'bg-amber-50 text-amber-900 border-amber-200' },
    WEB_TIENDA: { label: 'Tienda Web Supply', icon: ShoppingBag, bg: 'bg-blue-50 text-blue-900 border-blue-200' },
    POS_MOSTRADOR: { label: 'Venta Mostrador POS', icon: Store, bg: 'bg-zinc-100 text-zinc-900 border-zinc-200' },
  }[pedido.tipo_canal] || { label: 'Venta', icon: ShoppingBag, bg: 'bg-zinc-100 text-zinc-900 border-zinc-200' };

  const CanalIcon = canalBadge.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop con desenfoque de lujo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm transition-all"
      />

      {/* Contenedor del Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200/90 overflow-hidden z-10 flex flex-col max-h-[92vh]"
      >
        {/* CABECERA ELEGANTE CON BRAND ACCENT */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-zinc-50 to-white border-b border-zinc-150 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white font-mono text-xs font-bold tracking-tight shadow-xs">
                <span>{pedido.codigo_pedido}</span>
                <button
                  type="button"
                  onClick={handleCopiarCodigo}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                  title="Copiar código"
                >
                  {copiadoCodigo ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </span>

              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${canalBadge.bg}`}>
                <CanalIcon className="w-3 h-3" />
                <span>{canalBadge.label}</span>
              </span>

              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black font-mono">
                {formatCurrency(pedido.total)}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <h2 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight">
                Editar Datos de la Venta
              </h2>
            </div>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{pedido.sede_nombre}</span>
              <span>•</span>
              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>
                {new Date(pedido.creado_en).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-900 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO CON SCROLL SUAVE */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs flex items-start gap-2.5 shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* SECCIÓN 1: DATOS DEL CLIENTE / RECEPTOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                <span>Titular del Comprobante & Contacto</span>
              </span>
            </div>

            {/* Nombre Completo / Razón Social */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-800 block">
                Nombre Completo o Razón Social <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all bg-zinc-50/40 focus-within:bg-white overflow-hidden shadow-2xs">
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Diego Mendoza / Barbería Elite SAC"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold text-zinc-900 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* DNI / RUC y Celular en 2 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              {/* DNI o RUC */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800">
                    DNI / RUC
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {dni.length === 8 ? 'DNI (8)' : dni.length === 11 ? 'RUC (11)' : 'Doc. Identidad'}
                  </span>
                </div>
                <div className="relative rounded-xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all bg-zinc-50/40 focus-within:bg-white overflow-hidden shadow-2xs">
                  <input
                    type="text"
                    maxLength={11}
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="8 dígitos DNI u 11 RUC"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold text-zinc-900 outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Teléfono / WhatsApp */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-500" />
                    <span>WhatsApp / Celular</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 font-medium">Habilitado WA</span>
                </div>
                <div className="relative flex rounded-xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all bg-zinc-50/40 focus-within:bg-white overflow-hidden shadow-2xs">
                  <span className="inline-flex items-center px-2.5 bg-zinc-100 border-r border-zinc-200 text-zinc-500 font-mono text-[11px] font-bold select-none">
                    +51
                  </span>
                  <input
                    type="text"
                    maxLength={9}
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                    placeholder="9 dígitos de celular"
                    className="w-full px-3 py-2.5 text-xs font-mono font-semibold text-zinc-900 outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: MÉTODO DE PAGO ELEGANTE (GRID DE PILLS) */}
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                <span>Método de Pago Registrado</span>
              </span>
              <span className="text-[10px] text-zinc-400">
                Selecciona la vía de cobro efectuada
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OPCIONES_METODO_PAGO.map((opcion) => {
                const IconComponent = opcion.icon;
                const isSelected = metodoPago === opcion.id;

                return (
                  <button
                    key={opcion.id}
                    type="button"
                    onClick={() => setMetodoPago(opcion.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 relative select-none ${
                      isSelected
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm ring-2 ring-zinc-950/10'
                        : 'bg-zinc-50/60 hover:bg-zinc-100/80 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white text-zinc-600 shadow-2xs'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs block leading-tight truncate">
                        {opcion.label}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 3: NOTAS Y OBSERVACIONES */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span>Notas & Observaciones del Ticket</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {notas.length} car.
              </span>
            </div>

            <div className="relative rounded-2xl border border-zinc-200 focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/5 transition-all bg-zinc-50/40 focus-within:bg-white overflow-hidden shadow-2xs p-1">
              <textarea
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Añade especificaciones del comprobante, constancia de depósito o notas internas..."
                className="w-full p-2.5 text-xs text-zinc-800 outline-none resize-none font-mono leading-relaxed bg-transparent"
              />
            </div>
          </div>

          {/* AVISO DE AUDITORÍA CONTABLE */}
          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex items-start gap-2.5 text-[11px] text-zinc-500">
            <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              La edición de este comprobante preserva el correlativo y monto contable (<strong>{formatCurrency(pedido.total)}</strong>). Los cambios se reflejarán inmediatamente en tickets e informes.
            </p>
          </div>
        </form>

        {/* PIE DEL MODAL (ACCIONES) */}
        <div className="p-4 sm:p-5 border-t border-zinc-150 bg-zinc-50/70 flex items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
            Modo Edición Administrativa
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
              className="px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-black text-white font-black text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {cargando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
