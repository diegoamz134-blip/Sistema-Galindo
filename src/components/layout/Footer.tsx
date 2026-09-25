import React from 'react';
import Link from 'next/link';
import { BookOpen, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-black text-zinc-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        
        {/* Grilla Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Col 1: Galindo Info Legal */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 shadow-sm shrink-0">
                <img
                  src="/logo.jpg"
                  alt="Galindo Barber Logo Oficial"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-wider uppercase block leading-none">
                  Galindo Barber
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase block mt-1">
                  Academy & Supply • Perú
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              Escuela de formación técnica profesional y venta de herramientas originales de barbería en Ica y Huancayo. Comercio formal registrado en la República del Perú.
            </p>

            <div className="space-y-1.5 text-xs text-zinc-400 font-mono pt-2 border-t border-zinc-850">
              <p className="text-zinc-300">
                <b>Titular:</b> {BUSINESS_INFO.yapeHolder}
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{BUSINESS_INFO.email}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>Atención: {BUSINESS_INFO.whatsappDisplay}</span>
              </p>
            </div>
          </div>

          {/* Col 2: Tienda */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">
              Tienda Supply
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tienda?categoria=maquinas-corte" className="text-zinc-400 hover:text-white transition-colors">
                  Máquinas de Corte (Clippers)
                </Link>
              </li>
              <li>
                <Link href="/tienda?categoria=patilleras-trimmers" className="text-zinc-400 hover:text-white transition-colors">
                  Patilleras y Trimmers
                </Link>
              </li>
              <li>
                <Link href="/tienda?categoria=tijeras-navajas" className="text-zinc-400 hover:text-white transition-colors">
                  Tijeras & Navajas
                </Link>
              </li>
              <li>
                <Link href="/tienda?categoria=kits-alumnos" className="text-zinc-400 hover:text-white transition-colors">
                  Kits para Estudiantes
                </Link>
              </li>
              <li>
                <Link href="/tienda?categoria=pomadas-ceras-quimicos" className="text-zinc-400 hover:text-white transition-colors">
                  Pomadas & Cuidado Capilar
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal y Consumidor */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Legal & Privacidad</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/terminos" className="text-zinc-400 hover:text-white transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="text-zinc-400 hover:text-white transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-zinc-400 hover:text-white transition-colors">
                  Política de Cookies
                </Link>
              </li>
              <li className="pt-2">
                {/* Botón Distintivo Oficial Libro de Reclamaciones INDECOPI */}
                <Link
                  href="/reclamaciones"
                  className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/80 text-white text-xs font-semibold transition-all group shadow-sm hover:border-amber-400/60"
                >
                  <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left leading-tight">
                    <span className="block text-[11px] font-bold text-white">Libro de Reclamaciones</span>
                    <span className="block text-[9px] text-zinc-400 font-mono">Virtual • INDECOPI</span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Sedes Físicas */}
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Sede Ica</span>
              </h4>
              <div className="space-y-0.5 text-xs text-zinc-400">
                <p className="font-medium text-zinc-200">{SEDES.ica.direccion}</p>
                <p className="font-mono text-[11px] text-zinc-400">WA: {SEDES.ica.whatsappDisplay}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-850">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Sede Huancayo</span>
              </h4>
              <div className="space-y-0.5 text-xs text-zinc-400">
                <p className="font-medium text-zinc-200">{SEDES.huancayo.direccion}</p>
                <p className="font-mono text-[11px] text-zinc-400">WA: {SEDES.huancayo.whatsappDisplay}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-850">
              <Link href="/admin" className="text-[11px] text-zinc-600 hover:text-zinc-400 font-mono transition-colors block">
                Acceso Administrativo →
              </Link>
            </div>
          </div>

        </div>

        {/* Barra Inferior de Copyright y Cumplimiento Normativo */}
        <div className="border-t border-zinc-850 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-3">
          <p>© {new Date().getFullYear()} Galindo Barber — {BUSINESS_INFO.yapeHolder}. Todos los derechos reservados. Conforme a las leyes de la República del Perú (Ley N° 29733 y Ley N° 29571).</p>
          <p className="text-zinc-400 font-medium">Plataforma desarrollada por <span className="text-white font-semibold tracking-wide">supradev</span></p>
        </div>
      </div>
    </footer>
  );
}
