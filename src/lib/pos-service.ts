import { supabase } from '@/lib/supabase';
import { Producto, MetodoPago } from '@/types/database';
import { matchSede } from '@/lib/academia-service';
import { normalizarMetodoPago } from '@/lib/utils';

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

export interface DesglosePagoCruzado {
  efectivo: number;
  digital: number;
  canalDigital: 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA';
}

export interface VentaRegistradaPOS {
  id: string;
  codigo_pedido: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_dni?: string;
  total: number;
  metodo_pago: MetodoPago | string;
  metodo_entrega: string;
  estado: string;
  creado_en: string;
  items_resumen?: string;
  items_count: number;
  notas?: string;
  desglosePago?: DesglosePagoCruzado;
  /** Distingue el origen del ingreso para mostrar en Ventas Turno */
  tipo_transaccion?: 'VENTA_POS' | 'MATRICULA' | 'CUOTA';
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
 * Obtiene el listado de ventas del día realizadas en el POS filtrado estrictamente por sede
 */
export async function getVentasHoyPOS(
  sedeId?: 'ica' | 'huancayo',
  filtroPeriodo: 'HOY' | 'TODAS' = 'HOY'
): Promise<VentaRegistradaPOS[]> {
  try {
    let query = supabase
      .from('pedidos')
      .select('id, codigo_pedido, cliente_nombre, cliente_telefono, cliente_dni, total, metodo_pago, metodo_entrega, estado, creado_en, sede_id, ciudad, notas')
      .neq('estado', 'CANCELADO')
      .order('creado_en', { ascending: false });

    if (filtroPeriodo === 'HOY') {
      const hoyInicio = new Date();
      hoyInicio.setHours(0, 0, 0, 0);
      query = query.gte('creado_en', hoyInicio.toISOString());
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar ventas del POS:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    let filtrados = data;
    if (sedeId) {
      filtrados = data.filter((d: any) => {
        const sedeCandidata = d.sede_id || d.ciudad || d.notas || '';
        return matchSede(sedeCandidata, sedeId);
      });
    }

    return filtrados.map((d: any) => ({
      ...d,
      items_count: 1,
    }));
  } catch (err) {
    console.error('Error al consultar ventas del POS:', err);
    return [];
  }
}

/**
 * Calcula el rango de inicio y fin de una fecha en la zona horaria de Perú (UTC-5)
 */
export function getRangoFechaPeru(fechaStr: string) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const inicio = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
  const fin = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999));
  return {
    inicioISO: inicio.toISOString(),
    finISO: fin.toISOString(),
  };
}

/**
 * Parsea el desglose real de un Pago Cruzado guardado en notas
 * Ejemplo: "Pago Cruzado: S/ 10.00 Efectivo + S/ 15.00 por YAPE."
 */
export function parseDesglosePagoCruzado(
  notas?: string | null,
  total: number = 0
): DesglosePagoCruzado {
  if (!notas) {
    return { efectivo: total / 2, digital: total / 2, canalDigital: 'YAPE' };
  }

  // 1. Extraer Efectivo
  const mEfec = notas.match(/S\/\.?\s*([\d,.]+)\s*(?:Efectivo|efectivo|en caja)/i);
  // 2. Extraer Digital
  const mDig =
    notas.match(/\+\s*S\/\.?\s*([\d,.]+)\s*(?:por|vía|via)?\s*([A-Za-z]+)?/i) ||
    notas.match(/S\/\.?\s*([\d,.]+)\s*(?:por|vía|via)\s*([A-Za-z]+)/i);

  let efectivo = mEfec ? parseFloat(mEfec[1].replace(',', '')) : 0;
  let digital = mDig ? parseFloat(mDig[1].replace(',', '')) : 0;

  // Canal digital
  let canalDigital: 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA' = 'YAPE';
  if (/plin/i.test(notas)) canalDigital = 'PLIN';
  else if (/tarjeta/i.test(notas)) canalDigital = 'TARJETA';
  else if (/transferencia/i.test(notas)) canalDigital = 'TRANSFERENCIA';
  else if (/yape/i.test(notas)) canalDigital = 'YAPE';

  if (efectivo > 0 && digital === 0 && total > efectivo) {
    digital = total - efectivo;
  } else if (digital > 0 && efectivo === 0 && total > digital) {
    efectivo = total - digital;
  } else if (efectivo === 0 && digital === 0) {
    efectivo = total / 2;
    digital = total / 2;
  }

  return { efectivo, digital, canalDigital };
}

export interface FiltrosVentasPOS {
  sedeId?: 'ica' | 'huancayo';
  fecha?: string; // 'YYYY-MM-DD' o '' para todas
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
  incluirAnulados?: boolean;
}

export interface ResultadoVentasPOSPaginado {
  ventas: VentaRegistradaPOS[];
  totalRegistros: number;
  totalPaginas: number;
  paginaActual: number;
  totalVendido: number;
  totalEfectivo: number;
  totalDigital: number;
  totalTicketsValidos: number;
  totalAnulados: number;
}

// ---------------------------------------------------------------------------
// Helpers privados para combinar fuentes de ingreso en Ventas Turno
// ---------------------------------------------------------------------------

/** Obtiene matrículas del día o recientes como registros unificados para el arqueo */
export async function obtenerMatriculasParaTurno(
  sedeId: string | undefined,
  fechaStr?: string
): Promise<VentaRegistradaPOS[]> {
  try {
    let query = supabase
      .from('matriculas')
      .select('id, codigo_matricula, alumno_id, sede, fecha_matricula, monto_matricula_pagado, estado, curso_nombre, notas, metodo_pago, creado_en')
      .order('creado_en', { ascending: false });

    if (!fechaStr) {
      query = query.limit(50);
    }

    const { data: matsData } = await query;

    if (!matsData || matsData.length === 0) return [];

    const getFechaPeruFromIso = (iso?: string | null) => {
      if (!iso) return '';
      const dt = new Date(iso);
      if (isNaN(dt.getTime())) return '';
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(dt);
    };

    let filtrados = matsData;
    if (fechaStr) {
      filtrados = filtrados.filter((m: any) => {
        const fechaRealPeru = m.creado_en ? getFechaPeruFromIso(m.creado_en) : m.fecha_matricula;
        return fechaRealPeru === fechaStr;
      });
    }

    if (sedeId) {
      filtrados = filtrados.filter((m: any) => matchSede(m.sede, sedeId));
    }
    if (filtrados.length === 0) return [];

    // Traer nombres de alumnos
    const alumnoIds = [...new Set(filtrados.map((m: any) => m.alumno_id as string))];
    const { data: alumnosData } = await supabase
      .from('alumnos')
      .select('id, nombres, apellidos, dni, celular')
      .in('id', alumnoIds);

    const alumnosMap: Record<string, any> = {};
    (alumnosData || []).forEach((a: any) => { alumnosMap[a.id] = a; });

    return filtrados.map((m: any) => {
      const a = alumnosMap[m.alumno_id] || {};
      const metodoPago = normalizarMetodoPago(m.metodo_pago, m.notas) as MetodoPago;
      const isMixto = String(metodoPago).toUpperCase() === 'MIXTO';
      const monto = Number(m.monto_matricula_pagado || 0);
      const desglose = isMixto ? parseDesglosePagoCruzado(m.notas, monto) : undefined;
      return {
        id: m.id,
        codigo_pedido: m.codigo_matricula || `MAT-${String(m.id).slice(0, 6)}`,
        cliente_nombre: `${a.nombres || ''} ${a.apellidos || ''}`.trim() || 'Alumno',
        cliente_telefono: a.celular,
        cliente_dni: a.dni,
        total: monto,
        metodo_pago: metodoPago,
        metodo_entrega: 'ACADEMIA',
        estado: m.estado === 'RETIRADO' ? 'CANCELADO' : 'ENTREGADO',
        creado_en: m.creado_en || `${m.fecha_matricula}T17:00:00.000Z`,
        items_resumen: `Matrícula: ${m.curso_nombre || 'Curso'}`,
        items_count: 1,
        notas: m.notas,
        desglosePago: desglose,
        tipo_transaccion: 'MATRICULA' as const,
      };
    });
  } catch (err) {
    console.error('Error al obtener matrículas para turno:', err);
    return [];
  }
}

/** Obtiene pagos de cuotas del día o recientes como registros unificados para el arqueo */
export async function obtenerCuotasParaTurno(
  sedeId: string | undefined,
  inicioISO?: string,
  finISO?: string
): Promise<VentaRegistradaPOS[]> {
  try {
    let query = supabase
      .from('cuotas_matricula')
      .select('id, matricula_id, numero_cuota, monto, fecha_pago, metodo_pago, estado, notas')
      .eq('estado', 'PAGADA')
      .not('fecha_pago', 'is', null)
      .order('fecha_pago', { ascending: false });

    if (inicioISO && finISO) {
      query = query.gte('fecha_pago', inicioISO).lte('fecha_pago', finISO);
    } else {
      query = query.limit(50);
    }

    const { data: cuotasData } = await query;

    if (!cuotasData || cuotasData.length === 0) return [];

    // Traer matrículas para filtro de sede e info del curso
    const matriculaIds = [...new Set(cuotasData.map((c: any) => c.matricula_id as string))];
    const { data: matsData } = await supabase
      .from('matriculas')
      .select('id, codigo_matricula, alumno_id, sede, curso_nombre')
      .in('id', matriculaIds);

    const matsMap: Record<string, any> = {};
    (matsData || []).forEach((m: any) => { matsMap[m.id] = m; });

    let filtrados = cuotasData;
    if (sedeId) {
      filtrados = cuotasData.filter((c: any) => {
        const mat = matsMap[c.matricula_id];
        return mat && matchSede(mat.sede, sedeId);
      });
    }
    if (filtrados.length === 0) return [];

    // Traer alumnos
    const alumnoIds = [
      ...new Set(
        filtrados.map((c: any) => matsMap[c.matricula_id]?.alumno_id as string).filter(Boolean)
      ),
    ];
    const { data: alumnosData } = await supabase
      .from('alumnos')
      .select('id, nombres, apellidos, dni, celular')
      .in('id', alumnoIds);

    const alumnosMap: Record<string, any> = {};
    (alumnosData || []).forEach((a: any) => { alumnosMap[a.id] = a; });

    return filtrados.map((c: any) => {
      const mat = matsMap[c.matricula_id] || {};
      const a = alumnosMap[mat.alumno_id] || {};
      const metodoPago = normalizarMetodoPago(c.metodo_pago, c.notas) as MetodoPago;
      const isMixto = String(metodoPago).toUpperCase() === 'MIXTO';
      const monto = Number(c.monto || 0);
      const desglose = isMixto ? parseDesglosePagoCruzado(c.notas, monto) : undefined;
      return {
        id: c.id,
        codigo_pedido: `${mat.codigo_matricula || 'MAT'}-C${c.numero_cuota}`,
        cliente_nombre: `${a.nombres || ''} ${a.apellidos || ''}`.trim() || 'Alumno',
        cliente_telefono: a.celular,
        cliente_dni: a.dni,
        total: monto,
        metodo_pago: metodoPago,
        metodo_entrega: 'ACADEMIA',
        estado: 'ENTREGADO',
        creado_en: c.fecha_pago,
        items_resumen: `Cuota #${c.numero_cuota} — ${mat.curso_nombre || 'Curso'}`,
        items_count: 1,
        notas: c.notas,
        desglosePago: desglose,
        tipo_transaccion: 'CUOTA' as const,
      };
    });
  } catch (err) {
    console.error('Error al obtener cuotas para turno:', err);
    return [];
  }
}

/**
 * Consulta TODOS los ingresos del turno con paginación en memoria:
 * combina ventas POS de productos + matrículas + pagos de cuotas.
 * Los KPIs y totales reflejan la suma real del día de caja.
 */
export async function getVentasPOSPaginadas({
  sedeId,
  fecha,
  busqueda = '',
  pagina = 1,
  porPagina = 10,
  incluirAnulados = true,
}: FiltrosVentasPOS): Promise<ResultadoVentasPOSPaginado> {
  try {
    const hasFecha = Boolean(fecha && fecha.trim());
    const fechaStr = hasFecha ? fecha!.trim() : '';
    const { inicioISO, finISO } = hasFecha
      ? getRangoFechaPeru(fechaStr)
      : { inicioISO: '', finISO: '' };

    // ── 1. Pedidos POS (ventas de productos de mostrador) ────────────────
    let pedidosQuery = supabase
      .from('pedidos')
      .select(
        'id, codigo_pedido, cliente_nombre, cliente_telefono, cliente_dni, total, metodo_pago, metodo_entrega, estado, creado_en, sede_id, ciudad, notas'
      )
      .order('creado_en', { ascending: false });

    if (hasFecha) {
      pedidosQuery = pedidosQuery.gte('creado_en', inicioISO).lte('creado_en', finISO);
    } else {
      pedidosQuery = pedidosQuery.limit(200);
    }
    if (!incluirAnulados) {
      pedidosQuery = pedidosQuery.neq('estado', 'CANCELADO');
    }

    // ── 2. Matrículas + cuotas (del día o recientes) ────────────────────
    const matriculasPromise = hasFecha
      ? obtenerMatriculasParaTurno(sedeId, fechaStr)
      : obtenerMatriculasParaTurno(sedeId);

    const cuotasPromise = hasFecha
      ? obtenerCuotasParaTurno(sedeId, inicioISO, finISO)
      : obtenerCuotasParaTurno(sedeId);

    // Ejecutar las 3 consultas en paralelo
    const [pedidosResult, matriculas, cuotas] = await Promise.all([
      pedidosQuery,
      matriculasPromise,
      cuotasPromise,
    ]);

    if (pedidosResult.error) {
      console.error('Error al consultar pedidos:', pedidosResult.error);
    }

    // Mapear pedidos y filtrar por sede
    let pedidosMapped: VentaRegistradaPOS[] = (pedidosResult.data || []).map((d: any) => {
      const isMixto = String(d.metodo_pago || '').toUpperCase() === 'MIXTO';
      const monto = Number(d.total || 0);
      const desglose = isMixto ? parseDesglosePagoCruzado(d.notas, monto) : undefined;
      return {
        ...d,
        items_count: 1,
        tipo_transaccion: 'VENTA_POS' as const,
        notas: d.notas,
        desglosePago: desglose,
      };
    });
    if (sedeId) {
      pedidosMapped = pedidosMapped.filter((d) => {
        const sc = (d as any).sede_id || (d as any).ciudad || (d as any).notas || '';
        return matchSede(sc, sedeId);
      });
    }

    // ── Combinar y ordenar por fecha descendente ─────────────────────────
    const todas: VentaRegistradaPOS[] = [
      ...pedidosMapped,
      ...matriculas,
      ...cuotas,
    ].sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());

    // ── Búsqueda de texto sobre todos los registros combinados ───────────
    const q = busqueda.trim().toLowerCase();
    const filtradas = q
      ? todas.filter(
          (v) =>
            (v.codigo_pedido || '').toLowerCase().includes(q) ||
            (v.cliente_nombre || '').toLowerCase().includes(q) ||
            (v.cliente_dni || '').includes(q) ||
            (v.cliente_telefono || '').includes(q) ||
            (v.items_resumen || '').toLowerCase().includes(q)
        )
      : todas;

    // ── KPIs del período ─────────────────────────────────────────────────
    const validas = filtradas.filter((v) => v.estado !== 'CANCELADO');
    const totalVendido = validas.reduce((acc, v) => acc + Number(v.total || 0), 0);

    let totalEfectivo = 0;
    let totalDigital = 0;
    validas.forEach((v) => {
      const monto = Number(v.total || 0);
      const met = String(v.metodo_pago || '').toUpperCase();
      if (met === 'EFECTIVO') {
        totalEfectivo += monto;
      } else if (met === 'MIXTO') {
        const desglose = v.desglosePago || parseDesglosePagoCruzado(v.notas, monto);
        totalEfectivo += desglose.efectivo;
        totalDigital += desglose.digital;
      } else {
        totalDigital += monto;
      }
    });

    const totalTicketsValidos = validas.length;
    const totalAnulados = filtradas.filter((v) => v.estado === 'CANCELADO').length;
    const totalRegistros = filtradas.length;
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina));

    // ── Paginación en memoria ────────────────────────────────────────────
    const desde = (pagina - 1) * porPagina;
    const ventas = filtradas.slice(desde, desde + porPagina);

    return {
      ventas,
      totalRegistros,
      totalPaginas,
      paginaActual: pagina,
      totalVendido,
      totalEfectivo,
      totalDigital,
      totalTicketsValidos,
      totalAnulados,
    };
  } catch (err) {
    console.error('Error en getVentasPOSPaginadas:', err);
    return {
      ventas: [],
      totalRegistros: 0,
      totalPaginas: 1,
      paginaActual: 1,
      totalVendido: 0,
      totalEfectivo: 0,
      totalDigital: 0,
      totalTicketsValidos: 0,
      totalAnulados: 0,
    };
  }
}
