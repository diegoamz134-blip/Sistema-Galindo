'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Package,
  CircleDollarSign,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminBottomNavProps {
  onOpenMobileMenu: () => void;
}

export function AdminBottomNav({ onOpenMobileMenu }: AdminBottomNavProps) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    {
      href: '/admin',
      label: 'Inicio',
      icon: LayoutDashboard,
      isActive: pathname === '/admin',
    },
    {
      href: '/admin/pos',
      label: 'POS',
      icon: Store,
      isActive: pathname.startsWith('/admin/pos'),
    },
    {
      href: '/admin/productos',
      label: 'Productos',
      icon: Package,
      isActive: pathname.startsWith('/admin/productos'),
    },
    {
      href: '/admin/caja',
      label: 'Caja',
      icon: CircleDollarSign,
      isActive: pathname.startsWith('/admin/caja'),
    },
  ];

  return (
    <nav
      aria-label="Navegación inferior móvil"
      className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.35rem)]"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-95 group',
                item.isActive
                  ? 'text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-700'
              )}
            >
              <div
                className={cn(
                  'relative p-1 rounded-xl transition-all duration-200',
                  item.isActive ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-950" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] mt-0.5 tracking-tight font-medium',
                  item.isActive ? 'font-bold text-zinc-950' : 'text-zinc-500'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Botón Más / Hamburguesa para abrir el sidebar completo */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-zinc-600 hover:text-zinc-950 active:scale-95 transition-all duration-150 cursor-pointer group"
          title="Ver todos los módulos y opciones"
        >
          <div className="p-1 rounded-xl text-zinc-600 group-hover:text-zinc-950 group-hover:bg-zinc-100 transition-colors">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium text-zinc-600 group-hover:text-zinc-950">
            Más
          </span>
        </button>
      </div>
    </nav>
  );
}
