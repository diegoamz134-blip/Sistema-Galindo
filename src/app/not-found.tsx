import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, ShoppingBag, GraduationCap, MessageCircle, Scissors, Search } from 'lucide-react';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-200">
      {/* Barra superior mínima */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-200 bg-black shrink-0">
              <img src="/logo.jpg" alt="Galindo Barber" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-sm font-black text-black tracking-wider uppercase block leading-none">
                Galindo Barber
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase block mt-0.5">
                Academy & Supply
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la portada</span>
          </Link>
        </div>
      </header>

      {/* Contenido Central 404 */}
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-zinc-50/60">
        <div className="max-w-xl w-full text-center space-y-8 bg-white p-8 sm:p-12 rounded-3xl border border-zinc-200 shadow-sm">
          
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-inner">
              <Scissors className="w-10 h-10 rotate-45 text-black" />
            </div>
            <span className="absolute -top-2 -right-3 px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-400 text-black border border-black/10">
              Error 404
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
              Página No Encontrada
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-md mx-auto">
              El corte no quedó como esperabas. La página que estás buscando no existe, cambió de dirección o se encuentra en mantenimiento temporal.
            </p>
          </div>

          {/* Accesos Rápidos de Rescate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <Link
              href="/tienda"
              className="p-4 rounded-xl border border-zinc-200 hover:border-black/50 hover:bg-zinc-50 transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-black shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-black uppercase">Tienda Supply</p>
                <p className="text-[11px] text-zinc-500">Máquinas, tijeras e insumos</p>
              </div>
            </Link>

            <Link
              href="/cursos"
              className="p-4 rounded-xl border border-zinc-200 hover:border-black/50 hover:bg-zinc-50 transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-black shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-black uppercase">Academia</p>
                <p className="text-[11px] text-zinc-500">Cursos en Ica y Huancayo</p>
              </div>
            </Link>
          </div>

          {/* Botones Principales */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-zinc-100">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span>Ir al Inicio</span>
            </Link>

            <a
              href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=${encodeURIComponent(
                'Hola Galindo Barber, estaba navegando en la web y no pude encontrar lo que buscaba. ¿Podrían orientarme?'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ayuda por WhatsApp</span>
            </a>
          </div>

        </div>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 bg-white">
        © {new Date().getFullYear()} Galindo Barber Academy & Supply. Todos los derechos reservados.
      </footer>
    </div>
  );
}
