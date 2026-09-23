// =========================================================================
// MOTOR TRANSACCIONAL DE CHECKOUT WEB - SISTEMA GALINDO
// Conecta pedidos web, inventario Kardex, academia/matrículas y caja chica
// =========================================================================

import { supabase } from '@/lib/supabase';
import { Producto, MetodoPago } from '@/types/database';
import { SEDES, SedeId } from '@/lib/constants';

export interface PedidoWebItem {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  tipo?: 'producto' | 'matricula';
  matriculaMetadata?: {
    cursoId: string;
    cursoNombre: string;
    turno: 'MANANA' | 'TARDE' | 'NOCHE' | 'SABATINO';
    sede: string;
    costoMatricula: number;
    totalCurso: number;
  };
}

export interface PedidoWebInput {
  codigoPedido: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteDni?: string;
  tipoDocumento?: 'DNI' | 'CE';
  sedeId: SedeId;
  metodoEntrega: 'RECOJO_SEDE' | 'DELIVERY_ICA';
  metodoPago: MetodoPago;
  detallesPago?: {
    efectivo?: number;
    vuelto?: number;
    canalDigital?: 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
    digital?: number;
    numeroOperacion?: string;
  };
  notas?: string;
  items: PedidoWebItem[];
  subtotal: number;
  descuento: number;
  total: number;
}

export interface PedidoWebResult {
  success: boolean;
  pedidoId?: string;
  codigoPedido?: string;
  matriculaCodigo?: string;
  error?: string;
}

/**
 * Procesa y registra la orden web completa en la base de datos de Supabase:
 * 1. Inserta el pedido oficial en 'pedidos'
 * 2. Inserta el detalle en 'pedido_items'
 * 3. Si hay productos físicos: descuenta stock y registra en 'movimientos_inventario' (Kardex)
 * 4. Si hay matrículas de academia: registra alumno en 'alumnos', matrícula en 'matriculas' y cuotas
 * 5. Registra el ingreso en 'movimientos_caja' para el Dashboard y arqueo
 */
export async function procesarPedidoWeb(
  input: PedidoWebInput
): Promise<PedidoWebResult> {
  try {
    const sedeActual = SEDES[input.sedeId] || SEDES['ica'];
    const ciudad = sedeActual.ciudad || 'Ica';

    // Formatear texto explicativo de la forma de pago para el personal de tienda
    let detalleNotas = input.notas ? `Notas: ${input.notas}` : '';
    if (input.metodoPago === 'MIXTO' && input.detallesPago) {
      const eMonto = (input.detallesPago.efectivo || 0).toFixed(2);
      const dMonto = (input.detallesPago.digital || 0).toFixed(2);
      const canal = input.detallesPago.canalDigital || 'YAPE';
      const mixedText = `[Pago Cruzado Web: S/ ${eMonto} Efectivo en caja + S/ ${dMonto} vía ${canal}]`;
      detalleNotas = detalleNotas ? `${mixedText} • ${detalleNotas}` : mixedText;
    } else if (input.metodoPago === 'EFECTIVO' && input.detallesPago?.vuelto) {
      const efectivoText = `[Paga en efectivo con S/ ${((input.detallesPago.efectivo || input.total)).toFixed(2)} - Vuelto requerido: S/ ${input.detallesPago.vuelto.toFixed(2)}]`;
      detalleNotas = detalleNotas ? `${efectivoText} • ${detalleNotas}` : efectivoText;
    }

    // 1. Insertar el Pedido en la tabla 'pedidos'
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        codigo_pedido: input.codigoPedido,
        cliente_nombre: input.clienteNombre.trim() || 'Cliente Web',
        cliente_telefono: input.clienteTelefono.trim() || '',
        cliente_dni: input.clienteDni?.trim() || '',
        ciudad: ciudad,
        metodo_entrega: input.metodoEntrega || 'RECOJO_SEDE',
        metodo_pago: input.metodoPago,
        estado: 'PENDIENTE',
        subtotal: input.subtotal,
        costo_envio: 0.0,
        descuento: input.descuento || 0,
        total: input.total,
        es_alumno: input.items.some((it) => it.tipo === 'matricula' || it.producto.categoria_id === 'academia'),
        notas: detalleNotas || `Pedido Web para recojo en ${sedeActual.nombre}`,
      })
      .select('id')
      .single();

    if (pedidoError) {
      console.error('Error insertando pedido en Supabase:', pedidoError);
      throw new Error(`Error al registrar pedido: ${pedidoError.message}`);
    }

    const pedidoId = pedidoData.id;

    // 2. Insertar los ítems del pedido en 'pedido_items'
    if (input.items.length > 0) {
      const itemsPayload = input.items.map((it) => ({
        pedido_id: pedidoId,
        producto_id: it.producto.id.startsWith('mock-') || it.producto.id.startsWith('curso-')
          ? null
          : it.producto.id,
        nombre_producto: it.producto.nombre,
        precio_unitario: it.precioUnitario,
        cantidad: it.cantidad,
        subtotal: it.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('pedido_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.warn('Advertencia al insertar ítems de pedido:', itemsError.message);
      }
    }

    // 3. Procesar Productos Físicos: Descontar stock y registrar Kardex
    for (const item of input.items) {
      const esCurso =
        item.tipo === 'matricula' ||
        item.producto.categoria_id === 'academia' ||
        item.producto.id.startsWith('curso-');

      if (!esCurso && !item.producto.id.startsWith('mock-')) {
        try {
          const nuevoStock = Math.max(0, (item.producto.stock || 0) - item.cantidad);

          // Actualizar stock
          await supabase
            .from('productos')
            .update({ stock: nuevoStock })
            .eq('id', item.producto.id);

          // Registrar en Kardex (movimientos_inventario)
          await supabase.from('movimientos_inventario').insert({
            producto_id: item.producto.id,
            tipo: 'SALIDA',
            cantidad: item.cantidad,
            stock_anterior: item.producto.stock || 0,
            stock_nuevo: nuevoStock,
            motivo: `Pedido Web Recojo #${input.codigoPedido} - Cliente: ${input.clienteNombre}`,
            usuario_id: '00000000-0000-0000-0000-000000000001',
            usuario_nombre: 'Tienda Online Galindo',
            referencia_id: input.codigoPedido,
          });
        } catch (stockErr) {
          console.warn(`Error al actualizar stock de producto ${item.producto.id}:`, stockErr);
        }
      }
    }

    // 4. Pre-inscripción de Cursos de Academia (si el pedido incluye matrículas)
    // NOTA CLAVE: No creamos la matrícula oficial ni el alumno automáticamente con datos ficticios.
    // El pedido se registra con canal 'ACADEMIA' y estado 'PENDIENTE' para que el administrador
    // valide el pago/voucher, complete los datos faltantes del alumno (DNI de 8 dígitos, apellidos
    // completos, teléfono de emergencia) y formalice la matrícula oficial desde el panel de pedidos.
    let matriculaCodigoGenerado: string | undefined = undefined;

    // 5. Registrar en Movimientos de Caja y Actualizar Caja Chica si hay una abierta
    try {
      const { data: cajasAbiertas } = await supabase
        .from('cajas_chicas')
        .select('id, total_ingresos_efectivo, total_ingresos_digital, saldo_teorico_efectivo')
        .eq('estado', 'ABIERTA')
        .order('fecha_apertura', { ascending: false })
        .limit(1);

      const cajaActiva = cajasAbiertas?.[0];

      if (cajaActiva) {
        await supabase.from('movimientos_caja').insert({
          caja_id: cajaActiva.id,
          tipo: 'INGRESO_VENTA',
          monto: input.total,
          metodo_pago: input.metodoPago,
          concepto: `Pedido Web #${input.codigoPedido} - ${input.clienteNombre} (${sedeActual.nombre})`,
          referencia_id: input.codigoPedido,
          usuario_id: '00000000-0000-0000-0000-000000000001',
          usuario_nombre: 'Tienda Online Galindo',
        });

        let incEfectivo = 0;
        let incDigital = 0;

        if (input.metodoPago === 'EFECTIVO') {
          incEfectivo = input.total;
        } else if (input.metodoPago === 'MIXTO' && input.detallesPago) {
          incEfectivo = input.detallesPago.efectivo || 0;
          incDigital = input.detallesPago.digital || 0;
        } else {
          incDigital = input.total;
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
      console.warn('Nota: No se actualizó caja chica o no hay caja abierta:', cajaErr);
    }

    // 6. Notificar a listeners locales (ventanas activas / tabs del Admin)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
      window.dispatchEvent(new Event('galindo_pos_venta_realizada'));
    }

    return {
      success: true,
      pedidoId,
      codigoPedido: input.codigoPedido,
      matriculaCodigo: matriculaCodigoGenerado,
    };
  } catch (err: any) {
    console.error('Error al procesar pedido web:', err);
    return {
      success: false,
      error: err.message || 'Error inesperado al registrar el pedido.',
    };
  }
}
