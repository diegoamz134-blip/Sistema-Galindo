import { supabase } from '@/lib/supabase';
import { Producto, Categoria } from '@/types/database';

export interface CreateProductInput {
  nombre: string;
  sku: string;
  categoria_id: string;
  descripcion: string;
  precio_compra: number;
  precio_venta: number;
  precio_alumno?: number;
  stock: number;
  stock_minimo?: number;
  imagen_url?: string;
  destacado?: boolean;
  en_oferta?: boolean;
}

// -------------------------------------------------------------------------
// 1. Obtener todos los productos para el Panel de Administración
// -------------------------------------------------------------------------
export async function getAdminProducts(): Promise<Producto[]> {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(*)')
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error al consultar productos de Supabase:', error);
      return [];
    }

    return (data as unknown as Producto[]) || [];
  } catch (err) {
    console.error('Error inesperado al obtener productos:', err);
    return [];
  }
}

// -------------------------------------------------------------------------
// 2. Obtener categorías activas
// -------------------------------------------------------------------------
export async function getCategories(): Promise<Categoria[]> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error al consultar categorías de Supabase:', error);
      return [];
    }

    return (data as Categoria[]) || [];
  } catch (err) {
    console.error('Error inesperado al obtener categorías:', err);
    return [];
  }
}

// -------------------------------------------------------------------------
// 3. Crear un nuevo producto en Supabase
// -------------------------------------------------------------------------
export async function createProduct(
  input: CreateProductInput
): Promise<{ success: boolean; data?: Producto; error?: string }> {
  try {
    const slugBase = input.nombre
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const slug = `${slugBase}-${Date.now().toString().slice(-4)}`;

    const defaultImg =
      'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=800&q=80';
    const imagenes = input.imagen_url && input.imagen_url.trim() ? [input.imagen_url.trim()] : [defaultImg];

    let finalSku = input.sku ? input.sku.trim().toUpperCase() : '';
    if (!finalSku) {
      const { count } = await supabase.from('productos').select('*', { count: 'exact', head: true });
      const nextNum = String((count || 0) + 1).padStart(4, '0');
      finalSku = `GAL-${nextNum}`;
    }

    const nuevoProducto = {
      nombre: input.nombre.trim(),
      sku: finalSku,
      slug,
      categoria_id: input.categoria_id || null,
      descripcion: input.descripcion.trim() || 'Producto oficial Galindo Barber Supply',
      precio_compra: Number(input.precio_compra) || 0,
      precio_venta: Number(input.precio_venta) || 0,
      precio_alumno: input.precio_alumno ? Number(input.precio_alumno) : null,
      stock: Math.max(0, parseInt(String(input.stock), 10) || 0),
      stock_minimo: Math.max(1, parseInt(String(input.stock_minimo || 3), 10)),
      imagenes,
      destacado: Boolean(input.destacado),
      en_oferta: Boolean(input.en_oferta),
      activo: true,
    };

    const { data, error } = await supabase
      .from('productos')
      .insert([nuevoProducto])
      .select('*, categoria:categorias(*)')
      .single();

    if (error) {
      console.error('Error al insertar producto en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as unknown as Producto };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al registrar el producto';
    console.error('Excepción al crear producto:', err);
    return { success: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 4. Actualizar un producto existente
// -------------------------------------------------------------------------
export interface UpdateProductInput {
  nombre?: string;
  sku?: string;
  categoria_id?: string | null;
  descripcion?: string;
  precio_compra?: number;
  precio_venta?: number;
  precio_alumno?: number | null;
  stock?: number;
  stock_minimo?: number;
  imagen_url?: string;
  destacado?: boolean;
  en_oferta?: boolean;
  activo?: boolean;
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput
): Promise<{ success: boolean; data?: Producto; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {};

    if (input.nombre !== undefined) {
      updateData.nombre = input.nombre.trim();
      // Si cambia el nombre, actualizamos el slug
      const slugBase = input.nombre
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      updateData.slug = `${slugBase}-${Date.now().toString().slice(-4)}`;
    }

    if (input.sku !== undefined) updateData.sku = input.sku.trim().toUpperCase();
    if (input.categoria_id !== undefined) updateData.categoria_id = input.categoria_id || null;
    if (input.descripcion !== undefined) updateData.descripcion = input.descripcion.trim();
    if (input.precio_compra !== undefined) updateData.precio_compra = Number(input.precio_compra) || 0;
    if (input.precio_venta !== undefined) updateData.precio_venta = Number(input.precio_venta) || 0;
    if (input.precio_alumno !== undefined) {
      updateData.precio_alumno = input.precio_alumno ? Number(input.precio_alumno) : null;
    }
    if (input.stock !== undefined) updateData.stock = Math.max(0, parseInt(String(input.stock), 10) || 0);
    if (input.stock_minimo !== undefined) {
      updateData.stock_minimo = Math.max(1, parseInt(String(input.stock_minimo || 3), 10));
    }
    if (input.imagen_url !== undefined) {
      updateData.imagenes = input.imagen_url ? [input.imagen_url] : [];
    }
    if (input.destacado !== undefined) updateData.destacado = Boolean(input.destacado);
    if (input.en_oferta !== undefined) updateData.en_oferta = Boolean(input.en_oferta);
    if (input.activo !== undefined) updateData.activo = Boolean(input.activo);

    const { data, error } = await supabase
      .from('productos')
      .update(updateData)
      .eq('id', productId)
      .select('*, categoria:categorias(*)')
      .single();

    if (error) {
      console.error('Error al actualizar producto en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as unknown as Producto };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar producto';
    console.error('Excepción al actualizar producto:', err);
    return { success: false, error: msg };
  }
}

// -------------------------------------------------------------------------
// 5. Eliminar producto
// -------------------------------------------------------------------------
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('productos').delete().eq('id', productId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar producto';
    return { success: false, error: msg };
  }
}

