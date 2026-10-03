import React from 'react';
import { Star, MapPin, ExternalLink, CheckCircle } from 'lucide-react';
import { SEDES } from '@/lib/constants';

export function GoogleBusinessBadge() {
  return (
    <section className="bg-zinc-900 border-b border-zinc-800 py-6 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Calificación Google */}
          <div className="flex items-center gap-3.5">
            {/* Ícono de Google con fondo blanco sobrio */}
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.18 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-white">4.9</span>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-zinc-300">
                  (180+ reseñas)
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Ficha Oficial Verificada en Google Maps & Google Business
              </p>
            </div>
          </div>

          {/* Enlaces directos a las dos sedes en Google Maps */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={SEDES.ica.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white border border-zinc-700 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ver Ficha Google Ica</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>

            <a
              href={SEDES.huancayo.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white border border-zinc-700 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ver Ficha Google Huancayo</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
