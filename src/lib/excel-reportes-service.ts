import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { matchSede } from '@/lib/academia-service';
import { RangoFecha, SedeFiltro } from '@/lib/reportes-service';

// -----------------------------------------------------------------------------
// 1. EXPORTAR REPORTE FINANCIERO COMPLETO (Panel de Reportes)
// -----------------------------------------------------------------------------
export async function exportarReporteFinancieroExcel({
  rango,
  sedeFiltro,
}: {
  rango: RangoFecha;
  sedeFiltro: SedeFiltro;
}): Promise<void> {
  const ahora = new Date();
  let fechaInicio = new Date(0);

  if (rango === 'HOY') {
    fechaInicio = new Date();
    fechaInicio.setHours(0, 0, 0, 0);
  } else if (rango === '7_DIAS') {
    fechaInicio = subDays(ahora, 7);
    fechaInicio.setHours(0, 0, 0, 0);
  } else if (rango === 'MES') {
    fechaInicio = startOfMonth(ahora);
  } else if (rango === 'AÑO') {
    fechaInicio = startOfYear(ahora);
  }

  const fechaISO = fechaInicio.toISOString();

  // Consultar en paralelo pedidos, gastos, matrículas y cuotas
  const [
    { data: pedidosRaw },
    { data: gastosRaw },
    { data: cajasRaw },
    { data: matriculasRaw },
    { data: cuotasRaw },
  ] = await Promise.all([
    supabase
      .from('pedidos')
      .select(`
        id, codigo_pedido, total, metodo_pago, creado_en, sede_id, es_alumno, ciudad, notas,
        cliente_nombre, cliente_telefono, cliente_dni,
        pedido_items(producto_id, nombre_producto, cantidad, subtotal)
      `)
      .neq('estado', 'CANCELADO')
      .gte('creado_en', fechaISO)
      .order('creado_en', { ascending: false }),

    supabase
      .from('movimientos_caja')
      .select('id, monto, concepto, creado_en, fecha, tipo, caja_id')
      .in('tipo', ['EGRESO', 'PAGO_PROVEEDOR', 'GASTO_OPERATIVO', 'RETIRO'])
      .gte('creado_en', fechaISO)
      .order('creado_en', { ascending: false }),

    supabase.from('cajas_chicas').select('id, sede'),

    supabase
      .from('alumnos')
      .select('id, nombre_completo, dni, telefono, sede, creado_en')
      .limit(10), // referencia

    supabase
      .from('cuotas_matricula')
      .select('id, monto, fecha_pago, metodo_pago, estado, matricula_id, matriculas(id, sede, codigo_matricula, alumnos(nombre_completo))')
      .eq('estado', 'PAGADA')
      .gte('fecha_pago', fechaISO)
      .order('fecha_pago', { ascending: false }),
  ]);

  // Filtrar pedidos por sede
  const pedidos = (pedidosRaw || []).filter((ped: any) => {
    if (sedeFiltro === 'TODAS') return true;
    const sedeCandidata = ped.sede_id || ped.ciudad || ped.notas || '';
    return matchSede(sedeCandidata, sedeFiltro);
  });

  // Mapear cajas a sedes
  const cajasMap = new Map<string, string>();
  (cajasRaw || []).forEach((c: any) => {
    if (c.id && c.sede) cajasMap.set(c.id, c.sede);
  });

  // Filtrar gastos por sede
  const gastos = (gastosRaw || []).filter((g: any) => {
    if (sedeFiltro === 'TODAS') return true;
    const sedeCaja = g.caja_id ? cajasMap.get(g.caja_id) : undefined;
    if (sedeCaja) return matchSede(sedeCaja, sedeFiltro);
    if (g.concepto && typeof g.concepto === 'string') {
      return matchSede(g.concepto, sedeFiltro);
    }
    return true;
  });

  // Filtrar cuotas pagadas por sede
  const cuotas = (cuotasRaw || []).filter((c: any) => {
    if (sedeFiltro === 'TODAS') return true;
    const sedeCuota = c.matriculas?.sede;
    return matchSede(sedeCuota, sedeFiltro);
  });

  // Totales de KPIs
  let totalIngresos = 0;
  let totalGastos = 0;
  let efectivo = 0;
  let yapePlin = 0;
  let transferencia = 0;
  let tiendaIngresos = 0;
  let academiaIngresos = 0;

  const mapaTopProductos = new Map<string, { nombre: string; unidades: number; ingresos: number }>();
  const detalleIngresosFilas: Record<string, unknown>[] = [];

  // Procesar pedidos
  pedidos.forEach((p: any) => {
    const monto = Number(p.total || 0);
    totalIngresos += monto;

    const metodo = (p.metodo_pago || 'EFECTIVO').toUpperCase();
    if (metodo.includes('EFECTIVO') || metodo.includes('MIXTO')) efectivo += monto;
    else if (metodo.includes('YAPE') || metodo.includes('PLIN')) yapePlin += monto;
    else transferencia += monto;

    const esPos = p.codigo_pedido?.startsWith('POS-');
    const itemsNombres = (p.pedido_items || []).map((it: any) => `${it.cantidad}x ${it.nombre_producto}`).join('; ');
    const tieneMatricula = itemsNombres.toLowerCase().includes('matrícula') || itemsNombres.toLowerCase().includes('matricula');

    if (tieneMatricula || (!esPos && p.es_alumno)) {
      academiaIngresos += monto;
    } else {
      tiendaIngresos += monto;
    }

    // Top productos
    p.pedido_items?.forEach((it: any) => {
      const prodNom = it.nombre_producto || 'Producto sin nombre';
      if (!mapaTopProductos.has(prodNom)) {
        mapaTopProductos.set(prodNom, { nombre: prodNom, unidades: 0, ingresos: 0 });
      }
      const prod = mapaTopProductos.get(prodNom)!;
      prod.unidades += Number(it.cantidad || 1);
      prod.ingresos += Number(it.subtotal || 0);
    });

    const fechaFmt = p.creado_en
      ? format(new Date(p.creado_en), 'dd/MM/yyyy HH:mm', { locale: es })
      : 'N/A';

    detalleIngresosFilas.push({
      'FECHA_HORA': fechaFmt,
      'CODIGO_TICKET': p.codigo_pedido,
      'CLIENTE': p.cliente_nombre || 'Cliente General',
      'TELEFONO_DNI': p.cliente_telefono || p.cliente_dni || '-',
      'TIPO': tieneMatricula ? 'Academia' : 'Tienda / Barbería',
      'PRODUCTOS_SERVICIOS': itemsNombres || 'Venta POS',
      'METODO_PAGO': p.metodo_pago || 'EFECTIVO',
      'SEDE': (p.sede_id || sedeFiltro).toUpperCase(),
      'TOTAL_S/': monto,
    });
  });

  // Procesar cuotas de academia
  cuotas.forEach((c: any) => {
    const monto = Number(c.monto || 0);
    totalIngresos += monto;
    academiaIngresos += monto;

    const metodo = (c.metodo_pago || 'EFECTIVO').toUpperCase();
    if (metodo.includes('EFECTIVO') || metodo.includes('MIXTO')) efectivo += monto;
    else if (metodo.includes('YAPE') || metodo.includes('PLIN')) yapePlin += monto;
    else transferencia += monto;

    const fechaFmt = c.fecha_pago
      ? format(new Date(c.fecha_pago), 'dd/MM/yyyy HH:mm', { locale: es })
      : 'N/A';

    const alumnoNombre = c.matriculas?.alumnos?.nombre_completo || 'Alumno matriculado';
    const codMatricula = c.matriculas?.codigo_matricula || 'MAT-ACADEMIA';

    detalleIngresosFilas.push({
      'FECHA_HORA': fechaFmt,
      'CODIGO_TICKET': codMatricula,
      'CLIENTE': alumnoNombre,
      'TELEFONO_DNI': '-',
      'TIPO': 'Cuota Academia',
      'PRODUCTOS_SERVICIOS': 'Mensualidad / Curso Barbería',
      'METODO_PAGO': c.metodo_pago || 'EFECTIVO',
      'SEDE': (c.matriculas?.sede || sedeFiltro).toUpperCase(),
      'TOTAL_S/': monto,
    });
  });

  // Procesar gastos
  const detalleGastosFilas: Record<string, unknown>[] = [];
  gastos.forEach((g: any) => {
    const monto = Number(g.monto || 0);
    totalGastos += monto;

    const fechaFmt = g.creado_en || g.fecha
      ? format(new Date(g.creado_en || g.fecha), 'dd/MM/yyyy HH:mm', { locale: es })
      : 'N/A';

    detalleGastosFilas.push({
      'FECHA_HORA': fechaFmt,
      'CONCEPTO': g.concepto || 'Egreso de caja chica',
      'TIPO_MOVIMIENTO': g.tipo || 'EGRESO',
      'SEDE': sedeFiltro.toUpperCase(),
      'MONTO_S/': monto,
    });
  });

  const gananciaNeta = totalIngresos - totalGastos;
  const totalTransacciones = detalleIngresosFilas.length;
  const ticketPromedio = totalTransacciones > 0 ? totalIngresos / totalTransacciones : 0;

  // ---------------------------------------------------------------------------
  // HOJA 1: RESUMEN EJECUTIVO (KPIs)
  // ---------------------------------------------------------------------------
  const etiquetasRango: Record<RangoFecha, string> = {
    HOY: 'Hoy (Cierre Diario)',
    '7_DIAS': 'Últimos 7 Días',
    MES: 'Este Mes',
    AÑO: 'Este Año',
    TODO: 'Histórico Total',
  };

  const resumenFilas = [
    { METRICA: '=== REPORTE FINANCIERO SISTEMA GALINDO ===', VALOR: '' },
    { METRICA: 'Período Seleccionado', VALOR: etiquetasRango[rango] },
    { METRICA: 'Sede Auditada', VALOR: sedeFiltro.toUpperCase() },
    { METRICA: 'Fecha de Emisión', VALOR: format(ahora, 'dd/MM/yyyy HH:mm:ss', { locale: es }) },
    { METRICA: '', VALOR: '' },
    { METRICA: '=== RENTABILIDAD GENERAL ===', VALOR: '' },
    { METRICA: 'INGRESOS BRUTOS TOTALES (S/)', VALOR: totalIngresos },
    { METRICA: 'GASTOS OPERATIVOS / EGRESOS (S/)', VALOR: totalGastos },
    { METRICA: 'GANANCIA NETA REAL (S/)', VALOR: gananciaNeta },
    { METRICA: 'Total de Transacciones / Cobros', VALOR: totalTransacciones },
    { METRICA: 'Ticket Promedio por Cliente (S/)', VALOR: Number(ticketPromedio.toFixed(2)) },
    { METRICA: '', VALOR: '' },
    { METRICA: '=== DESGLOSE POR UNIDAD DE NEGOCIO ===', VALOR: '' },
    { METRICA: 'Ventas de Tienda & Barbería (S/)', VALOR: tiendaIngresos },
    { METRICA: 'Ingresos por Academia & Cursos (S/)', VALOR: academiaIngresos },
    { METRICA: '', VALOR: '' },
    { METRICA: '=== DESGLOSE POR MEDIO DE PAGO ===', VALOR: '' },
    { METRICA: 'Efectivo en Caja (S/)', VALOR: efectivo },
    { METRICA: 'Billeteras Digitales Yape / Plin (S/)', VALOR: yapePlin },
    { METRICA: 'Tarjetas & Transferencias Bancarias (S/)', VALOR: transferencia },
  ];

  const wsResumen = XLSX.utils.json_to_sheet(resumenFilas);
  wsResumen['!cols'] = [{ wch: 42 }, { wch: 30 }];

  // ---------------------------------------------------------------------------
  // HOJA 2: DETALLE DE INGRESOS
  // ---------------------------------------------------------------------------
  const wsIngresos = XLSX.utils.json_to_sheet(
    detalleIngresosFilas.length > 0
      ? detalleIngresosFilas
      : [{ 'INFO': 'No se registraron ventas en el período seleccionado' }]
  );
  wsIngresos['!cols'] = [
    { wch: 18 }, // FECHA_HORA
    { wch: 18 }, // CODIGO_TICKET
    { wch: 28 }, // CLIENTE
    { wch: 16 }, // TELEFONO_DNI
    { wch: 18 }, // TIPO
    { wch: 35 }, // PRODUCTOS_SERVICIOS
    { wch: 16 }, // METODO_PAGO
    { wch: 14 }, // SEDE
    { wch: 14 }, // TOTAL_S/
  ];

  // ---------------------------------------------------------------------------
  // HOJA 3: TOP PRODUCTOS VENDIDOS
  // ---------------------------------------------------------------------------
  const topProductosFilas = Array.from(mapaTopProductos.values())
    .sort((a, b) => b.ingresos - a.ingresos)
    .map((p, idx) => ({
      'RANKING': `#${idx + 1}`,
      'PRODUCTO': p.nombre,
      'UNIDADES_VENDIDAS': p.unidades,
      'INGRESOS_GENERADOS_S/': p.ingresos,
    }));

  const wsTopProds = XLSX.utils.json_to_sheet(
    topProductosFilas.length > 0
      ? topProductosFilas
      : [{ 'INFO': 'No hay datos de productos en este período' }]
  );
  wsTopProds['!cols'] = [
    { wch: 10 },
    { wch: 40 },
    { wch: 20 },
    { wch: 24 },
  ];

  // ---------------------------------------------------------------------------
  // HOJA 4: GASTOS Y EGRESOS
  // ---------------------------------------------------------------------------
  const wsGastos = XLSX.utils.json_to_sheet(
    detalleGastosFilas.length > 0
      ? detalleGastosFilas
      : [{ 'INFO': 'No se registraron egresos en el período seleccionado' }]
  );
  wsGastos['!cols'] = [
    { wch: 18 },
    { wch: 36 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
  ];

  // Construir Libro
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN_EJECUTIVO');
  XLSX.utils.book_append_sheet(wb, wsIngresos, 'DETALLE_INGRESOS');
  XLSX.utils.book_append_sheet(wb, wsTopProds, 'TOP_PRODUCTOS');
  XLSX.utils.book_append_sheet(wb, wsGastos, 'DETALLE_GASTOS');

  const fechaHoy = format(ahora, 'yyyy-MM-dd');
  const nombreArchivo = `Reporte_Financiero_${sedeFiltro.toUpperCase()}_${rango}_${fechaHoy}.xlsx`;

  XLSX.writeFile(wb, nombreArchivo);
}

// -----------------------------------------------------------------------------
// 2. EXPORTAR CIERRE Y ARQUEO DIARIO DE CAJA (Módulo POS / Caja)
// -----------------------------------------------------------------------------
export async function exportarCierreCajaExcel({
  sedeId,
  cajeroNombre = 'Cajero Turno',
  fechaFiltro,
}: {
  sedeId: 'ica' | 'huancayo';
  cajeroNombre?: string;
  fechaFiltro?: string; // Formato YYYY-MM-DD o 'HOY' o undefined
}): Promise<void> {
  const ahora = new Date();

  let fechaInicioISO: string;
  let fechaFinISO: string;
  let fechaLabel: string;
  let fechaArchivo: string;

  if (fechaFiltro && fechaFiltro !== 'HOY') {
    const [y, m, d] = fechaFiltro.split('-').map(Number);
    const inicio = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
    const fin = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999));
    fechaInicioISO = inicio.toISOString();
    fechaFinISO = fin.toISOString();
    fechaLabel = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    fechaArchivo = fechaFiltro;
  } else {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = hoy.getMonth() + 1;
    const d = hoy.getDate();
    const inicio = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
    const fin = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999));
    fechaInicioISO = inicio.toISOString();
    fechaFinISO = fin.toISOString();
    fechaLabel = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    fechaArchivo = format(hoy, 'yyyy-MM-dd');
  }

  // Consultar ventas POS del día seleccionado
  const { data: pedidosRaw } = await supabase
    .from('pedidos')
    .select(`
      id, codigo_pedido, total, metodo_pago, creado_en, sede_id,
      cliente_nombre, cliente_telefono, cliente_dni, notas,
      pedido_items(nombre_producto, cantidad, subtotal)
    `)
    .neq('estado', 'CANCELADO')
    .gte('creado_en', fechaInicioISO)
    .lte('creado_en', fechaFinISO)
    .order('creado_en', { ascending: false });

  // Consultar egresos del día seleccionado
  const { data: gastosRaw } = await supabase
    .from('movimientos_caja')
    .select('id, monto, concepto, creado_en, fecha, tipo')
    .in('tipo', ['EGRESO', 'PAGO_PROVEEDOR', 'GASTO_OPERATIVO', 'RETIRO'])
    .gte('creado_en', fechaInicioISO)
    .lte('creado_en', fechaFinISO)
    .order('creado_en', { ascending: false });

  // Filtrar pedidos que pertenezcan estrictamente a la sede
  const pedidos = (pedidosRaw || []).filter((p: any) => {
    const s = p.sede_id || p.ciudad || p.notas || '';
    return matchSede(s, sedeId);
  });

  const gastos = gastosRaw || [];

  let totalEfectivo = 0;
  let totalYapePlin = 0;
  let totalTarjeta = 0;
  let totalTransferencia = 0;
  let totalIngresos = 0;
  let totalEgresos = 0;

  const filasVentas = pedidos.map((p: any) => {
    const monto = Number(p.total || 0);
    totalIngresos += monto;

    const metodo = (p.metodo_pago || 'EFECTIVO').toUpperCase();
    if (metodo.includes('EFECTIVO')) totalEfectivo += monto;
    else if (metodo.includes('YAPE') || metodo.includes('PLIN')) totalYapePlin += monto;
    else if (metodo.includes('TARJETA')) totalTarjeta += monto;
    else totalTransferencia += monto;

    const fechaFmt = p.creado_en
      ? format(new Date(p.creado_en), 'HH:mm:ss', { locale: es })
      : 'N/A';

    const itemsDesc = (p.pedido_items || [])
      .map((it: any) => `${it.cantidad}x ${it.nombre_producto}`)
      .join(', ');

    return {
      'HORA': fechaFmt,
      'TICKET_NRO': p.codigo_pedido,
      'CLIENTE': p.cliente_nombre || 'Cliente Mostrador',
      'DOCUMENTO_TELF': p.cliente_dni || p.cliente_telefono || '-',
      'DETALLE_PRODUCTOS': itemsDesc || 'Venta POS',
      'METODO_PAGO': p.metodo_pago || 'EFECTIVO',
      'TOTAL_COBRADO_S/': monto,
    };
  });

  const filasEgresos = gastos.map((g: any) => {
    const monto = Number(g.monto || 0);
    totalEgresos += monto;

    const horaFmt = g.creado_en || g.fecha
      ? format(new Date(g.creado_en || g.fecha), 'HH:mm:ss', { locale: es })
      : 'N/A';

    return {
      'HORA': horaFmt,
      'CONCEPTO_EGRESO': g.concepto || 'Gasto de caja chica',
      'TIPO': g.tipo || 'EGRESO',
      'MONTO_S/': monto,
    };
  });

  const saldoNetoEfectivo = totalEfectivo - totalEgresos;
  const totalNetoGeneral = totalIngresos - totalEgresos;

  // ---------------------------------------------------------------------------
  // HOJA 1: RESUMEN DE ARQUEO
  // ---------------------------------------------------------------------------
  const filasArqueo = [
    { CONCEPTO: '=== CIERRE Y ARQUEO DE CAJA DIARIO ===', MONTO: '' },
    { CONCEPTO: 'Sede Operativa', MONTO: `SEDE ${sedeId.toUpperCase()}` },
    { CONCEPTO: 'Fecha del Cierre / Arqueo', MONTO: fechaLabel },
    { CONCEPTO: 'Hora del Cierre', MONTO: format(ahora, 'HH:mm:ss', { locale: es }) },
    { CONCEPTO: '', MONTO: '' },
    { CONCEPTO: '=== CUADRE DE DINERO POR MEDIO DE PAGO ===', MONTO: '' },
    { CONCEPTO: 'Efectivo Cobrado en Mostrador (S/)', MONTO: totalEfectivo },
    { CONCEPTO: 'Billeteras Digitales (Yape / Plin) (S/)', MONTO: totalYapePlin },
    { CONCEPTO: 'Tarjetas de Crédito / Débito (S/)', MONTO: totalTarjeta },
    { CONCEPTO: 'Transferencias Bancarias (S/)', MONTO: totalTransferencia },
    { CONCEPTO: 'TOTAL INGRESOS DEL DÍA (S/)', MONTO: totalIngresos },
    { CONCEPTO: '', MONTO: '' },
    { CONCEPTO: '=== EGRESOS Y GASTOS DEL TURNO ===', MONTO: '' },
    { CONCEPTO: 'Total Salidas de Caja Chica (S/)', MONTO: totalEgresos },
    { CONCEPTO: '', MONTO: '' },
    { CONCEPTO: '=== CUADRE FINAL DE CAJÓN ===', MONTO: '' },
    { CONCEPTO: 'EFECTIVO NETO ESPERADO EN CAJÓN (S/)', MONTO: saldoNetoEfectivo },
    { CONCEPTO: 'TOTAL NETO DEL DÍA (S/)', MONTO: totalNetoGeneral },
    { CONCEPTO: 'Cantidad de Tickets Emitidos', MONTO: filasVentas.length },
  ];

  const wsArqueo = XLSX.utils.json_to_sheet(filasArqueo);
  wsArqueo['!cols'] = [{ wch: 44 }, { wch: 28 }];

  // ---------------------------------------------------------------------------
  // HOJA 2: VENTAS DEL TURNO
  // ---------------------------------------------------------------------------
  const wsVentas = XLSX.utils.json_to_sheet(
    filasVentas.length > 0
      ? filasVentas
      : [{ 'INFO': 'No se registraron ventas en este turno' }]
  );
  wsVentas['!cols'] = [
    { wch: 12 }, // HORA
    { wch: 16 }, // TICKET_NRO
    { wch: 26 }, // CLIENTE
    { wch: 16 }, // DOCUMENTO_TELF
    { wch: 38 }, // DETALLE_PRODUCTOS
    { wch: 16 }, // METODO_PAGO
    { wch: 18 }, // TOTAL_COBRADO_S/
  ];

  // ---------------------------------------------------------------------------
  // HOJA 3: EGRESOS DEL TURNO
  // ---------------------------------------------------------------------------
  const wsEgresos = XLSX.utils.json_to_sheet(
    filasEgresos.length > 0
      ? filasEgresos
      : [{ 'INFO': 'No se registraron egresos o retiros de caja' }]
  );
  wsEgresos['!cols'] = [
    { wch: 12 },
    { wch: 36 },
    { wch: 16 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsArqueo, 'ARQUEO_DE_CAJA');
  XLSX.utils.book_append_sheet(wb, wsVentas, 'VENTAS_TURNO');
  XLSX.utils.book_append_sheet(wb, wsEgresos, 'EGRESOS_TURNO');

  const nombreArchivo = `Cierre_Caja_${sedeId.toUpperCase()}_${fechaArchivo}.xlsx`;

  XLSX.writeFile(wb, nombreArchivo);
}
