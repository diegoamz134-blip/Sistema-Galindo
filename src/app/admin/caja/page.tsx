'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { MOCK_CAJA_ACTUAL, MOCK_MOVIMIENTOS_CAJA } from '@/lib/mock-data';
import { MovimientoCaja, MetodoPago, TipoMovimientoCaja, CajaChica } from '@/types/database';
import { supabase } from '@/lib/supabase';

export default function CajaChicaPage() {
  const [caja, setCaja] = useState<CajaChica>(MOCK_CAJA_ACTUAL);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>(MOCK_MOVIMIENTOS_CAJA);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [showModalCierre, setShowModalCierre] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Formulario nuevo movimiento
  const [nuevoConcepto, setNuevoConcepto] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState<TipoMovimientoCaja>('EGRESO_GASTO');
  const [nuevoMetodo, setNuevoMetodo] = useState<MetodoPago>('EFECTIVO');

  // Arqueo de cierre
  const [efectivoContado, setEfectivoContado] = useState('');

  // Cargar datos de caja desde Supabase
  const cargarCajaDatos = useCallback(async () => {
    try {
      const [cajaRes, movsRes] = await Promise.all([
        supabase
          .from('cajas_chicas')
          .select('*')
          .eq('estado', 'ABIERTA')
          .order('fecha_apertura', { ascending: false })
          .limit(1),
        supabase
          .from('movimientos_caja')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(50),
      ]);

      if (cajaRes.data && cajaRes.data.length > 0) {
        setCaja(cajaRes.data[0] as CajaChica);
      }

      if (movsRes.data && movsRes.data.length > 0) {
        setMovimientos(movsRes.data as MovimientoCaja[]);
      }
    } catch (err) {
      console.warn('Usando datos de respaldo para caja chica:', err);
    }
  }, []);

  useEffect(() => {
    cargarCajaDatos();

    const channel = supabase
      .channel('realtime_caja_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cajas_chicas' }, () => cargarCajaDatos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos_caja' }, () => cargarCajaDatos())
      .subscribe();

    const onFocus = () => cargarCajaDatos();
    window.addEventListener('focus', onFocus);
    window.addEventListener('galindo_pos_venta_realizada', onFocus);
    window.addEventListener('galindo_pedido_web_realizado', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('galindo_pos_venta_realizada', onFocus);
      window.removeEventListener('galindo_pedido_web_realizado', onFocus);
    };
  }, [cargarCajaDatos]);

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoConcepto || !nuevoMonto) return;

    const montoNum = parseFloat(nuevoMonto);
    const esIngreso = nuevoTipo.startsWith('INGRESO');
    setGuardando(true);

    try {
      const nuevoMov: MovimientoCaja = {
        id: `mov-${Date.now()}`,
        caja_id: caja.id,
        tipo: nuevoTipo,
        monto: montoNum,
        metodo_pago: nuevoMetodo,
        concepto: nuevoConcepto,
        usuario_id: 'usr-admin',
        usuario_nombre: 'Diego Galindo',
        fecha: new Date().toISOString(),
      };

      setMovimientos([nuevoMov, ...movimientos]);

      // Guardar en Supabase
      await supabase.from('movimientos_caja').insert({
        caja_id: caja.id.startsWith('caja-') ? null : caja.id,
        tipo: nuevoTipo,
        monto: montoNum,
        metodo_pago: nuevoMetodo,
        concepto: nuevoConcepto,
        usuario_id: '00000000-0000-0000-0000-000000000001',
        usuario_nombre: 'Diego Galindo',
      });

      let incEfectivo = 0;
      let incDigital = 0;
      let egresoEfectivo = 0;

      if (nuevoMetodo === 'EFECTIVO') {
        if (esIngreso) incEfectivo = montoNum;
        else egresoEfectivo = montoNum;
      } else if (nuevoMetodo === 'MIXTO') {
        const mitad = montoNum / 2;
        if (esIngreso) {
          incEfectivo = mitad;
          incDigital = mitad;
        } else {
          egresoEfectivo = mitad;
        }
      } else {
        if (esIngreso) incDigital = montoNum;
      }

      const nuevoTotalIngEfectivo = Number(caja.total_ingresos_efectivo || 0) + incEfectivo;
      const nuevoTotalEgrEfectivo = Number(caja.total_egresos_efectivo || 0) + egresoEfectivo;
      const nuevoSaldoEfectivo =
        Number(caja.saldo_teorico_efectivo || 0) + incEfectivo - egresoEfectivo;
      const nuevoTotalDigital = Number(caja.total_ingresos_digital || 0) + incDigital;

      setCaja((prev) => ({
        ...prev,
        total_ingresos_efectivo: nuevoTotalIngEfectivo,
        total_egresos_efectivo: nuevoTotalEgrEfectivo,
        saldo_teorico_efectivo: nuevoSaldoEfectivo,
        total_ingresos_digital: nuevoTotalDigital,
      }));

      if (!caja.id.startsWith('caja-')) {
        await supabase
          .from('cajas_chicas')
          .update({
            total_ingresos_efectivo: nuevoTotalIngEfectivo,
            total_egresos_efectivo: nuevoTotalEgrEfectivo,
            saldo_teorico_efectivo: nuevoSaldoEfectivo,
            total_ingresos_digital: nuevoTotalDigital,
          })
          .eq('id', caja.id);
      }

      setNuevoConcepto('');
      setNuevoMonto('');
      setShowModalGasto(false);
    } catch (err) {
      console.error('Error al registrar movimiento:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    const realNum = parseFloat(efectivoContado);
    const dif = realNum - caja.saldo_teorico_efectivo;
    setGuardando(true);

    try {
      const fechaCierre = new Date().toISOString();
      setCaja((prev) => ({
        ...prev,
        estado: 'CERRADA',
        fecha_cierre: fechaCierre,
        saldo_real_efectivo: realNum,
        diferencia: dif,
      }));

      if (!caja.id.startsWith('caja-')) {
        await supabase
          .from('cajas_chicas')
          .update({
            estado: 'CERRADA',
            fecha_cierre: fechaCierre,
            saldo_real_efectivo: realNum,
            diferencia: dif,
          })
          .eq('id', caja.id);
      }

      setShowModalCierre(false);
    } catch (err) {
      console.error('Error al cerrar caja:', err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
              Control de Caja Chica & Arqueo
            </h2>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono border border-zinc-200 bg-white text-zinc-800 shadow-sm font-semibold">
              Estado: {caja.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Registro de cobros en efectivo, Yape/Plin, gastos de insumos y balance diario.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {caja.estado === 'ABIERTA' ? (
            <>
              <button
                onClick={() => setShowModalGasto(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-800 shadow-sm transition-colors"
              >
                Registrar Movimiento
              </button>
              <button
                onClick={() => setShowModalCierre(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 shadow-sm transition-colors"
              >
                Hacer Arqueo & Cerrar
              </button>
            </>
          ) : (
            <button
              onClick={() =>
                setCaja((prev) => ({
                  ...prev,
                  estado: 'ABIERTA',
                  fecha_cierre: undefined,
                  saldo_real_efectivo: undefined,
                  diferencia: undefined,
                }))
              }
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 shadow-sm transition-colors"
            >
              Reabrir Turno
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Saldo - Blanco Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
          <span className="text-xs text-zinc-500 font-medium">1. Saldo Inicial</span>
          <p className="text-xl font-bold text-zinc-950 mt-1">
            {formatCurrency(caja.monto_apertura)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Efectivo base al abrir</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
          <span className="text-xs text-zinc-600 font-medium">+ Ingresos Efectivo</span>
          <p className="text-xl font-bold text-zinc-950 mt-1">
            +{formatCurrency(caja.total_ingresos_efectivo)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Ventas y matrículas</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
          <span className="text-xs text-zinc-600 font-medium">- Egresos & Gastos</span>
          <p className="text-xl font-bold text-zinc-950 mt-1">
            -{formatCurrency(caja.total_egresos_efectivo)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Insumos y servicios</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-900 text-white shadow-sm">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            Saldo Teórico Efectivo
          </span>
          <p className="text-2xl font-bold text-white mt-1 font-mono">
            {formatCurrency(caja.saldo_teorico_efectivo)}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1 font-mono">
            Total a cuadrar en gaveta
          </p>
        </div>
      </div>

      {/* Cobros Digitales */}
      <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-zinc-950">
            Cobros Digitales (Yape / Plin / Transferencias)
          </p>
          <p className="text-[11px] text-zinc-500">
            Fondos recibidos directamente en cuentas bancarias de la escuela
          </p>
        </div>
        <p className="text-lg font-bold text-zinc-950 font-mono">
          {formatCurrency(caja.total_ingresos_digital)}
        </p>
      </div>

      {/* Historial de Movimientos */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-600">
            Libro de Movimientos de Caja
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            {movimientos.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
              <tr>
                <th className="px-5 py-3 font-medium">Hora</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Concepto</th>
                <th className="px-5 py-3 font-medium">Método</th>
                <th className="px-5 py-3 font-medium">Responsable</th>
                <th className="px-5 py-3 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {movimientos.map((m) => {
                const esIngreso = m.tipo.startsWith('INGRESO');
                return (
                  <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                    <td suppressHydrationWarning className="px-5 py-3 text-zinc-500 whitespace-nowrap font-mono">
                      {formatDateTime(m.fecha)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-zinc-200 bg-white text-zinc-800">
                        {esIngreso ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-800 font-medium">
                      {m.concepto}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap font-mono text-zinc-500">
                      {m.metodo_pago}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 whitespace-nowrap">
                      {m.usuario_nombre}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap text-zinc-950">
                      {esIngreso ? '+' : '-'}{formatCurrency(m.monto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar */}
      {showModalGasto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
              Registrar Movimiento de Caja
            </h3>

            <form onSubmit={handleRegistrarMovimiento} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                  Tipo
                </label>
                <select
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value as TipoMovimientoCaja)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black"
                >
                  <option value="EGRESO_GASTO">Egreso: Gasto Operativo</option>
                  <option value="EGRESO_COMPRA_INSUMO">Egreso: Compra de Insumos</option>
                  <option value="INGRESO_VENTA">Ingreso: Venta Mostrador</option>
                  <option value="INGRESO_MATRICULA">Ingreso: Cuota / Matrícula</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                  Concepto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Detalle del movimiento..."
                  value={nuevoConcepto}
                  onChange={(e) => setNuevoConcepto(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                    Monto (S/)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    placeholder="0.00"
                    value={nuevoMonto}
                    onChange={(e) => setNuevoMonto(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono font-bold outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                    Método
                  </label>
                  <select
                    value={nuevoMetodo}
                    onChange={(e) => setNuevoMetodo(e.target.value as MetodoPago)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="YAPE">Yape (972799397)</option>
                    <option value="PLIN">Plin</option>
                    <option value="TRANSFERENCIA">Transferencia BCP</option>
                    <option value="MIXTO">Pago Cruzado (Efectivo + Yape)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModalGasto(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-600 hover:text-black"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold bg-black text-white hover:bg-zinc-800 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Arqueo */}
      {showModalCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
              Arqueo y Cierre de Turno
            </h3>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs flex justify-between">
              <span className="text-zinc-500">Saldo teórico calculado:</span>
              <span className="font-bold text-zinc-950 font-mono">
                {formatCurrency(caja.saldo_teorico_efectivo)}
              </span>
            </div>

            <form onSubmit={handleCerrarCaja} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 uppercase tracking-wider mb-1">
                  Efectivo Contado en Gaveta (S/)
                </label>
                <input
                  type="number"
                  step="0.10"
                  required
                  placeholder="0.00"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-950 font-mono font-bold text-sm outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModalCierre(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-600 hover:text-black"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold bg-black text-white hover:bg-zinc-800 transition-colors"
                >
                  Confirmar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
