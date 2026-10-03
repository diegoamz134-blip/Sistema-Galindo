'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Scissors,
  Download,
  Printer,
  CheckCircle2,
  ChevronLeft,
  Calendar,
  Clock,
  User,
  CreditCard,
  Barcode,
  AlertTriangle,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { exportarTicketPDF } from '@/lib/ticket-pdf';
import { SEDES, SedeId } from '@/lib/constants';

interface ItemPedido {
  id: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  sku?: string;
}

interface TicketPublicoData {
  codigoPedido: string;
  fecha: string;
  clienteNombre: string;
  clienteTelefono?: string;
  clienteDni?: string;
  sedeId: SedeId;
  total: number;
  subtotal: number;
  descuento: number;
  metodoPago: string;
  cajeroNombre: string;
  estado?: string;
  notas?: string;
  items: ItemPedido[];
}

export default function TicketPublicoPage() {
  const params = useParams();
  const codigoParam = typeof params?.codigo === 'string' ? params.codigo.trim() : '';

  const [ticket, setTicket] = useState<TicketPublicoData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!codigoParam) return;

    async function cargarTicket() {
      setCargando(true);
      setError(null);

      try {
        // 1. Buscar en Supabase por código exacto o en mayúsculas
        const { data: pedido, error: dbError } = await supabase
          .from('pedidos')
          .select('*')
          .or(`codigo_pedido.eq.${codigoParam},codigo_pedido.eq.${codigoParam.toUpperCase()}`)
          .maybeSingle();

        if (pedido) {
          // Obtener los ítems asociados
          const { data: itemsRaw } = await supabase
            .from('pedido_items')
            .select('*')
            .eq('pedido_id', pedido.id);

          const itemsMapeados: ItemPedido[] = (itemsRaw && itemsRaw.length > 0)
            ? itemsRaw.map((it: any) => ({
                id: it.id,
                nombre: it.nombre_producto || 'Producto Galindo',
                cantidad: Number(it.cantidad || 1),
                precioUnitario: Number(it.precio_unitario || 0),
                subtotal: Number(it.subtotal || 0),
                sku: it.sku || '',
              }))
            : [
                {
                  id: pedido.id,
                  nombre: pedido.notas?.includes('Matrícula')
                    ? 'Inscripción de Curso Academia'
                    : 'Compra en Galindo Barber',
                  cantidad: 1,
                  precioUnitario: Number(pedido.total || 0),
                  subtotal: Number(pedido.total || 0),
                },
              ];

          const fechaRaw = pedido.creado_en || (pedido as any).created_at || new Date().toISOString();
          const esHuancayo = (pedido.sede_id || pedido.ciudad || pedido.notas || '').toLowerCase().includes('huancayo');
          const sedeIdFinal: SedeId = esHuancayo ? 'huancayo' : 'ica';

          // Detectar cajero o supervisor en notas
          let cajero = 'Caja Galindo';
          if (pedido.notas) {
            const matchAtendido = pedido.notas.match(/(?:atendida por|atendido por|por)\s+([^.\n]+)/i);
            if (matchAtendido) {
              cajero = matchAtendido[1].trim();
            }
          }

          setTicket({
            codigoPedido: pedido.codigo_pedido,
            fecha: new Date(fechaRaw).toLocaleString('es-PE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            clienteNombre: pedido.cliente_nombre || 'Cliente Mostrador',
            clienteTelefono: pedido.cliente_telefono || '',
            clienteDni: pedido.cliente_dni || '',
            sedeId: sedeIdFinal,
            total: Number(pedido.total || 0),
            subtotal: Number(pedido.subtotal || pedido.total || 0),
            descuento: Number(pedido.descuento || 0),
            metodoPago: pedido.metodo_pago || 'EFECTIVO',
            cajeroNombre: cajero,
            estado: pedido.estado || 'ENTREGADO',
            notas: pedido.notas || '',
            items: itemsMapeados,
          });
          return;
        }

        // 2. Respaldo en localStorage si es una venta reciente offline
        if (typeof window !== 'undefined') {
          const localStr = localStorage.getItem('galindo_pos_ventas_historial');
          if (localStr) {
            const lista = JSON.parse(localStr);
            const encontrado = lista.find(
              (v: any) =>
                v.codigoPedido?.toLowerCase() === codigoParam.toLowerCase()
            );
            if (encontrado) {
              setTicket({
                codigoPedido: encontrado.codigoPedido,
                fecha: new Date(encontrado.timestamp || Date.now()).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                clienteNombre: encontrado.clienteNombre || 'Cliente Mostrador',
                clienteTelefono: encontrado.clienteTelefono || '',
                clienteDni: encontrado.clienteDni || '',
                sedeId: encontrado.sedeId || 'ica',
                total: Number(encontrado.total || 0),
                subtotal: Number(encontrado.subtotal || encontrado.total || 0),
                descuento: Number(encontrado.descuento || 0),
                metodoPago: encontrado.metodoPago || 'EFECTIVO',
                cajeroNombre: encontrado.cajeroNombre || 'Caja Galindo',
                estado: 'ENTREGADO',
                items: (encontrado.items || []).map((it: any) => ({
                  id: it.producto?.id || Math.random().toString(),
                  nombre: it.producto?.nombre || 'Producto',
                  cantidad: it.cantidad,
                  precioUnitario: it.precioUnitario,
                  subtotal: it.subtotal,
                  sku: it.producto?.sku,
                })),
              });
              return;
            }
          }
        }

        setError('No pudimos encontrar el comprobante solicitado en la base de datos.');
      } catch (err: any) {
        console.error('Error cargando ticket:', err);
        setError('Ocurrió un inconveniente al cargar el comprobante.');
      } finally {
        setCargando(false);
      }
    }

    cargarTicket();
  }, [codigoParam]);

  const handleDescargarPDF = async () => {
    if (!ticket) return;
    setDescargandoPdf(true);
    try {
      await exportarTicketPDF('ticket-pos-imprimible', ticket.codigoPedido);
    } finally {
      setDescargandoPdf(false);
    }
  };

  const sedeActual = ticket ? SEDES[ticket.sedeId] || SEDES['ica'] : SEDES['ica'];
  const esAnulado = ticket?.estado === 'CANCELADO';

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-zinc-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-zinc-600 font-semibold text-xs">Cargando comprobante de venta...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-200 flex items-center justify-center mb-4 text-zinc-500 shadow-2xs">
          <Scissors className="w-8 h-8 rotate-45" />
        </div>
        <h1 className="text-lg font-black text-zinc-900 mb-1">Comprobante no disponible</h1>
        <p className="text-zinc-500 text-xs max-w-sm mb-5">
          {error || 'El código ingresado no corresponde a una venta registrada.'}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pedidos"
            className="px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-black transition-colors shadow-xs"
          >
            ← Volver a Ventas
          </Link>
          <Link
            href="/tienda"
            className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-800 text-xs font-bold hover:bg-zinc-50 transition-colors shadow-2xs"
          >
            Ir a la Tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center">
      {/* Barra superior de navegación / acciones */}
      <div className="max-w-md w-full mb-3 flex items-center justify-between gap-2">
        <Link
          href="/admin/pedidos"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-black transition-colors p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </Link>

        {esAnulado ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black tracking-wide border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>TICKET ANULADO</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Comprobante Válido</span>
          </div>
        )}
      </div>

      {/* Ticket Térmico Imprimible */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden p-5 sm:p-6 space-y-4">
        
        {/* Contenedor exacto del comprobante físico para impresión / PDF */}
        <div
          id="ticket-pos-imprimible"
          className={`bg-white p-5 rounded-2xl border-2 border-dashed font-mono text-xs text-zinc-950 space-y-3 relative ${
            esAnulado ? 'border-rose-400 bg-rose-50/20' : 'border-zinc-300'
          }`}
        >
          {/* Sello de agua si está anulado */}
          {esAnulado && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-10 opacity-15">
              <span className="text-rose-700 font-black text-4xl sm:text-5xl uppercase tracking-widest -rotate-45 border-4 border-rose-700 p-2">
                ANULADO
              </span>
            </div>
          )}

          {/* Cabecera */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-300">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-300 mx-auto mb-1.5 shadow-2xs bg-white p-0.5">
              <img
                src="/logo.jpg"
                alt="Logo Galindo Barber"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <h2 className="font-black text-base tracking-tight uppercase leading-tight">
              GALINDO BARBER
            </h2>
            <p className="text-[10px] tracking-wider uppercase text-zinc-600 font-semibold">
              Academy & Supply EIRL
            </p>
            <p className="text-[10px] text-zinc-700 font-sans font-bold pt-0.5">{sedeActual.nombre}</p>
            <p className="text-[9px] text-zinc-500 font-sans">{sedeActual.direccionCompleta}</p>
            <p className="text-[9px] text-zinc-500 font-sans font-mono">WhatsApp: {sedeActual.whatsappDisplay}</p>
          </div>

          {/* Banner de Anulación oficial en el ticket */}
          {esAnulado && (
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-center space-y-0.5 text-[10px]">
              <div className="font-black tracking-wider text-rose-950 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                <span>*** COMPROBANTE ANULADO ***</span>
              </div>
              <p className="text-[9px] text-rose-800">
                Esta venta fue anulada en el sistema. Stock devuelto a Kardex.
              </p>
            </div>
          )}

          {/* Datos del Pedido */}
          <div className="text-[11px] space-y-1 pb-3 border-b border-dashed border-zinc-300">
            <div className="flex justify-between">
              <span className="text-zinc-500">TICKET:</span>
              <span className="font-bold text-zinc-950">{ticket.codigoPedido}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">FECHA:</span>
              <span>{ticket.fecha}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">CLIENTE:</span>
              <span className="font-bold truncate max-w-[200px]">{ticket.clienteNombre}</span>
            </div>
            {ticket.clienteDni && (
              <div className="flex justify-between">
                <span className="text-zinc-500">DOC. IDENTIDAD:</span>
                <span className="font-bold">{ticket.clienteDni}</span>
              </div>
            )}
            {ticket.clienteTelefono && (
              <div className="flex justify-between">
                <span className="text-zinc-500">TELÉFONO:</span>
                <span>{ticket.clienteTelefono}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">ATENDIDO POR:</span>
              <span>{ticket.cajeroNombre}</span>
            </div>
          </div>

          {/* Productos / Conceptos */}
          <div className="space-y-2 py-1 border-b border-dashed border-zinc-300">
            <div className="flex justify-between font-bold text-[10px] text-zinc-500 uppercase pb-0.5">
              <span>Cant / Concepto</span>
              <span>Importe</span>
            </div>
            {ticket.items.map((it) => (
              <div key={it.id} className="text-[11px] leading-tight space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-bold max-w-[230px]">{it.nombre}</span>
                  <span className="font-bold text-right shrink-0">{formatCurrency(it.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-sans">
                  <span>
                    {it.cantidad} un. x {formatCurrency(it.precioUnitario)}
                  </span>
                  {it.sku && <span>SKU: {it.sku}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="space-y-1 pt-1 text-[11px]">
            <div className="flex justify-between text-zinc-600">
              <span>SUBTOTAL:</span>
              <span>{formatCurrency(ticket.subtotal)}</span>
            </div>
            {ticket.descuento > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>DESCUENTO:</span>
                <span>-{formatCurrency(ticket.descuento)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-black pt-1 border-t border-black">
              <span>TOTAL:</span>
              <span className={esAnulado ? 'line-through text-rose-600' : ''}>
                {formatCurrency(ticket.total)}
              </span>
            </div>
          </div>

          {/* Método de Pago */}
          <div className="pt-2 border-t border-dashed border-zinc-300 text-[10px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">MÉTODO DE PAGO:</span>
              <span className="font-bold uppercase">{ticket.metodoPago}</span>
            </div>
          </div>

          {/* Notas de Auditoría si existen */}
          {ticket.notas && ticket.notas.includes('[ANULADA') && (
            <div className="pt-2 border-t border-dashed border-rose-300 text-[9px] text-rose-900 leading-tight">
              <strong>AUDITORÍA:</strong>
              <p className="mt-0.5 whitespace-pre-wrap">{ticket.notas.substring(ticket.notas.indexOf('[ANULADA'))}</p>
            </div>
          )}

          {/* Código de barras simulado */}
          <div className="text-center pt-3 border-t border-dashed border-zinc-300 space-y-1">
            <div className="font-mono text-xl tracking-[0.3em] font-black text-zinc-900 select-none py-0.5">
              ||| | |||| || | ||||| | |||
            </div>
            <p className="text-[8px] text-zinc-500 tracking-wider">COMPROBANTE ELECTRÓNICO OFICIAL</p>
            <p className="text-[9px] font-sans font-bold text-zinc-900">
              ¡Gracias por confiar en Galindo Barber!
            </p>
          </div>
        </div>

        {/* Acciones de Impresión y Descarga */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleDescargarPDF}
            disabled={descargandoPdf}
            className="py-3 px-4 rounded-2xl bg-zinc-950 text-white hover:bg-black text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{descargandoPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="py-3 px-4 rounded-2xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket</span>
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 mt-5 text-center">
        Galindo Barber Academy & Supply • Ica & Huancayo, Perú
      </p>
    </div>
  );
}
