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
} from 'lucide-react';
import {
  getMatriculasConDetalle,
  getAdminCursos,
  toggleCursoActivo,
  eliminarCurso,
  eliminarTodosLosCursos,
  calcularEstadisticas,
  toggleEntregaKit,
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

export default function AdminMatriculasPage() {
  const [tabActiva, setTabActiva] = useState<'matriculas' | 'cursos'>('matriculas');
  const [matriculas, setMatriculas] = useState<MatriculaConDetalle[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroSede, setFiltroSede] = useState('TODAS');
  const [filtroCurso, setFiltroCurso] = useState('TODOS');
  const [filtroEstadoCuota, setFiltroEstadoCuota] = useState<'TODOS' | 'AL_DIA' | 'VENCIDA' | 'PAGADA'>('TODOS');
  const [filtroKit, setFiltroKit] = useState<'TODOS' | 'ENTREGADO' | 'PENDIENTE'>('TODOS');

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

    // 2. Heartbeat de sincronización continua (cada 4 segundos cuando la pestaña está visible)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        cargarDatos(true);
      }
    }, 4000);

    // 3. Sincronización instantánea al recuperar foco en la ventana
    const onFocus = () => cargarDatos(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [cargarDatos]);

  // Cálculo de KPIs
  const stats = useMemo(() => {
    return calcularEstadisticas(matriculas);
  }, [matriculas]);

  // Filtrado de lista en tiempo real
  const matriculasFiltradas = useMemo(() => {
    return matriculas.filter((m) => {
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

      // Filtro Sede
      if (filtroSede !== 'TODAS' && m.sede !== filtroSede) {
        return false;
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
  }, [matriculas, busqueda, filtroSede, filtroCurso, filtroKit, filtroEstadoCuota]);

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
          <button
            type="button"
            onClick={() => cargarDatos(true)}
            className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors shadow-xs"
            title="Actualizar datos desde la base de datos"
          >
            <RefreshCw className={`w-4 h-4 ${actualizando ? 'animate-spin text-black' : ''}`} />
          </button>

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
            {matriculas.length}
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
            {cursos.length}
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
            <select
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-medium focus:border-black outline-none"
            >
              <option value="TODAS">Todas las Sedes</option>
              <option value="Sede Central Ica">Sede Central Ica</option>
              <option value="Sede Huancayo">Sede Huancayo</option>
            </select>
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
            <strong className="text-zinc-800">{matriculas.length}</strong> estudiantes registrados
          </span>
          {(busqueda || filtroSede !== 'TODAS' || filtroCurso !== 'TODOS' || filtroEstadoCuota !== 'TODOS' || filtroKit !== 'TODOS') && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setFiltroSede('TODAS');
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
                <th className="px-5 py-3.5 font-bold text-center">Kit Oficial</th>
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

                      {/* Kit de Barbería con Toggle Rápido */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleKitRapido(m, e)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            m.kit_entregado
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Clic para alternar estado de entrega"
                        >
                          <PackageCheck className="w-3 h-3" />
                          <span>{m.kit_entregado ? 'Entregado' : 'Pendiente'}</span>
                        </button>
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
          cursos={cursos}
          onCrearCurso={() => {
            setCursoParaEditar(null);
            setShowModalCurso(true);
          }}
          onEditarCurso={(curso) => {
            setCursoParaEditar(curso);
            setShowModalCurso(true);
          }}
          onToggleActivo={handleToggleCursoActivo}
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

    </div>
  );
}
