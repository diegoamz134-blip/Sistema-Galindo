// =========================================================================
// SERVICIO DE GESTIÓN ACADÉMICA & MATRÍCULAS (SISTEMA GALINDO)
// Conexión directa a Supabase (PostgreSQL) con fallback seguro
// =========================================================================

import { supabase } from '@/lib/supabase';
import { Alumno, Matricula, CuotaMatricula, Curso, EstadoAcademico, TurnoOption } from '@/types/database';
import { MOCK_CURSOS } from '@/lib/mock-data';

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

  return {
    ...raw,
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
        const filtered = allCursos.filter((c) => {
          const s = (c.sede || 'ica').toLowerCase();
          return s === sedeId.toLowerCase() || s === 'ambas' || s === 'todas';
        });
        if (filtered.length > 0) {
          return filtered;
        }
      } else {
        return allCursos;
      }
    }
  } catch (err) {
    console.warn('Error al consultar cursos activos en supabase:', err);
  }

  // Fallback seguro a cursos mock oficiales configurados por sede
  if (sedeId) {
    const fallbackPorSede = MOCK_CURSOS.filter((c) => {
      const s = (c.sede || 'ica').toLowerCase();
      return s === sedeId.toLowerCase() || s === 'ambas' || s === 'todas';
    });
    if (fallbackPorSede.length > 0) return fallbackPorSede;
  }
  return MOCK_CURSOS;
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

      return {
        ...m,
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
// 3. Aplicar filtros en memoria
// -------------------------------------------------------------------------
function aplicarFiltrosEnMemoria(
  lista: MatriculaConDetalle[],
  filtros?: FiltrosMatriculas
): MatriculaConDetalle[] {
  if (!filtros) return lista;

  return lista.filter((m) => {
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
    const saldoInicial = Math.max(0, input.total_curso - input.monto_matricula_pagado);

    // Buscar si ya existía una matrícula provisional para este alumno
    const { data: matExistente } = await supabase
      .from('matriculas')
      .select('id, codigo_matricula')
      .eq('alumno_id', alumnoId)
      .maybeSingle();

    let nuevaMatricula;
    const codigoMatricula = matExistente?.codigo_matricula || codigoMatriculaGenerado;

    if (matExistente) {
      // Limpiar cuotas previas si las hubiera antes de regenerar
      await supabase.from('cuotas_matricula').delete().eq('matricula_id', matExistente.id);

      const { data: matActualizada, error: errAct } = await supabase
        .from('matriculas')
        .update({
          codigo_matricula: codigoMatricula,
          curso_id: input.curso_id,
          curso_nombre: input.curso_nombre,
          sede: input.sede,
          turno: input.turno,
          fecha_matricula: new Date().toISOString().split('T')[0],
          fecha_inicio: input.fecha_inicio || new Date().toISOString().split('T')[0],
          estado: 'EN_CURSO',
          monto_matricula_pagado: input.monto_matricula_pagado,
          total_curso: input.total_curso,
          saldo_pendiente: saldoInicial,
          kit_entregado: false,
          fecha_entrega_kit: null,
          notas: input.notas || null,
        })
        .eq('id', matExistente.id)
        .select()
        .single();

      if (errAct || !matActualizada) {
        throw new Error(errAct?.message || 'Error al actualizar registro de matrícula');
      }
      nuevaMatricula = matActualizada;
    } else {
      const { data: matCreada, error: errMat } = await supabase
        .from('matriculas')
        .insert({
          codigo_matricula: codigoMatricula,
          alumno_id: alumnoId,
          curso_id: input.curso_id,
          curso_nombre: input.curso_nombre,
          sede: input.sede,
          turno: input.turno,
          fecha_matricula: new Date().toISOString().split('T')[0],
          fecha_inicio: input.fecha_inicio || new Date().toISOString().split('T')[0],
          estado: 'EN_CURSO',
          monto_matricula_pagado: input.monto_matricula_pagado,
          total_curso: input.total_curso,
          saldo_pendiente: saldoInicial,
          kit_entregado: false,
          fecha_entrega_kit: null,
          notas: input.notas || null,
        })
        .select()
        .single();

      if (errMat || !matCreada) {
        throw new Error(errMat?.message || 'Error al crear registro de matrícula');
      }
      nuevaMatricula = matCreada;
    }

    // D. Generar Cronograma de Cuotas
    const cuotasGeneradas: CuotaMatricula[] = [];
    if (input.numero_cuotas > 0 && saldoInicial > 0) {
      const cuotasParaInsertar = [];
      const fechaBase = new Date();

      for (let i = 1; i <= input.numero_cuotas; i++) {
        const fechaVence = new Date(fechaBase);
        fechaVence.setDate(fechaVence.getDate() + 30 * i);
        const fechaStr = fechaVence.toISOString().split('T')[0];

        cuotasParaInsertar.push({
          matricula_id: nuevaMatricula.id,
          numero_cuota: i,
          monto: input.monto_por_cuota,
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

    // E. Registrar movimiento en Caja Chica si aplica
    if (input.registrar_en_caja && input.monto_matricula_pagado > 0) {
      try {
        await registrarIngresoEnCaja({
          monto: input.monto_matricula_pagado,
          concepto: `Matrícula ${codigoMatricula} - ${input.nombres} ${input.apellidos}`,
          metodo_pago: input.metodo_pago,
          referencia: codigoMatricula,
        });
      } catch (cajaErr) {
        console.warn('No se pudo registrar movimiento en caja:', cajaErr);
      }
    }

    const matriculaCompleta: MatriculaConDetalle = {
      ...nuevaMatricula,
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

    // A. Actualizar estado de la cuota en Supabase
    const { error: errCuota } = await supabase
      .from('cuotas_matricula')
      .update({
        estado: 'PAGADA',
        fecha_pago: fechaPago,
        metodo_pago: input.metodo_pago,
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
      .select('saldo_pendiente, total_curso, codigo_matricula')
      .eq('id', input.matricula_id)
      .single();

    if (matriculaActual) {
      const nuevoSaldo = Math.max(0, Number(matriculaActual.saldo_pendiente) - Number(input.monto));
      await supabase
        .from('matriculas')
        .update({
          saldo_pendiente: nuevoSaldo,
        })
        .eq('id', input.matricula_id);
    }

    // C. Opcional: registrar en Caja Chica
    if (input.registrar_en_caja && input.monto > 0) {
      try {
        await registrarIngresoEnCaja({
          monto: input.monto,
          concepto: `Pago Cuota - ${matriculaActual?.codigo_matricula || input.matricula_id}`,
          metodo_pago: input.metodo_pago,
          referencia: input.numero_operacion || input.cuota_id,
        });
      } catch (cajaErr) {
        console.warn('No se pudo registrar pago en caja:', cajaErr);
      }
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
// Helper: Registrar ingreso en caja chica si hay una abierta
// -------------------------------------------------------------------------
async function registrarIngresoEnCaja(params: {
  monto: number;
  concepto: string;
  metodo_pago: string;
  referencia?: string;
}) {
  const { data: cajaAbierta } = await supabase
    .from('cajas_chicas')
    .select('id, total_ingresos_efectivo, total_ingresos_digital')
    .eq('estado', 'ABIERTA')
    .order('fecha_apertura', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cajaAbierta) return;

  const esEfectivo = params.metodo_pago.toUpperCase() === 'EFECTIVO';

  // Registrar movimiento en movimientos_caja si la tabla existe
  try {
    await supabase.from('movimientos_caja').insert({
      caja_id: cajaAbierta.id,
      tipo: 'INGRESO_MATRICULA',
      monto: params.monto,
      metodo_pago: params.metodo_pago,
      concepto: params.concepto,
      referencia_id: params.referencia || null,
      fecha: new Date().toISOString(),
    });
  } catch {
    // Si la tabla aún no existe o falla, continuar sin bloquear
  }

  // Actualizar totales de caja
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
  turnos?: TurnoOption[];
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
      beneficios: turnosAGuardar,
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

