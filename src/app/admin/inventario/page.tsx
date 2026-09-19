'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDateTime } from '@/lib/utils';
import { MovimientoInventario, TipoMovimientoInventario, Producto } from '@/types/database';
import {
  getMovimientosKardexPaginado,
  getProductosParaKardex,
  registrarMovimientoKardex,
} from '@/lib/kardex-service';
import { supabase } from '@/lib/supabase';
import {
  Search,
  Plus,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  Scissors,
  SlidersHorizontal,
  Package,
  Boxes,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=300';

const ITEMS_POR_PAGINA = 10;

export default function AdminInventarioPage() {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Paginación (10 registros por página)
  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Métricas generales
  const [metricas, setMetricas] = useState({
    entradas: 0,
    salidas: 0,
    usoClases: 0,
    ajustes: 0,
    total: 0,
  });

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimientoInventario | 'TODOS'>('TODOS');
  const [filtroProductoId, setFiltroProductoId] = useState<string>('todos');

  // Modal de registro
  const [showModalMovimiento, setShowModalMovimiento] = useState(false);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [tipoMov, setTipoMov] = useState<TipoMovimientoInventario>('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // 1. Cargar datos paginados (exactamente 10 por página)
  // -------------------------------------------------------------------------
  const cargarDatos = useCallback(
    async (silencioso = false, paginaDestino = pagina) => {
      if (!silencioso) setIsRefreshing(true);
      try {
        const [kardexData, prodsData] = await Promise.all([
          getMovimientosKardexPaginado({
            productoId: filtroProductoId,
            tipo: filtroTipo,
            busqueda: busqueda.trim(),
            pagina: paginaDestino,
            porPagina: ITEMS_POR_PAGINA,
          }),
          getProductosParaKardex(),
        ]);

        setMovimientos(kardexData.movimientos);
        setTotalRegistros(kardexData.totalRegistros);
        setTotalPaginas(kardexData.totalPaginas);
        setMetricas(kardexData.totalesGenerales);
        setProductos(prodsData);

        if (prodsData.length > 0) {
          setSelectedProdId((curr) => curr || prodsData[0].id);
        }
      } catch (err) {
        console.error('Error al cargar datos del Kardex:', err);
      } finally {
        setIsLoading(false);
        if (!silencioso) setIsRefreshing(false);
      }
    },
    [pagina, filtroProductoId, filtroTipo, busqueda]
  );

  // Efecto inicial y cuando cambia la página
  useEffect(() => {
    cargarDatos(false, pagina);
  }, [pagina, cargarDatos]);

  // Reset a página 1 cuando cambian los filtros o el texto de búsqueda
  const handleCambioFiltroTipo = (tipo: TipoMovimientoInventario | 'TODOS') => {
    setFiltroTipo(tipo);
    setPagina(1);
  };

  const handleCambioFiltroProducto = (prodId: string) => {
    setFiltroProductoId(prodId);
    setPagina(1);
  };

  const handleCambioBusqueda = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value);
    setPagina(1);
  };

  // -------------------------------------------------------------------------
  // 2. Suscripción en Tiempo Real con Supabase WebSockets
  // -------------------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel('kardex-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movimientos_inventario' },
        () => {
          cargarDatos(true, pagina);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        () => {
          cargarDatos(true, pagina);
        }
      )
      .subscribe();

    const onFocus = () => cargarDatos(true, pagina);
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [cargarDatos, pagina]);

  // -------------------------------------------------------------------------
  // 3. Lógica del Producto Seleccionado en el Modal
  // -------------------------------------------------------------------------
  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id === selectedProdId) || productos[0];
  }, [productos, selectedProdId]);

  const stockActualProd = productoSeleccionado?.stock ?? 0;
  const cantParsed = parseInt(cantidad, 10) || 0;

  const stockProyectado = useMemo(() => {
    if (tipoMov === 'ENTRADA') return stockActualProd + cantParsed;
    if (tipoMov === 'SALIDA' || tipoMov === 'USO_CLASE') {
      return stockActualProd - cantParsed;
    }
    if (tipoMov === 'AJUSTE') return cantParsed;
    return stockActualProd;
  }, [tipoMov, stockActualProd, cantParsed]);

  const stockInsuficiente =
    (tipoMov === 'SALIDA' || tipoMov === 'USO_CLASE') &&
    cantParsed > 0 &&
    cantParsed > stockActualProd;

  // -------------------------------------------------------------------------
  // 4. Enviar Registro de Movimiento a Supabase
  // -------------------------------------------------------------------------
  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProdId) {
      setFormError('Por favor selecciona un producto');
      return;
    }

    if (!cantidad || cantParsed <= 0) {
      setFormError('La cantidad ingresada debe ser mayor a 0');
      return;
    }

    if (!motivo.trim()) {
      setFormError('Debes ingresar el motivo o justificación');
      return;
    }

    if (stockInsuficiente) {
      setFormError(
        `Stock insuficiente. El producto solo cuenta con ${stockActualProd} unidades disponibles.`
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await registrarMovimientoKardex({
        producto_id: selectedProdId,
        tipo: tipoMov,
        cantidad: cantParsed,
        motivo: motivo.trim(),
        usuario_nombre: 'Diego Galindo (Admin)',
      });

      if (res.success && res.data) {
        // Recargar página 1 para ver el nuevo movimiento de inmediato
        setPagina(1);
        await cargarDatos(false, 1);

        setShowModalMovimiento(false);
        setCantidad('');
        setMotivo('');
        setToastMessage('¡Movimiento Kardex registrado exitosamente!');
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setFormError(res.error || 'Ocurrió un error al guardar el movimiento');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Cálculo de rango visual de paginación
  const primerItemVisible = totalRegistros === 0 ? 0 : (pagina - 1) * ITEMS_POR_PAGINA + 1;
  const ultimoItemVisible = Math.min(pagina * ITEMS_POR_PAGINA, totalRegistros);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notificación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-950 text-white px-4 py-3 rounded-xl shadow-2xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-zinc-950 tracking-tight">
            Kardex de Inventario
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Control cronológico oficial de entradas por compras a distribuidores, salidas por ventas en mostrador y consumo en clases.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => cargarDatos(false, pagina)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition-colors disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setShowModalMovimiento(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Movimiento</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas (KPIs Globales) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Total Entradas
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-zinc-950 font-mono mt-1">
            +{metricas.entradas} <span className="text-xs font-medium text-zinc-500">un.</span>
          </p>
          <span className="text-[10px] text-zinc-400">Compras a distribuidores</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Total Salidas
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-zinc-950 font-mono mt-1">
            -{metricas.salidas} <span className="text-xs font-medium text-zinc-500">un.</span>
          </p>
          <span className="text-[10px] text-zinc-400">Ventas en tienda & POS</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Consumo Clases
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Scissors className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-zinc-950 font-mono mt-1">
            -{metricas.usoClases} <span className="text-xs font-medium text-zinc-500">un.</span>
          </p>
          <span className="text-[10px] text-zinc-400">Prácticas de academia</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Total Registros
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <History className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black text-zinc-950 font-mono mt-1">
            {metricas.total}{' '}
            <span className="text-xs font-medium text-zinc-500">movs.</span>
          </p>
          <span className="text-[10px] text-zinc-400">{metricas.ajustes} ajustes de inventario</span>
        </div>
      </div>

      {/* Contenedor Principal: Filtros, Tabla y Paginación */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Barra de Búsqueda y Filtros Superiores */}
        <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Input Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por producto, SKU, motivo o comprobante..."
              value={busqueda}
              onChange={handleCambioBusqueda}
              className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-black focus:bg-white transition-all font-medium"
            />
            {busqueda && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setPagina(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros por Tipo y Producto */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Producto */}
            <select
              value={filtroProductoId}
              onChange={(e) => handleCambioFiltroProducto(e.target.value)}
              className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 outline-none focus:border-black font-medium"
            >
              <option value="todos">Todos los productos</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.stock} un.)
                </option>
              ))}
            </select>

            {/* Pestañas de Tipo de Movimiento */}
            <div className="inline-flex bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              {(
                [
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'ENTRADA', label: 'Entradas' },
                  { id: 'SALIDA', label: 'Salidas' },
                  { id: 'USO_CLASE', label: 'Clases' },
                  { id: 'AJUSTE', label: 'Ajustes' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleCambioFiltroTipo(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all text-[11px] ${
                    filtroTipo === tab.id
                      ? 'bg-white text-zinc-950 shadow-xs font-bold'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla Kardex (10 Registros por Página) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-zinc-50/80 text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Fecha & Hora</th>
                <th className="px-5 py-3.5 font-semibold">Producto</th>
                <th className="px-5 py-3.5 font-semibold">Tipo</th>
                <th className="px-5 py-3.5 font-semibold">Motivo / Detalle</th>
                <th className="px-5 py-3.5 font-semibold text-center">Variación</th>
                <th className="px-5 py-3.5 font-semibold text-center">Stock Anterior</th>
                <th className="px-5 py-3.5 font-semibold text-center">Stock Final</th>
                <th className="px-5 py-3.5 font-semibold">Responsable</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                      <p className="text-xs font-mono">Cargando 10 movimientos de inventario...</p>
                    </div>
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="w-8 h-8 text-zinc-300 stroke-1" />
                      <p className="font-semibold text-zinc-700">No se encontraron movimientos registrados</p>
                      <p className="text-[11px] text-zinc-400 max-w-sm">
                        {busqueda || filtroTipo !== 'TODOS' || filtroProductoId !== 'todos'
                          ? 'Prueba modificando los filtros o el término de búsqueda.'
                          : 'Comienza registrando tu primer movimiento o realiza una venta en mostrador.'}
                      </p>
                      <button
                        onClick={() => setShowModalMovimiento(true)}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800 transition-colors"
                      >
                        Registrar Movimiento
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                movimientos.map((m) => {
                  const prod = m.producto || productos.find((p) => p.id === m.producto_id);
                  const prodNombre = prod?.nombre || 'Producto';
                  const prodSku = prod?.sku || 'GAL-PROD';
                  const prodImg =
                    prod?.imagenes && prod.imagenes.length > 0
                      ? prod.imagenes[0]
                      : DEFAULT_PRODUCT_IMAGE;

                  let badge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {m.tipo}
                    </span>
                  );
                  let variacionColor = 'text-zinc-950';
                  let signo = '';

                  if (m.tipo === 'ENTRADA') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ArrowDownRight className="w-3 h-3" />
                        ENTRADA
                      </span>
                    );
                    variacionColor = 'text-emerald-600';
                    signo = '+';
                  } else if (m.tipo === 'SALIDA') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                        <ArrowUpRight className="w-3 h-3" />
                        SALIDA
                      </span>
                    );
                    variacionColor = 'text-rose-600';
                    signo = '-';
                  } else if (m.tipo === 'USO_CLASE') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                        <Scissors className="w-3 h-3" />
                        CLASES
                      </span>
                    );
                    variacionColor = 'text-blue-600';
                    signo = '-';
                  } else if (m.tipo === 'AJUSTE') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
                        <SlidersHorizontal className="w-3 h-3" />
                        AJUSTE
                      </span>
                    );
                    variacionColor = 'text-amber-700';
                    signo = m.stock_nuevo >= m.stock_anterior ? '+' : '-';
                  }

                  return (
                    <tr key={m.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Fecha y hora */}
                      <td
                        suppressHydrationWarning
                        className="px-5 py-3.5 text-zinc-500 whitespace-nowrap font-mono text-[11px]"
                      >
                        {formatDateTime(m.fecha)}
                      </td>

                      {/* Producto */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                            <img
                              src={prodImg}
                              alt={prodNombre}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-950 truncate max-w-xs sm:max-w-sm">
                              {prodNombre}
                            </p>
                            <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                              {prodSku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-5 py-3.5 whitespace-nowrap">{badge}</td>

                      {/* Motivo */}
                      <td className="px-5 py-3.5 text-zinc-700 max-w-xs">
                        <p className="truncate font-medium">{m.motivo}</p>
                        {m.referencia_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                            <Store className="w-2.5 h-2.5" /> Ref: {m.referencia_id}
                          </span>
                        )}
                      </td>

                      {/* Variación */}
                      <td
                        className={`px-5 py-3.5 text-center font-mono font-bold whitespace-nowrap ${variacionColor}`}
                      >
                        {signo}
                        {m.cantidad} un.
                      </td>

                      {/* Stock Anterior */}
                      <td className="px-5 py-3.5 text-center text-zinc-500 font-mono whitespace-nowrap">
                        {m.stock_anterior} un.
                      </td>

                      {/* Stock Resultante */}
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-zinc-950 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200">
                          {m.stock_nuevo} un.
                        </span>
                      </td>

                      {/* Responsable */}
                      <td className="px-5 py-3.5 text-zinc-500 text-[11px] whitespace-nowrap font-medium">
                        {m.usuario_nombre || 'Diego Galindo'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación Oficial de 10 en 10 */}
        <div className="p-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-600">
          <div className="font-mono">
            Mostrando <b>{primerItemVisible}</b> a <b>{ultimoItemVisible}</b> de{' '}
            <b>{totalRegistros}</b> movimientos (10 por página)
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1 || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((num) => Math.abs(num - pagina) <= 2 || num === 1 || num === totalPaginas)
                .map((num, idx, arr) => {
                  const showEllipsis = idx > 0 && num - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={num}>
                      {showEllipsis && <span className="px-1 text-zinc-400">...</span>}
                      <button
                        onClick={() => setPagina(num)}
                        disabled={isLoading}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                          pagina === num
                            ? 'bg-zinc-950 text-white shadow-xs'
                            : 'bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {num}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Modal: Registrar Movimiento Kardex                                        */}
      {/* ========================================================================= */}
      {showModalMovimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl p-6 space-y-5 shadow-2xl">
            {/* Encabezado Modal */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                    Registrar Movimiento Kardex
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Afecta directamente el stock oficial del producto.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalMovimiento(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Formulario */}
            {formError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRegistrarMovimiento} className="space-y-4 text-xs">
              {/* Selector de Producto */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Producto a Afectar *
                </label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-950 font-medium outline-none focus:border-black focus:bg-white transition-all text-xs"
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — SKU: {p.sku} (Stock actual: {p.stock} un.)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Operación */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Tipo de Operación *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'ENTRADA',
                      title: 'Entrada (Compra)',
                      desc: '+ Suma stock',
                      icon: ArrowDownRight,
                      color: 'border-emerald-300 bg-emerald-50/60 text-emerald-800',
                    },
                    {
                      id: 'SALIDA',
                      title: 'Salida (Venta/Baja)',
                      desc: '- Resta stock',
                      icon: ArrowUpRight,
                      color: 'border-rose-300 bg-rose-50/60 text-rose-800',
                    },
                    {
                      id: 'USO_CLASE',
                      title: 'Consumo Academia',
                      desc: '- Para clases prácticas',
                      icon: Scissors,
                      color: 'border-blue-300 bg-blue-50/60 text-blue-800',
                    },
                    {
                      id: 'AJUSTE',
                      title: 'Ajuste / Cuadre',
                      desc: '= Conteo físico final',
                      icon: SlidersHorizontal,
                      color: 'border-amber-300 bg-amber-50/60 text-amber-800',
                    },
                  ].map((op) => {
                    const OpIcon = op.icon;
                    const isSelected = tipoMov === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setTipoMov(op.id as TipoMovimientoInventario)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? `${op.color} ring-2 ring-black font-bold shadow-xs`
                            : 'border-zinc-200 bg-zinc-50/80 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <OpIcon className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold leading-tight">{op.title}</p>
                          <span className="text-[10px] text-zinc-500 font-normal leading-tight">
                            {op.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cantidad y Motivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    {tipoMov === 'AJUSTE' ? 'Nuevo Conteo Físico *' : 'Cantidad (Unidades) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ej: 10"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border text-zinc-950 font-mono font-bold outline-none focus:bg-white text-xs ${
                      stockInsuficiente
                        ? 'border-rose-500 text-rose-700 bg-rose-50'
                        : 'border-zinc-300 focus:border-black'
                    }`}
                  />
                  {stockInsuficiente && (
                    <span className="text-[10px] text-rose-600 font-medium mt-1 block">
                      Excede el stock actual ({stockActualProd} un.)
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Motivo / Justificación *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Compra proveedor Wahl..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-950 outline-none focus:border-black focus:bg-white text-xs font-medium"
                  />
                </div>
              </div>

              {/* Caja de Proyección de Stock */}
              {productoSeleccionado && (
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">
                      Stock Actual
                    </span>
                    <span className="font-bold text-zinc-900 text-sm">
                      {stockActualProd} un.
                    </span>
                  </div>

                  <span className="text-zinc-400 font-sans text-xs">➔</span>

                  <div className="text-right">
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">
                      Stock Resultante
                    </span>
                    <span
                      className={`font-black text-sm ${
                        stockProyectado < 0
                          ? 'text-rose-600'
                          : stockProyectado > stockActualProd
                          ? 'text-emerald-600'
                          : 'text-zinc-900'
                      }`}
                    >
                      {cantParsed > 0 ? `${stockProyectado} un.` : `${stockActualProd} un.`}
                    </span>
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModalMovimiento(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || stockInsuficiente}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-zinc-950 text-white hover:bg-zinc-800 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Confirmar y Guardar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
