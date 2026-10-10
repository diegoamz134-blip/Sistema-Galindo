'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowRight,
  Store,
  Layers,
  HelpCircle,
  FileDown,
} from 'lucide-react';
import { Producto } from '@/types/database';
import { supabase } from '@/lib/supabase';
import {
  exportarInventarioAExcel,
  analizarArchivoExcel,
  aplicarAjusteMasivoInventario,
  ResumenPrevisualizacion,
  ModoActualizacionSede,
  perteneceASede,
} from '@/lib/excel-inventario-service';
import { useAuth } from '@/context/AuthContext';
import { useSede } from '@/context/SedeContext';

interface ModalInventarioExcelProps {
  isOpen: boolean;
  onClose: () => void;
  productos?: Producto[];
  onActualizacionExitosa: () => void;
}

export function ModalInventarioExcel({
  isOpen,
  onClose,
  productos: initialProductos = [],
  onActualizacionExitosa,
}: ModalInventarioExcelProps) {
  const { userMeta, user } = useAuth();
  const { sedeActiva } = useSede();

  // Lista completa de productos (cargada fresca desde BD)
  const [catalogoCompleto, setCatalogoCompleto] = useState<Producto[]>(initialProductos);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function cargarCatalogoCompleto() {
      setIsLoadingCatalogo(true);
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*, categoria:categorias(id, nombre)')
          .order('nombre', { ascending: true });

        if (!error && data) {
          setCatalogoCompleto(data as Producto[]);
        } else if (initialProductos.length > 0) {
          setCatalogoCompleto(initialProductos);
        }
      } catch (err) {
        console.warn('Error al cargar catálogo en modal:', err);
        if (initialProductos.length > 0) {
          setCatalogoCompleto(initialProductos);
        }
      } finally {
        setIsLoadingCatalogo(false);
      }
    }

    cargarCatalogoCompleto();
  }, [isOpen, initialProductos]);

  // Pestaña principal: 'importar' o 'exportar'
  const [tabActiva, setTabActiva] = useState<'importar' | 'exportar'>('importar');

  // Modo de Sede para importar
  const [modoImportacion, setModoImportacion] = useState<ModoActualizacionSede>('ambas');

  // Estados de archivo y análisis
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [isAnalizando, setIsAnalizando] = useState(false);
  const [resumen, setResumen] = useState<ResumenPrevisualizacion | null>(null);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);

  // Estados de filtro en la previsualización
  const [busquedaTabla, setBusquedaTabla] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'modificados' | 'no_encontrados'>('modificados');

  // Motivo oficial para el Kardex
  const [motivoKardex, setMotivoKardex] = useState('Inventario físico inicial / Cuadre masivo Excel');

  // Estados de aplicación de cambios
  const [isAplicando, setIsAplicando] = useState(false);
  const [progreso, setProgreso] = useState({ porcentaje: 0, procesados: 0, total: 0 });
  const [resultadoFinal, setResultadoFinal] = useState<{
    exito: boolean;
    actualizados: number;
    errores: string[];
  } | null>(null);

  // Estado de descarga
  const [isDescargando, setIsDescargando] = useState(false);
  const [sedeDescarga, setSedeDescarga] = useState<'todas' | 'ica' | 'huancayo'>('todas');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // MANEJADORES DE IMPORTACIÓN
  // ---------------------------------------------------------------------------
  const procesarArchivo = async (file: File) => {
    setArchivoSeleccionado(file);
    setIsAnalizando(true);
    setErrorAnalisis(null);
    setResumen(null);
    setResultadoFinal(null);

    try {
      const res = await analizarArchivoExcel({
        file,
        productosActuales: catalogoCompleto,
        modo: modoImportacion,
      });
      setResumen(res);
      // Si no hay modificados pero sí filas, colocar filtro en 'todos'
      if (res.totalModificados === 0 && res.items.length > 0) {
        setFiltroEstado('todos');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo Excel';
      setErrorAnalisis(msg);
    } finally {
      setIsAnalizando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  };

  const handleConfirmarActualizacion = async () => {
    if (!resumen || resumen.totalModificados === 0) return;

    setIsAplicando(true);
    setProgreso({ porcentaje: 0, procesados: 0, total: resumen.totalModificados });

    try {
      const nombreUsuario = userMeta?.nombre || 'Administrador Galindo';
      const res = await aplicarAjusteMasivoInventario({
        items: resumen.items,
        motivo: motivoKardex,
        usuarioNombre: nombreUsuario,
        usuarioId: user?.id,
        onProgreso: (porcentaje, procesados, total) => {
          setProgreso({ porcentaje, procesados, total });
        },
      });

      setResultadoFinal({
        exito: res.success,
        actualizados: res.actualizados,
        errores: res.errores,
      });

      onActualizacionExitosa();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al aplicar cambios';
      setResultadoFinal({
        exito: false,
        actualizados: 0,
        errores: [msg],
      });
    } finally {
      setIsAplicando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MANEJADORES DE EXPORTACIÓN
  // ---------------------------------------------------------------------------
  const handleDescargarExcel = async (soloPlantilla: boolean) => {
    setIsDescargando(true);
    try {
      await exportarInventarioAExcel({
        productos: catalogoCompleto,
        sede: sedeDescarga,
        soloPlantilla,
      });
    } catch (err) {
      console.error('Error al exportar inventario a Excel:', err);
      alert('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setIsDescargando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTRADO DE ITEMS EN PREVISUALIZACIÓN
  // ---------------------------------------------------------------------------
  const itemsFiltrados = useMemo(() => {
    if (!resumen) return [];

    let lista = resumen.items;

    if (filtroEstado === 'modificados') {
      lista = lista.filter((i) => i.estado === 'actualizado');
    }

    if (busquedaTabla.trim()) {
      const q = busquedaTabla.trim().toLowerCase();
      lista = lista.filter(
        (i) =>
          i.nombre.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.categoria && i.categoria.toLowerCase().includes(q))
      );
    }

    return lista;
  }, [resumen, filtroEstado, busquedaTabla]);

  // Conteos exactos por Sede para la pestaña de exportación
  const conteoIca = useMemo(
    () => catalogoCompleto.filter((p) => perteneceASede(p, 'ica')).length,
    [catalogoCompleto]
  );
  const conteoHyo = useMemo(
    () => catalogoCompleto.filter((p) => perteneceASede(p, 'huancayo')).length,
    [catalogoCompleto]
  );
  const conteoSeleccionado = useMemo(() => {
    if (sedeDescarga === 'ica') return conteoIca;
    if (sedeDescarga === 'huancayo') return conteoHyo;
    return catalogoCompleto.length;
  }, [sedeDescarga, conteoIca, conteoHyo, catalogoCompleto.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-950">
                Gestión Masiva de Inventario (Excel)
              </h2>
              <p className="text-xs text-zinc-500">
                Sincronización de stock físico multisede con registro oficial en Kardex
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAplicando}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Pestañas Principales */}
        <div className="flex border-b border-zinc-100 px-6 bg-white gap-2 pt-2">
          <button
            onClick={() => {
              setTabActiva('importar');
              setResultadoFinal(null);
            }}
            disabled={isAplicando}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              tabActiva === 'importar'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Actualizar Stock desde Excel</span>
            {resumen && resumen.totalModificados > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-black">
                {resumen.totalModificados}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setTabActiva('exportar');
              setResultadoFinal(null);
            }}
            disabled={isAplicando}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              tabActiva === 'exportar'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Descargar / Exportar Inventario</span>
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ================================================================= */}
          {/* PESTAÑA 1: IMPORTAR / ACTUALIZAR STOCK DESDE EXCEL */}
          {/* ================================================================= */}
          {tabActiva === 'importar' && (
            <>
              {/* Pantalla de Éxito Final */}
              {resultadoFinal && (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-emerald-950">
                      ¡Inventario Actualizado Exitosamente!
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                      Se actualizaron <strong>{resultadoFinal.actualizados} productos</strong> en la base de datos y se generaron los asientos de ajuste en el Kardex para auditoría.
                    </p>
                  </div>

                  {resultadoFinal.errores.length > 0 && (
                    <div className="text-left bg-white p-3 rounded-xl border border-rose-200 text-xs text-rose-600 max-h-32 overflow-y-auto">
                      <p className="font-bold mb-1">Advertencias durante la carga:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {resultadoFinal.errores.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setResumen(null);
                        setArchivoSeleccionado(null);
                        setResultadoFinal(null);
                      }}
                      className="px-4 py-2 text-xs font-bold bg-white text-zinc-800 border border-zinc-200 rounded-xl hover:bg-zinc-50"
                    >
                      Subir Otro Archivo
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md"
                    >
                      Cerrar y Ver Inventario
                    </button>
                  </div>
                </div>
              )}

              {/* Pantalla en Progreso */}
              {isAplicando && (
                <div className="p-8 rounded-2xl bg-zinc-950 text-white text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
                  <div>
                    <h3 className="text-sm font-bold">
                      Actualizando inventario en Supabase...
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Procesando {progreso.procesados} de {progreso.total} productos
                    </p>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-200"
                      style={{ width: `${progreso.porcentaje}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    {progreso.porcentaje}% completado
                  </span>
                </div>
              )}

              {/* Selector de Archivo (Si aún no se ha analizado o se quiere cambiar) */}
              {!resultadoFinal && !isAplicando && !resumen && (
                <div className="space-y-4">
                  {/* Selector de Sede a impactar */}
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-zinc-800 flex items-center gap-2">
                        <Store className="w-4 h-4 text-purple-600" />
                        <span>¿Qué sedes deseas actualizar con este archivo?</span>
                      </label>
                      <span className="text-[11px] text-zinc-500">
                        Sede activa actual: <strong className="capitalize">{sedeActiva}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setModoImportacion('ambas')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          modoImportacion === 'ambas'
                            ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 font-bold'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100/60 font-medium'
                        }`}
                      >
                        <div className="text-xs font-bold">Ambas Sedes (Recomendado)</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Usa columnas STOCK_ICA y STOCK_HUANCAYO
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModoImportacion('ica')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          modoImportacion === 'ica'
                            ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 font-bold'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100/60 font-medium'
                        }`}
                      >
                        <div className="text-xs font-bold">Solo Sede Ica</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Actualiza únicamente el stock físico de Ica
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModoImportacion('huancayo')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          modoImportacion === 'huancayo'
                            ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 font-bold'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100/60 font-medium'
                        }`}
                      >
                        <div className="text-xs font-bold">Solo Sede Huancayo</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Actualiza únicamente el stock físico de Huancayo
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Zona Drag & Drop */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-300 hover:border-zinc-900 rounded-3xl p-8 text-center cursor-pointer transition-all bg-zinc-50/50 hover:bg-zinc-50 group space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-zinc-950 group-hover:scale-110 group-hover:border-zinc-950 transition-all shadow-xs">
                      {isAnalizando ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">
                        {isAnalizando ? 'Analizando archivo Excel...' : 'Arrastra tu archivo Excel aquí o haz clic para explorar'}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Formatos soportados: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100">
                      <span>Consejo: Descarga primero el inventario actual para rellenarlo sin errores</span>
                    </div>
                  </div>

                  {errorAnalisis && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <strong>Error al leer el archivo:</strong> {errorAnalisis}
                      </div>
                    </div>
                  )}

                  {/* Acceso Rápido a Descarga de Plantilla */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-100/70 border border-zinc-200 text-xs text-zinc-600">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-zinc-500" />
                      <span>¿Quieres el archivo con todos los productos ya ordenados para llenarlo?</span>
                    </div>
                    <button
                      onClick={() => handleDescargarExcel(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-300 font-bold text-zinc-900 hover:bg-zinc-50 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Descargar Inventario Actual (.xlsx)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Vista Previa y Auditoría (Cuando el archivo ya fue analizado) */}
              {!resultadoFinal && !isAplicando && resumen && (
                <div className="space-y-4">
                  {/* Resumen de KPIs de la auditoría */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                        A Modificar
                      </span>
                      <p className="text-xl font-black text-emerald-950 font-mono mt-0.5">
                        {resumen.totalModificados}
                      </p>
                      <span className="text-[11px] text-emerald-600 font-medium">Productos con cambio</span>
                    </div>

                    <div className="bg-zinc-100 border border-zinc-200 p-3.5 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                        Sin Cambios
                      </span>
                      <p className="text-xl font-black text-zinc-800 font-mono mt-0.5">
                        {resumen.totalSinCambios}
                      </p>
                      <span className="text-[11px] text-zinc-500">Mismo stock que en BD</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                        No Encontrados
                      </span>
                      <p className="text-xl font-black text-amber-950 font-mono mt-0.5">
                        {resumen.itemsNoEncontrados.length}
                      </p>
                      <span className="text-[11px] text-amber-600">Filas sin coincidencia</span>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                        Total Filas
                      </span>
                      <p className="text-xl font-black text-zinc-950 font-mono mt-0.5">
                        {resumen.totalFilas}
                      </p>
                      <span className="text-[11px] text-zinc-400 truncate block">
                        {resumen.nombreArchivo}
                      </span>
                    </div>
                  </div>

                  {/* Motivo del Kardex */}
                  <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100 space-y-1">
                    <label className="text-xs font-bold text-purple-950 flex items-center justify-between">
                      <span>Motivo para el Kardex (Auditoría oficial)</span>
                      <span className="text-[10px] text-purple-600 font-normal">
                        Quedará guardado en el historial de movimientos
                      </span>
                    </label>
                    <input
                      type="text"
                      value={motivoKardex}
                      onChange={(e) => setMotivoKardex(e.target.value)}
                      placeholder="Ej: Inventario físico inicial previo a asignación de cajas"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-purple-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Barra de Filtros de la Tabla */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setFiltroEstado('modificados')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          filtroEstado === 'modificados'
                            ? 'bg-zinc-950 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        Modificados ({resumen.totalModificados})
                      </button>

                      <button
                        type="button"
                        onClick={() => setFiltroEstado('todos')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          filtroEstado === 'todos'
                            ? 'bg-zinc-950 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        Todos ({resumen.items.length})
                      </button>

                      {resumen.itemsNoEncontrados.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFiltroEstado('no_encontrados')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filtroEstado === 'no_encontrados'
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          No Encontrados ({resumen.itemsNoEncontrados.length})
                        </button>
                      )}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={busquedaTabla}
                        onChange={(e) => setBusquedaTabla(e.target.value)}
                        placeholder="Buscar producto o SKU..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950"
                      />
                    </div>
                  </div>

                  {/* Tabla de Previsualización */}
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {filtroEstado === 'no_encontrados' ? (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold text-[11px] uppercase">
                          <tr>
                            <th className="p-3">Fila Excel</th>
                            <th className="p-3">Código / SKU Detectado</th>
                            <th className="p-3">Nombre en Fila</th>
                            <th className="p-3">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {resumen.itemsNoEncontrados.map((item, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/40">
                              <td className="p-3 font-mono font-bold text-zinc-500">#{item.filaExcel}</td>
                              <td className="p-3 font-mono font-bold text-zinc-900">{item.codigoIdentificador}</td>
                              <td className="p-3 text-zinc-700">{item.nombreDetectado}</td>
                              <td className="p-3 text-amber-600">{item.motivo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold text-[11px] uppercase sticky top-0 z-10">
                          <tr>
                            <th className="p-2.5">SKU / Producto</th>
                            <th className="p-2.5 text-center">Sede Ica</th>
                            <th className="p-2.5 text-center">Sede Huancayo</th>
                            <th className="p-2.5 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {itemsFiltrados.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-zinc-400">
                                No hay productos que coincidan con el filtro actual.
                              </td>
                            </tr>
                          ) : (
                            itemsFiltrados.map((item) => (
                              <tr
                                key={item.productoId}
                                className={`hover:bg-zinc-50/80 transition-colors ${
                                  item.estado === 'actualizado' ? 'bg-emerald-50/20' : ''
                                }`}
                              >
                                <td className="p-2.5">
                                  <div className="font-bold text-zinc-900 line-clamp-1">{item.nombre}</div>
                                  <div className="text-[11px] font-mono text-zinc-400">{item.sku}</div>
                                </td>

                                {/* Stock Ica */}
                                <td className="p-2.5 text-center font-mono">
                                  {item.cambioIca ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="text-zinc-400 line-through">{item.stockIcaAnterior}</span>
                                      <ArrowRight className="w-3 h-3 text-zinc-400" />
                                      <span className="font-bold text-emerald-600">{item.stockIcaNuevo}</span>
                                      <span className={`text-[10px] px-1 py-0.2 rounded font-black ${
                                        item.diffIca > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {item.diffIca > 0 ? `+${item.diffIca}` : item.diffIca}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-600">{item.stockIcaAnterior}</span>
                                  )}
                                </td>

                                {/* Stock Huancayo */}
                                <td className="p-2.5 text-center font-mono">
                                  {item.cambioHyo ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="text-zinc-400 line-through">{item.stockHyoAnterior}</span>
                                      <ArrowRight className="w-3 h-3 text-zinc-400" />
                                      <span className="font-bold text-purple-600">{item.stockHyoNuevo}</span>
                                      <span className={`text-[10px] px-1 py-0.2 rounded font-black ${
                                        item.diffHyo > 0 ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {item.diffHyo > 0 ? `+${item.diffHyo}` : item.diffHyo}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-600">{item.stockHyoAnterior}</span>
                                  )}
                                </td>

                                {/* Estado */}
                                <td className="p-2.5 text-right">
                                  {item.estado === 'actualizado' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Modificado
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-zinc-400 font-medium">Sin cambios</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Botones de Acción de Confirmación */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResumen(null);
                        setArchivoSeleccionado(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all"
                    >
                      Elegir Otro Archivo
                    </button>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmarActualizacion}
                        disabled={resumen.totalModificados === 0}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar y Actualizar {resumen.totalModificados} Productos</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 2: DESCARGAR / EXPORTAR INVENTARIO */}
          {/* ================================================================= */}
          {tabActiva === 'exportar' && (
            <div className="space-y-6">
              {/* Selector de Sede para Exportación */}
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 space-y-2">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-2">
                  <Store className="w-4 h-4 text-purple-600" />
                  <span>Sede a incluir en el reporte</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSedeDescarga('todas')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      sedeDescarga === 'todas'
                        ? 'bg-zinc-950 border-zinc-950 text-white font-bold'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="text-xs font-bold">Todo el Sistema ({catalogoCompleto.length})</div>
                    <div className="text-[10px] opacity-75">Ica y Huancayo juntos</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSedeDescarga('ica')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      sedeDescarga === 'ica'
                        ? 'bg-zinc-950 border-zinc-950 text-white font-bold'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="text-xs font-bold">Solo Sede Ica ({conteoIca})</div>
                    <div className="text-[10px] opacity-75">Únicamente productos de Ica</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSedeDescarga('huancayo')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      sedeDescarga === 'huancayo'
                        ? 'bg-zinc-950 border-zinc-950 text-white font-bold'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="text-xs font-bold">Solo Sede Huancayo ({conteoHyo})</div>
                    <div className="text-[10px] opacity-75">Únicamente productos de Huancayo</div>
                  </button>
                </div>
              </div>

              {/* Tarjetas de Opciones de Descarga */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opción A: Inventario Actual Completo */}
                <div className="p-5 rounded-2xl border border-zinc-200 bg-white hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Inventario Actual con Cantidades
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Descarga el Excel con los <strong>{conteoSeleccionado} productos</strong> de {sedeDescarga === 'todas' ? 'todo el sistema' : `Sede ${sedeDescarga === 'ica' ? 'Ica' : 'Huancayo'}`} y sus cantidades exactas.
                    </p>
                    <ul className="text-[11px] text-zinc-600 space-y-1 list-disc pl-4 pt-1">
                      <li>Filtrado exacto: no incluye productos de otras tiendas.</li>
                      <li>Puedes editar las cantidades y subirlo de vuelta.</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleDescargarExcel(false)}
                    disabled={isDescargando}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-zinc-950 text-white hover:bg-zinc-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isDescargando ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>Descargar Inventario {sedeDescarga === 'todas' ? 'General' : sedeDescarga === 'ica' ? 'Sede Ica' : 'Sede Huancayo'} (.xlsx)</span>
                  </button>
                </div>

                {/* Opción B: Plantilla Oficial para Conteo Físico */}
                <div className="p-5 rounded-2xl border border-zinc-200 bg-white hover:border-purple-500/50 hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <FileDown className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Plantilla Base para Conteo Físico
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Genera el formato oficial con los nombres y códigos de los productos, pero con las columnas de stock en cero o en blanco.
                    </p>
                    <ul className="text-[11px] text-zinc-600 space-y-1 list-disc pl-4 pt-1">
                      <li>Para imprimir o enviar al personal para toma de inventario.</li>
                      <li>Evita que alteren los códigos SKU originales.</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleDescargarExcel(true)}
                    disabled={isDescargando}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    {isDescargando ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-purple-600" />
                    )}
                    <span>Descargar Plantilla Base (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Guía Rápida */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-600 space-y-2">
                <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Paso a paso para cuadrar el inventario:
                </span>
                <ol className="list-decimal pl-4 space-y-1 text-zinc-500">
                  <li>Haz clic en <strong>Descargar Inventario Actual</strong>.</li>
                  <li>Abre el archivo en tu computadora y ajusta las columnas de stock según lo que hay físicamente en cada tienda.</li>
                  <li>Ve a la pestaña <strong>Actualizar Stock desde Excel</strong> y sube el archivo.</li>
                  <li>Revisa la previsualización y presiona <strong>Confirmar y Actualizar</strong>. ¡Listo!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
