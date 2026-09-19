'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { BUSINESS_INFO } from '@/lib/constants';
import { useCart } from '@/context/CartContext';

interface NavbarProps {
  cartItemCount?: number;
  onOpenCart?: () => void;
}

export function Navbar({ cartItemCount, onOpenCart }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems, setCartOpen, isCartBumping } = useCart();

  const count = cartItemCount !== undefined ? cartItemCount : totalItems;
  const handleOpenCart = onOpenCart || (() => setCartOpen(true));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      {/* Top Banner sutil */}
      <div className="hidden md:flex items-center justify-between px-6 py-2 text-xs text-zinc-600 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sede Ica: Calle Bolívar 536 (WA: 914 614 424)</span>
          </span>
          <span className="text-zinc-300">•</span>
          <span className="flex items-center gap-1.5 font-medium text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sede Huancayo: Jr. Guido 654 (WA: 967 577 215)</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-600">Ciclo Académico 2026</span>
          <span className="text-zinc-300">|</span>
          <Link
            href="/admin"
            className="text-zinc-900 hover:text-black transition-colors font-semibold"
          >
            Panel Administrativo
          </Link>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Galindo Oficial */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-zinc-200 shadow-sm shrink-0">
              <img
                src="/logo.jpg"
                alt="Galindo Barber Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-950 block uppercase leading-none">
                Galindo Barber
              </span>
              <span className="text-[11px] tracking-widest text-zinc-500 uppercase block mt-1">
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
          <div className="flex items-center gap-3">
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
              <ShoppingBag className="w-4 h-4" />
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
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-all uppercase tracking-wider"
            >
              Matrícula 2026
            </Link>

            {/* Toggle Móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-600 hover:text-black"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Menú Móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-4 space-y-2">
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
      )}
    </header>
  );
}
