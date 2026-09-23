'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  GraduationCap,
  Store,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  X,
  Printer,
} from 'lucide-react';
import { DetallePedidoModal } from '@/components/admin/pedidos/DetallePedidoModal';
import {
  PedidoCompleto,
  EstadisticasPedidos,
  getPedidosAdmin,
  getEstadisticasPedidos,
  actualizarEstadoPedido,
  FiltrosPedidosAdmin,
} from '@/lib/pedidos-service';
import { formatCurrency, generateWhatsAppLink } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function AdminPedidosPage() {
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Datos
  const [pedidos, setPedidos] = useState<PedidoCompleto[]>([]);
  const [stats, setStats] = useState<EstadisticasPedidos>({
    totalPedidos: 0,
    pendientes: 0,
    entregados: 0,
    totalFacturado: 0,
    totalAcademia: 0,
    totalTienda: 0,
  });

  // Modal de Detalle
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoCompleto | null>(null);
  const pedidoSeleccionadoIdRef = useRef<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialModalTab, setInitialModalTab] = useState<'DETALLE' | 'WHATSAPP' | 'ACADEMIA'>('DETALLE');

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO'>('TODOS');
  const [filtroCanal, setFiltroCanal] = useState<'TODOS' | 'WEB_TIENDA' | 'ACADEMIA' | 'POS_MOSTRADOR'>('TODOS');
  const [filtroSede, setFiltroSede] = useState<'TODAS' | 'Ica' | 'Huancayo'>('TODAS');
  const [filtroFecha, setFiltroFecha] = useState<'TODAS' | 'HOY' | 'SEMANA'>('TODAS');

  // Cargar datos (Sin dependencias circulares)
  const cargarDatos = useCallback(async () => {
    try {
      const filtros: FiltrosPedidosAdmin = {
        busqueda,
        estado: filtroEstado,
        canal: filtroCanal,
        sede: filtroSede,
        fecha: filtroFecha,
      };

      const [lista, estadisticas] = await Promise.all([
        getPedidosAdmin(filtros),
        getEstadisticasPedidos(),
      ]);

      setPedidos(lista);
      setStats(estadisticas);

      // Si hay un pedido abierto en el modal, actualizar únicamente si cambió algo relevante
      const currentSelectedId = pedidoSeleccionadoIdRef.current;
      if (currentSelectedId) {
        const actualizado = lista.find((p) => p.id === currentSelectedId);
        if (actualizado) {
          setPedidoSeleccionado((prev) => {
            if (!prev) return actualizado;
            if (
              prev.id === actualizado.id &&
              prev.estado === actualizado.estado &&
              prev.actualizado_en === actualizado.actualizado_en &&
              prev.notas === actualizado.notas &&
              prev.items.length === actualizado.items.length
            ) {
              return prev; // Mantiene la misma referencia de objeto para no causar re-render loop
            }
            return actualizado;
          });
        }
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [busqueda, filtroEstado, filtroCanal, filtroSede, filtroFecha]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Suscripción Realtime a nuevos pedidos
  useEffect(() => {
    const handleEventoLocal = () => cargarDatos();
    window.addEventListener('galindo_pedido_web_realizado', handleEventoLocal);

    const channel = supabase
      .channel('admin_pedidos_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          cargarDatos();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('galindo_pedido_web_realizado', handleEventoLocal);
      supabase.removeChannel(channel);
    };
  }, [cargarDatos]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const handleOpenDetalle = (ped: PedidoCompleto, tab: 'DETALLE' | 'WHATSAPP' | 'ACADEMIA' = 'DETALLE') => {
    pedidoSeleccionadoIdRef.current = ped.id;
    setPedidoSeleccionado(ped);
    setInitialModalTab(tab);
    setModalOpen(true);
  };

  const handleQuickEntregar = async (e: React.MouseEvent, pedido: PedidoCompleto) => {
    e.stopPropagation();
    await actualizarEstadoPedido(pedido.id, 'ENTREGADO');
    await cargarDatos();
    handleOpenDetalle(pedido, 'WHATSAPP');
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'PAGADO':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'ENTREGADO':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'CANCELADO':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };

  const getCanalBadge = (canal: string) => {
    switch (canal) {
      case 'ACADEMIA':
        return {
          icon: GraduationCap,
          label: 'Academia',
          color: 'bg-amber-100 text-amber-900 border-amber-200',
        };
      case 'WEB_TIENDA':
        return {
          icon: ShoppingBag,
          label: 'Tienda Web',
          color: 'bg-blue-100 text-blue-900 border-blue-200',
        };
      case 'POS_MOSTRADOR':
        return {
          icon: Store,
          label: 'Mostrador POS',
          color: 'bg-zinc-100 text-zinc-900 border-zinc-200',
        };
      default:
        return {
          icon: ShoppingBag,
          label: 'Web',
          color: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
          
          {/* TÍTULO Y ACCIONES DE CABECERA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-950 uppercase tracking-tight">
                  Gestión de Pedidos & Ventas
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Control centralizado de compras de la tienda supply, matrículas web y despachos en vivo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-2 text-xs font-semibold"
                title="Actualizar listado"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-black' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
          </div>

          {/* TARJETAS DE KPIS / MÉTRICAS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Pedidos */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
              <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                Total Pedidos
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
                  {stats.totalPedidos}
                </span>
                <span className="text-[10px] text-zinc-500">Historial completo</span>
              </div>
            </div>

            {/* Pendientes de Atención */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-amber-700 block">
                  Por Atender / Entregar
                </span>
                {stats.pendientes > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
                  {stats.pendientes}
                </span>
                <span className="text-[10px] font-bold text-amber-700">Requieren despacho</span>
              </div>
            </div>

            {/* Entregados / Completados */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
              <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                Entregados
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                  {stats.entregados}
                </span>
                <span className="text-[10px] text-zinc-500">Atendidos con éxito</span>
              </div>
            </div>

            {/* Facturación Total */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
              <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                Total Facturado
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-zinc-950 font-mono truncate">
                  {formatCurrency(stats.totalFacturado)}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 flex items-center justify-between pt-0.5 font-mono">
                <span>Tienda: {formatCurrency(stats.totalTienda)}</span>
                <span>•</span>
                <span>Academia: {formatCurrency(stats.totalAcademia)}</span>
              </div>
            </div>
          </div>

          {/* BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Input de Búsqueda */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código (WEB-2026-...), cliente, celular, DNI o producto..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none bg-zinc-50/50"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="p-1 text-zinc-400 hover:text-black absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Selectores de Filtro */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Canal */}
                <select
                  value={filtroCanal}
                  onChange={(e) => setFiltroCanal(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold bg-white text-zinc-800 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos los Canales</option>
                  <option value="WEB_TIENDA">Tienda Web Supply 🛍️</option>
                  <option value="ACADEMIA">Academia & Matrícula 🎓</option>
                  <option value="POS_MOSTRADOR">Mostrador POS 🏪</option>
                </select>

                {/* Sede */}
                <select
                  value={filtroSede}
                  onChange={(e) => setFiltroSede(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold bg-white text-zinc-800 outline-none cursor-pointer"
                >
                  <option value="TODAS">Todas las Sedes</option>
                  <option value="Ica">Sede Ica</option>
                  <option value="Huancayo">Sede Huancayo</option>
                </select>

                {/* Fecha */}
                <select
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold bg-white text-zinc-800 outline-none cursor-pointer"
                >
                  <option value="TODAS">Historial Completo</option>
                  <option value="HOY">Solo Hoy</option>
                  <option value="SEMANA">Últimos 7 días</option>
                </select>
              </div>
            </div>

            {/* Pestañas de Estado */}
            <div className="flex border-t border-zinc-100 pt-3 overflow-x-auto gap-1 text-xs">
              {(
                [
                  { id: 'TODOS', label: 'Todos los Estados' },
                  { id: 'PENDIENTE', label: `Pendientes (${stats.pendientes})` },
                  { id: 'ENTREGADO', label: `Entregados (${stats.entregados})` },
                  { id: 'PAGADO', label: 'Pagados' },
                  { id: 'CANCELADO', label: 'Anulados' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFiltroEstado(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    filtroEstado === tab.id
                      ? 'bg-black text-white shadow-2xs'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TABLA DE PEDIDOS */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            {cargando ? (
              <div className="py-20 text-center text-zinc-400">
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-semibold text-zinc-600">Cargando pedidos de Supabase...</p>
              </div>
            ) : pedidos.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto shadow-2xs">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">No se encontraron pedidos</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 max-w-sm mx-auto">
                    {busqueda || filtroEstado !== 'TODOS' || filtroCanal !== 'TODOS'
                      ? 'Intenta ajustar los filtros o el texto de búsqueda para encontrar los pedidos deseados.'
                      : 'Aún no se han recibido compras web ni ventas en el sistema.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Código / Canal</th>
                      <th className="py-3 px-4">Fecha & Sede</th>
                      <th className="py-3 px-4">Cliente / Contacto</th>
                      <th className="py-3 px-4">Resumen Ítems</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/70">
                    {pedidos.map((pedido) => {
                      const canalInfo = getCanalBadge(pedido.tipo_canal);
                      const CanalRowIcon = canalInfo.icon;

                      return (
                        <tr
                          key={pedido.id}
                          onClick={() => handleOpenDetalle(pedido)}
                          className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Código y Canal */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-zinc-950 group-hover:underline">
                              {pedido.codigo_pedido}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border mt-1 ${canalInfo.color}`}>
                              <CanalRowIcon className="w-2.5 h-2.5" />
                              <span>{canalInfo.label}</span>
                            </span>
                          </td>

                          {/* Fecha y Sede */}
                          <td className="py-3.5 px-4">
                            <div className="text-zinc-900 font-medium font-mono text-[11px]">
                              {new Date(pedido.creado_en).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              {pedido.sede_nombre}
                            </div>
                          </td>

                          {/* Cliente */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-950">
                              {pedido.cliente_nombre}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{pedido.cliente_telefono || 'Sin celular'}</span>
                              {pedido.cliente_dni && <span>• DNI {pedido.cliente_dni}</span>}
                            </div>
                          </td>

                          {/* Resumen Ítems */}
                          <td className="py-3.5 px-4">
                            <div className="text-zinc-800 font-medium max-w-[220px] truncate">
                              {pedido.items.length > 0
                                ? pedido.items.map((i) => `${i.cantidad}x ${i.nombre_producto}`).join(', ')
                                : pedido.notas || 'Sin detalle'}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {pedido.items.length} {pedido.items.length === 1 ? 'concepto' : 'conceptos'}
                            </div>
                          </td>

                          {/* Total & Método */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            <div className="font-black text-zinc-950 text-sm">
                              {formatCurrency(pedido.total)}
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase">
                              {pedido.metodo_pago}
                            </span>
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getEstadoBadge(pedido.estado)}`}>
                              {pedido.estado}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Acciones para Academia: Inscribir (si está pendiente) o Matriculado (si ya se formalizó) */}
                              {pedido.tipo_canal === 'ACADEMIA' && (
                                pedido.notas?.includes('[Matrícula formalizada:') ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetalle(pedido, 'ACADEMIA')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Ver matrícula oficial y expediente del alumno"
                                  >
                                    <GraduationCap className="w-3 h-3 text-emerald-700" />
                                    <span>Matriculado</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetalle(pedido, 'ACADEMIA')}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1"
                                    title="Rellenar datos faltantes e inscribir alumno"
                                  >
                                    <GraduationCap className="w-3 h-3" />
                                    <span>Inscribir</span>
                                  </button>
                                )
                              )}

                              {pedido.cliente_telefono && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetalle(pedido, 'WHATSAPP')}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Abrir Centro WhatsApp con plantillas inteligentes"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              )}

                              {/* Botón Entregar: EXCLUSIVO para productos físicos de tienda/web, NUNCA para cursos de academia */}
                              {pedido.tipo_canal !== 'ACADEMIA' && pedido.estado === 'PENDIENTE' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickEntregar(e, pedido)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title="Marcar como entregado y enviar constancia"
                                >
                                  Entregar
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenDetalle(pedido, 'DETALLE')}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                                title="Ver modal detallado"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      {/* MODAL SÚPER COMPLETO DE DETALLE DE PEDIDO */}
      <DetallePedidoModal
        pedido={pedidoSeleccionado}
        isOpen={modalOpen}
        initialTab={initialModalTab}
        onClose={() => {
          pedidoSeleccionadoIdRef.current = null;
          setModalOpen(false);
          setPedidoSeleccionado(null);
        }}
        onPedidoActualizado={cargarDatos}
      />
    </div>
  );
}
