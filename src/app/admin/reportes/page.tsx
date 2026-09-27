'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSede } from '@/context/SedeContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  getReporteFinanciero,
  RangoFecha,
  ReporteFinanciero,
} from '@/lib/reportes-service';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Download,
  Calendar,
  Wallet,
  Activity,
  PieChart as PieChartIcon
} from 'lucide-react';

export default function ReportesPage() {
  const { sedeActiva } = useSede();
  const [rangoFecha, setRangoFecha] = useState<RangoFecha>('7_DIAS');
  const [data, setData] = useState<ReporteFinanciero | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchReport = async () => {
      setIsLoading(true);
      const res = await getReporteFinanciero(rangoFecha, sedeActiva);
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    };
    fetchReport();
    return () => { isMounted = false; };
  }, [rangoFecha, sedeActiva]);

  const formatearMoneda = (valor: number) =>
    `S/ ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const BotonRango = ({ valor, label }: { valor: RangoFecha; label: string }) => (
    <button
      onClick={() => setRangoFecha(valor)}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
        rangoFecha === valor
          ? 'bg-zinc-950 text-white shadow-md'
          : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-zinc-50/50 min-h-screen">
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-500" />
            Reportes Financieros
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Analítica de negocio y ganancias netas para la sede <strong className="capitalize">{sedeActiva}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BotonRango valor="HOY" label="Hoy" />
          <BotonRango valor="7_DIAS" label="Últimos 7 Días" />
          <BotonRango valor="MES" label="Este Mes" />
          <BotonRango valor="AÑO" label="Este Año" />
          <BotonRango valor="TODO" label="Histórico" />
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-100 transition-all ml-auto md:ml-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400"
          >
            <Activity className="w-8 h-8 animate-pulse text-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-widest">Calculando Métricas...</p>
          </motion.div>
        ) : data ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* 1. KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Ingresos Brutos"
                value={formatearMoneda(data.kpis.ingresosBrutos)}
                icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
                bgIcon="bg-emerald-100"
                subtitle="Ventas y matrículas"
              />
              <KpiCard
                title="Gastos Operativos"
                value={formatearMoneda(data.kpis.gastosOperativos)}
                icon={<TrendingDown className="w-5 h-5 text-rose-600" />}
                bgIcon="bg-rose-100"
                subtitle="Egresos de caja chica"
              />
              <KpiCard
                title="Ganancia Neta"
                value={formatearMoneda(data.kpis.gananciaNeta)}
                icon={<Wallet className="w-5 h-5 text-blue-600" />}
                bgIcon="bg-blue-100"
                subtitle="Ingresos - Gastos"
                highlight={true}
              />
              <KpiCard
                title="Ticket Promedio"
                value={formatearMoneda(data.kpis.ticketPromedio)}
                icon={<CreditCard className="w-5 h-5 text-purple-600" />}
                bgIcon="bg-purple-100"
                subtitle={`De ${data.kpis.ventasTotales} ventas totales`}
              />
            </div>

            {/* 2. CHARTS PRIMARIOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Chart: Evolución */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Evolución Financiera</h3>
                    <p className="text-xs text-zinc-500">Ingresos vs Gastos en el tiempo</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="h-[300px] w-full mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.graficoEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(val) => `S/${val}`} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, '']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" name="Ingresos" dataKey="ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                      <Area type="monotone" name="Gastos" dataKey="gastos" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart: Métodos de Pago */}
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Métodos de Cobro</h3>
                    <p className="text-xs text-zinc-500">Distribución de ingresos</p>
                  </div>
                  <PieChartIcon className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="h-[250px] w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.metodosPago}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.metodosPago.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Monto']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. TABLAS Y TOPs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Productos */}
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-sm font-bold text-zinc-900">Top Productos (Rentabilidad)</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.productosTop.length > 0 ? (
                    data.productosTop.map((prod, idx) => (
                      <div key={prod.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-zinc-200 text-zinc-600'}`}>
                            {idx + 1}
                          </div>
                          <p className="text-xs font-semibold text-zinc-800 truncate">{prod.nombre}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-sm font-bold text-emerald-600">{formatearMoneda(prod.ingresos)}</p>
                          <p className="text-[10px] text-zinc-500">{prod.unidades} unidades</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 text-zinc-400 text-xs">No hay ventas registradas en este periodo.</div>
                  )}
                </div>
              </div>

              {/* Fugas / Gastos */}
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                    <h3 className="text-sm font-bold text-zinc-900">Mayores Egresos Operativos</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.topGastos.length > 0 ? (
                    data.topGastos.map((gasto, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/30 border border-rose-100">
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-zinc-800 truncate">{gasto.concepto}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(gasto.fecha).toLocaleDateString('es-PE')}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-sm font-bold text-rose-600">-{formatearMoneda(gasto.monto)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 text-zinc-400 text-xs">No hay egresos registrados en este periodo.</div>
                  )}
                </div>
              </div>
            </div>

          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function KpiCard({ title, value, icon, bgIcon, subtitle, highlight = false }: any) {
  return (
    <div className={`p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md ${highlight ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${highlight ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {title}
          </p>
          <h4 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${highlight ? 'text-white' : 'text-zinc-900'}`}>
            {value}
          </h4>
        </div>
        <div className={`p-2.5 rounded-xl ${highlight ? 'bg-zinc-800' : bgIcon}`}>
          {icon}
        </div>
      </div>
      {subtitle && (
        <p className={`text-xs mt-3 font-medium ${highlight ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
