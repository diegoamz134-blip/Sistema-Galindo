'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowRight,
  CircleDollarSign,
  Receipt,
  Store,
  ShoppingBag,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  DashboardSummary,
  getDashboardSummary,
  getRecentMovements,
  getActiveStudents,
  getRecentOrders,
  updateOrderStatus,
  PedidoReciente,
} from '@/lib/dashboard-service';
import { MovimientoCaja, Matricula } from '@/types/database';
import { SalesTrendChart } from '@/components/admin/dashboard/SalesTrendChart';
import { TopProductsRanking } from '@/components/admin/dashboard/TopProductsRanking';
import { PaymentMethodsDonut } from '@/components/admin/dashboard/PaymentMethodsDonut';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [pedidosRecientes, setPedidosRecientes] = useState<PedidoReciente[]>([]);
  const [actualizandoPedidoId, setActualizandoPedidoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [sumData, movData, matData, pedData] = await Promise.all([
          getDashboardSummary(),
          getRecentMovements(),
          getActiveStudents(),
          getRecentOrders(6),
        ]);
        if (!isMounted) return;
        setSummary(sumData);
        setMovimientos(movData);
        setMatriculas(matData);
        setPedidosRecientes(pedData);
        const now = new Date();
        setLastUpdated(
          now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [sumData, movData, matData, pedData] = await Promise.all([
        getDashboardSummary(),
        getRecentMovements(),
        getActiveStudents(),
        getRecentOrders(6),
      ]);
      setSummary(sumData);
      setMovimientos(movData);
      setMatriculas(matData);
      setPedidosRecientes(pedData);
      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Error al recargar dashboard:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarcarEntregado = async (pedidoId: string) => {
    setActualizandoPedidoId(pedidoId);
    try {
      const ok = await updateOrderStatus(pedidoId, 'ENTREGADO');
      if (ok) {
        setPedidosRecientes((prev) =>
          prev.map((p) => (p.id === pedidoId ? { ...p, estado: 'ENTREGADO' } : p))
        );
        handleRefresh();
      }
    } finally {
      setActualizandoPedidoId(null);
    }
  };

  // Sincronización en Tiempo Real (Supabase Realtime WebSockets + re-enfoque)
  useEffect(() => {
    // 1. Canal WebSocket en vivo para escuchar ventas, cobros, matrículas y productos
    const channel = supabase
      .channel('admin_dashboard_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => handleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, () => handleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos_caja' }, () => handleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => handleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cajas_chicas' }, () => handleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matriculas' }, () => handleRefresh())
      .subscribe();

    const onFocus = () => handleRefresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onFocus);
    window.addEventListener('galindo_pos_venta_realizada', onFocus);
    window.addEventListener('galindo_pedido_web_realizado', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onFocus);
      window.removeEventListener('galindo_pos_venta_realizada', onFocus);
      window.removeEventListener('galindo_pedido_web_realizado', onFocus);
    };
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              Panel General de Control
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Monitoreo general de ventas, academia y balance de caja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón de Actualizar / Refrescar */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Recargar datos desde la base de datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            {lastUpdated && !isRefreshing && (
              <span className="text-[10px] text-zinc-400 font-mono pl-1 hidden sm:inline">
                ({lastUpdated})
              </span>
            )}
          </button>

          <Link
            href="/admin/caja"
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 shadow-xs transition-colors"
          >
            Registrar en Caja
          </Link>

          <Link
            href="/admin/productos"
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 shadow-xs transition-colors"
          >
            Productos
          </Link>

          <Link
            href="/admin/pos"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-black text-white hover:bg-zinc-800 shadow-md transition-all active:scale-95"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Punto de Venta (POS)</span>
          </Link>
        </div>
      </div>

      {/* 4 Tarjetas de Métricas Principales (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Cobros Hoy */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider font-mono">
              Cobros Hoy
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono text-zinc-950 tracking-tight">
              {isLoading ? '...' : formatCurrency(summary?.cobrosHoy || 0)}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              {(summary?.cobrosHoy ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  <ArrowUpRight className="w-3 h-3" />
                  +{summary?.crecimientoVsAyer ?? 0}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded-md font-mono">
                  0% hoy
                </span>
              )}
              <span className="text-[11px] text-zinc-400 font-mono">Efectivo + Yape / Plin</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Efectivo en Caja */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider font-mono">
              Efectivo en Caja
            </span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono text-zinc-950 tracking-tight">
              {isLoading ? '...' : formatCurrency(summary?.efectivoCaja || 0)}
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-zinc-500">Gaveta física</span>
              <span className="text-zinc-400 font-mono">Turno Abierto</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Alumnos Activos */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider font-mono">
              Alumnos Activos
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono text-zinc-950 tracking-tight">
              {isLoading ? '...' : `${summary?.alumnosActivos || 0} Alumnos`}
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-zinc-500">Academia Galindo</span>
              <span className="text-blue-600 font-medium font-mono">Sede Ica</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Alerta de Stock */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider font-mono">
              Alerta de Stock
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                (summary?.stockCriticoCount || 0) > 0
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono text-zinc-950 tracking-tight">
              {isLoading ? '...' : `${summary?.stockCriticoCount || 0} Productos`}
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-zinc-500">
                {(summary?.stockCriticoCount || 0) > 0 ? 'Bajo el mínimo' : 'Inventario al día'}
              </span>
              <Link
                href="/admin/productos"
                className="text-amber-600 hover:text-amber-700 font-medium font-mono underline underline-offset-2"
              >
                Reabastecer
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Principales: Evolución de Ventas y Métodos de Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesTrendChart key={`trend-${refreshKey}`} />
        </div>
        <div className="lg:col-span-1">
          <PaymentMethodsDonut key={`donut-${refreshKey}`} />
        </div>
      </div>

      {/* Ranking de Productos Estrella & Tablas Operativas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Ranking Top 5 Productos */}
        <div className="lg:col-span-1">
          <TopProductsRanking key={`top-${refreshKey}`} />
        </div>

        {/* Columna Derecha (2 cols): Pedidos Web en Vivo, Movimientos & Alumnos */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pedidos Web y Mostrador en Vivo */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
                <ShoppingBag className="w-3.5 h-3.5 text-zinc-900" />
                <span>Pedidos Web & Mostrador en Vivo</span>
                {pedidosRecientes.filter((p) => p.estado === 'PENDIENTE').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    {pedidosRecientes.filter((p) => p.estado === 'PENDIENTE').length} Pendientes
                  </span>
                )}
              </div>
              <Link
                href="/admin/pedidos"
                className="text-xs font-bold text-zinc-900 hover:text-black hover:underline flex items-center gap-0.5"
              >
                <span>Ver todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-100 overflow-hidden">
              {pedidosRecientes.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 font-mono">
                  No hay pedidos web o ventas registradas recientemente.
                </div>
              ) : (
                pedidosRecientes.slice(0, 5).map((ped) => {
                  const esPendiente = ped.estado === 'PENDIENTE';
                  const isUpdating = actualizandoPedidoId === ped.id;

                  return (
                    <div
                      key={ped.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/80 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black font-mono text-zinc-950">
                            #{ped.codigo_pedido}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <p className="text-xs font-bold text-zinc-900 truncate">
                            {ped.cliente_nombre}
                          </p>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                          {ped.cliente_telefono ? `Tel: ${ped.cliente_telefono} • ` : ''}
                          Pago: {ped.metodo_pago} • {ped.metodo_entrega || 'Recojo en Tienda'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-xs font-black font-mono text-zinc-950">
                          {formatCurrency(ped.total)}
                        </span>

                        {esPendiente ? (
                          <button
                            type="button"
                            onClick={() => handleMarcarEntregado(ped.id)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Marcar este pedido como retirado / entregado"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isUpdating ? 'Actualizando...' : 'Entregar'}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Entregado</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-1 text-center">
              <Link
                href="/admin/pedidos"
                className="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 hover:text-black hover:underline"
              >
                <span>Ir al Módulo Completo de Pedidos & Ventas →</span>
              </Link>
            </div>
          </div>

          {/* Movimientos del Turno */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
                <Receipt className="w-3.5 h-3.5 text-zinc-700" />
                <span>Movimientos Recientes de Caja</span>
              </div>
              <Link
                href="/admin/caja"
                className="text-xs font-medium text-zinc-600 hover:text-black flex items-center gap-1 group transition-colors"
              >
                <span>Ver Arqueo Completo</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-100 overflow-hidden">
              {movimientos.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 font-mono">
                  No hay movimientos registrados en este turno.
                </div>
              ) : (
                movimientos.slice(0, 5).map((mov) => {
                  const esIngreso = mov.tipo.startsWith('INGRESO');
                  return (
                    <div
                      key={mov.id}
                      className="p-3.5 flex items-center justify-between hover:bg-zinc-50/80 transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="text-xs font-bold text-zinc-950 truncate">
                          {mov.concepto}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                          {mov.metodo_pago} • {mov.usuario_nombre}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                            esIngreso
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                          }`}
                        >
                          {esIngreso ? '+' : '-'}{formatCurrency(mov.monto)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cuotas de Alumnos de Barbería */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>Estado de Alumnos & Cuotas Pendientes</span>
              </div>
              <Link
                href="/admin/matriculas"
                className="text-xs font-medium text-zinc-600 hover:text-black flex items-center gap-1 group transition-colors"
              >
                <span>Ver Matrículas</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {matriculas.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 font-mono rounded-xl border border-zinc-100 bg-zinc-50/50">
                No hay alumnos matriculados ni cuotas pendientes en la base de datos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matriculas.map((mat) => {
                  const cuotaVencida = mat.cuotas?.find((c) => c.estado === 'VENCIDA');
                  return (
                    <div
                      key={mat.id}
                      className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:bg-zinc-50 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-950 truncate">
                            {mat.alumno?.nombres} {mat.alumno?.apellidos}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">{mat.curso?.titulo}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 border ${
                            cuotaVencida
                              ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                          }`}
                        >
                          {cuotaVencida ? 'Cuota Vencida' : 'Al Día'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-1.5 border-t border-zinc-200/70">
                        <span>Saldo pendiente:</span>
                        <span className="font-mono font-bold text-zinc-950">
                          {formatCurrency(mat.saldo_pendiente)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
