'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingBag,
  GraduationCap,
  BookOpen,
  Clock,
  User,
  Phone,
  CreditCard,
  CheckCircle2,
  XCircle,
  Printer,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Receipt,
  Store,
  MapPin,
  FileText,
  AlertTriangle,
  Loader2,
  Tag,
  Hash,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { VentaRegistradaPOS, parseDesglosePagoCruzado } from '@/lib/pos-service';
import { formatCurrency } from '@/lib/utils';
import { METODOS_PAGO_LABELS } from '@/lib/constants';

interface ItemDetalleVenta {
  id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface POSVentaDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  venta: VentaRegistradaPOS | null;
  onAnularVenta?: (venta: VentaRegistradaPOS) => void;
  onReimprimirTicket?: (venta: VentaRegistradaPOS) => void;
}

export function POSVentaDetalleModal({
  isOpen,
  onClose,
  venta,
  onAnularVenta,
  onReimprimirTicket,
}: POSVentaDetalleModalProps) {
  const [items, setItems] = useState<ItemDetalleVenta[]>([]);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [datosPedido, setDatosPedido] = useState<{
    subtotal?: number;
    descuento?: number;
    notas?: string;
    sede_id?: string;
    ciudad?: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen || !venta) {
      setItems([]);
      setDatosPedido(null);
      return;
    }

    const cargarDetalleVenta = async () => {
      // Si es matrícula o cuota, no consulta pedido_items de la tienda
      if (venta.tipo_transaccion === 'MATRICULA' || venta.tipo_transaccion === 'CUOTA') {
        setItems([
          {
            id: venta.id || 'item-academia',
            nombre_producto: venta.items_resumen || (venta.tipo_transaccion === 'MATRICULA' ? 'Matrícula Academia' : 'Pago de Cuota'),
            cantidad: 1,
            precio_unitario: Number(venta.total || 0),
            subtotal: Number(venta.total || 0),
          },
        ]);
        setCargandoItems(false);
        return;
      }

      setCargandoItems(true);
      try {
        // Consultar ítems de la base de datos
        const [itemsRes, pedidoRes] = await Promise.all([
          supabase
            .from('pedido_items')
            .select('id, nombre_producto, cantidad, precio_unitario, subtotal')
            .eq('pedido_id', venta.id),
          supabase
            .from('pedidos')
            .select('subtotal, descuento, total, notas, sede_id, ciudad')
            .eq('id', venta.id)
            .maybeSingle(),
        ]);

        if (pedidoRes.data) {
          setDatosPedido(pedidoRes.data);
        }

        if (itemsRes.data && itemsRes.data.length > 0) {
          setItems(
            itemsRes.data.map((it: any) => ({
              id: it.id,
              nombre_producto: it.nombre_producto || 'Producto Galindo',
              cantidad: Number(it.cantidad || 1),
              precio_unitario: Number(it.precio_unitario || 0),
              subtotal: Number(it.subtotal || 0),
            }))
          );
        } else if (venta.items_resumen) {
          // Fallback al resumen si no hubiera registros en pedido_items
          setItems([
            {
              id: 'fallback-1',
              nombre_producto: venta.items_resumen,
              cantidad: venta.items_count || 1,
              precio_unitario: Number(venta.total || 0) / Math.max(1, venta.items_count || 1),
              subtotal: Number(venta.total || 0),
            },
          ]);
        } else {
          setItems([
            {
              id: 'fallback-total',
              nombre_producto: 'Venta Mostrador POS',
              cantidad: 1,
              precio_unitario: Number(venta.total || 0),
              subtotal: Number(venta.total || 0),
            },
          ]);
        }
      } catch (err) {
        console.error('Error al cargar detalle de venta POS:', err);
        if (venta.items_resumen) {
          setItems([
            {
              id: 'fallback-err',
              nombre_producto: venta.items_resumen,
              cantidad: 1,
              precio_unitario: Number(venta.total || 0),
              subtotal: Number(venta.total || 0),
            },
          ]);
        }
      } finally {
        setCargandoItems(false);
      }
    };

    cargarDetalleVenta();
  }, [isOpen, venta]);

  if (!isOpen || !venta) return null;

  const esAnulado = venta.estado === 'CANCELADO';
  const metaLabel =
    METODOS_PAGO_LABELS[venta.metodo_pago as keyof typeof METODOS_PAGO_LABELS] || {
      label: venta.metodo_pago || 'Efectivo',
      color: 'bg-zinc-100 text-zinc-700',
    };

  // Formatear fecha y hora
  const fechaObj = new Date(venta.creado_en);
  const fechaCompleta = !isNaN(fechaObj.getTime())
    ? fechaObj.toLocaleDateString('es-PE', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const horaCompleta = !isNaN(fechaObj.getTime())
    ? fechaObj.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const handleCopiarCodigo = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(venta.codigo_pedido);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const subtotalCalculado = datosPedido?.subtotal ?? items.reduce((acc, it) => acc + it.subtotal, 0);
  const descuentoAplicado = datosPedido?.descuento ?? 0;
  const totalFinal = Number(venta.total || 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* HEADER DEL MODAL */}
          <div className="p-4 sm:p-5 border-b border-zinc-100 bg-linear-to-r from-zinc-50 via-white to-zinc-50 flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Código de ticket con botón de copiar */}
                <button
                  type="button"
                  onClick={handleCopiarCodigo}
                  className="font-mono font-black text-sm text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded-lg border border-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Click para copiar código"
                >
                  <Hash className="w-3.5 h-3.5 text-zinc-500" />
                  <span>#{venta.codigo_pedido}</span>
                  {copiado ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-400" />
                  )}
                </button>

                {/* Badge de tipo de transacción */}
                {venta.tipo_transaccion === 'MATRICULA' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                    <GraduationCap className="w-3 h-3" />
                    MATRÍCULA
                  </span>
                )}
                {venta.tipo_transaccion === 'CUOTA' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-2xs">
                    <BookOpen className="w-3 h-3" />
                    CUOTA
                  </span>
                )}
                {(!venta.tipo_transaccion || venta.tipo_transaccion === 'VENTA_POS') && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-zinc-900 text-white shadow-2xs">
                    <ShoppingBag className="w-3 h-3" />
                    VENTA POS
                  </span>
                )}

                {/* Estado */}
                {esAnulado ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>Anulado</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Entregado / Válido</span>
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                Detalle de la Venta
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CONTENIDO DEL MODAL (SCROLLABLE) */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {/* Banner de alerta si está anulado */}
            {esAnulado && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <p className="text-[11px] font-semibold leading-relaxed">
                  Esta venta fue <strong className="font-bold underline">ANULADA</strong>. Los productos retornaron al inventario de la sede y el monto no suma en el arqueo final.
                </p>
              </div>
            )}

            {/* METADATOS CLAVE EN CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card Cliente */}
              <div className="p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px] uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Datos del Cliente</span>
                </div>
                <div className="font-black text-sm text-zinc-900">
                  {venta.cliente_nombre || 'Cliente Mostrador'}
                </div>
                <div className="space-y-0.5 text-[11px] text-zinc-600 font-mono">
                  {venta.cliente_dni && (
                    <div className="flex items-center gap-1 text-zinc-500">
                      <span className="text-zinc-400">DNI:</span>
                      <span className="font-bold text-zinc-800">{venta.cliente_dni}</span>
                    </div>
                  )}
                  {venta.cliente_telefono && (
                    <div className="flex items-center gap-1 text-zinc-500">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      <span className="font-bold text-zinc-800">{venta.cliente_telefono}</span>
                    </div>
                  )}
                  {!venta.cliente_dni && !venta.cliente_telefono && (
                    <span className="text-zinc-400 italic">Venta rápida en mostrador</span>
                  )}
                </div>
              </div>

              {/* Card Pago y Fecha */}
              <div className="p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px] uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Fecha y Medio de Pago</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${metaLabel.color}`}>
                    {metaLabel.label}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-700 capitalize">
                    {fechaCompleta}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>Hora: {horaCompleta}</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN: ¿QUÉ SE VENDIÓ? (PRODUCTOS / ÍTEMS) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[11px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Detalle de Artículos ({items.length})</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {venta.tipo_transaccion === 'MATRICULA'
                    ? 'Academia Galindo'
                    : venta.tipo_transaccion === 'CUOTA'
                    ? 'Cuota de Alumno'
                    : 'Punto de Venta Mostrador'}
                </span>
              </div>

              {/* LISTA DE ÍTEMS */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-zinc-100">
                {cargandoItems ? (
                  <div className="p-6 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    <span className="text-xs">Cargando productos del ticket...</span>
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400 italic text-xs">
                    No hay detalles registrados para esta venta.
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-900 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-zinc-200 mt-0.5">
                          {item.cantidad}x
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 text-xs truncate">
                            {item.nombre_producto}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            Precio unitario: {formatCurrency(item.precio_unitario)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-xs text-zinc-900">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NOTAS O OBSERVACIONES SI LAS HUBIERA */}
            {datosPedido?.notas && (
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs space-y-1">
                <span className="font-bold text-zinc-600 flex items-center gap-1 text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Observaciones / Notas:
                </span>
                <p className="text-zinc-600 text-[11px] italic whitespace-pre-wrap">
                  {datosPedido.notas}
                </p>
              </div>
            )}

            {/* DESGLOSE DESTACADO DE PAGO CRUZADO (SEPARACIÓN EXACTA EFECTIVO / DIGITAL) */}
            {venta.metodo_pago === 'MIXTO' && (() => {
              const desglose = venta.desglosePago || parseDesglosePagoCruzado(datosPedido?.notas || venta.notas, totalFinal);
              return (
                <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-indigo-950 flex items-center gap-1.5 text-xs">
                      <span>Desglose de Pago Cruzado</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                      Separado en Caja
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 bg-white rounded-xl border border-indigo-100/90 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block font-mono">
                        💵 Efectivo (Gaveta)
                      </span>
                      <span className="font-mono font-black text-base text-zinc-950 mt-0.5 block">
                        {formatCurrency(desglose.efectivo)}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-indigo-100/90 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block font-mono">
                        📱 {desglose.canalDigital} (Digital)
                      </span>
                      <span className="font-mono font-black text-base text-emerald-600 mt-0.5 block">
                        {formatCurrency(desglose.digital)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CAJA DE TOTALES */}
            <div className="p-4 bg-zinc-900 text-white rounded-2xl space-y-2 shadow-inner">
              <div className="flex justify-between items-center text-zinc-400 text-xs font-mono">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotalCalculado)}</span>
              </div>

              {descuentoAplicado > 0 && (
                <div className="flex justify-between items-center text-emerald-400 text-xs font-mono">
                  <span>Descuento aplicado</span>
                  <span>- {formatCurrency(descuentoAplicado)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-black block">
                    Total Cobrado
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Método: {metaLabel.label}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono font-black text-xl sm:text-2xl ${
                      esAnulado ? 'text-zinc-500 line-through' : 'text-emerald-400'
                    }`}
                  >
                    {formatCurrency(totalFinal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER DE ACCIONES */}
          <div className="p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {/* Botón Ver Ticket Oficial en pestaña nueva */}
              <a
                href={`/ticket/${venta.codigo_pedido}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl border border-zinc-300 hover:bg-white text-zinc-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Receipt className="w-3.5 h-3.5 text-zinc-600" />
                <span>Ver / Imprimir Ticket</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>

              {/* Botón Anular Venta (solo ventas POS válidas) */}
              {(!venta.tipo_transaccion || venta.tipo_transaccion === 'VENTA_POS') && !esAnulado && onAnularVenta && (
                <button
                  type="button"
                  onClick={() => {
                    onAnularVenta(venta);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Anular venta y reingresar stock"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Anular Venta</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
