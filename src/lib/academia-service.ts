// =========================================================================
// SERVICIO DE GESTIÓN ACADÉMICA & MATRÍCULAS (SISTEMA GALINDO)
// Conexión directa a Supabase (PostgreSQL) con fallback seguro
// =========================================================================

import { supabase } from '@/lib/supabase';
import { Alumno, Matricula, CuotaMatricula, Curso, EstadoAcademico, TurnoOption } from '@/types/database';
import { normalizarMetodoPago, extraerNumeroOperacion } from '@/lib/utils';

export interface MatriculaConDetalle extends Matricula {
  alumno: Alumno;
  curso?: Curso;
  cuotas: CuotaMatricula[];
}

export interface EstadisticasAcademia {
  totalAlumnos: number;
  totalRecaudado: number;
  saldoPendiente: number;
  cuotasVencidas: number;
  kitsPendientes: number;
  alumnosAlDia: number;
}

export interface FiltrosMatriculas {
  busqueda?: string;
  sede?: string;
  cursoId?: string;
  estadoCuota?: 'TODOS' | 'AL_DIA' | 'VENCIDA' | 'PAGADA';
  kitEstado?: 'TODOS' | 'ENTREGADO' | 'PENDIENTE';
}

export interface NuevaMatriculaInput {
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string;
  email?: string;
  distrito?: string;
  direccion?: string;
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
  numero_operacion?: string;
  
  kit_entregado: boolean;
  notas?: string;
  registrar_en_caja?: boolean;
}

export interface RegistrarPagoCuotaInput {
  cuota_id: string;
  matricula_id: string;
  monto: number;
  metodo_pago: string;
  numero_operacion?: string;
  notas?: string;
  registrar_en_caja?: boolean;
}

// -------------------------------------------------------------------------
// 1. Obtener lista de cursos oficiales activos
// -------------------------------------------------------------------------
export const DEFAULT_TURNOS: TurnoOption[] = [
  {
    id: 'MANANA',
    nombre: 'Turno Mañana',
    horario: '9:00 AM — 12:00 PM',
    dias: 'Lunes, Miércoles y Viernes',
    vacantesDisponibles: 4,
  },
  {
    id: 'TARDE',
    nombre: 'Turno Tarde',
    horario: '3:00 PM — 6:00 PM',
    dias: 'Lunes, Miércoles y Viernes',
    vacantesDisponibles: 6,
  },
  {
    id: 'SABATINO',
    nombre: 'Sábados Intensivo',
    horario: '9:00 AM — 2:00 PM',
    dias: 'Todos los Sábados',
    vacantesDisponibles: 2,
  },
];

export function normalizarCurso(raw: any): Curso {
  let turnos: TurnoOption[] = [];
  if (Array.isArray(raw.turnos) && raw.turnos.length > 0) {
    turnos = raw.turnos.map((t: any) => (typeof t === 'string' ? JSON.parse(t) : t));
  } else if (Array.isArray(raw.beneficios) && raw.beneficios.length > 0) {
    try {
      turnos = raw.beneficios.map((t: any) => (typeof t === 'string' ? JSON.parse(t) : t));
    } catch {
      turnos = [];
    }
  }

  if (!turnos || turnos.length === 0) {
    turnos = [...DEFAULT_TURNOS];
  }

  let esDestacado = Boolean(raw.destacado);
  if (typeof window !== 'undefined') {
    const localDestacadoId = localStorage.getItem('galindo_curso_destacado_id');
    if (localDestacadoId && localDestacadoId === raw.id) {
      esDestacado = true;
    }
  }

  return {
    ...raw,
    destacado: esDestacado,
    sede: raw.sede || 'ica',
    turnos,
  };
}

export async function getCursosActivos(sedeId?: string): Promise<Curso[]> {
  try {
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .eq('activo', true)
      .order('titulo', { ascending: true });

    if (!error && data && data.length > 0) {
      const allCursos = (data as any[]).map(normalizarCurso);
      if (sedeId) {
        return allCursos.filter((c) => {
          const s = (c.sede || 'ica').toLowerCase();
          return s === sedeId.toLowerCase() || s === 'ambas' || s === 'todas';
        });
      } else {
        return allCursos;
      }
    }
  } catch (err) {
    console.warn('Error al consultar cursos activos en supabase:', err);
  }

  // Si no hay cursos o hubo un error, retornamos arreglo vacío
  return [];
}

// -------------------------------------------------------------------------
// 2. Obtener todas las matrículas con alumnos y cuotas
// -------------------------------------------------------------------------
export async function getMatriculasConDetalle(
  filtros?: FiltrosMatriculas
): Promise<MatriculaConDetalle[]> {
  try {
    // A. Consultar matrículas
    let query = supabase
      .from('matriculas')
      .select('*')
      .order('creado_en', { ascending: false });

    if (filtros?.sede && filtros.sede !== 'TODAS') {
      query = query.eq('sede', filtros.sede);
    }

    const { data: matriculasData, error: matError } = await query;

    if (matError) {
      console.warn('Error consultando matriculas en Supabase:', matError);
      return [];
    }

    if (!matriculasData || matriculasData.length === 0) {
      return [];
    }

    // B. Consultar alumnos asociados
    const alumnoIds = Array.from(new Set(matriculasData.map((m) => m.alumno_id).filter(Boolean)));
    let alumnosMap: Record<string, Alumno> = {};

    if (alumnoIds.length > 0) {
      const { data: alumnosData } = await supabase
        .from('alumnos')
        .select('*')
        .in('id', alumnoIds);

      if (alumnosData) {
        alumnosData.forEach((a) => {
          alumnosMap[a.id] = a;
        });
      }
    }

    // C. Consultar cuotas asociadas
    const matriculaIds = matriculasData.map((m) => m.id);
    let cuotasMap: Record<string, CuotaMatricula[]> = {};

    if (matriculaIds.length > 0) {
      const { data: cuotasData } = await supabase
        .from('cuotas_matricula')
        .select('*')
        .in('matricula_id', matriculaIds)
        .order('numero_cuota', { ascending: true });

      if (cuotasData) {
        cuotasData.forEach((c) => {
          if (!cuotasMap[c.matricula_id]) {
            cuotasMap[c.matricula_id] = [];
          }
          cuotasMap[c.matricula_id].push(c);
        });
      }
    }

    // D. Unificar datos completos
    const resultado: MatriculaConDetalle[] = matriculasData.map((m) => {
      const alumno = alumnosMap[m.alumno_id] || {
        id: m.alumno_id || `temp-${m.id}`,
        dni: '00000000',
        nombres: 'Estudiante',
        apellidos: 'Galindo',
        celular: '999999999',
        distrito: 'Ica',
        creado_en: m.creado_en,
      };

      const cuotas = cuotasMap[m.id] || [];

      // Verificar y actualizar dinámicamente si una cuota está vencida por fecha
      const hoy = new Date().toISOString().split('T')[0];
      const cuotasActualizadas = cuotas.map((c) => {
        if (c.estado === 'PENDIENTE' && c.fecha_vencimiento < hoy) {
          return { ...c, estado: 'VENCIDA' as const };
        }
        return c;
      });

      const metodoPago = normalizarMetodoPago(m.metodo_pago, m.notas);
      const numeroOperacion = m.numero_operacion || extraerNumeroOperacion(undefined, m.notas);

      return {
        ...m,
        metodo_pago: metodoPago,
        numero_operacion: numeroOperacion,
        alumno,
        cuotas: cuotasActualizadas,
        curso: {
          id: m.curso_id || 'c01',
          titulo: m.curso_nombre || 'Barbería Profesional',
          slug: 'barberia-profesional',
          descripcion_corta: '',
          duracion_semanas: 12,
          horas_academicas: 96,
          costo_matricula: m.monto_matricula_pagado,
          costo_mensualidad: 250,
          costo_total_contado: m.total_curso,
          incluye_kit: true,
          imagen_url: '/logo.jpg',
          activo: true,
        },
      };
    });

    return aplicarFiltrosEnMemoria(resultado, filtros);
  } catch (err) {
    console.error('Error cargando matrículas de Supabase:', err);
    return [];
  }
}

// -------------------------------------------------------------------------
// 2.5 Comparador flexible de sedes (Ica vs Huancayo)
// -------------------------------------------------------------------------
export function matchSede(sedeMatricula?: string | null, sedeTarget?: string | null): boolean {
  if (!sedeTarget || sedeTarget === 'TODAS' || sedeTarget === 'todas') return true;
  if (!sedeMatricula) return false;

  const target = sedeTarget.toLowerCase().trim();
  const current = sedeMatricula.toLowerCase().trim();

  if (target.includes('ica')) {
    return current.includes('ica');
  }
  if (target.includes('huancayo')) {
    return current.includes('huancayo');
  }
  return current === target;
}

// -------------------------------------------------------------------------
// 3. Aplicar filtros en memoria
// -------------------------------------------------------------------------
function aplicarFiltrosEnMemoria(
  lista: MatriculaConDetalle[],
  filtros?: FiltrosMatriculas
): MatriculaConDetalle[] {
  if (!filtros) return lista;

  return lista.filter((m) => {
    // Filtro por sede
    if (filtros.sede && filtros.sede !== 'TODAS') {
      if (!matchSede(m.sede, filtros.sede)) return false;
    }

    // Filtro por búsqueda de texto
    if (filtros.busqueda) {
      const term = filtros.busqueda.toLowerCase().trim();
      const nombreCompleto = `${m.alumno?.nombres} ${m.alumno?.apellidos}`.toLowerCase();
      const dni = m.alumno?.dni || '';
      const codigo = m.codigo_matricula?.toLowerCase() || '';
      const celular = m.alumno?.celular || '';

      const coincide =
        nombreCompleto.includes(term) ||
        dni.includes(term) ||
        codigo.includes(term) ||
        celular.includes(term);

      if (!coincide) return false;
    }

    // Filtro por curso
    if (filtros.cursoId && filtros.cursoId !== 'TODOS') {
      if (m.curso_id !== filtros.cursoId && m.curso?.titulo !== filtros.cursoId) {
        return false;
      }
    }

    // Filtro por estado del kit
    if (filtros.kitEstado && filtros.kitEstado !== 'TODOS') {
      const esEntregado = filtros.kitEstado === 'ENTREGADO';
      if (m.kit_entregado !== esEntregado) return false;
    }

    // Filtro por estado de cuotas
    if (filtros.estadoCuota && filtros.estadoCuota !== 'TODOS') {
      const tieneVencida = m.cuotas.some((c) => c.estado === 'VENCIDA');
      const saldoCero = Number(m.saldo_pendiente) <= 0;

      if (filtros.estadoCuota === 'VENCIDA' && !tieneVencida) return false;
      if (filtros.estadoCuota === 'PAGADA' && !saldoCero) return false;
      if (filtros.estadoCuota === 'AL_DIA' && (tieneVencida || saldoCero)) return false;
    }

    return true;
  });
}

// -------------------------------------------------------------------------
// 4. Calcular KPIs y estadísticas financieras de Academia
// -------------------------------------------------------------------------
export function calcularEstadisticas(matriculas: MatriculaConDetalle[]): EstadisticasAcademia {
  let totalRecaudado = 0;
  let saldoPendiente = 0;
  let cuotasVencidas = 0;
  let kitsPendientes = 0;
  let alumnosAlDia = 0;

  matriculas.forEach((m) => {
    const pagadoMatricula = Number(m.monto_matricula_pagado) || 0;
    const cuotasPagadas = (m.cuotas || [])
      .filter((c) => c.estado === 'PAGADA')
      .reduce((acc, c) => acc + (Number(c.monto) || 0), 0);

    totalRecaudado += pagadoMatricula + cuotasPagadas;
    saldoPendiente += Math.max(0, Number(m.saldo_pendiente) || 0);

    if (!m.kit_entregado) {
      kitsPendientes += 1;
    }

    const tieneVencida = (m.cuotas || []).some((c) => c.estado === 'VENCIDA');
    if (tieneVencida) {
      cuotasVencidas += 1;
    } else {
      alumnosAlDia += 1;
    }
  });

  return {
    totalAlumnos: matriculas.length,
    totalRecaudado,
    saldoPendiente,
    cuotasVencidas,
    kitsPendientes,
    alumnosAlDia,
  };
}

// -------------------------------------------------------------------------
// 5. Registrar una nueva matrícula completa en Supabase
// -------------------------------------------------------------------------
export async function crearMatriculaCompleta(
  input: NuevaMatriculaInput
): Promise<{ ok: boolean; matricula?: MatriculaConDetalle; error?: string }> {
  try {
    // A. Insertar o actualizar Alumno
    let alumnoId: string;

    // 1. Buscar por DNI exacto
    const { data: porDni } = await supabase
      .from('alumnos')
      .select('id, dni')
      .eq('dni', input.dni)
      .maybeSingle();

    let alumnoEncontrado = porDni;

    // 2. Si no se encontró por DNI pero viene un celular, buscar si había un registro provisional con DNI temporal
    if (!alumnoEncontrado && input.celular) {
      const cleanPhone = input.celular.replace(/\D/g, '');
      const numOnly = cleanPhone.startsWith('51') ? cleanPhone.slice(2) : cleanPhone;
      const { data: porCel } = await supabase
        .from('alumnos')
        .select('id, dni')
        .or(`celular.eq.${cleanPhone},celular.eq.${numOnly},celular.eq.51${numOnly}`)
        .maybeSingle();

      if (porCel && (porCel.dni?.startsWith('DNI-') || porCel.dni === '00000000')) {
        alumnoEncontrado = porCel;
      }
    }

    if (alumnoEncontrado) {
      alumnoId = alumnoEncontrado.id;
      // Actualizar datos de contacto y formalizar con el DNI real
      await supabase
        .from('alumnos')
        .update({
          dni: input.dni,
          nombres: input.nombres,
          apellidos: input.apellidos,
          celular: input.celular,
          email: input.email || null,
          distrito: input.distrito || 'Ica Centro',
          direccion: input.direccion || null,
          contacto_emergencia_nombre: input.contacto_emergencia_nombre || null,
          contacto_emergencia_telefono: input.contacto_emergencia_telefono || null,
        })
        .eq('id', alumnoId);
    } else {
      const { data: nuevoAlumno, error: errAlumno } = await supabase
        .from('alumnos')
        .insert({
          dni: input.dni,
          nombres: input.nombres,
          apellidos: input.apellidos,
          celular: input.celular,
          email: input.email || null,
          distrito: input.distrito || 'Ica Centro',
          direccion: input.direccion || null,
          contacto_emergencia_nombre: input.contacto_emergencia_nombre || null,
          contacto_emergencia_telefono: input.contacto_emergencia_telefono || null,
        })
        .select()
        .single();

      if (errAlumno || !nuevoAlumno) {
        throw new Error(errAlumno?.message || 'Error registrando datos del alumno');
      }
      alumnoId = nuevoAlumno.id;
    }

    // B. Código Correlativo
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const codigoMatriculaGenerado = `MAT-2026-${randomSuffix}`;

    // C. Calcular saldo y registrar o actualizar Matrícula
    const totalCursoReal = Math.max(0, Number(input.total_curso) || 0) || (input.numero_cuotas === 0 ? (Number(input.monto_matricula_pagado) || 0) : 750);
    const montoMatriculaReal = Math.max(0, Number(input.monto_matricula_pagado) || 0);
    // La matrícula es un derecho de inscripción independiente que NO se descuenta de las mensualidades
    const saldoInicial = input.numero_cuotas === 0
      ? 0
      : totalCursoReal;

    // Buscar si ya existía una matrícula provisional para este alumno
    const { data: matExistente } = await supabase
      .from('matriculas')
      .select('id, codigo_matricula')
      .eq('alumno_id', alumnoId)
      .maybeSingle();

    let nuevaMatricula;
    const codigoMatricula = matExistente?.codigo_matricula || codigoMatriculaGenerado;

    // Construir notas con tag de método de pago y n° operación para compatibilidad total
    const metodoNormalizado = normalizarMetodoPago(input.metodo_pago, input.notas);
    let notasLimpias = (input.notas || '')
      .replace(/\[METODO(?:_PAGO)?:\s*[^\]]+\]/gi, '')
      .replace(/\[(?:OP|OPERACION|NUM_OPERACION):\s*[^\]]+\]/gi, '')
      .trim();

    const tagMetodo = `[METODO: ${metodoNormalizado}]`;
    const tagOp = input.numero_operacion?.trim() ? ` [OP: ${input.numero_operacion.trim()}]` : '';
    const notasFinales = `${notasLimpias}${notasLimpias ? ' • ' : ''}${tagMetodo}${tagOp}`.trim();

    const basePayload: Record<string, any> = {
      codigo_matricula: codigoMatricula,
      curso_id: input.curso_id,
      curso_nombre: input.curso_nombre,
      sede: input.sede,
      turno: input.turno,
      fecha_matricula: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()),
      fecha_inicio: input.fecha_inicio || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()),
      estado: 'EN_CURSO',
      monto_matricula_pagado: montoMatriculaReal,
      total_curso: totalCursoReal,
      saldo_pendiente: saldoInicial,
      kit_entregado: false,
      fecha_entrega_kit: null,
      notas: notasFinales || null,
    };

    const payloadConColumnas: Record<string, any> = {
      ...basePayload,
      metodo_pago: metodoNormalizado,
      numero_operacion: input.numero_operacion?.trim() || null,
    };

    if (matExistente) {
      // Limpiar cuotas previas si las hubiera antes de regenerar
      await supabase.from('cuotas_matricula').delete().eq('matricula_id', matExistente.id);

      let matActualizada: any;
      const { data: resAct, error: errAct } = await supabase
        .from('matriculas')
        .update(payloadConColumnas)
        .eq('id', matExistente.id)
        .select()
        .single();

      if (errAct) {
        // Fallback en caso de que las columnas metodo_pago/numero_operacion aún no existan en Supabase
        const { data: resFallback, error: errFallback } = await supabase
          .from('matriculas')
          .update(basePayload)
          .eq('id', matExistente.id)
          .select()
          .single();

        if (errFallback || !resFallback) {
          throw new Error(errFallback?.message || errAct.message || 'Error al actualizar registro de matrícula');
        }
        matActualizada = resFallback;
      } else {
        matActualizada = resAct;
      }
      nuevaMatricula = matActualizada;
    } else {
      let matCreada: any;
      const { data: resIns, error: errMat } = await supabase
        .from('matriculas')
        .insert(payloadConColumnas)
        .select()
        .single();

      if (errMat) {
        // Fallback en caso de que las columnas metodo_pago/numero_operacion aún no existan en Supabase
        const { data: resFallback, error: errFallback } = await supabase
          .from('matriculas')
          .insert(basePayload)
          .select()
          .single();

        if (errFallback || !resFallback) {
          throw new Error(errFallback?.message || errMat.message || 'Error al crear registro de matrícula');
        }
        matCreada = resFallback;
      } else {
        matCreada = resIns;
      }
      nuevaMatricula = matCreada;
    }

    // D. Generar Cronograma de Cuotas
    const cuotasGeneradas: CuotaMatricula[] = [];
    if (input.numero_cuotas > 0 && saldoInicial > 0) {
      const cuotasParaInsertar = [];
      const fechaBase = new Date();
      const cuotaIndividual = input.monto_por_cuota > 0
        ? input.monto_por_cuota
        : Math.round((totalCursoReal / input.numero_cuotas) * 10) / 10;

      for (let i = 1; i <= input.numero_cuotas; i++) {
        const fechaVence = new Date(fechaBase);
        fechaVence.setDate(fechaVence.getDate() + 30 * i);
        const fechaStr = fechaVence.toISOString().split('T')[0];

        cuotasParaInsertar.push({
          matricula_id: nuevaMatricula.id,
          numero_cuota: i,
          monto: cuotaIndividual,
          fecha_vencimiento: fechaStr,
          estado: 'PENDIENTE',
        });
      }

      const { data: cuotasData } = await supabase
        .from('cuotas_matricula')
        .insert(cuotasParaInsertar)
        .select();

      if (cuotasData) {
        cuotasGeneradas.push(...(cuotasData as CuotaMatricula[]));
      }
    }

    // E. Registrar movimiento en Caja Chica si aplica (por defecto sí para mat. con pago)
    const debeRegistrarCaja = input.registrar_en_caja ?? true;
    if (debeRegistrarCaja && montoMatriculaReal > 0) {
      try {
        await registrarIngresoEnCaja({
          monto: montoMatriculaReal,
          concepto: `Matrícula ${codigoMatricula} - ${input.nombres} ${input.apellidos}`,
          metodo_pago: metodoNormalizado,
          referencia: codigoMatricula,
        });
      } catch (cajaErr) {
        console.warn('No se pudo registrar movimiento en caja:', cajaErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_matricula_registrada'));
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
    }

    const matriculaCompleta: MatriculaConDetalle = {
      ...nuevaMatricula,
      metodo_pago: metodoNormalizado,
      numero_operacion: input.numero_operacion,
      alumno: {
        id: alumnoId,
        dni: input.dni,
        nombres: input.nombres,
        apellidos: input.apellidos,
        celular: input.celular,
        email: input.email,
        distrito: input.distrito || 'Ica Centro',
        direccion: input.direccion,
        contacto_emergencia_nombre: input.contacto_emergencia_nombre,
        contacto_emergencia_telefono: input.contacto_emergencia_telefono,
        creado_en: new Date().toISOString(),
      },
      cuotas: cuotasGeneradas,
    };

    return { ok: true, matricula: matriculaCompleta };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al registrar matrícula';
    console.error('Error en crearMatriculaCompleta:', msg);
    return { ok: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 6. Registrar el cobro de una cuota
// -------------------------------------------------------------------------
export async function pagarCuota(
  input: RegistrarPagoCuotaInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const fechaPago = new Date().toISOString();
    const metodoNormalizado = normalizarMetodoPago(input.metodo_pago);

    // A. Actualizar estado de la cuota en Supabase
    const { error: errCuota } = await supabase
      .from('cuotas_matricula')
      .update({
        estado: 'PAGADA',
        fecha_pago: fechaPago,
        metodo_pago: metodoNormalizado,
        numero_operacion: input.numero_operacion || null,
        notas: input.notas || null,
      })
      .eq('id', input.cuota_id);

    if (errCuota) {
      throw new Error(errCuota.message);
    }

    // B. Actualizar saldo de la matrícula
    const { data: matriculaActual } = await supabase
      .from('matriculas')
      .select('id, saldo_pendiente, total_curso, codigo_matricula, sede, alumno_id')
      .eq('id', input.matricula_id)
      .single();

    let nombreAlumno = 'Alumno';
    if (matriculaActual?.alumno_id) {
      const { data: alData } = await supabase
        .from('alumnos')
        .select('nombres, apellidos')
        .eq('id', matriculaActual.alumno_id)
        .maybeSingle();
      if (alData) {
        nombreAlumno = `${alData.nombres} ${alData.apellidos || ''}`.trim();
      }
    }

    if (matriculaActual) {
      const nuevoSaldo = Math.max(0, Number(matriculaActual.saldo_pendiente) - Number(input.monto));
      await supabase
        .from('matriculas')
        .update({
          saldo_pendiente: nuevoSaldo,
        })
        .eq('id', input.matricula_id);
    }

    // C. Registrar en Caja Chica y Movimientos de Caja (por defecto SIEMPRE true al cobrar cuota)
    const debeRegistrarCaja = input.registrar_en_caja ?? true;
    if (debeRegistrarCaja && Number(input.monto) > 0) {
      try {
        await registrarIngresoEnCaja({
          monto: Number(input.monto),
          concepto: `Pago Cuota ${matriculaActual?.codigo_matricula || ''} - ${nombreAlumno}`,
          metodo_pago: metodoNormalizado,
          referencia: input.numero_operacion || input.cuota_id,
          tipo: 'INGRESO_CUOTA',
        });
      } catch (cajaErr) {
        console.warn('No se pudo registrar pago en caja:', cajaErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_matricula_registrada'));
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
      window.dispatchEvent(new Event('galindo_caja_actualizada'));
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al pagar cuota';
    console.error('Error en pagarCuota:', msg);
    return { ok: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 7. Toggle o actualización de estado de entrega del kit
// -------------------------------------------------------------------------
export async function toggleEntregaKit(
  matriculaId: string,
  entregado: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('matriculas')
      .update({
        kit_entregado: entregado,
        fecha_entrega_kit: entregado ? new Date().toISOString() : null,
      })
      .eq('id', matriculaId);

    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar kit';
    return { ok: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 8. Actualizar estado académico del estudiante
// -------------------------------------------------------------------------
export async function actualizarEstadoAcademico(
  matriculaId: string,
  nuevoEstado: EstadoAcademico
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('matriculas')
      .update({ estado: nuevoEstado })
      .eq('id', matriculaId);

    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al cambiar estado académico';
    return { ok: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 8.5 Actualizar sede física de la matrícula
// -------------------------------------------------------------------------
export async function actualizarSedeMatricula(
  matriculaId: string,
  nuevaSede: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('matriculas')
      .update({ sede: nuevaSede })
      .eq('id', matriculaId);

    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al cambiar sede de matrícula';
    return { ok: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 8.6 Actualizar plan financiero (costo total, contado vs cuotas)
// -------------------------------------------------------------------------
export interface ActualizarPlanFinancieroInput {
  matriculaId: string;
  total_curso: number;
  monto_matricula_pagado: number;
  modalidad: 'CONTADO' | 'CUOTAS';
  numero_cuotas?: number;
  fechas_vencimiento?: string[];
}

export async function actualizarPlanFinancieroMatricula(
  input: ActualizarPlanFinancieroInput
): Promise<{ ok: boolean; error?: string; cuotas?: CuotaMatricula[]; saldo_pendiente?: number }> {
  try {
    const totalCurso = Math.max(0, Number(input.total_curso) || 0);
    const montoMatricula = Math.max(0, Number(input.monto_matricula_pagado) || 0);

    if (input.modalidad === 'CONTADO') {
      // 1. Matrícula liquidada al contado: saldo pendiente es 0
      const { error: errMat } = await supabase
        .from('matriculas')
        .update({
          total_curso: totalCurso,
          monto_matricula_pagado: montoMatricula,
          saldo_pendiente: 0,
        })
        .eq('id', input.matriculaId);

      if (errMat) throw new Error(errMat.message);

      // Eliminar cuotas pendientes (no pagadas) ya que fue liquidado al contado
      await supabase
        .from('cuotas_matricula')
        .delete()
        .eq('matricula_id', input.matriculaId)
        .neq('estado', 'PAGADA');

      const { data: cuotasRestantes } = await supabase
        .from('cuotas_matricula')
        .select('*')
        .eq('matricula_id', input.matriculaId)
        .order('numero_cuota', { ascending: true });

      return {
        ok: true,
        saldo_pendiente: 0,
        cuotas: (cuotasRestantes as CuotaMatricula[]) || [],
      };
    } else {
      // 2. Modalidad en cuotas
      const numCuotas = Math.max(1, input.numero_cuotas || 2);

      // Obtener cuotas ya pagadas si las hubiera
      const { data: cuotasPagadas } = await supabase
        .from('cuotas_matricula')
        .select('*')
        .eq('matricula_id', input.matriculaId)
        .eq('estado', 'PAGADA')
        .order('numero_cuota', { ascending: true });

      const totalPagadoEnCuotas = (cuotasPagadas || []).reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
      // La matrícula es independiente y no se descuenta de las cuotas del curso
      const saldoRestante = Math.max(0, totalCurso - totalPagadoEnCuotas);

      // Actualizar registro de la matrícula con el nuevo saldo
      const { error: errMat } = await supabase
        .from('matriculas')
        .update({
          total_curso: totalCurso,
          monto_matricula_pagado: montoMatricula,
          saldo_pendiente: saldoRestante,
        })
        .eq('id', input.matriculaId);

      if (errMat) throw new Error(errMat.message);

      // Eliminar cuotas pendientes o vencidas no pagadas para regenerar el cronograma
      await supabase
        .from('cuotas_matricula')
        .delete()
        .eq('matricula_id', input.matriculaId)
        .neq('estado', 'PAGADA');

      const cuotasNuevas: any[] = [];
      if (saldoRestante > 0 && numCuotas > 0) {
        const montoPorCuota = Math.round((saldoRestante / numCuotas) * 10) / 10;
        const fechaBase = new Date();
        const startIdx = (cuotasPagadas?.length || 0) + 1;

        for (let i = 0; i < numCuotas; i++) {
          let fechaStr = input.fechas_vencimiento && input.fechas_vencimiento[i];
          if (!fechaStr) {
            const fechaVence = new Date(fechaBase);
            fechaVence.setDate(fechaVence.getDate() + 30 * (i + 1));
            fechaStr = fechaVence.toISOString().split('T')[0];
          }

          cuotasNuevas.push({
            matricula_id: input.matriculaId,
            numero_cuota: startIdx + i,
            monto: montoPorCuota,
            fecha_vencimiento: fechaStr,
            estado: 'PENDIENTE',
          });
        }

        if (cuotasNuevas.length > 0) {
          const { error: errInsert } = await supabase
            .from('cuotas_matricula')
            .insert(cuotasNuevas);

          if (errInsert) {
            console.warn('Error insertando cuotas nuevas:', errInsert);
          }
        }
      }

      // Obtener todas las cuotas actualizadas
      const { data: todasCuotas } = await supabase
        .from('cuotas_matricula')
        .select('*')
        .eq('matricula_id', input.matriculaId)
        .order('numero_cuota', { ascending: true });

      return {
        ok: true,
        saldo_pendiente: saldoRestante,
        cuotas: (todasCuotas as CuotaMatricula[]) || [],
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar plan financiero';
    return { ok: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 8. Actualizar Método de Pago de una Matrícula Inicial
// -------------------------------------------------------------------------
export async function actualizarMetodoPagoMatricula(
  matriculaId: string,
  nuevoMetodoPago: string,
  numeroOperacion?: string
): Promise<{ ok: boolean; error?: string; metodo_pago?: string }> {
  try {
    const metodoNormalizado = normalizarMetodoPago(nuevoMetodoPago);

    // 1. Obtener la matrícula actual para preservar notas previas
    const { data: mat, error: getErr } = await supabase
      .from('matriculas')
      .select('id, notas, monto_matricula_pagado, codigo_matricula')
      .eq('id', matriculaId)
      .maybeSingle();

    if (getErr || !mat) {
      throw new Error('No se encontró el registro de matrícula.');
    }

    // 2. Limpiar tags anteriores de método de notas y agregar el nuevo
    let notasLimpias = (mat.notas || '')
      .replace(/\[METODO(?:_PAGO)?:\s*[^\]]+\]/gi, '')
      .replace(/\[(?:OP|OPERACION|NUM_OPERACION):\s*[^\]]+\]/gi, '')
      .trim();

    const tagMetodo = `[METODO: ${metodoNormalizado}]`;
    const tagOp = numeroOperacion?.trim() ? ` [OP: ${numeroOperacion.trim()}]` : '';
    const notasActualizadas = `${notasLimpias}${notasLimpias ? ' • ' : ''}${tagMetodo}${tagOp}`.trim();

    // 3. Intentar actualizar con columnas metodo_pago y numero_operacion
    const payloadConColumnas: Record<string, any> = {
      notas: notasActualizadas || null,
      metodo_pago: metodoNormalizado,
    };
    if (numeroOperacion !== undefined) {
      payloadConColumnas.numero_operacion = numeroOperacion.trim() || null;
    }

    const { error: errUpdate } = await supabase
      .from('matriculas')
      .update(payloadConColumnas)
      .eq('id', matriculaId);

    // Si falló porque la columna aún no existe en Postgres, actualizamos solo notas
    if (errUpdate) {
      const { error: errSoloNotas } = await supabase
        .from('matriculas')
        .update({ notas: notasActualizadas || null })
        .eq('id', matriculaId);

      if (errSoloNotas) throw errSoloNotas;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_matricula_registrada'));
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
    }

    return { ok: true, metodo_pago: metodoNormalizado };
  } catch (err: any) {
    console.error('Error al actualizar método de pago de matrícula:', err);
    return { ok: false, error: err.message || 'Error al actualizar método de pago.' };
  }
}

// -------------------------------------------------------------------------
// 9. Actualizar Método de Pago de una Cuota Pagada
// -------------------------------------------------------------------------
export async function actualizarMetodoPagoCuota(
  cuotaId: string,
  nuevoMetodoPago: string,
  numeroOperacion?: string
): Promise<{ ok: boolean; error?: string; metodo_pago?: string }> {
  try {
    const metodoNormalizado = normalizarMetodoPago(nuevoMetodoPago);
    const payload: Record<string, any> = {
      metodo_pago: metodoNormalizado,
    };
    if (numeroOperacion !== undefined) {
      payload.numero_operacion = numeroOperacion.trim() || null;
    }

    const { error } = await supabase
      .from('cuotas_matricula')
      .update(payload)
      .eq('id', cuotaId);

    if (error) throw error;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('galindo_matricula_registrada'));
      window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
    }

    return { ok: true, metodo_pago: metodoNormalizado };
  } catch (err: any) {
    console.error('Error al actualizar método de pago de cuota:', err);
    return { ok: false, error: err.message || 'Error al actualizar método de pago de cuota.' };
  }
}

// -------------------------------------------------------------------------
// Helper: Registrar ingreso en caja chica y movimientos de caja
// -------------------------------------------------------------------------
async function registrarIngresoEnCaja(params: {
  monto: number;
  concepto: string;
  metodo_pago: string;
  referencia?: string;
  tipo?: string;
}) {
  const { data: cajaAbierta } = await supabase
    .from('cajas_chicas')
    .select('id, total_ingresos_efectivo, total_ingresos_digital')
    .eq('estado', 'ABIERTA')
    .order('fecha_apertura', { ascending: false })
    .limit(1)
    .maybeSingle();

  const esEfectivo = params.metodo_pago.toUpperCase() === 'EFECTIVO';
  const tipoMovimiento = params.tipo || 'INGRESO_MATRICULA';

  // Registrar movimiento en movimientos_caja (siempre, para que el arqueo de ventas lo tenga)
  try {
    await supabase.from('movimientos_caja').insert({
      caja_id: cajaAbierta?.id || null,
      tipo: tipoMovimiento,
      monto: params.monto,
      metodo_pago: params.metodo_pago,
      concepto: params.concepto,
      referencia_id: params.referencia || null,
      fecha: new Date().toISOString(),
    });
  } catch (movErr) {
    console.warn('No se pudo insertar en movimientos_caja:', movErr);
  }

  // Actualizar totales de caja abierta si está disponible
  if (cajaAbierta) {
    if (esEfectivo) {
      await supabase
        .from('cajas_chicas')
        .update({
          total_ingresos_efectivo: Number(cajaAbierta.total_ingresos_efectivo || 0) + Number(params.monto),
        })
        .eq('id', cajaAbierta.id);
    } else {
      await supabase
        .from('cajas_chicas')
        .update({
          total_ingresos_digital: Number(cajaAbierta.total_ingresos_digital || 0) + Number(params.monto),
        })
        .eq('id', cajaAbierta.id);
    }
  }
}

// -------------------------------------------------------------------------
// 10. GESTIÓN ADMINISTRATIVA DE CURSOS Y MATERIAS
// -------------------------------------------------------------------------

export interface CursoInput {
  id?: string;
  titulo: string;
  slug?: string;
  descripcion_corta: string;
  temario_detallado: string[];
  duracion_semanas: number;
  horas_academicas: number;
  costo_matricula: number;
  costo_mensualidad: number;
  costo_total_contado?: number;
  incluye_kit: boolean;
  descripcion_kit?: string;
  imagen_url: string;
  activo?: boolean;
  destacado?: boolean;
  turnos?: TurnoOption[];
  sede?: string;
}

/**
 * Obtener todos los cursos para el panel de administración (incluye activos e inactivos)
 */
export async function getAdminCursos(): Promise<Curso[]> {
  try {
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (!error && data) {
      return (data as any[]).map(normalizarCurso);
    }
  } catch (err) {
    console.warn('Error al consultar cursos en admin:', err);
  }
  return [];
}

/**
 * Crear o actualizar un curso en la base de datos de Supabase
 */
export async function guardarCurso(
  curso: CursoInput
): Promise<{ ok: boolean; curso?: Curso; error?: string }> {
  try {
    const slugBase = (curso.slug || curso.titulo)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const slug = curso.id && !curso.id.startsWith('mock-')
      ? slugBase
      : `${slugBase}-${Date.now().toString().slice(-4)}`;

    const defaultImg =
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80';

    const turnosAGuardar = curso.turnos && curso.turnos.length > 0 ? curso.turnos : DEFAULT_TURNOS;

    const payloadBase = {
      titulo: curso.titulo.trim(),
      slug: slug,
      descripcion: curso.descripcion_corta.trim(),
      descripcion_corta: curso.descripcion_corta.trim(),
      temario_detallado: curso.temario_detallado,
      duracion_semanas: Number(curso.duracion_semanas) || 8,
      horas_academicas: Number(curso.horas_academicas) || 60,
      costo_matricula: Number(curso.costo_matricula) || 80,
      costo_mensualidad: Number(curso.costo_mensualidad) || 250,
      costo_total_contado: curso.costo_total_contado ? Number(curso.costo_total_contado) : null,
      incluye_kit: Boolean(curso.incluye_kit),
      descripcion_kit: curso.descripcion_kit ? curso.descripcion_kit.trim() : null,
      imagen_url: curso.imagen_url.trim() || defaultImg,
      activo: curso.activo !== undefined ? curso.activo : true,
      destacado: Boolean(curso.destacado),
      beneficios: turnosAGuardar,
      sede: curso.sede || 'ica',
    };

    const payloadWithTurnos = {
      ...payloadBase,
      turnos: turnosAGuardar,
    };

    if (curso.id && !curso.id.startsWith('mock-')) {
      let { data, error } = await supabase
        .from('cursos')
        .update(payloadWithTurnos)
        .eq('id', curso.id)
        .select()
        .single();

      if (error && error.message.includes('turnos')) {
        const res = await supabase
          .from('cursos')
          .update(payloadBase)
          .eq('id', curso.id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) throw new Error(error.message);
      return { ok: true, curso: normalizarCurso(data) };
    } else {
      let { data, error } = await supabase
        .from('cursos')
        .insert(payloadWithTurnos)
        .select()
        .single();

      if (error && error.message.includes('turnos')) {
        const res = await supabase
          .from('cursos')
          .insert(payloadBase)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) throw new Error(error.message);
      return { ok: true, curso: normalizarCurso(data) };
    }
  } catch (err: any) {
    console.error('Error al guardar curso:', err);
    return { ok: false, error: err.message || 'Error al guardar el curso.' };
  }
}

/**
 * Activar o desactivar (pausar) un curso en la portada y web
 */
export async function toggleCursoActivo(
  cursoId: string,
  activo: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cursos')
      .update({ activo })
      .eq('id', cursoId);

    return !error;
  } catch (err) {
    console.error('Error al cambiar estado de curso:', err);
    return false;
  }
}

/**
 * Marcar un curso como recomendado/destacado en la portada principal
 */
export async function marcarCursoDestacado(
  cursoId: string
): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('galindo_curso_destacado_id', cursoId);
      window.dispatchEvent(new CustomEvent('galindo_curso_destacado_changed', { detail: cursoId }));
    }

    // 1. Intentar desmarcar todos los demás en Supabase
    await supabase
      .from('cursos')
      .update({ destacado: false })
      .neq('id', cursoId);

    // 2. Marcar el seleccionado como destacado
    const { error } = await supabase
      .from('cursos')
      .update({ destacado: true })
      .eq('id', cursoId);

    if (error) {
      console.warn('Advertencia al marcar curso en Supabase (usando respaldo local):', error.message);
    }
    return true;
  } catch (err) {
    console.warn('Error al marcar curso destacado:', err);
    return true;
  }
}

/**
 * Eliminar un curso de la base de datos de Supabase
 */
export async function eliminarCurso(
  cursoId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Desvincular matrículas existentes para evitar error de Foreign Key
    await supabase
      .from('matriculas')
      .update({ curso_id: null })
      .eq('curso_id', cursoId);

    const { error } = await supabase
      .from('cursos')
      .delete()
      .eq('id', cursoId);

    if (error) {
      console.error('Error al eliminar curso:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error al eliminar curso:', err);
    return { ok: false, error: err.message || 'Error al eliminar el curso.' };
  }
}

/**
 * Eliminar todos los cursos (vaciar catálogo completo)
 */
export async function eliminarTodosLosCursos(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Desvincular matrículas existentes
    await supabase
      .from('matriculas')
      .update({ curso_id: null })
      .not('curso_id', 'is', null);

    const { error } = await supabase
      .from('cursos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error al vaciar catálogo de cursos:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error al vaciar catálogo de cursos:', err);
    return { ok: false, error: err.message || 'Error al vaciar los cursos.' };
  }
}

/**
 * Eliminar una matrícula completa, sus cuotas asociadas y el registro del alumno si no tiene más matrículas
 */
export async function eliminarMatriculaCompleta(
  matriculaId: string,
  alumnoId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Eliminar cuotas vinculadas
    const { error: errCuotas } = await supabase
      .from('cuotas_matricula')
      .delete()
      .eq('matricula_id', matriculaId);

    if (errCuotas) {
      console.warn('Aviso al eliminar cuotas:', errCuotas.message);
    }

    // 2. Eliminar la matrícula
    const { error: errMat } = await supabase
      .from('matriculas')
      .delete()
      .eq('id', matriculaId);

    if (errMat) throw new Error(errMat.message);

    // 3. Si se especificó alumnoId, comprobar si tiene otras matrículas
    if (alumnoId) {
      const { data: otrasMats } = await supabase
        .from('matriculas')
        .select('id')
        .eq('alumno_id', alumnoId);

      if (!otrasMats || otrasMats.length === 0) {
        await supabase
          .from('alumnos')
          .delete()
          .eq('id', alumnoId);
      }
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar la matrícula';
    console.error('Error al eliminar matricula:', msg);
    return { ok: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 12. Retirar alumno: condonar cuotas y registrar auditoría
// -------------------------------------------------------------------------
/**
 * Procesa el retiro formal de un alumno:
 * 1. Cambia estado de la matrícula a RETIRADO y guarda auditoría en notas
 * 2. Marca todas las cuotas PENDIENTE/VENCIDA como CONDONADA
 * 3. Pone saldo_pendiente en 0 (deuda condonada)
 */
export async function retirarMatricula(
  matriculaId: string,
  motivo: string,
  usuarioNombre: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const fechaHoy = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const notaRetiro = `[RETIRO ${fechaHoy} — Procesado por: ${usuarioNombre}] Motivo: ${motivo || 'Sin motivo especificado'}`;

    // 1. Actualizar estado a RETIRADO, guardar auditoría y zerear saldo
    const { error: errEstado } = await supabase
      .from('matriculas')
      .update({
        estado: 'RETIRADO',
        notas: notaRetiro,
        saldo_pendiente: 0,
      })
      .eq('id', matriculaId);

    if (errEstado) throw new Error(errEstado.message);

    // 2. Condonar todas las cuotas pendientes o vencidas
    const { error: errCuotas } = await supabase
      .from('cuotas_matricula')
      .update({ estado: 'CONDONADA' })
      .eq('matricula_id', matriculaId)
      .in('estado', ['PENDIENTE', 'VENCIDA']);

    if (errCuotas) {
      console.warn('Advertencia: no se pudieron condonar cuotas:', errCuotas.message);
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado al procesar el retiro';
    console.error('Error en retirarMatricula:', msg);
    return { ok: false, error: msg };
  }
}
