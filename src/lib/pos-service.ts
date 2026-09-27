import { supabase } from '@/lib/supabase';
import { Producto, MetodoPago } from '@/types/database';

export interface VentaItemPOS {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esPrecioAlumno?: boolean;
}

export interface VentaPOSData {
  codigoPedido: string;
  clienteNombre: string;
  clienteTelefono?: string;
  clienteDni?: string;
  esAlumno?: boolean;
  sedeId: 'ica' | 'huancayo';
  items: VentaItemPOS[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: MetodoPago;
  detallesPago?: {
    efectivo?: number;
    vuelto?: number;
    canalDigital?: 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
    digital?: number;
    numeroOperacion?: string;
  };
  notas?: string;
  cajeroNombre: string;
  cajeroId?: string;
  fecha?: string;
}

export interface VentaRegistradaPOS {
  id: string;
  codigo_pedido: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_dni?: string;
  total: number;
  metodo_pago: MetodoPago;
  metodo_entrega: string;
  estado: string;
  creado_en: string;
  items_resumen?: string;
  items_count: number;
}

/**
 * Obtiene el catálogo de productos disponibles en tiempo real desde Supabase filtrado por sede
 */
export async function getPOSProducts(sedeId?: 'ica' | 'huancayo'): Promise<Producto[]> {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(*)')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.warn('Error al consultar productos:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Filtrar en memoria según stock de la sede
    if (sedeId === 'huancayo') {
      const conStock = data.filter((p: any) => Number(p.stock_huancayo ?? 0) > 0);
      // Si existe la columna y hay productos con stock, devolver solo esos
      // Si la columna aún no existe (todos en 0), devolver todos activos
      return (conStock.length > 0 ? conStock : data) as Producto[];
    }

    // Ica: mostrar productos con stock_ica > 0 o stock > 0
    const conStock = data.filter((p: any) => Number(p.stock_ica ?? p.stock ?? 0) > 0);
    return (conStock.length > 0 ? conStock : data) as Producto[];
  } catch (err) {
    console.error('Error al cargar productos para POS:', err);
    return [];
  }
}

/**
 * Procesa y registra la venta de mostrador en Supabase:
 * 1. Crea el registro en 'pedidos'
 * 2. Inserta los ítems en 'pedido_items'
 * 3. Descuenta el stock en 'productos'
 * 4. Inserta el movimiento en 'movimientos_inventario'
 * 5. Registra el cobro en 'movimientos_caja'
 */
export async function procesarVentaPOS(
  venta: VentaPOSData
): Promise<{ success: boolean; pedidoId?: string; error?: string }> {
  try {
    const ciudad = venta.sedeId === 'huancayo' ? 'Huancayo' : 'Ica';

    let detallePagoTexto = `Venta Mostrador POS atendida por ${venta.cajeroNombre}.`;
    if (venta.metodoPago === 'MIXTO' && venta.detallesPago) {
      detallePagoTexto += ` Pago Cruzado: S/ ${(venta.detallesPago.efectivo || 0).toFixed(2)} Efectivo + S/ ${(venta.detallesPago.digital || 0).toFixed(2)} por ${venta.detallesPago.canalDigital || 'Digital'}.`;
    }
    if (venta.notas) {
      detallePagoTexto += ` Nota: ${venta.notas}`;
    }

    // 1. Insertar el Pedido en Supabase
    const pedidoPayload: Record<string, any> = {
      codigo_pedido: venta.codigoPedido,
      cliente_nombre: venta.clienteNombre.trim() || 'Cliente Mostrador',
      cliente_telefono: venta.clienteTelefono?.trim() || '',
      cliente_dni: venta.clienteDni?.trim() || '',
      ciudad: ciudad,
      sede_id: venta.sedeId, // Guardar sede_id para filtros futuros
      metodo_entrega: 'RECOJO_SEDE',
      metodo_pago: venta.metodoPago,
      estado: 'ENTREGADO',
      subtotal: venta.subtotal,
      costo_envio: 0.0,
      descuento: venta.descuento,
      total: venta.total,
      es_alumno: venta.esAlumno,
      notas: detallePagoTexto,
    };

    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .insert(pedidoPayload)
      .select('id')
      .single();

    const pedidoId = pedidoData?.id || `local-${Date.now()}`;

    if (pedidoError) {
      console.warn('No se pudo guardar pedido en Supabase (usando fallback local):', pedidoError.message);
    } else if (pedidoData?.id) {
      // 2. Insertar los ítems del pedido
      const itemsPayload = venta.items.map((it) => ({
        pedido_id: pedidoData.id,
        producto_id: it.producto.id.startsWith('mock-') ? null : it.producto.id,
        nombre_producto: it.producto.nombre,
        precio_unitario: it.precioUnitario,
        cantidad: it.cantidad,
        subtotal: it.subtotal,
      }));

      await supabase.from('pedido_items').insert(itemsPayload);
    }

    // 3. Descontar stock e insertar movimientos de inventario por sede
    for (const item of venta.items) {
      if (!item.producto.id.startsWith('mock-')) {
        const esHuancayo = venta.sedeId === 'huancayo';
        const stockPrev = esHuancayo
          ? (item.producto.stock_huancayo ?? 0)
          : (item.producto.stock_ica ?? item.producto.stock ?? 0);
        const nuevoStock = Math.max(0, stockPrev - item.cantidad);

        // Actualizar stock de la sede correspondiente
        if (esHuancayo) {
          await supabase
            .from('productos')
            .update({ stock_huancayo: nuevoStock })
            .eq('id', item.producto.id);
        } else {
          await supabase
            .from('productos')
            .update({ stock_ica: nuevoStock })
            .eq('id', item.producto.id);
        }

        // Registrar movimiento de inventario (Kardex) con sede específica
        await supabase.from('movimientos_inventario').insert({
          producto_id: item.producto.id,
          tipo: 'SALIDA',
          cantidad: item.cantidad,
          stock_anterior: stockPrev,
          stock_nuevo: nuevoStock,
          sede: esHuancayo ? 'huancayo' : 'ica',
          motivo: `Venta Mostrador POS Ticket #${venta.codigoPedido} (Sede ${ciudad})`,
          usuario_id: venta.cajeroId || '00000000-0000-0000-0000-000000000001',
          usuario_nombre: venta.cajeroNombre,
          referencia_id: venta.codigoPedido,
        });
      }
    }

    // 4. Registrar en Caja Chica si hay caja abierta
    try {
      const { data: cajasAbiertas } = await supabase
        .from('cajas_chicas')
        .select('id, total_ingresos_efectivo, total_ingresos_digital, saldo_teorico_efectivo')
        .eq('estado', 'ABIERTA')
        .order('fecha_apertura', { ascending: false })
        .limit(1);

      const cajaActiva = cajasAbiertas?.[0];

      if (cajaActiva) {
        // Registrar movimiento de caja
        await supabase.from('movimientos_caja').insert({
          caja_id: cajaActiva.id,
          tipo: 'INGRESO_VENTA',
          monto: venta.total,
          metodo_pago: venta.metodoPago,
          concepto: `Venta Mostrador POS #${venta.codigoPedido} - ${venta.clienteNombre || 'Cliente Mostrador'}`,
          referencia_id: venta.codigoPedido,
          usuario_id: venta.cajeroId || '00000000-0000-0000-0000-000000000001',
          usuario_nombre: venta.cajeroNombre,
        });

        // Actualizar acumulados de caja según el método
        let incEfectivo = 0;
        let incDigital = 0;

        if (venta.metodoPago === 'EFECTIVO') {
          incEfectivo = venta.total;
        } else if (venta.metodoPago === 'MIXTO' && venta.detallesPago) {
          incEfectivo = venta.detallesPago.efectivo || 0;
          incDigital = venta.detallesPago.digital || 0;
        } else {
          incDigital = venta.total;
        }

        await supabase
          .from('cajas_chicas')
          .update({
            total_ingresos_efectivo: Number(cajaActiva.total_ingresos_efectivo || 0) + incEfectivo,
            total_ingresos_digital: Number(cajaActiva.total_ingresos_digital || 0) + incDigital,
            saldo_teorico_efectivo: Number(cajaActiva.saldo_teorico_efectivo || 0) + incEfectivo,
          })
          .eq('id', cajaActiva.id);
      }
    } catch (cajaErr) {
      console.warn('Nota: No se actualizó caja chica o no hay caja abierta actualmente:', cajaErr);
    }

    // Persistir localmente en localStorage para disponibilidad offline y consulta de ventas del turno
    if (typeof window !== 'undefined') {
      try {
        const key = 'galindo_pos_ventas_turno';
        const anteriores = JSON.parse(localStorage.getItem(key) || '[]');
        const nuevaVentaRegistro = {
          id: pedidoId,
          codigo_pedido: venta.codigoPedido,
          cliente_nombre: venta.clienteNombre.trim() || 'Cliente Mostrador',
          cliente_telefono: venta.clienteTelefono,
          cliente_dni: venta.clienteDni,
          total: venta.total,
          metodo_pago: venta.metodoPago,
          metodo_entrega: 'RECOJO_SEDE',
          estado: 'ENTREGADO',
          creado_en: new Date().toISOString(),
          items_resumen: venta.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(', '),
          items_count: venta.items.reduce((acc, it) => acc + it.cantidad, 0),
          ventaCompleta: venta,
        };
        localStorage.setItem(key, JSON.stringify([nuevaVentaRegistro, ...anteriores]));
        window.dispatchEvent(new Event('galindo_pos_venta_realizada'));
      } catch (e) {
        console.warn('Error al guardar en cache local de ventas:', e);
      }
    }

    return { success: true, pedidoId };
  } catch (err: any) {
    console.error('Error al procesar venta POS:', err);
    return { success: false, error: err.message || 'Error inesperado al procesar venta' };
  }
}

/**
 * Obtiene el listado de ventas del día realizadas en el POS
 */
export async function getVentasHoyPOS(): Promise<VentaRegistradaPOS[]> {
  try {
    // 1. Intentar consultar pedidos de Supabase
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, codigo_pedido, cliente_nombre, cliente_telefono, cliente_dni, total, metodo_pago, metodo_entrega, estado, creado_en')
      .order('creado_en', { ascending: false })
      .limit(30);

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        ...d,
        items_count: 1,
      }));
    }

    // 2. Eliminamos la lectura de localStorage para evitar datos "fantasma"
    // cuando la base de datos se limpia o resetea.
    return [];

    return [];
  } catch (err) {
    console.error('Error al consultar ventas del POS:', err);
    return [];
  }
}
