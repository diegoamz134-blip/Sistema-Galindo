// =========================================================================
// SERVICIO DE GESTIÓN DE PEDIDOS WEB & MOSTRADOR (SISTEMA GALINDO)
// =========================================================================

import { supabase } from '@/lib/supabase';
import { SEDES, SedeId, BUSINESS_INFO } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { crearMatriculaCompleta } from '@/lib/academia-service';
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
  // Datos inferidos
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
function inferirCanalYSede(row: any, items: PedidoItemDetallado[] = []): { canal: 'WEB_TIENDA' | 'ACADEMIA' | 'POS_MOSTRADOR'; sede: string } {
  const codigo = (row.codigo_pedido || '').toUpperCase();
  const notas = (row.notas || '').toLowerCase();
  const ciudad = (row.ciudad || '').toLowerCase();

  // Sede
  let sede = 'Sede Central Ica';
  if (ciudad.includes('huancayo') || notas.includes('huancayo')) {
    sede = SEDES.huancayo.nombre;
  } else if (ciudad.includes('ica') || notas.includes('ica')) {
    sede = SEDES.ica.nombre;
  }

  // Canal
  const tieneMatricula =
    row.es_alumno ||
    items.some((it) =>
      it.nombre_producto.toLowerCase().includes('matrícula') ||
      it.nombre_producto.toLowerCase().includes('matricula') ||
      it.nombre_producto.toLowerCase().includes('barbería integral') ||
      it.nombre_producto.toLowerCase().includes('masterclass')
    );

  let canal: 'WEB_TIENDA' | 'ACADEMIA' | 'POS_MOSTRADOR' = 'WEB_TIENDA';

  if (codigo.startsWith('POS-')) {
    canal = 'POS_MOSTRADOR';
  } else if (tieneMatricula) {
    canal = 'ACADEMIA';
  } else {
    canal = 'WEB_TIENDA';
  }

  return { canal, sede };
}

/**
 * Obtener listado de pedidos con filtros avanzados para el panel administrativo
 */
export async function getPedidosAdmin(filtros?: FiltrosPedidosAdmin): Promise<PedidoCompleto[]> {
  try {
    let query = supabase
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (filtros?.estado && filtros.estado !== 'TODOS') {
      query = query.eq('estado', filtros.estado);
    }

    const { data: pedidosRows, error: pedError } = await query;

    if (pedError || !pedidosRows) {
      console.warn('Error al consultar pedidos:', pedError);
      return [];
    }

    if (pedidosRows.length === 0) return [];

    // Obtener ítems de todos los pedidos consultados
    const pedidoIds = pedidosRows.map((p) => p.id);
    const { data: itemsRows } = await supabase
      .from('pedido_items')
      .select('*')
      .in('pedido_id', pedidoIds);

    const itemsMap: Record<string, PedidoItemDetallado[]> = {};
    if (itemsRows) {
      itemsRows.forEach((item: any) => {
        if (!itemsMap[item.pedido_id]) itemsMap[item.pedido_id] = [];
        const esMatricula =
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
    }

    // Mapear y enriquecer
    let resultado: PedidoCompleto[] = pedidosRows.map((row) => {
      const items = itemsMap[row.id] || [];
      const { canal, sede } = inferirCanalYSede(row, items);

      return {
        id: row.id,
        codigo_pedido: row.codigo_pedido,
        cliente_nombre: row.cliente_nombre || 'Cliente Web',
        cliente_telefono: row.cliente_telefono || '',
        cliente_dni: row.cliente_dni || '',
        ciudad: row.ciudad || '',
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

    // Filtros en memoria para canal, sede y texto de búsqueda
    if (filtros?.canal && filtros.canal !== 'TODOS') {
      resultado = resultado.filter((p) => p.tipo_canal === filtros.canal);
    }

    if (filtros?.sede && filtros.sede !== 'TODAS') {
      resultado = resultado.filter((p) => p.sede_nombre.toLowerCase().includes(filtros.sede!.toLowerCase()));
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
          p.items.some((it) => it.nombre_producto.toLowerCase().includes(q))
      );
    }

    return resultado;
  } catch (err) {
    console.error('Error en getPedidosAdmin:', err);
    return [];
  }
}

/**
 * Obtener métricas y KPIs de pedidos
 */
export async function getEstadisticasPedidos(): Promise<EstadisticasPedidos> {
  try {
    const pedidos = await getPedidosAdmin();
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
 * Actualizar el estado de un pedido en Supabase
 */
export async function actualizarEstadoPedido(
  pedidoId: string,
  nuevoEstado: 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update({
        estado: nuevoEstado,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', pedidoId);

    if (error) throw new Error(error.message);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error al actualizar pedido:', err);
    return { ok: false, error: err.message || 'Error al cambiar estado del pedido.' };
  }
}

/**
 * Eliminar o anular un pedido definitivamente
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
