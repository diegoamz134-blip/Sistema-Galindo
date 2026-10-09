'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Filter,
  RefreshCw,
  MessageCircle,
  PackageCheck,
  Eye,
  DollarSign,
  Printer,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  BookOpen,
  MapPin,
  Trash2,
} from 'lucide-react';
import {
  getMatriculasConDetalle,
  getAdminCursos,
  toggleCursoActivo,
  marcarCursoDestacado,
  eliminarCurso,
  eliminarTodosLosCursos,
  eliminarMatriculaCompleta,
  calcularEstadisticas,
  toggleEntregaKit,
  matchSede,
  MatriculaConDetalle,
  FiltrosMatriculas,
  EstadisticasAcademia,
} from '@/lib/academia-service';
import { Curso, CuotaMatricula } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { AcademiaKpis } from '@/components/admin/matriculas/AcademiaKpis';
import { NuevaMatriculaModal } from '@/components/admin/matriculas/NuevaMatriculaModal';
import { DetalleAlumnoModal } from '@/components/admin/matriculas/DetalleAlumnoModal';
import { RegistrarPagoCuotaModal } from '@/components/admin/matriculas/RegistrarPagoCuotaModal';
import { ReciboMatriculaTicket } from '@/components/admin/matriculas/ReciboMatriculaTicket';
import { AdminCursosList } from '@/components/admin/matriculas/AdminCursosList';
import { CursoFormModal } from '@/components/admin/matriculas/CursoFormModal';
import { useSede } from '@/context/SedeContext';

export default function AdminMatriculasPage() {
  const { sedeActiva, sedeInfo, puedeCambiarSede } = useSede();
  const [tabActiva, setTabActiva] = useState<'matriculas' | 'cursos'>('matriculas');
  const [matriculas, setMatriculas] = useState<MatriculaConDetalle[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroSede, setFiltroSede] = useState<string>('SEDE_ACTIVA');
  const [filtroCurso, setFiltroCurso] = useState('TODOS');
  const [filtroEstadoCuota, setFiltroEstadoCuota] = useState<'TODOS' | 'AL_DIA' | 'VENCIDA' | 'PAGADA'>('TODOS');
  const [filtroKit, setFiltroKit] = useState<'TODOS' | 'ENTREGADO' | 'PENDIENTE'>('TODOS');

  // Sincronizar el filtro de sede cuando el usuario cambia de sede en el selector global
  useEffect(() => {
    setFiltroSede('SEDE_ACTIVA');
  }, [sedeActiva]);

  // Modales
  const [showModalNueva, setShowModalNueva] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<MatriculaConDetalle | null>(null);
  const [cuotaParaCobrar, setCuotaParaCobrar] = useState<{
    matricula: MatriculaConDetalle;
    cuota: CuotaMatricula;
  } | null>(null);
  const [ticketParaImprimir, setTicketParaImprimir] = useState<MatriculaConDetalle | null>(null);
  const [showModalCurso, setShowModalCurso] = useState(false);
  const [cursoParaEditar, setCursoParaEditar] = useState<Curso | null>(null);
  const [matriculaEliminando, setMatriculaEliminando] = useState<MatriculaConDetalle | null>(null);
  const [isEliminandoMatricula, setIsEliminandoMatricula] = useState(false);

  const handleConfirmarEliminarMatricula = async () => {
    if (!matriculaEliminando) return;
    setIsEliminandoMatricula(true);
    try {
      const res = await eliminarMatriculaCompleta(
        matriculaEliminando.id,
        matriculaEliminando.alumno_id || matriculaEliminando.alumno?.id
      );
      if (res.ok) {
        setMatriculas((prev) => prev.filter((m) => m.id !== matriculaEliminando.id));
        setMatriculaEliminando(null);
      } else {
        alert(res.error || 'No se pudo eliminar la matrícula');
      }
    } catch {
      alert('Error inesperado al eliminar');
    } finally {
      setIsEliminandoMatricula(false);
    }
  };

  // Carga de datos
  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    else setActualizando(true);

    try {
      const [listMatriculas, listCursos] = await Promise.all([
        getMatriculasConDetalle(),
        getAdminCursos(),
      ]);

      setMatriculas(listMatriculas);
      setCursos(listCursos);

      // Sincronizar el expediente del alumno si está abierto
      setAlumnoSeleccionado((prev) => {
        if (!prev) return null;
        const actualizado = listMatriculas.find((m) => m.id === prev.id);
        return actualizado || prev;
      });
    } catch (err) {
      console.error('Error al cargar academia:', err);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();

    // 1. Suscripción Supabase Realtime a cambios en public
    const channel = supabase
      .channel('realtime-academia-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matriculas' },
        () => cargarDatos(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cuotas_matricula' },
        () => cargarDatos(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alumnos' },
        () => cargarDatos(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cursos' },
        () => cargarDatos(true)
      )
      .subscribe();

    // 2. Sincronización instantánea al recuperar foco en la ventana
    const onFocus = () => cargarDatos(true);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [cargarDatos]);

  // Sede efectiva para la vista (blindada según permisos del usuario)
  const sedeEfectiva = !puedeCambiarSede ? sedeActiva : (filtroSede === 'SEDE_ACTIVA' ? sedeActiva : filtroSede);

  // Filtrado de cursos por Sede Activa (Global)
  const cursosFiltrados = useMemo(() => {
    return cursos.filter((c) => matchSede(c.sede, sedeEfectiva));
  }, [cursos, sedeEfectiva]);

  // Matrículas pertenecientes a la sede evaluada
  const matriculasSede = useMemo(() => {
    if (sedeEfectiva === 'TODAS') return matriculas;
    return matriculas.filter((m) => matchSede(m.sede, sedeEfectiva));
  }, [matriculas, sedeEfectiva]);

  // Cálculo de KPIs correspondiente a la sede
  const stats = useMemo(() => {
    return calcularEstadisticas(matriculasSede);
  }, [matriculasSede]);

  // Filtrado de lista en tiempo real
  const matriculasFiltradas = useMemo(() => {
    return matriculasSede.filter((m) => {
      // Búsqueda por texto
      if (busqueda.trim()) {
        const term = busqueda.toLowerCase().trim();
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

      // Filtro Curso
      if (filtroCurso !== 'TODOS') {
        const cursoCoincide =
          m.curso_id === filtroCurso ||
          m.curso_nombre === filtroCurso ||
          m.curso?.titulo === filtroCurso;
        if (!cursoCoincide) return false;
      }

      // Filtro Kit
      if (filtroKit !== 'TODOS') {
        const esEntregado = filtroKit === 'ENTREGADO';
        if (m.kit_entregado !== esEntregado) return false;
      }

      // Filtro Estado Cuotas
      if (filtroEstadoCuota !== 'TODOS') {
        const tieneVencida = (m.cuotas || []).some((c) => c.estado === 'VENCIDA');
        const saldoCero = Number(m.saldo_pendiente) <= 0;

        if (filtroEstadoCuota === 'VENCIDA' && !tieneVencida) return false;
        if (filtroEstadoCuota === 'PAGADA' && !saldoCero) return false;
        if (filtroEstadoCuota === 'AL_DIA' && (tieneVencida || saldoCero)) return false;
      }

      return true;
    });
  }, [matriculasSede, busqueda, filtroCurso, filtroKit, filtroEstadoCuota]);

  // Handler rápido para toggle de kit
  const handleToggleKitRapido = async (m: MatriculaConDetalle, e: React.MouseEvent) => {
    e.stopPropagation();
    const nuevoKit = !m.kit_entregado;
    // Actualización inmediata en el estado de la tabla
    setMatriculas((prev) =>
      prev.map((item) => (item.id === m.id ? { ...item, kit_entregado: nuevoKit } : item))
    );
    await toggleEntregaKit(m.id, nuevoKit);
    cargarDatos(true);
  };

  // Enviar mensaje de WhatsApp
  const handleOpenWhatsApp = (m: MatriculaConDetalle, e: React.MouseEvent) => {
    e.stopPropagation();
    const tel = m.alumno.celular.replace(/\D/g, '');
    const saldo = formatCurrency(m.saldo_pendiente);
    const mensaje = encodeURIComponent(
      `Hola *${m.alumno.nombres}*, te saludamos de *Galindo Barber Academy* 💈.\n\n` +
      `Te informamos que tu estado de matrícula (*${m.codigo_matricula}*) en el curso *${m.curso_nombre || m.curso?.titulo}* cuenta actualmente con un saldo de *${saldo}*.\n\n` +
      `Si tienes alguna duda o deseas registrar un abono, estamos atentos. ¡Éxitos en tu formación!`
    );
    window.open(`https://wa.me/51${tel}?text=${mensaje}`, '_blank');
  };

  // Handler para activar/desactivar curso en portada
  const handleToggleCursoActivo = async (cursoId: string, nuevoEstado: boolean) => {
    setCursos((prev) =>
      prev.map((c) => (c.id === cursoId ? { ...c, activo: nuevoEstado } : c))
    );
    await toggleCursoActivo(cursoId, nuevoEstado);
    cargarDatos(true);
  };

  // Handler para marcar curso recomendado en portada
  const handleMarcarDestacado = async (cursoId: string) => {
    setCursos((prev) =>
      prev.map((c) => ({
        ...c,
        destacado: c.id === cursoId,
      }))
    );
    await marcarCursoDestacado(cursoId);
    cargarDatos(true);
  };

  // Handler para eliminar curso individual
  const handleEliminarCurso = async (cursoId: string) => {
    setCursos((prev) => prev.filter((c) => c.id !== cursoId));
    await eliminarCurso(cursoId);
    cargarDatos(true);
  };

  // Handler para vaciar todos los cursos
  const handleVaciarCursos = async () => {
    setCursos([]);
    await eliminarTodosLosCursos();
    cargarDatos(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Encabezado Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
              <span>Control de Academia Galindo</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            {actualizando && (
              <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Sincronizando...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Gestión integral de alumnos, matrículas, cuotas y catálogo de cursos de la portada web.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {tabActiva === 'matriculas' ? (
            <button
              type="button"
              onClick={() => setShowModalNueva(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-zinc-800 shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Matrícula</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCursoParaEditar(null);
                setShowModalCurso(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-zinc-800 shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Curso</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector de Pestañas Principales */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-1">
        <button
          type="button"
          onClick={() => setTabActiva('matriculas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            tabActiva === 'matriculas'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Alumnos & Matrículas</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              tabActiva === 'matriculas'
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-200 text-zinc-700'
            }`}
          >
            {matriculasSede.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('cursos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            tabActiva === 'cursos'
              ? 'bg-zinc-950 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Cursos & Materias de Portada</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              tabActiva === 'cursos'
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-200 text-zinc-700'
            }`}
          >
            {cursosFiltrados.length}
          </span>
        </button>
      </div>

      {tabActiva === 'matriculas' ? (
        <>
          {/* Bloque de KPIs y Métricas Financieras */}
          <AcademiaKpis stats={stats} />

          {/* Barra de Filtros & Búsqueda Avanzada */}
          <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Buscador de Texto */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por DNI, nombres o código de matrícula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs focus:border-black outline-none transition-colors"
            />
          </div>

          {/* Filtro Sede */}
          <div className="md:col-span-2">
            {puedeCambiarSede ? (
              <select
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-semibold focus:border-black outline-none"
              >
                <option value="SEDE_ACTIVA">Sede {sedeInfo.ciudad} (Actual)</option>
                <option value="ica">Sede Ica</option>
                <option value="huancayo">Sede Huancayo</option>
                <option value="TODAS">Todas las Sedes</option>
              </select>
            ) : (
              <div className="w-full px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold flex items-center gap-2 select-none h-[38px]">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">Sede {sedeInfo.ciudad}</span>
              </div>
            )}
          </div>

          {/* Filtro Curso */}
          <div className="md:col-span-2">
            <select
              value={filtroCurso}
              onChange={(e) => setFiltroCurso(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-medium focus:border-black outline-none"
            >
              <option value="TODOS">Todos los Cursos</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.titulo}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Estado de Cuotas */}
          <div className="md:col-span-3 flex gap-2">
            <select
              value={filtroEstadoCuota}
              onChange={(e) => setFiltroEstadoCuota(e.target.value as any)}
              className="w-1/2 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-medium focus:border-black outline-none"
            >
              <option value="TODOS">Todas las Cuotas</option>
              <option value="AL_DIA">Al Día</option>
              <option value="VENCIDA">Con Mora / Vencida</option>
              <option value="PAGADA">Pagado 100%</option>
            </select>

            <select
              value={filtroKit}
              onChange={(e) => setFiltroKit(e.target.value as any)}
              className="w-1/2 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-medium focus:border-black outline-none"
            >
              <option value="TODOS">Kits: Todos</option>
              <option value="ENTREGADO">Entregados</option>
              <option value="PENDIENTE">Pendientes</option>
            </select>
          </div>

        </div>

        {/* Resumen de resultados filtrados */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
          <span>
            Mostrando <strong className="text-zinc-800">{matriculasFiltradas.length}</strong> de{' '}
            <strong className="text-zinc-800">{matriculasSede.length}</strong> estudiantes registrados
            {sedeEfectiva !== 'TODAS' && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono text-[10px] font-bold">
                {sedeEfectiva === 'huancayo' ? 'Sede Huancayo' : 'Sede Ica'}
              </span>
            )}
          </span>
          {(busqueda || filtroSede !== 'SEDE_ACTIVA' || filtroCurso !== 'TODOS' || filtroEstadoCuota !== 'TODOS' || filtroKit !== 'TODOS') && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setFiltroSede('SEDE_ACTIVA');
                setFiltroCurso('TODOS');
                setFiltroEstadoCuota('TODOS');
                setFiltroKit('TODOS');
              }}
              className="text-zinc-600 hover:text-black font-semibold underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-zinc-50/80 text-zinc-500 uppercase tracking-wider text-[11px] border-b border-zinc-200">
              <tr>
                <th className="px-5 py-3.5 font-bold">Alumno / Código</th>
                <th className="px-5 py-3.5 font-bold">DNI & Celular</th>
                <th className="px-5 py-3.5 font-bold">Curso & Turno</th>
                <th className="px-5 py-3.5 font-bold text-right">Saldo Deuda</th>
                <th className="px-5 py-3.5 font-bold text-center">Estado Cuotas</th>
                <th className="px-5 py-3.5 font-bold text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-300 mb-2" />
                    <p className="font-semibold text-xs text-zinc-600">
                      Conectando con Supabase & cargando estudiantes...
                    </p>
                  </td>
                </tr>
              ) : matriculasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-zinc-400">
                    <GraduationCap className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                    <p className="font-semibold text-xs text-zinc-700">
                      No se encontraron matrículas con los filtros actuales
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Intenta buscar con otro término o haz clic en &quot;Nueva Matrícula&quot; para registrar un estudiante.
                    </p>
                  </td>
                </tr>
              ) : (
                matriculasFiltradas.map((m) => {
                  const tieneVencida = (m.cuotas || []).some((c) => c.estado === 'VENCIDA');
                  const cuotaPendiente = (m.cuotas || []).find((c) => c.estado !== 'PAGADA');
                  const saldoCero = Number(m.saldo_pendiente) <= 0;

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setAlumnoSeleccionado(m)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Alumno y Código */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-800 font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                            {m.alumno?.nombres?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-950 text-xs">
                              {m.alumno?.nombres} {m.alumno?.apellidos}
                            </p>
                            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                              {m.codigo_matricula} • {m.alumno?.distrito || 'Ica'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* DNI & Celular con WhatsApp */}
                      <td className="px-5 py-3.5 font-mono text-zinc-700">
                        <p className="font-semibold text-xs">DNI: {m.alumno?.dni}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-zinc-500 text-[11px]">{m.alumno?.celular}</span>
                          <button
                            type="button"
                            onClick={(e) => handleOpenWhatsApp(m, e)}
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Enviar mensaje por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Curso y Turno */}
                      <td className="px-5 py-3.5">
                        <p className="text-zinc-900 font-semibold truncate max-w-[220px]">
                          {m.curso_nombre || m.curso?.titulo}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          Turno {m.turno} • {m.sede}
                        </p>
                      </td>


                      {/* Saldo Deuda */}
                      <td className="px-5 py-3.5 text-right font-mono">
                        <span
                          className={`font-bold text-xs ${
                            saldoCero ? 'text-zinc-400' : 'text-zinc-950'
                          }`}
                        >
                          {formatCurrency(m.saldo_pendiente)}
                        </span>
                        <p className="text-[10px] text-zinc-400">
                          Total: {formatCurrency(m.total_curso)}
                        </p>
                      </td>

                      {/* Estado Cuotas */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            saldoCero
                              ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
                              : tieneVencida
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {saldoCero ? 'Pagado Total' : tieneVencida ? 'Cuota Vencida' : 'Al Día'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Cobrar si tiene cuota pendiente */}
                          {cuotaPendiente && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCuotaParaCobrar({ matricula: m, cuota: cuotaPendiente });
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-colors"
                              title={`Cobrar Cuota #${cuotaPendiente.numero_cuota}`}
                            >
                              <DollarSign className="w-3 h-3" />
                              <span className="hidden md:inline">Cobrar</span>
                            </button>
                          )}

                          {/* Botón Ver Recibo */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTicketParaImprimir(m);
                            }}
                            className="p-1 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors"
                            title="Ver Recibo Imprimible"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Expediente */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAlumnoSeleccionado(m);
                            }}
                            className="p-1 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors"
                            title="Ver Expediente Completo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar Alumno & Matrícula */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMatriculaEliminando(m);
                            }}
                            className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Eliminar Alumno y Matrícula"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        <AdminCursosList
          cursos={cursosFiltrados}
          onCrearCurso={() => {
            setCursoParaEditar(null);
            setShowModalCurso(true);
          }}
          onEditarCurso={(curso) => {
            setCursoParaEditar(curso);
            setShowModalCurso(true);
          }}
          onToggleActivo={handleToggleCursoActivo}
          onMarcarDestacado={handleMarcarDestacado}
          onEliminarCurso={handleEliminarCurso}
          onVaciarCursos={handleVaciarCursos}
        />
      )}

      {/* Modal: Administrar Curso (Crear / Editar) */}
      <CursoFormModal
        isOpen={showModalCurso}
        onClose={() => {
          setShowModalCurso(false);
          setCursoParaEditar(null);
        }}
        cursoAEditar={cursoParaEditar}
        onCursoGuardado={() => {
          setShowModalCurso(false);
          setCursoParaEditar(null);
          cargarDatos(true);
        }}
        onCursoEliminado={async (cursoId) => {
          await handleEliminarCurso(cursoId);
          setShowModalCurso(false);
          setCursoParaEditar(null);
        }}
      />

      {/* Modal: Nueva Matrícula */}
      <NuevaMatriculaModal
        isOpen={showModalNueva}
        onClose={() => setShowModalNueva(false)}
        sedeInicial={sedeActiva === 'huancayo' ? 'Sede Huancayo' : 'Sede Central Ica'}
        onMatriculaCreada={(nueva) => {
          setMatriculas((prev) => [nueva, ...prev]);
          cargarDatos(true);
        }}
      />

      {/* Modal: Expediente Detallado del Alumno */}
      {alumnoSeleccionado && (
        <DetalleAlumnoModal
          isOpen={true}
          onClose={() => setAlumnoSeleccionado(null)}
          matricula={alumnoSeleccionado}
          onUpdate={() => cargarDatos(true)}
        />
      )}

      {/* Modal: Registrar Pago de Cuota Rápido */}
      {cuotaParaCobrar && (
        <RegistrarPagoCuotaModal
          isOpen={true}
          onClose={() => setCuotaParaCobrar(null)}
          matricula={cuotaParaCobrar.matricula}
          cuota={cuotaParaCobrar.cuota}
          onPagoRegistrado={() => {
            // Actualización optimista inmediata en tabla
            setMatriculas((prev) =>
              prev.map((m) => {
                if (m.id !== cuotaParaCobrar.matricula.id) return m;
                const nuevoSaldo = Math.max(0, Number(m.saldo_pendiente || 0) - Number(cuotaParaCobrar.cuota.monto));
                const nuevasCuotas = (m.cuotas || []).map((c) =>
                  c.id === cuotaParaCobrar.cuota.id
                    ? { ...c, estado: 'PAGADA' as const, fecha_pago: new Date().toISOString() }
                    : c
                );
                return {
                  ...m,
                  saldo_pendiente: nuevoSaldo,
                  cuotas: nuevasCuotas,
                };
              })
            );
            setCuotaParaCobrar(null);
            cargarDatos(true);
          }}
        />
      )}

      {/* Modal: Imprimir Recibo */}
      {ticketParaImprimir && (
        <ReciboMatriculaTicket
          isOpen={true}
          onClose={() => setTicketParaImprimir(null)}
          matricula={ticketParaImprimir}
        />
      )}

      {/* Modal: Confirmación Eliminar Alumno y Matrícula */}
      {matriculaEliminando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => !isEliminandoMatricula && setMatriculaEliminando(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 z-10 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-semibold text-zinc-950">
                ¿Eliminar alumno y matrícula?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                ¿Estás seguro de que deseas eliminar la matrícula{' '}
                <span className="font-semibold text-zinc-900">{matriculaEliminando.codigo_matricula}</span>{' '}
                de{' '}
                <span className="font-semibold text-zinc-900">
                  {matriculaEliminando.alumno?.nombres} {matriculaEliminando.alumno?.apellidos}
                </span>?
              </p>
              <p className="text-[11px] text-zinc-400">
                Se borrarán sus cuotas de pago, expediente académico y el registro del estudiante.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMatriculaEliminando(null)}
                disabled={isEliminandoMatricula}
                className="py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminarMatricula}
                disabled={isEliminandoMatricula}
                className="inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isEliminandoMatricula && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
