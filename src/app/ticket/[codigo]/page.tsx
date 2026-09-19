'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Scissors,
  Download,
  Printer,
  CheckCircle2,
  Store,
  ChevronLeft,
  Calendar,
  Clock,
  User,
  CreditCard,
  Barcode,
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
  items: ItemPedido[];
}

export default function TicketPublicoPage() {
  const params = useParams();
  const codigoParam = typeof params?.codigo === 'string' ? params.codigo : '';

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
        // 1. Intentar buscar en Supabase
        const { data: pedido, error: dbError } = await supabase
          .from('pedidos')
          .select(`
            id,
            codigo_pedido,
            created_at,
            cliente_nombre,
            cliente_telefono,
            cliente_dni,
            sede_id,
            total,
            subtotal,
            descuento,
            metodo_pago,
            notas,
            pedido_items (
              id,
              cantidad,
              precio_unitario,
              subtotal,
              producto_nombre,
              productos (
                nombre,
                sku
              )
            )
          `)
          .eq('codigo_pedido', codigoParam)
          .maybeSingle();

        if (pedido) {
          const itemsMapeados: ItemPedido[] = (pedido.pedido_items || []).map((it: any) => ({
            id: it.id,
            nombre: it.productos?.nombre || it.producto_nombre || 'Producto Galindo',
            cantidad: it.cantidad,
            precioUnitario: Number(it.precio_unitario || 0),
            subtotal: Number(it.subtotal || 0),
            sku: it.productos?.sku || '',
          }));

          setTicket({
            codigoPedido: pedido.codigo_pedido,
            fecha: new Date(pedido.created_at).toLocaleString('es-PE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            clienteNombre: pedido.cliente_nombre || 'Cliente Mostrador',
            clienteTelefono: pedido.cliente_telefono || '',
            clienteDni: pedido.cliente_dni || '',
            sedeId: (pedido.sede_id as SedeId) || 'ica',
            total: Number(pedido.total || 0),
            subtotal: Number(pedido.subtotal || pedido.total || 0),
            descuento: Number(pedido.descuento || 0),
            metodoPago: pedido.metodo_pago || 'EFECTIVO',
            cajeroNombre: pedido.notas?.replace('Atendido por: ', '') || 'Caja Galindo',
            items: itemsMapeados,
          });
          return;
        }

        // 2. Respaldo en localStorage si es reciente
        if (typeof window !== 'undefined') {
          const localStr = localStorage.getItem('galindo_pos_ventas_historial');
          if (localStr) {
            const lista = JSON.parse(localStr);
            const encontrado = lista.find((v: any) => v.codigoPedido === codigoParam);
            if (encontrado) {
              setTicket({
                codigoPedido: encontrado.codigoPedido,
                fecha: new Date(encontrado.timestamp).toLocaleString('es-PE', {
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
                total: encontrado.total,
                subtotal: encontrado.subtotal,
                descuento: encontrado.descuento,
                metodoPago: encontrado.metodoPago,
                cajeroNombre: encontrado.cajeroNombre || 'Caja Galindo',
                items: encontrado.items.map((it: any) => ({
                  id: it.producto.id,
                  nombre: it.producto.nombre,
                  cantidad: it.cantidad,
                  precioUnitario: it.precioUnitario,
                  subtotal: it.subtotal,
                  sku: it.producto.sku,
                })),
              });
              return;
            }
          }
        }

        setError('No pudimos encontrar el comprobante solicitado.');
      } catch (err) {
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

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-600 font-medium text-sm">Cargando comprobante de venta...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-200 flex items-center justify-center mb-4 text-zinc-500">
          <Scissors className="w-8 h-8 rotate-45" />
        </div>
        <h1 className="text-xl font-black text-zinc-900 mb-2">Comprobante no disponible</h1>
        <p className="text-zinc-500 text-sm max-w-sm mb-6">
          {error || 'El código ingresado no corresponde a una venta registrada.'}
        </p>
        <Link
          href="/tienda"
          className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs"
        >
          Ir a la Tienda Galindo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 py-8 px-4 flex flex-col items-center justify-center">
      {/* Barra superior de navegación / acciones */}
      <div className="max-w-md w-full mb-4 flex items-center justify-between">
        <Link
          href="/tienda"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Tienda Galindo</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Comprobante Oficial</span>
        </div>
      </div>

      {/* Ticket Térmico Imprimible */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden p-6 space-y-5">
        <div
          id="ticket-pos-imprimible"
          className="bg-white p-5 rounded-2xl border-2 border-dashed border-zinc-300 font-mono text-xs text-zinc-950 space-y-3"
        >
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
            <p className="text-[10px] tracking-wider uppercase text-zinc-600">
              Academy & Supply EIRL
            </p>
            <p className="text-[10px] text-zinc-500 font-sans">{sedeActual.nombre}</p>
            <p className="text-[9px] text-zinc-500 font-sans">{sedeActual.direccionCompleta}</p>
            <p className="text-[9px] text-zinc-500 font-sans">Tel: {sedeActual.whatsappDisplay}</p>
          </div>

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
              <span className="font-bold truncate max-w-[190px]">{ticket.clienteNombre}</span>
            </div>
            {ticket.clienteDni && (
              <div className="flex justify-between">
                <span className="text-zinc-500">DOC:</span>
                <span>{ticket.clienteDni}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">ATENDIDO POR:</span>
              <span>{ticket.cajeroNombre}</span>
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-2 py-1 border-b border-dashed border-zinc-300">
            <div className="flex justify-between font-bold text-[10px] text-zinc-500 uppercase pb-0.5">
              <span>Cant / Producto</span>
              <span>Total</span>
            </div>
            {ticket.items.map((it) => (
              <div key={it.id} className="text-[11px] leading-tight space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-bold truncate max-w-[210px]">{it.nombre}</span>
                  <span className="font-bold">{formatCurrency(it.subtotal)}</span>
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
              <span>{formatCurrency(ticket.total)}</span>
            </div>
          </div>

          {/* Método de Pago */}
          <div className="pt-2 border-t border-dashed border-zinc-300 text-[10px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">MÉTODO DE PAGO:</span>
              <span className="font-bold uppercase">{ticket.metodoPago}</span>
            </div>
          </div>

          {/* Código de barras simulado */}
          <div className="text-center pt-3 border-t border-dashed border-zinc-300 space-y-1">
            <div className="font-mono text-xl tracking-[0.3em] font-black text-zinc-900 select-none py-0.5">
              ||| | |||| || | ||||| | |||
            </div>
            <p className="text-[8px] text-zinc-500 tracking-wider">COMPROBANTE DIGITAL EMITIDO</p>
            <p className="text-[9px] font-sans font-bold text-zinc-900">
              ¡Gracias por tu compra en Galindo Barber!
            </p>
          </div>
        </div>

        {/* Acciones para el Cliente */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleDescargarPDF}
            disabled={descargandoPdf}
            className="py-3 px-4 rounded-2xl bg-black text-white hover:bg-zinc-800 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{descargandoPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="py-3 px-4 rounded-2xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 mt-6 text-center">
        Galindo Barber Academy & Supply • Ica & Huancayo, Perú
      </p>
    </div>
  );
}
