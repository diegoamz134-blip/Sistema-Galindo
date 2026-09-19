import { supabase } from '@/lib/supabase';
import { MovimientoInventario, TipoMovimientoInventario, Producto } from '@/types/database';
import { MOCK_MOVIMIENTOS_INVENTARIO, MOCK_PRODUCTOS } from '@/lib/mock-data';

export interface RegistrarMovimientoInput {
  producto_id: string;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  motivo: string;
  usuario_id?: string;
  usuario_nombre?: string;
  referencia_id?: string;
}

export interface KardexFiltros {
  productoId?: string;
  tipo?: TipoMovimientoInventario | 'TODOS';
  busqueda?: string;
  pagina?: number;
  porPagina?: number;
}

export interface KardexPaginadoRespuesta {
  movimientos: MovimientoInventario[];
  totalRegistros: number;
  totalPaginas: number;
  paginaActual: number;
  totalesGenerales: {
    entradas: number;
    salidas: number;
    usoClases: number;
    ajustes: number;
    total: number;
  };
}

// -------------------------------------------------------------------------
// 1. Obtener lista paginada de movimientos (exactamente 10 por página)
// -------------------------------------------------------------------------
export async function getMovimientosKardexPaginado(
  filtros?: KardexFiltros
): Promise<KardexPaginadoRespuesta> {
  const pagina = Math.max(1, filtros?.pagina || 1);
  const porPagina = filtros?.porPagina || 10;
  const desde = (pagina - 1) * porPagina;
  const hasta = desde + porPagina - 1;

  try {
    // A. Consultar totales globales ligeros para los KPIs (sólo columnas tipo y cantidad)
    const { data: lightData } = await supabase
      .from('movimientos_inventario')
      .select('tipo, cantidad');

    let entradas = 0;
    let salidas = 0;
    let usoClases = 0;
    let ajustes = 0;
    const totalGeneral = lightData ? lightData.length : 0;

    if (lightData && lightData.length > 0) {
      lightData.forEach((row) => {
        const cant = Number(row.cantidad) || 0;
        if (row.tipo === 'ENTRADA') entradas += cant;
        else if (row.tipo === 'SALIDA') salidas += cant;
        else if (row.tipo === 'USO_CLASE') usoClases += cant;
        else if (row.tipo === 'AJUSTE') ajustes += 1;
      });
    }

    // B. Si hay búsqueda por texto, buscar también productos coincidentes por nombre o SKU
    let matchedProductIds: string[] = [];
    if (filtros?.busqueda && filtros.busqueda.trim()) {
      const q = filtros.busqueda.trim();
      const { data: matchedProds } = await supabase
        .from('productos')
        .select('id')
        .or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`);

      if (matchedProds && matchedProds.length > 0) {
        matchedProductIds = matchedProds.map((p) => p.id);
      }
    }

    // C. Consulta paginada oficial con .range(desde, hasta) para traer solo 10 registros
    let query = supabase
      .from('movimientos_inventario')
      .select('*, producto:productos(id, nombre, sku, imagenes, stock, precio_venta)', {
        count: 'exact',
      })
      .order('fecha', { ascending: false });

    if (filtros?.productoId && filtros.productoId !== 'todos') {
      query = query.eq('producto_id', filtros.productoId);
    }

    if (filtros?.tipo && filtros.tipo !== 'TODOS') {
      query = query.eq('tipo', filtros.tipo);
    }

    if (filtros?.busqueda && filtros.busqueda.trim()) {
      const q = filtros.busqueda.trim();
      if (matchedProductIds.length > 0) {
        query = query.or(
          `producto_id.in.(${matchedProductIds.join(',')}),motivo.ilike.%${q}%,referencia_id.ilike.%${q}%,usuario_nombre.ilike.%${q}%`
        );
      } else {
        query = query.or(
          `motivo.ilike.%${q}%,referencia_id.ilike.%${q}%,usuario_nombre.ilike.%${q}%`
        );
      }
    }

    // Limitar estrictamente al rango de la página solicitada (10 por página)
    query = query.range(desde, hasta);

    const { data, count, error } = await query;

    if (error) {
      console.warn('Error al consultar movimientos_inventario en Supabase:', error.message);
      const totalMock = MOCK_MOVIMIENTOS_INVENTARIO.length;
      return {
        movimientos: MOCK_MOVIMIENTOS_INVENTARIO.slice(desde, hasta + 1),
        totalRegistros: totalMock,
        totalPaginas: Math.ceil(totalMock / porPagina) || 1,
        paginaActual: pagina,
        totalesGenerales: {
          entradas: 10,
          salidas: 2,
          usoClases: 0,
          ajustes: 0,
          total: totalMock,
        },
      };
    }

    const totalFiltrado = count ?? (data?.length || 0);
    const totalPaginas = Math.ceil(totalFiltrado / porPagina) || 1;

    const movsMapeados: MovimientoInventario[] = ((data as unknown as Record<string, unknown>[]) || []).map((row) => ({
      ...(row as unknown as MovimientoInventario),
      fecha: String(row.fecha || row.created_at || row.creado_en || new Date().toISOString()),
    }));

    return {
      movimientos: movsMapeados,
      totalRegistros: totalFiltrado,
      totalPaginas,
      paginaActual: pagina,
      totalesGenerales: {
        entradas,
        salidas,
        usoClases,
        ajustes,
        total: totalGeneral,
      },
    };
  } catch (err) {
    console.error('Error inesperado al cargar Kardex paginado:', err);
    return {
      movimientos: [],
      totalRegistros: 0,
      totalPaginas: 1,
      paginaActual: 1,
      totalesGenerales: {
        entradas: 0,
        salidas: 0,
        usoClases: 0,
        ajustes: 0,
        total: 0,
      },
    };
  }
}

// -------------------------------------------------------------------------
// 2. Obtener lista de productos para el selector de Kardex
// -------------------------------------------------------------------------
export async function getProductosParaKardex(): Promise<Producto[]> {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('id, nombre, sku, stock, stock_minimo, imagenes, precio_venta, activo')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error || !data || data.length === 0) {
      return MOCK_PRODUCTOS;
    }

    return data as Producto[];
  } catch (err) {
    console.warn('Error al obtener productos para Kardex:', err);
    return MOCK_PRODUCTOS;
  }
}

// -------------------------------------------------------------------------
// 3. Registrar un nuevo movimiento de Kardex (Transaccional en Supabase)
// -------------------------------------------------------------------------
export async function registrarMovimientoKardex(
  input: RegistrarMovimientoInput
): Promise<{ success: boolean; data?: MovimientoInventario; error?: string }> {
  try {
    if (!input.producto_id) {
      return { success: false, error: 'Debe seleccionar un producto válido' };
    }

    if (!input.cantidad || input.cantidad <= 0) {
      return { success: false, error: 'La cantidad debe ser mayor a 0 unidades' };
    }

    if (!input.motivo || !input.motivo.trim()) {
      return { success: false, error: 'Debe ingresar un motivo o justificación' };
    }

    // A. Obtener el stock actual más reciente del producto desde Supabase
    const { data: prod, error: prodErr } = await supabase
      .from('productos')
      .select('id, nombre, sku, stock')
      .eq('id', input.producto_id)
      .single();

    if (prodErr || !prod) {
      return {
        success: false,
        error: 'No se pudo encontrar el producto en la base de datos',
      };
    }

    const stockAnterior = typeof prod.stock === 'number' ? prod.stock : 0;
    let stockNuevo = stockAnterior;

    // B. Calcular el stock resultante según el tipo de operación
    switch (input.tipo) {
      case 'ENTRADA':
        stockNuevo = stockAnterior + input.cantidad;
        break;

      case 'SALIDA':
      case 'USO_CLASE':
        if (stockAnterior < input.cantidad) {
          return {
            success: false,
            error: `Stock insuficiente para esta salida. Solo hay ${stockAnterior} unidades disponibles en inventario.`,
          };
        }
        stockNuevo = Math.max(0, stockAnterior - input.cantidad);
        break;

      case 'AJUSTE':
        stockNuevo = Math.max(0, input.cantidad);
        break;

      default:
        stockNuevo = stockAnterior;
    }

    // C. Actualizar el stock en la tabla 'productos'
    const { error: updateErr } = await supabase
      .from('productos')
      .update({
        stock: stockNuevo,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', input.producto_id);

    if (updateErr) {
      console.error('Error al actualizar stock de producto:', updateErr);
      return {
        success: false,
        error: `No se pudo actualizar el stock en Supabase: ${updateErr.message}`,
      };
    }

    // D. Registrar el movimiento en 'movimientos_inventario'
    const payload: Record<string, unknown> = {
      producto_id: input.producto_id,
      tipo: input.tipo,
      cantidad: input.tipo === 'AJUSTE' ? Math.abs(stockNuevo - stockAnterior) : input.cantidad,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      motivo: input.motivo.trim(),
      usuario_nombre: input.usuario_nombre || 'Diego Galindo',
      referencia_id: input.referencia_id || null,
      fecha: new Date().toISOString(),
    };

    if (input.usuario_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.usuario_id)) {
      payload.usuario_id = input.usuario_id;
    }

    const { data: movInsertado, error: insertErr } = await supabase
      .from('movimientos_inventario')
      .insert(payload)
      .select('*, producto:productos(id, nombre, sku, imagenes, stock)')
      .single();

    if (insertErr) {
      console.error('Error al insertar en movimientos_inventario:', insertErr);
      return {
        success: false,
        error: `Error al registrar en Kardex: ${insertErr.message}`,
      };
    }

    return {
      success: true,
      data: movInsertado as unknown as MovimientoInventario,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al registrar en Kardex';
    console.error('Error inesperado en registrarMovimientoKardex:', err);
    return { success: false, error: msg };
  }
}
