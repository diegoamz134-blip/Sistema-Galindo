import React from 'react';
import Link from 'next/link';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-black text-zinc-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Col 1: Galindo Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 shadow-sm shrink-0">
                <img
                  src="/logo.jpg"
                  alt="Galindo Barber"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-base font-bold text-white tracking-wider uppercase">
                Galindo Barber
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Escuela de formación técnica y distribución de herramientas profesionales de barbería en Ica, Perú.
            </p>
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
                  Tijeras Profesionales & Navajas
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

          {/* Col 3: Cursos */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">
              Academia
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/cursos" className="text-zinc-400 hover:text-white transition-colors">
                  Barbería Integral & Fade
                </Link>
              </li>
              <li>
                <Link href="/cursos" className="text-zinc-400 hover:text-white transition-colors">
                  Masterclass Avanzada
                </Link>
              </li>
              <li>
                <Link href="/cursos" className="text-zinc-400 hover:text-white transition-colors">
                  Horarios y Turnos
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors pt-2 block">
                  Acceso Administrativo
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Sedes y Contacto */}
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Sede Ica</span>
              </h4>
              <div className="space-y-1 text-xs text-zinc-400">
                <p className="font-medium text-zinc-200">{SEDES.ica.direccion}</p>
                <p className="font-mono text-[11px] text-zinc-400">WA: {SEDES.ica.whatsappDisplay}</p>
                <a
                  href={`https://wa.me/${SEDES.ica.whatsapp}?text=Hola%20Galindo%20Barber%20Sede%20Ica,%20solicito%20información.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-[11px] font-bold text-white underline hover:text-zinc-300 transition-colors"
                >
                  Contactar WhatsApp Ica →
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Sede Huancayo</span>
              </h4>
              <div className="space-y-1 text-xs text-zinc-400">
                <p className="font-medium text-zinc-200">{SEDES.huancayo.direccion}</p>
                <p className="font-mono text-[11px] text-zinc-400">WA: {SEDES.huancayo.whatsappDisplay}</p>
                <a
                  href={`https://wa.me/${SEDES.huancayo.whatsapp}?text=Hola%20Galindo%20Barber%20Sede%20Huancayo,%20solicito%20información.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-[11px] font-bold text-white underline hover:text-zinc-300 transition-colors"
                >
                  Contactar WhatsApp Huancayo →
                </a>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-zinc-800 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-3">
          <p>© {new Date().getFullYear()} Galindo Barber Academy & Supply — Ica & Huancayo, Perú.</p>
          <p className="text-zinc-400 font-medium">Creado por <span className="text-white font-semibold tracking-wide">supradev</span></p>
        </div>
      </div>
    </footer>
  );
}
