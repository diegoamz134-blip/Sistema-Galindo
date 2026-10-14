// =========================================================================
// SERVICIO DE GESTIÓN DE PEDIDOS WEB & MOSTRADOR (SISTEMA GALINDO)
// =========================================================================

import { supabase } from '@/lib/supabase';
import { SEDES, SedeId, BUSINESS_INFO } from '@/lib/constants';
import { formatCurrency, normalizarMetodoPago } from '@/lib/utils';
import { crearMatriculaCompleta, matchSede, retirarMatricula, actualizarMetodoPagoMatricula, actualizarMetodoPagoCuota } from '@/lib/academia-service';
import { Alumno, Matricula } from '@/types/database';

export interface PedidoItemDetallado {
  id: string;
  pedido_id: string;
  producto_id?: string | null;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  es_matricula?: boolean;
}

export interface PedidoCompleto {
  id: string;
  codigo_pedido: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_dni?: string;
  ciudad?: string;
  sede_id?: string;
  metodo_entrega?: string;
  metodo_pago: string;
  estado: 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO';
  subtotal: number;
  costo_envio?: number;
  descuento?: number;
  total: number;
  es_alumno: boolean;
  notas?: string;
  creado_en: string;
  actualizado_en?: string;
  items: PedidoItemDetallado[];
  tipo_canal: 'WEB_TIENDA' | 'ACADEMIA' | 'POS_MOSTRADOR';
  sede_nombre: string;
}

export interface FiltrosPedidosAdmin {
  busqueda?: string;
  estado?: 'TODOS' | 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO';
  canal?: 'TODOS' | 'WEB_TIENDA' | 'ACADEMIA' | 'POS_MOSTRADOR';
  sede?: 'TODAS' | 'Ica' | 'Huancayo';
  fecha?: 'TODAS' | 'HOY' | 'SEMANA' | 'MES';
}

export interface EstadisticasPedidos {
  totalPedidos: number;
  pendientes: number;
  entregados: number;
  totalFacturado: number;
  totalAcademia: number;
  totalTienda: number;
}

/**
 * Normaliza un pedido bruto de Supabase deduciendo su canal y sede
 */
function inferirCanalYSede(row: any, items: PedidoItemDetallado[] = []): { canal: 'WEB_TIENDA' | 'ACADEMIA' | 'POS_MOSTRADOR'; sede: string; sedeId: 'ica' | 'huancayo' } {
  const codigo = (row.codigo_pedido || '').toUpperCase();
  const notas = (row.notas || '').toLowerCase();
  const ciudad = (row.ciudad || '').toLowerCase();
  const rowSede = (row.sede_id || row.sede || '').toLowerCase();

  let sedeId: 'ica' | 'huancayo' = 'ica';
  let sede = SEDES.ica.nombre;

  if (rowSede.includes('huancayo') || ciudad.includes('huancayo') || notas.includes('huancayo')) {
    sedeId = 'huancayo';
    sede = SEDES.huancayo.nombre;
  } else {
    sedeId = 'ica';
    sede = SEDES.ica.nombre;
  }

  // Canal
  const tieneMatricula =
    Boolean(row.es_alumno) ||
    codigo.startsWith('MAT-') ||
    items.some((it) =>
      Boolean(it.es_matricula) ||
      it.nombre_producto.toLowerCase().includes('matrícula') ||
      it.nombre_producto.toLowerCase().includes('matricula') ||
      it.nombre_producto.toLowerCase().includes('barbería integral') ||
      it.nombre_producto.toLowerCase().includes('masterclass')
    );

  let canal: 'WEB_TIENDA' | 'ACADEMIA' | 'POS_MOSTRADOR' = 'WEB_TIENDA';

  if (codigo.startsWith('POS-') || notas.includes('mostrador') || /\bpos\b/i.test(notas)) {
    canal = 'POS_MOSTRADOR';
  } else if (tieneMatricula) {
    canal = 'ACADEMIA';
  } else {
    canal = 'WEB_TIENDA';
  }

  return { canal, sede, sedeId };
}

/**
 * Obtener listado consolidado de ventas y pedidos para el panel administrativo:
 * 1. Ventas Mostrador (POS)
 * 2. Pedidos Tienda Web (Supply / E-commerce)
 * 3. Academia & Matrículas (Inscripciones de alumnos y pagos de cuotas)
 */
export async function getPedidosAdmin(filtros?: FiltrosPedidosAdmin): Promise<PedidoCompleto[]> {
  try {
    // 1. Consultar pedidos en Supabase (POS mostrador y Tienda Web)
    let pedidosQuery = supabase
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      pedidosQuery = pedidosQuery.eq('estado', filtros.estado);
    }

    // 2. Consultar Matrículas oficiales de Academia
    let matriculasQuery = supabase
      .from('matriculas')
      .select('*')
      .order('creado_en', { ascending: false });

    // 3. Consultar Pagos de Cuotas de Academia (estado PAGADA)
    let cuotasQuery = supabase
      .from('cuotas_matricula')
      .select('*')
      .eq('estado', 'PAGADA')
      .order('fecha_pago', { ascending: false });

    // Ejecutar las 3 consultas en paralelo
    const [pedidosRes, matriculasRes, cuotasRes] = await Promise.all([
      pedidosQuery,
      matriculasQuery,
      cuotasQuery,
    ]);

    const pedidosRows = pedidosRes.data || [];
    const matriculasRows = matriculasRes.data || [];
    const cuotasRows = cuotasRes.data || [];

    // Obtener ítems de todos los pedidos consultados
    const pedidoIds = pedidosRows.map((p) => p.id);
    let itemsRows: any[] = [];
    if (pedidoIds.length > 0) {
      const { data } = await supabase
        .from('pedido_items')
        .select('*')
        .in('pedido_id', pedidoIds);
      itemsRows = data || [];
    }

    const itemsMap: Record<string, PedidoItemDetallado[]> = {};
    itemsRows.forEach((item: any) => {
      if (!itemsMap[item.pedido_id]) itemsMap[item.pedido_id] = [];
      const esMatricula =
        Boolean(item.es_matricula) ||
        item.nombre_producto.toLowerCase().includes('matrícula') ||
        item.nombre_producto.toLowerCase().includes('matricula');
      itemsMap[item.pedido_id].push({
        id: item.id,
        pedido_id: item.pedido_id,
        producto_id: item.producto_id,
        nombre_producto: item.nombre_producto,
        precio_unitario: Number(item.precio_unitario) || 0,
        cantidad: Number(item.cantidad) || 1,
        subtotal: Number(item.subtotal) || 0,
        es_matricula: esMatricula,
      });
    });

    // Mapear pedidos (POS y Web)
    const pedidosMapped: PedidoCompleto[] = pedidosRows.map((row) => {
      const items = itemsMap[row.id] || [];
      const { canal, sede, sedeId } = inferirCanalYSede(row, items);

      return {
        id: row.id,
        codigo_pedido: row.codigo_pedido,
        cliente_nombre: row.cliente_nombre || 'Cliente Mostrador',
        cliente_telefono: row.cliente_telefono || '',
        cliente_dni: row.cliente_dni || '',
        ciudad: row.ciudad || '',
        sede_id: sedeId,
        metodo_entrega: row.metodo_entrega || 'RECOJO_SEDE',
        metodo_pago: row.metodo_pago || 'EFECTIVO',
        estado: row.estado || 'PENDIENTE',
        subtotal: Number(row.subtotal) || Number(row.total) || 0,
        costo_envio: Number(row.costo_envio) || 0,
        descuento: Number(row.descuento) || 0,
        total: Number(row.total) || 0,
        es_alumno: Boolean(row.es_alumno),
        notas: row.notas || '',
        creado_en: row.creado_en,
        actualizado_en: row.actualizado_en,
        items,
        tipo_canal: canal,
        sede_nombre: sede,
      };
    });

    // ── Enriquecer Matrículas con Alumnos ──────────────────────────────────
    const alumnoIds = Array.from(
      new Set(matriculasRows.map((m: any) => m.alumno_id).filter(Boolean))
    );
    const alumnosMap: Record<string, any> = {};
    if (alumnoIds.length > 0) {
      const { data: alumnosData } = await supabase
        .from('alumnos')
        .select('id, dni, nombres, apellidos, celular, email, distrito')
        .in('id', alumnoIds);
      (alumnosData || []).forEach((a: any) => {
        alumnosMap[a.id] = a;
      });
    }

    const matriculasMapped: PedidoCompleto[] = matriculasRows.map((m: any) => {
      const a = alumnosMap[m.alumno_id] || {};
      const alumnoNombre = `${a.nombres || ''} ${a.apellidos || ''}`.trim() || 'Estudiante Academia';
      const esHuancayo = matchSede(m.sede, 'huancayo');
      const sedeNombre = esHuancayo ? SEDES.huancayo.nombre : SEDES.ica.nombre;
      const sedeId: 'ica' | 'huancayo' = esHuancayo ? 'huancayo' : 'ica';
      const montoPagado = Number(m.monto_matricula_pagado || 0);

      let estado: 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO' = 'PAGADO';
      if (m.estado === 'RETIRADO') {
        estado = 'CANCELADO';
      } else if (Number(m.saldo_pendiente || 0) <= 0) {
        estado = 'ENTREGADO';
      } else if (montoPagado > 0) {
        estado = 'PAGADO';
      } else {
        estado = 'PENDIENTE';
      }

      const items: PedidoItemDetallado[] = [
        {
          id: m.id,
          pedido_id: m.id,
          producto_id: m.curso_id,
          nombre_producto: `Matrícula: ${m.curso_nombre || 'Curso'} (${m.turno || 'Regular'})`,
          precio_unitario: montoPagado,
          cantidad: 1,
          subtotal: montoPagado,
          es_matricula: true,
        },
      ];

      return {
        id: m.id,
        codigo_pedido: m.codigo_matricula || `MAT-${String(m.id).slice(0, 6)}`,
        cliente_nombre: alumnoNombre,
        cliente_telefono: a.celular || '',
        cliente_dni: a.dni || '',
        ciudad: m.sede || (esHuancayo ? 'Huancayo' : 'Ica'),
        sede_id: sedeId,
        metodo_entrega: 'ACADEMIA',
        metodo_pago: normalizarMetodoPago(m.metodo_pago, m.notas),
        estado,
        subtotal: montoPagado,
        costo_envio: 0,
        descuento: 0,
        total: montoPagado,
        es_alumno: true,
        notas: `Matrícula: ${m.curso_nombre || 'Curso'}. Turno: ${m.turno || 'Regular'}. Total curso: S/ ${Number(m.total_curso || 0).toFixed(2)}. Saldo pendiente: S/ ${Number(m.saldo_pendiente || 0).toFixed(2)}${m.notas ? ` • ${m.notas}` : ''}`,
        creado_en: m.creado_en || (m.fecha_matricula ? `${m.fecha_matricula}T12:00:00.000Z` : new Date().toISOString()),
        actualizado_en: m.creado_en,
        items,
        tipo_canal: 'ACADEMIA' as const,
        sede_nombre: sedeNombre,
      };
    });

    // ── Enriquecer Cuotas Pagadas de Academia ──────────────────────────────
    const matsMap: Record<string, any> = {};
    matriculasRows.forEach((m: any) => { matsMap[m.id] = m; });

    const cuotasMapped: PedidoCompleto[] = cuotasRows.map((c: any) => {
      const mat = matsMap[c.matricula_id] || {};
      const a = alumnosMap[mat.alumno_id] || {};
      const alumnoNombre = `${a.nombres || ''} ${a.apellidos || ''}`.trim() || 'Estudiante Academia';
      const esHuancayo = matchSede(mat.sede, 'huancayo');
      const sedeNombre = esHuancayo ? SEDES.huancayo.nombre : SEDES.ica.nombre;
      const sedeId: 'ica' | 'huancayo' = esHuancayo ? 'huancayo' : 'ica';
      const monto = Number(c.monto || 0);

      const items: PedidoItemDetallado[] = [
        {
          id: c.id,
          pedido_id: c.id,
          producto_id: mat.curso_id,
          nombre_producto: `Cuota #${c.numero_cuota} — ${mat.curso_nombre || 'Curso'}`,
          precio_unitario: monto,
          cantidad: 1,
          subtotal: monto,
          es_matricula: true,
        },
      ];

      return {
        id: c.id,
        codigo_pedido: `${mat.codigo_matricula || 'MAT'}-C${c.numero_cuota}`,
        cliente_nombre: alumnoNombre,
        cliente_telefono: a.celular || '',
        cliente_dni: a.dni || '',
        ciudad: mat.sede || (esHuancayo ? 'Huancayo' : 'Ica'),
        sede_id: sedeId,
        metodo_entrega: 'ACADEMIA',
        metodo_pago: normalizarMetodoPago(c.metodo_pago, c.notas),
        estado: 'ENTREGADO' as const,
        subtotal: monto,
        costo_envio: 0,
        descuento: 0,
        total: monto,
        es_alumno: true,
        notas: `Pago de Cuota #${c.numero_cuota} — ${mat.curso_nombre || 'Curso'}.${c.numero_operacion ? ` N° Operación: ${c.numero_operacion}` : ''}`,
        creado_en: c.fecha_pago || c.creado_en || new Date().toISOString(),
        actualizado_en: c.fecha_pago,
        items,
        tipo_canal: 'ACADEMIA' as const,
        sede_nombre: sedeNombre,
      };
    });

    // ── Combinar y deduplicar por código ──────────────────────────────────
    const existingCodes = new Set(pedidosMapped.map((p) => p.codigo_pedido));
    const nuevasMatriculas = matriculasMapped.filter((m) => !existingCodes.has(m.codigo_pedido));
    const nuevasCuotas = cuotasMapped.filter((c) => !existingCodes.has(c.codigo_pedido));

    let resultado: PedidoCompleto[] = [
      ...pedidosMapped,
      ...nuevasMatriculas,
      ...nuevasCuotas,
    ].sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());

    // Filtros en memoria para canal, sede y texto de búsqueda
    if (filtros?.canal && filtros.canal !== 'TODOS') {
      resultado = resultado.filter((p) => p.tipo_canal === filtros.canal);
    }

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      resultado = resultado.filter((p) => p.estado === filtros.estado);
    }

    // Filtro de sede estricto
    if (filtros?.sede && filtros.sede !== 'TODAS') {
      resultado = resultado.filter((p) => matchSede(p.sede_id || p.sede_nombre || p.ciudad || p.notas, filtros.sede));
    }

    if (filtros?.fecha && filtros.fecha !== 'TODAS') {
      const ahora = new Date();
      if (filtros.fecha === 'HOY') {
        const hoyStr = ahora.toISOString().split('T')[0];
        resultado = resultado.filter((p) => p.creado_en.startsWith(hoyStr));
      } else if (filtros.fecha === 'SEMANA') {
        const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
        resultado = resultado.filter((p) => new Date(p.creado_en) >= hace7Dias);
      }
    }

    if (filtros?.busqueda && filtros.busqueda.trim()) {
      const q = filtros.busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (p) =>
          p.codigo_pedido.toLowerCase().includes(q) ||
          p.cliente_nombre.toLowerCase().includes(q) ||
          p.cliente_telefono.includes(q) ||
          (p.cliente_dni && p.cliente_dni.includes(q)) ||
          p.items.some((it) => it.nombre_producto.toLowerCase().includes(q)) ||
          (p.notas && p.notas.toLowerCase().includes(q))
      );
    }

    return resultado;
  } catch (err) {
    console.error('Error en getPedidosAdmin:', err);
    return [];
  }
}

/**
 * Obtener métricas y KPIs de pedidos filtrados por sede
 */
export async function getEstadisticasPedidos(sedeId?: string): Promise<EstadisticasPedidos> {
  try {
    const filtros = sedeId ? ({ sede: sedeId } as FiltrosPedidosAdmin) : undefined;
    const pedidos = await getPedidosAdmin(filtros);
    const pendientes = pedidos.filter((p) => p.estado === 'PENDIENTE').length;
    const entregados = pedidos.filter((p) => p.estado === 'ENTREGADO').length;
    const totalFacturado = pedidos
      .filter((p) => p.estado !== 'CANCELADO')
      .reduce((acc, p) => acc + p.total, 0);

    const totalAcademia = pedidos
      .filter((p) => p.tipo_canal === 'ACADEMIA' && p.estado !== 'CANCELADO')
      .reduce((acc, p) => acc + p.total, 0);

    const totalTienda = pedidos
      .filter((p) => p.tipo_canal !== 'ACADEMIA' && p.estado !== 'CANCELADO')
      .reduce((acc, p) => acc + p.total, 0);

    return {
      totalPedidos: pedidos.length,
      pendientes,
      entregados,
      totalFacturado,
      totalAcademia,
      totalTienda,
    };
  } catch (err) {
    console.error('Error calculando estadísticas de pedidos:', err);
    return {
      totalPedidos: 0,
      pendientes: 0,
      entregados: 0,
      totalFacturado: 0,
      totalAcademia: 0,
      totalTienda: 0,
    };
  }
}

/**
 * Actualizar el estado de un pedido o matrícula en Supabase
 */
export async function actualizarEstadoPedido(
  pedidoId: string,
  nuevoEstado: 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: pedExistente } = await supabase
      .from('pedidos')
      .select('id')
      .eq('id', pedidoId)
      .maybeSingle();

    if (pedExistente) {
      const { error } = await supabase
        .from('pedidos')
        .update({
          estado: nuevoEstado,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', pedidoId);

      if (error) throw new Error(error.message);
    } else {
      // Si es una matrícula
      const { data: matExistente } = await supabase
        .from('matriculas')
        .select('id')
        .eq('id', pedidoId)
        .maybeSingle();

      if (matExistente) {
        const estadoMat = nuevoEstado === 'CANCELADO' ? 'RETIRADO' : 'EN_CURSO';
        await supabase
          .from('matriculas')
          .update({ estado: estadoMat })
          .eq('id', pedidoId);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
      window.dispatchEvent(new Event('galindo_matricula_registrada'));
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error al actualizar pedido:', err);
    return { ok: false, error: err.message || 'Error al cambiar estado del pedido.' };
  }
}

/**
 * Anular venta formalmente con reposición de inventario (Kardex) y auditoría
 */
export async function anularPedidoConKardex(
  pedidoId: string,
  responsable: string,
  motivo: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Obtener pedido y sus ítems
    const { data: pedido, error: pedErr } = await supabase
      .from('pedidos')
      .select('id, codigo_pedido, total, notas, sede_id, ciudad, estado, metodo_pago')
      .eq('id', pedidoId)
      .maybeSingle();

    if (pedErr || !pedido) {
      // ¿Es una matrícula de Academia?
      const { data: mat } = await supabase
        .from('matriculas')
        .select('id, codigo_matricula, estado')
        .eq('id', pedidoId)
        .maybeSingle();

      if (mat) {
        return await retirarMatricula(mat.id, motivo, responsable);
      }
      throw new Error('Pedido o matrícula no encontrado en la base de datos.');
    }

    if (pedido.estado === 'CANCELADO') throw new Error('Este pedido ya se encuentra anulado.');

    const { data: items } = await supabase
      .from('pedido_items')
      .select('*')
      .eq('pedido_id', pedidoId);

    const esHuancayo = (pedido.sede_id || (pedido as any).sede || pedido.ciudad || pedido.notas || '').toLowerCase().includes('huancayo');
    const sedeDestino: 'huancayo' | 'ica' = esHuancayo ? 'huancayo' : 'ica';

    // 2. Reingresar stock al Kardex por cada producto devuelto
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.producto_id && !String(item.producto_id).startsWith('mock-')) {
          const { data: prod } = await supabase
            .from('productos')
            .select('id, stock, stock_ica, stock_huancayo')
            .eq('id', item.producto_id)
            .single();

          if (prod) {
            const stockPrev = esHuancayo
              ? Number(prod.stock_huancayo ?? prod.stock ?? 0)
              : Number(prod.stock_ica ?? prod.stock ?? 0);
            const cant = Number(item.cantidad || 1);
            const nuevoStock = stockPrev + cant;

            // Restaurar stock en el producto de la sede
            if (esHuancayo) {
              await supabase.from('productos').update({ stock_huancayo: nuevoStock }).eq('id', item.producto_id);
            } else {
              await supabase.from('productos').update({ stock_ica: nuevoStock }).eq('id', item.producto_id);
            }

            // Registrar movimiento de entrada en Kardex
            await supabase.from('movimientos_inventario').insert({
              producto_id: item.producto_id,
              tipo: 'ENTRADA',
              cantidad: cant,
              stock_anterior: stockPrev,
              stock_nuevo: nuevoStock,
              sede: sedeDestino,
              motivo: `Devolución por Anulación de Ticket #${pedido.codigo_pedido} (Autorizado por: ${responsable} - Motivo: ${motivo})`,
              usuario_nombre: responsable,
              referencia_id: pedido.codigo_pedido,
            });
          }
        }
      }
    }

    // 3. Registrar egreso / reversión en caja chica si hay caja abierta
    try {
      const { data: cajasAbiertas } = await supabase
        .from('cajas_chicas')
        .select('id, sede')
        .eq('estado', 'ABIERTA');

      const cajaSede = (cajasAbiertas || []).find((c: any) => matchSede(c.sede, sedeDestino));
      if (cajaSede) {
        await supabase.from('movimientos_caja').insert({
          caja_id: cajaSede.id,
          tipo: 'EGRESO',
          monto: Number(pedido.total || 0),
          metodo_pago: pedido.metodo_pago || 'EFECTIVO',
          concepto: `Anulación de Ticket #${pedido.codigo_pedido} (Por: ${responsable} - Motivo: ${motivo})`,
          referencia_id: pedido.codigo_pedido,
          usuario_nombre: responsable,
          fecha: new Date().toISOString(),
        });
      }
    } catch {
      // Ignorar si caja chica no está abierta
    }

    // 4. Cambiar estado a CANCELADO y registrar constancia de auditoría en notas
    const fechaHora = new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const notaAuditoria = `\n[ANULADA el ${fechaHora} por ${responsable}. Motivo: ${motivo}]`;
    const notasActualizadas = ((pedido.notas || '') + notaAuditoria).trim();

    const { error: updErr } = await supabase
      .from('pedidos')
      .update({
        estado: 'CANCELADO',
        notas: notasActualizadas,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', pedidoId);

    if (updErr) throw updErr;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error al anular venta con kardex:', err);
    return { ok: false, error: err.message || 'Error al anular la venta.' };
  }
}

/**
 * Editar datos básicos de un pedido o venta (cliente, teléfono, DNI, método de pago, notas)
 */
export async function editarPedidoAdmin(
  pedidoId: string,
  datos: {
    cliente_nombre?: string;
    cliente_dni?: string;
    cliente_telefono?: string;
    metodo_pago?: string;
    notas?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Verificar si el registro existe en 'pedidos'
    const { data: pedidoExistente } = await supabase
      .from('pedidos')
      .select('id')
      .eq('id', pedidoId)
      .maybeSingle();

    if (pedidoExistente) {
      const payload: Record<string, any> = {
        actualizado_en: new Date().toISOString(),
      };
      if (datos.cliente_nombre !== undefined) payload.cliente_nombre = datos.cliente_nombre.trim();
      if (datos.cliente_dni !== undefined) payload.cliente_dni = datos.cliente_dni.trim();
      if (datos.cliente_telefono !== undefined) payload.cliente_telefono = datos.cliente_telefono.trim();
      if (datos.metodo_pago !== undefined) payload.metodo_pago = datos.metodo_pago;
      if (datos.notas !== undefined) payload.notas = datos.notas;

      const { error } = await supabase
        .from('pedidos')
        .update(payload)
        .eq('id', pedidoId);

      if (error) throw error;
    } else {
      // 2. Si no es un pedido común, verificar si es una Matrícula de Academia
      const { data: matExistente } = await supabase
        .from('matriculas')
        .select('id, alumno_id, notas')
        .eq('id', pedidoId)
        .maybeSingle();

      if (matExistente) {
        if (datos.metodo_pago) {
          await actualizarMetodoPagoMatricula(matExistente.id, datos.metodo_pago);
        }
        if (datos.notas !== undefined) {
          await supabase
            .from('matriculas')
            .update({ notas: datos.notas })
            .eq('id', matExistente.id);
        }
        // Si editaron nombre o celular del alumno
        if (matExistente.alumno_id && (datos.cliente_nombre || datos.cliente_dni || datos.cliente_telefono)) {
          const alumnoUpdate: Record<string, any> = {};
          if (datos.cliente_nombre) {
            const partes = datos.cliente_nombre.trim().split(' ');
            alumnoUpdate.nombres = partes[0] || datos.cliente_nombre;
            alumnoUpdate.apellidos = partes.slice(1).join(' ') || '';
          }
          if (datos.cliente_dni) alumnoUpdate.dni = datos.cliente_dni.trim();
          if (datos.cliente_telefono) alumnoUpdate.celular = datos.cliente_telefono.trim();

          await supabase.from('alumnos').update(alumnoUpdate).eq('id', matExistente.alumno_id);
        }
      } else {
        // 3. Verificar si es una Cuota de Matrícula
        const { data: cuotaExistente } = await supabase
          .from('cuotas_matricula')
          .select('id, matricula_id')
          .eq('id', pedidoId)
          .maybeSingle();

        if (cuotaExistente && datos.metodo_pago) {
          await actualizarMetodoPagoCuota(cuotaExistente.id, datos.metodo_pago);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
      window.dispatchEvent(new Event('galindo_matricula_registrada'));
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error al editar venta:', err);
    return { ok: false, error: err.message || 'Error al guardar cambios de la venta.' };
  }
}

/**
 * Eliminar un pedido definitivamente
 */
export async function eliminarPedido(pedidoId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Eliminar ítems asociados
    await supabase.from('pedido_items').delete().eq('pedido_id', pedidoId);

    // 2. Eliminar pedido
    const { error } = await supabase.from('pedidos').delete().eq('id', pedidoId);

    if (error) throw new Error(error.message);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error al eliminar pedido:', err);
    return { ok: false, error: err.message || 'Error al eliminar pedido.' };
  }
}

// =========================================================================
// GENERADOR DINÁMICO DE PLANTILLAS DE WHATSAPP CONTEXTUALES
// =========================================================================

export type TipoPlantillaWhatsApp =
  | 'ENTREGADO'
  | 'RECIBIDO'
  | 'LISTO'
  | 'ACADEMIA'
  | 'COMPROBANTE';

export interface OpcionesMensajeWhatsApp {
  turno?: string;
  fechaInicio?: string;
  sedeNombre?: string;
  direccionSede?: string;
  horarioSede?: string;
  notasAdicionales?: string;
  codigoMatricula?: string;
  cursoNombre?: string;
}

/**
 * Genera un mensaje de WhatsApp dinámico, enriquecido y profesional
 * según el estado del pedido, los productos adquiridos o la matrícula.
 */
export function generarMensajeWhatsApp(
  pedido: PedidoCompleto,
  plantilla: TipoPlantillaWhatsApp,
  opciones?: OpcionesMensajeWhatsApp
): string {
  const sedeKey: SedeId = (pedido.sede_nombre || '').toLowerCase().includes('huancayo') ? 'huancayo' : 'ica';
  const sede = SEDES[sedeKey] || SEDES.ica;
  const sedeNombre = opciones?.sedeNombre || pedido.sede_nombre || sede.nombre;
  const sedeDireccion = opciones?.direccionSede || sede.direccion;
  const sedeHorario = opciones?.horarioSede || sede.horario;

  // Lista formateada de productos / conceptos
  const listaItems =
    pedido.items && pedido.items.length > 0
      ? pedido.items
          .map(
            (it) =>
              `• ${it.cantidad}x ${it.nombre_producto} — ${formatCurrency(it.subtotal)} (c/u ${formatCurrency(it.precio_unitario)})`
          )
          .join('\n')
      : `• 1x ${pedido.notas || 'Compra en Galindo Barber'} — ${formatCurrency(pedido.total)}`;

  const totalStr = formatCurrency(pedido.total);
  const subtotalStr = formatCurrency(pedido.subtotal || pedido.total);
  const metodoPago = pedido.metodo_pago || 'Efectivo';

  switch (plantilla) {
    case 'ENTREGADO': {
      const descuentoLinea =
        pedido.descuento && pedido.descuento > 0
          ? `🎟️ *Descuento Aplicado:* -${formatCurrency(pedido.descuento)}\n`
          : '';
      const envioLinea =
        pedido.metodo_entrega === 'DELIVERY_ICA'
          ? `🛵 *Modalidad:* Envío a Domicilio (${pedido.ciudad || 'Ica'})\n`
          : `📍 *Punto de Entrega:* ${sedeNombre} (${sedeDireccion})\n`;

      return (
`✨ *CONSTANCIA DE ENTREGA / DESPACHO* ✨
*Galindo Barber Supply & Academy*
-----------------------------------------
👤 *Cliente:* ${pedido.cliente_nombre}
🏷️ *Código de Pedido:* ${pedido.codigo_pedido}
${envioLinea}
📦 *DETALLE DE PRODUCTOS ENTREGADOS:*
${listaItems}
-----------------------------------------
💵 *Subtotal:* ${subtotalStr}
${descuentoLinea}💰 *TOTAL PAGADO:* ${totalStr}
💳 *Método de Pago:* ${metodoPago} (Cancelado y Conforme)
✅ *Estado Operativo:* ENTREGADO CON ÉXITO

🤝 *¡Muchas gracias por tu compra en Galindo Barber!*
Tus máquinas y suministros cuentan con respaldo oficial y garantía. Ante cualquier consulta de uso o asistencia técnica, escríbenos por este mismo medio.`
      ).trim();
    }

    case 'RECIBIDO': {
      return (
`👋 Hola *${pedido.cliente_nombre}*, te saludamos cordialmente de *Galindo Barber Supply*.

Hemos recibido tu pedido con el código *${pedido.codigo_pedido}*.

📦 *PRODUCTOS SOLICITADOS:*
${listaItems}
-----------------------------------------
💰 *TOTAL:* ${totalStr}
💳 *Método de Pago:* ${metodoPago}
📍 *Sede de Despacho:* ${sedeNombre}

⏳ *Estado:* En preparación en nuestro almacén.
Te avisaremos de inmediato apenas tus productos estén empaquetados y listos para entrega o retiro. ¡Muchas gracias por tu preferencia!`
      ).trim();
    }

    case 'LISTO': {
      return (
`🚀 *¡TU PEDIDO YA ESTÁ LISTO PARA ENTREGA!*
Hola *${pedido.cliente_nombre}*, tu pedido *${pedido.codigo_pedido}* ya se encuentra empaquetado y listo para ser retirado.

📍 *Punto de Recojo:* ${sedeNombre}
🏢 *Dirección:* ${sedeDireccion}
⏰ *Horario de Atención:* ${sedeHorario}
💰 *Total:* ${totalStr} (${metodoPago})

📋 *Indicación:* Al apersonarte al local, solo necesitas indicar tu nombre o mostrar este mensaje con el código *${pedido.codigo_pedido}*. ¡Te esperamos!`
      ).trim();
    }

    case 'ACADEMIA': {
      const itemCurso = pedido.items.find(
        (it) =>
          it.es_matricula ||
          it.nombre_producto.toLowerCase().includes('matrícula') ||
          it.nombre_producto.toLowerCase().includes('barber')
      );
      const cursoNombre = opciones?.cursoNombre || itemCurso?.nombre_producto || 'Curso de Barbería Profesional';
      const turnoTexto = opciones?.turno || 'Turno Regular (Coordinado)';
      const fechaTexto = opciones?.fechaInicio ? `🗓️ *Inicio de Clases:* ${opciones.fechaInicio}\n` : '';
      const matriculaLinea = opciones?.codigoMatricula ? `🎫 *N° de Matrícula Oficial:* ${opciones.codigoMatricula}\n` : '';

      return (
`🎓 *¡BIENVENIDO(A) A GALINDO BARBER ACADEMY!*
Hola *${pedido.cliente_nombre}*, nos alegra darte la bienvenida a nuestra academia. Felicitaciones por dar el paso para formarte con los mejores barberos profesionales de la región.

📋 *DATOS DE TU MATRÍCULA:*
${matriculaLinea}📚 *Curso:* ${cursoNombre}
🏫 *Sede:* ${sedeNombre} (${sedeDireccion})
⏰ *Horario / Turno:* ${turnoTexto}
${fechaTexto}💵 *Monto Abonado:* ${totalStr}
💳 *Método de Pago:* ${metodoPago}

📍 *Recordatorio:* Recuerda asistir con tu DNI físico y libreta de apuntes en tu primera sesión. ¡Nos vemos en clases para iniciar tu formación de élite!`
      ).trim();
    }

    case 'COMPROBANTE': {
      return (
`👋 Hola *${pedido.cliente_nombre}*, te saludamos del equipo de *Galindo Barber*.

Registramos tu pedido *${pedido.codigo_pedido}* por un importe de *${totalStr}*.

💳 *Método Seleccionado:* ${metodoPago}

Para validar tu compra y proceder con el despacho inmediato, por favor envíanos la captura de tu comprobante o voucher por este medio.

📲 *Cuentas Oficiales:*
• Yape / Plin: ${BUSINESS_INFO.yapeNumber} (${BUSINESS_INFO.yapeHolder})
• BCP Soles: ${BUSINESS_INFO.bcpAccountFormatted}
• BCP CCI: ${BUSINESS_INFO.bcpCci}
• Titular: ${BUSINESS_INFO.bcpHolder}

Apenas confirmemos tu voucher, procesaremos tu despacho inmediatamente. ¡Muchas gracias!`
      ).trim();
    }

    default:
      return `Hola ${pedido.cliente_nombre}, te saludamos de Galindo Barber sobre tu pedido ${pedido.codigo_pedido}.`;
  }
}

// =========================================================================
// SERVICIOS DE VINCULACIÓN CON ALUMNOS & MATRÍCULAS
// =========================================================================

/**
 * Busca si un cliente de un pedido ya está registrado en la tabla de alumnos
 */
export async function buscarAlumnoExistente(dni?: string, telefono?: string): Promise<Alumno | null> {
  try {
    if (dni && dni.trim().length >= 7) {
      const { data } = await supabase
        .from('alumnos')
        .select('*')
        .eq('dni', dni.trim())
        .maybeSingle();
      if (data) return data as Alumno;
    }

    if (telefono && telefono.trim().length >= 8) {
      const cleanPhone = telefono.replace(/\D/g, '');
      const numOnly = cleanPhone.startsWith('51') ? cleanPhone.slice(2) : cleanPhone;

      const { data } = await supabase
        .from('alumnos')
        .select('*')
        .or(`celular.eq.${cleanPhone},celular.eq.${numOnly},celular.eq.51${numOnly}`)
        .maybeSingle();
      if (data) return data as Alumno;
    }
  } catch (err) {
    console.warn('Error buscando alumno existente:', err);
  }
  return null;
}

/**
 * Busca si un alumno ya cuenta con una matrícula registrada
 */
export async function buscarMatriculaExistente(alumnoId: string): Promise<Matricula | null> {
  try {
    const { data } = await supabase
      .from('matriculas')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('creado_en', { ascending: false })
      .maybeSingle();
    return (data as Matricula) || null;
  } catch (err) {
    console.warn('Error buscando matrícula existente:', err);
    return null;
  }
}

export interface FormalizarMatriculaInput {
  pedidoId: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string;
  fecha_nacimiento?: string;
  email?: string;
  direccion?: string;
  distrito?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  curso_id: string;
  curso_nombre: string;
  sede: string;
  turno: 'MANANA' | 'TARDE' | 'NOCHE' | 'SABATINO';
  fecha_inicio?: string;
  monto_matricula_pagado: number;
  total_curso: number;
  numero_cuotas: number;
  monto_por_cuota: number;
  metodo_pago: string;
  kit_entregado?: boolean;
  notas?: string;
}

/**
 * Formaliza la matrícula en la academia a partir de un pedido web / mostrador
 */
export async function formalizarMatriculaDesdePedido(
  input: FormalizarMatriculaInput
): Promise<{ ok: boolean; codigoMatricula?: string; alumnoId?: string; error?: string }> {
  try {
    // 1. Usar el servicio oficial de academia para registrar o actualizar el alumno y su matrícula
    const res = await crearMatriculaCompleta({
      dni: input.dni.trim(),
      nombres: input.nombres.trim(),
      apellidos: input.apellidos.trim(),
      celular: input.celular.trim(),
      email: input.email?.trim() || undefined,
      direccion: input.direccion?.trim() || undefined,
      distrito: input.distrito?.trim() || 'Ica',
      contacto_emergencia_nombre: input.contacto_emergencia_nombre?.trim() || undefined,
      contacto_emergencia_telefono: input.contacto_emergencia_telefono?.trim() || undefined,
      curso_id: input.curso_id,
      curso_nombre: input.curso_nombre,
      sede: input.sede,
      turno: input.turno,
      fecha_inicio: input.fecha_inicio || new Date().toISOString().split('T')[0],
      monto_matricula_pagado: input.monto_matricula_pagado,
      total_curso: input.total_curso,
      numero_cuotas: input.numero_cuotas,
      monto_por_cuota: input.monto_por_cuota,
      metodo_pago: input.metodo_pago,
      kit_entregado: Boolean(input.kit_entregado),
      notas: input.notas,
      registrar_en_caja: true,
    });

    if (!res.ok || !res.matricula) {
      return { ok: false, error: res.error || 'Error al registrar la matrícula oficial.' };
    }

    const codigoMat = res.matricula.codigo_matricula;
    const alumnoId = res.matricula.alumno_id;

    // 2. Si se proporcionó fecha de nacimiento, actualizarla en el alumno
    if (input.fecha_nacimiento && alumnoId) {
      await supabase
        .from('alumnos')
        .update({ fecha_nacimiento: input.fecha_nacimiento })
        .eq('id', alumnoId);
    }

    // 3. Actualizar el pedido asociado: marcar como alumno, guardar DNI y anotar código de matrícula
    if (input.pedidoId) {
      const notaMatricula = `[Matrícula formalizada: ${codigoMat} - Sede: ${input.sede} - Turno: ${input.turno}]`;
      const { data: pedActual } = await supabase
        .from('pedidos')
        .select('notas')
        .eq('id', input.pedidoId)
        .maybeSingle();

      const notasFinales = pedActual?.notas
        ? `${pedActual.notas}\n${notaMatricula}`
        : notaMatricula;

      await supabase
        .from('pedidos')
        .update({
          es_alumno: true,
          cliente_dni: input.dni.trim(),
          estado: 'PAGADO',
          notas: notasFinales,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', input.pedidoId);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_matricula_creada'));
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
    }

    return { ok: true, codigoMatricula: codigoMat, alumnoId };
  } catch (err: any) {
    console.error('Error en formalizarMatriculaDesdePedido:', err);
    return { ok: false, error: err.message || 'Error al formalizar la matrícula.' };
  }
}
