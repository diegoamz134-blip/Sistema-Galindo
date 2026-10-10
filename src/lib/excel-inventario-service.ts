import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Producto } from '@/types/database';

export interface ItemPrevisualizacionExcel {
  filaExcel: number;
  productoId: string;
  sku: string;
  nombre: string;
  categoria?: string;
  precioVenta?: number;
  stockIcaAnterior: number;
  stockIcaNuevo: number;
  cambioIca: boolean;
  diffIca: number;
  stockHyoAnterior: number;
  stockHyoNuevo: number;
  cambioHyo: boolean;
  diffHyo: number;
  estado: 'actualizado' | 'sin_cambios' | 'error' | 'no_encontrado';
  mensajeError?: string;
}

export interface ItemNoEncontrado {
  filaExcel: number;
  codigoIdentificador: string;
  nombreDetectado: string;
  motivo: string;
}

export interface ResumenPrevisualizacion {
  nombreArchivo: string;
  totalFilas: number;
  totalModificados: number;
  totalSinCambios: number;
  totalErrores: number;
  items: ItemPrevisualizacionExcel[];
  itemsNoEncontrados: ItemNoEncontrado[];
}

export type ModoActualizacionSede = 'ambas' | 'ica' | 'huancayo';

// -----------------------------------------------------------------------------
// HELPER: Determinar si un producto pertenece a una sede específica
// -----------------------------------------------------------------------------
export function perteneceASede(producto: Producto, sede: 'ica' | 'huancayo' | 'todas'): boolean {
  if (sede === 'todas') return true;

  const sku = (producto.sku || '').toUpperCase();
  const desc = (producto.descripcion || '').toLowerCase();
  const nombre = (producto.nombre || '').toLowerCase();
  const stockIca = typeof producto.stock_ica === 'number' ? producto.stock_ica : 0;
  const stockHyo = typeof producto.stock_huancayo === 'number' ? producto.stock_huancayo : 0;

  const esHuancayo =
    sku.startsWith('HYO') ||
    desc.includes('(huancayo)') ||
    desc.includes('huancayo') ||
    nombre.includes('huancayo') ||
    (stockHyo > 0 && stockIca === 0);

  if (sede === 'huancayo') {
    return esHuancayo || stockHyo > 0;
  }

  if (sede === 'ica') {
    return !esHuancayo || stockIca > 0;
  }

  return true;
}

// -----------------------------------------------------------------------------
// 1. EXPORTAR INVENTARIO O PLANTILLA A EXCEL (.xlsx) CON FILTRO EXACTO POR SEDE
// -----------------------------------------------------------------------------
export async function exportarInventarioAExcel({
  productos,
  sede = 'todas',
  soloPlantilla = false,
}: {
  productos: Producto[];
  sede?: 'ica' | 'huancayo' | 'todas';
  soloPlantilla?: boolean;
}): Promise<void> {
  // 1. Filtrar estrictamente según la sede elegida
  const productosFiltrados = productos.filter((p) => perteneceASede(p, sede));

  // 2. Asegurar lista ordenada alfabéticamente por nombre
  const productosOrdenados = [...productosFiltrados].sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
  );

  // 3. Mapear filas con las columnas exactas para la sede (sin mezclar sedes)
  const filas = productosOrdenados.map((p) => {
    const stockIcaReal = typeof p.stock_ica === 'number' ? p.stock_ica : 0;
    const stockHyoReal = typeof p.stock_huancayo === 'number' ? p.stock_huancayo : 0;
    const stockTotalReal = typeof p.stock === 'number' ? p.stock : stockIcaReal + stockHyoReal;

    if (sede === 'ica') {
      return {
        'ID_SISTEMA': p.id,
        'CODIGO_SKU': p.sku || 'SIN-SKU',
        'PRODUCTO': p.nombre,
        'CATEGORIA': p.categoria?.nombre || 'General',
        'PRECIO_VENTA': Number(p.precio_venta || 0),
        'STOCK_ICA': soloPlantilla ? 0 : stockIcaReal,
      };
    }

    if (sede === 'huancayo') {
      return {
        'ID_SISTEMA': p.id,
        'CODIGO_SKU': p.sku || 'SIN-SKU',
        'PRODUCTO': p.nombre,
        'CATEGORIA': p.categoria?.nombre || 'General',
        'PRECIO_VENTA': Number(p.precio_venta || 0),
        'STOCK_HUANCAYO': soloPlantilla ? 0 : stockHyoReal,
      };
    }

    // Sede 'todas' (reporte general)
    return {
      'ID_SISTEMA': p.id,
      'CODIGO_SKU': p.sku || 'SIN-SKU',
      'PRODUCTO': p.nombre,
      'CATEGORIA': p.categoria?.nombre || 'General',
      'PRECIO_VENTA': Number(p.precio_venta || 0),
      'STOCK_ICA': soloPlantilla ? 0 : stockIcaReal,
      'STOCK_HUANCAYO': soloPlantilla ? 0 : stockHyoReal,
      'STOCK_TOTAL': soloPlantilla ? 0 : stockTotalReal,
    };
  });

  const ws = XLSX.utils.json_to_sheet(filas);

  // Ancho óptimo de columnas ajustado según la sede seleccionada
  if (sede === 'ica') {
    ws['!cols'] = [
      { wch: 38 }, // ID_SISTEMA
      { wch: 14 }, // CODIGO_SKU
      { wch: 40 }, // PRODUCTO
      { wch: 22 }, // CATEGORIA
      { wch: 14 }, // PRECIO_VENTA
      { wch: 16 }, // STOCK_ICA
    ];
  } else if (sede === 'huancayo') {
    ws['!cols'] = [
      { wch: 38 }, // ID_SISTEMA
      { wch: 14 }, // CODIGO_SKU
      { wch: 40 }, // PRODUCTO
      { wch: 22 }, // CATEGORIA
      { wch: 14 }, // PRECIO_VENTA
      { wch: 18 }, // STOCK_HUANCAYO
    ];
  } else {
    ws['!cols'] = [
      { wch: 38 }, // ID_SISTEMA
      { wch: 14 }, // CODIGO_SKU
      { wch: 38 }, // PRODUCTO
      { wch: 20 }, // CATEGORIA
      { wch: 14 }, // PRECIO_VENTA
      { wch: 14 }, // STOCK_ICA
      { wch: 18 }, // STOCK_HUANCAYO
      { wch: 14 }, // STOCK_TOTAL
    ];
  }

  const wb = XLSX.utils.book_new();
  const nombreHoja = soloPlantilla
    ? `PLANTILLA_${sede.toUpperCase()}`
    : `INVENTARIO_${sede.toUpperCase()}`;
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

  const fechaHoy = new Date().toISOString().split('T')[0];
  const nombreArchivo = soloPlantilla
    ? `Plantilla_Inventario_${sede.toUpperCase()}_${fechaHoy}.xlsx`
    : `Inventario_${sede.toUpperCase()}_Galindo_${fechaHoy}.xlsx`;

  XLSX.writeFile(wb, nombreArchivo);
}

// -----------------------------------------------------------------------------
// 2. ANALIZAR Y PREVISUALIZAR ARCHIVO EXCEL (.xlsx / .xls / .csv)
// -----------------------------------------------------------------------------
export async function analizarArchivoExcel({
  file,
  productosActuales,
  modo = 'ambas',
}: {
  file: File;
  productosActuales: Producto[];
  modo: ModoActualizacionSede;
}): Promise<ResumenPrevisualizacion> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene ninguna hoja de cálculo.');
  }

  const primeraHoja = wb.Sheets[wb.SheetNames[0]];
  const filasRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(primeraHoja, {
    defval: '',
  });

  if (filasRaw.length === 0) {
    throw new Error('La hoja de cálculo está vacía o no contiene filas con datos.');
  }

  // Índices rápidos de búsqueda de productos
  const mapaPorId = new Map<string, Producto>();
  const mapaPorSku = new Map<string, Producto>();
  const mapaPorNombre = new Map<string, Producto>();

  productosActuales.forEach((p) => {
    if (p.id) mapaPorId.set(String(p.id).trim().toLowerCase(), p);
    if (p.sku) mapaPorSku.set(String(p.sku).trim().toLowerCase(), p);
    if (p.nombre) mapaPorNombre.set(String(p.nombre).trim().toLowerCase(), p);
  });

  const items: ItemPrevisualizacionExcel[] = [];
  const itemsNoEncontrados: ItemNoEncontrado[] = [];

  filasRaw.forEach((fila, index) => {
    const filaExcel = index + 2; // +1 por base 1, +1 por cabecera

    // Normalizar llaves del objeto de la fila
    const keys = Object.keys(fila);
    const getValor = (posiblesNombres: string[]): unknown => {
      for (const p of posiblesNombres) {
        const foundKey = keys.find((k) =>
          k
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_')
            .replace(/[ÁÀÄÂ]/g, 'A')
            .replace(/[ÉÈËÊ]/g, 'E')
            .replace(/[ÍÌÏÎ]/g, 'I')
            .replace(/[ÓÒÖÔ]/g, 'O')
            .replace(/[ÚÙÜÛ]/g, 'U')
            .includes(p)
        );
        if (foundKey && fila[foundKey] !== undefined && fila[foundKey] !== '') {
          return fila[foundKey];
        }
      }
      return undefined;
    };

    // Identificadores
    const rawId = getValor(['ID_SISTEMA', 'ID_PRODUCTO', 'ID']);
    const rawSku = getValor(['CODIGO_SKU', 'SKU', 'CODIGO', 'BARRA', 'COD']);
    const rawNombre = getValor(['PRODUCTO', 'NOMBRE_PRODUCTO', 'NOMBRE', 'DESCRIPCION']);

    // Si la fila está completamente en blanco, omitirla
    if (!rawId && !rawSku && !rawNombre) {
      return;
    }

    // Buscar producto coincidente
    let productoEncontrado: Producto | undefined = undefined;

    if (rawId && typeof rawId === 'string') {
      productoEncontrado = mapaPorId.get(rawId.trim().toLowerCase());
    }

    if (!productoEncontrado && rawSku) {
      const skuNorm = String(rawSku).trim().toLowerCase();
      productoEncontrado = mapaPorSku.get(skuNorm);
    }

    if (!productoEncontrado && rawNombre) {
      const nombreNorm = String(rawNombre).trim().toLowerCase();
      productoEncontrado = mapaPorNombre.get(nombreNorm);
    }

    if (!productoEncontrado) {
      itemsNoEncontrados.push({
        filaExcel,
        codigoIdentificador: String(rawSku || rawId || 'N/A'),
        nombreDetectado: String(rawNombre || 'Sin nombre'),
        motivo: 'No se encontró ningún producto con este SKU o Nombre en el sistema',
      });
      return;
    }

    // Valores anteriores en sistema
    const stockIcaAnterior = typeof productoEncontrado.stock_ica === 'number'
      ? productoEncontrado.stock_ica
      : (typeof productoEncontrado.stock === 'number' ? productoEncontrado.stock : 0);
    const stockHyoAnterior = typeof productoEncontrado.stock_huancayo === 'number'
      ? productoEncontrado.stock_huancayo
      : 0;

    // Valores en Excel
    const rawStockIca = getValor(['STOCK_ICA', 'ICA', 'CANTIDAD_ICA']);
    const rawStockHyo = getValor(['STOCK_HUANCAYO', 'HUANCAYO', 'CANTIDAD_HUANCAYO', 'HYO']);
    const rawStockGenerico = getValor(['STOCK_TOTAL', 'STOCK', 'CANTIDAD', 'CONTEO']);

    // Parsear números
    const parseStock = (val: unknown): number | null => {
      if (val === undefined || val === '') return null;
      const num = Number(val);
      if (isNaN(num) || num < 0) return -1; // Inválido
      return Math.floor(num);
    };

    const valIca = parseStock(rawStockIca);
    const valHyo = parseStock(rawStockHyo);
    const valGenerico = parseStock(rawStockGenerico);

    let stockIcaNuevo = stockIcaAnterior;
    let stockHyoNuevo = stockHyoAnterior;
    let cambioIca = false;
    let cambioHyo = false;
    let errorMensaje: string | undefined = undefined;

    // Validar según el modo seleccionado
    if (modo === 'ica') {
      const objetivo = valIca !== null ? valIca : valGenerico;
      if (objetivo === -1) {
        errorMensaje = 'La cantidad de Sede Ica debe ser un número entero mayor o igual a 0.';
      } else if (objetivo !== null) {
        stockIcaNuevo = objetivo;
        cambioIca = stockIcaNuevo !== stockIcaAnterior;
      }
    } else if (modo === 'huancayo') {
      const objetivo = valHyo !== null ? valHyo : valGenerico;
      if (objetivo === -1) {
        errorMensaje = 'La cantidad de Sede Huancayo debe ser un número entero mayor o igual a 0.';
      } else if (objetivo !== null) {
        stockHyoNuevo = objetivo;
        cambioHyo = stockHyoNuevo !== stockHyoAnterior;
      }
    } else {
      // Modo 'ambas'
      if (valIca === -1 || valHyo === -1 || (valGenerico === -1 && valIca === null && valHyo === null)) {
        errorMensaje = 'Las cantidades ingresadas deben ser números válidos mayores o iguales a 0.';
      } else {
        if (valIca !== null) {
          stockIcaNuevo = valIca;
          cambioIca = stockIcaNuevo !== stockIcaAnterior;
        }
        if (valHyo !== null) {
          stockHyoNuevo = valHyo;
          cambioHyo = stockHyoNuevo !== stockHyoAnterior;
        }
        // Si no había columnas específicas de ICA ni HUANCAYO pero sí genérica
        if (valIca === null && valHyo === null && valGenerico !== null) {
          stockIcaNuevo = valGenerico;
          cambioIca = stockIcaNuevo !== stockIcaAnterior;
        }
      }
    }

    const estado: ItemPrevisualizacionExcel['estado'] = errorMensaje
      ? 'error'
      : cambioIca || cambioHyo
      ? 'actualizado'
      : 'sin_cambios';

    items.push({
      filaExcel,
      productoId: productoEncontrado.id,
      sku: productoEncontrado.sku,
      nombre: productoEncontrado.nombre,
      categoria: productoEncontrado.categoria?.nombre || 'General',
      precioVenta: productoEncontrado.precio_venta,
      stockIcaAnterior,
      stockIcaNuevo,
      cambioIca,
      diffIca: stockIcaNuevo - stockIcaAnterior,
      stockHyoAnterior,
      stockHyoNuevo,
      cambioHyo,
      diffHyo: stockHyoNuevo - stockHyoAnterior,
      estado,
      mensajeError: errorMensaje,
    });
  });

  const totalModificados = items.filter((i) => i.estado === 'actualizado').length;
  const totalSinCambios = items.filter((i) => i.estado === 'sin_cambios').length;
  const totalErrores = items.filter((i) => i.estado === 'error').length;

  return {
    nombreArchivo: file.name,
    totalFilas: items.length + itemsNoEncontrados.length,
    totalModificados,
    totalSinCambios,
    totalErrores,
    items,
    itemsNoEncontrados,
  };
}

// -----------------------------------------------------------------------------
// 3. APLICAR AJUSTE MASIVO DE STOCK Y REGISTRAR EN KARDEX (Supabase)
// -----------------------------------------------------------------------------
export async function aplicarAjusteMasivoInventario({
  items,
  motivo,
  usuarioNombre = 'Administración',
  usuarioId,
  onProgreso,
}: {
  items: ItemPrevisualizacionExcel[];
  motivo: string;
  usuarioNombre?: string;
  usuarioId?: string;
  onProgreso?: (porcentaje: number, procesados: number, total: number) => void;
}): Promise<{
  success: boolean;
  actualizados: number;
  errores: string[];
}> {
  const itemsAModificar = items.filter((i) => i.estado === 'actualizado');
  const total = itemsAModificar.length;

  if (total === 0) {
    return { success: true, actualizados: 0, errores: [] };
  }

  const errores: string[] = [];
  let procesados = 0;
  const motivoOficial = motivo.trim() || 'Ajuste masivo por importación de inventario Excel';
  const fechaOperacion = new Date().toISOString();

  // Procesar secuencialmente o en pequeños lotes de 10 para garantizar estabilidad
  const TAMANIO_LOTE = 10;
  for (let i = 0; i < itemsAModificar.length; i += TAMANIO_LOTE) {
    const lote = itemsAModificar.slice(i, i + TAMANIO_LOTE);

    await Promise.all(
      lote.map(async (item) => {
        try {
          // 1. Construir actualización de stock en tabla productos
          const updatePayload: Record<string, unknown> = {
            actualizado_en: new Date().toISOString(),
          };

          if (item.cambioIca) {
            updatePayload.stock_ica = item.stockIcaNuevo;
          }
          if (item.cambioHyo) {
            updatePayload.stock_huancayo = item.stockHyoNuevo;
          }

          const { error: prodErr } = await supabase
            .from('productos')
            .update(updatePayload)
            .eq('id', item.productoId);

          if (prodErr) {
            throw new Error(`Error actualizando "${item.nombre}": ${prodErr.message}`);
          }

          // 2. Registrar en Kardex (movimientos_inventario) por cada sede afectada
          const movimientosAInsertar: Record<string, unknown>[] = [];

          if (item.cambioIca) {
            const movIca: Record<string, unknown> = {
              producto_id: item.productoId,
              tipo: 'AJUSTE',
              cantidad: Math.abs(item.diffIca),
              stock_anterior: item.stockIcaAnterior,
              stock_nuevo: item.stockIcaNuevo,
              sede: 'ica',
              motivo: `${motivoOficial} (Sede Ica)`,
              usuario_nombre: usuarioNombre,
              fecha: fechaOperacion,
            };
            if (usuarioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usuarioId)) {
              movIca.usuario_id = usuarioId;
            }
            movimientosAInsertar.push(movIca);
          }

          if (item.cambioHyo) {
            const movHyo: Record<string, unknown> = {
              producto_id: item.productoId,
              tipo: 'AJUSTE',
              cantidad: Math.abs(item.diffHyo),
              stock_anterior: item.stockHyoAnterior,
              stock_nuevo: item.stockHyoNuevo,
              sede: 'huancayo',
              motivo: `${motivoOficial} (Sede Huancayo)`,
              usuario_nombre: usuarioNombre,
              fecha: fechaOperacion,
            };
            if (usuarioId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usuarioId)) {
              movHyo.usuario_id = usuarioId;
            }
            movimientosAInsertar.push(movHyo);
          }

          if (movimientosAInsertar.length > 0) {
            const { error: kardexErr } = await supabase
              .from('movimientos_inventario')
              .insert(movimientosAInsertar);

            if (kardexErr) {
              console.warn(
                `Kardex aviso para producto ${item.nombre}:`,
                kardexErr.message
              );
            }
          }

          procesados++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          errores.push(msg);
        }
      })
    );

    if (onProgreso) {
      const porcentaje = Math.round((procesados / total) * 100);
      onProgreso(porcentaje, procesados, total);
    }
  }

  return {
    success: errores.length === 0,
    actualizados: procesados,
    errores,
  };
}
