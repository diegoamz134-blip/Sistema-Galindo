'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Menu, X, MapPin } from 'lucide-react';
import { BUSINESS_INFO, SEDES, SedeId } from '@/lib/constants';
import { useCart } from '@/context/CartContext';
import { SedeSelector } from '@/components/layout/SedeSelector';

interface NavbarProps {
  cartItemCount?: number;
  onOpenCart?: () => void;
}

export function Navbar({ cartItemCount, onOpenCart }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems, setCartOpen, isCartBumping, sedeSeleccionada, setSedeSeleccionada } = useCart();

  const count = cartItemCount !== undefined ? cartItemCount : totalItems;
  const handleOpenCart = onOpenCart || (() => setCartOpen(true));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo Galindo Oficial */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-zinc-200 shadow-sm shrink-0">
              <img
                src="/logo.jpg"
                alt="Galindo Barber Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 block uppercase leading-none">
                Galindo Barber
              </span>
              <span className="text-[10px] sm:text-[11px] tracking-widest text-zinc-500 uppercase block mt-0.5 sm:mt-1">
                Academy & Supply • Ica & Huancayo
              </span>
            </div>
          </Link>

          {/* Enlaces de Navegación */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm text-zinc-600 hover:text-black transition-colors font-medium"
            >
              Inicio
            </Link>
            <Link
              href="/tienda"
              className="text-sm text-zinc-600 hover:text-black transition-colors font-medium"
            >
              Tienda Supply
            </Link>
            <Link
              href="/cursos"
              className="text-sm text-zinc-600 hover:text-black transition-colors font-medium"
            >
              Cursos & Academia
            </Link>
          </nav>

          {/* Acciones Derecha */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Selector de Sede Elegante y Accesible (Solo Desktop) */}
            <div className="hidden md:block">
              <SedeSelector variant="dropdown" showDetails />
            </div>

            {/* Botón Carrito interactivo con animación reactiva de impacto */}
            <motion.button
              id="navbar-cart-button"
              type="button"
              onClick={handleOpenCart}
              animate={
                isCartBumping
                  ? {
                      scale: [1, 1.35, 0.88, 1.15, 1],
                      rotate: [0, -12, 12, -6, 6, 0],
                    }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className={`relative p-2.5 rounded-xl border transition-colors cursor-pointer ${
                isCartBumping
                  ? 'bg-black text-white border-black ring-4 ring-emerald-500/30'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900'
              }`}
              aria-label="Abrir carrito de compras"
            >
              <ShoppingCart className="w-4 h-4" />
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black text-white font-bold text-[10px] flex items-center justify-center shadow-sm"
                >
                  {count}
                </motion.span>
              )}
            </motion.button>

            {/* Botón Matrícula */}
            <Link
              href="/cursos"
              className="hidden lg:inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-all uppercase tracking-wider"
            >
              Matrícula 2026
            </Link>

            {/* Toggle Móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-600 hover:text-black cursor-pointer rounded-lg hover:bg-zinc-100"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* BARRA PERMANENTE DE CAMBIO DE SEDE EN TELÉFONO / MÓVIL (Siempre visible y accesible en teléfonos) */}
      <div className="md:hidden px-3.5 sm:px-6 py-2 bg-zinc-50 border-t border-zinc-200/90 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold truncate">
            Sede:
          </span>
          <span className="text-xs font-bold text-zinc-950 truncate">
            {sedeSeleccionada === 'ica' ? 'Ica (Calle Bolívar)' : 'Huancayo (Jr. Guido)'}
          </span>
        </div>
        <SedeSelector variant="segmented" className="shrink-0" />
      </div>

      {/* Menú Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-4 space-y-3">
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 rounded-lg"
            >
              Inicio
            </Link>
            <Link
              href="/tienda"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 rounded-lg"
            >
              Tienda Supply
            </Link>
            <Link
              href="/cursos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 rounded-lg"
            >
              Cursos & Academia
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-zinc-600 hover:text-black border-t border-zinc-100 pt-3"
            >
              Panel Administrativo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
