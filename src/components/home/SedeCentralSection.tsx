import React from 'react';
import { MapPin, Clock, Navigation, MessageCircle, Armchair, ShoppingBag, ShieldCheck, Check } from 'lucide-react';
import { SEDES, SedeId } from '@/lib/constants';
import { useCart } from '@/context/CartContext';

export function SedeCentralSection() {
  const { sedeSeleccionada, setSedeSeleccionada } = useCart();
  const activeSede: SedeId = (sedeSeleccionada === 'huancayo' ? 'huancayo' : 'ica') as SedeId;

  const sede = SEDES[activeSede] || SEDES['ica'];

  const whatsappUrl = `https://wa.me/${sede.whatsapp}?text=${encodeURIComponent(
    `Hola Galindo Barber, deseo información sobre la ubicación y atención en la ${sede.nombre} (${sede.direccion}).`
  )}`;

  return (
    <section className="py-20 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Sede details & live status */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                  Infraestructura Presencial Multisede
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
                Nuestras Sedes: Ica y Huancayo
              </h2>

              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Espacios integrales donde conviven las aulas de práctica real, la tienda física de barber supply y el mostrador de recojo express para tus compras online.
              </p>

              {/* Selector de pestañas para las dos sedes */}
              <div className="pt-2">
                <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200 gap-1">
                  {(Object.keys(SEDES) as SedeId[]).map((key) => {
                    const s = SEDES[key];
                    const isSelected = activeSede === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSedeSeleccionada(key)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-black text-white shadow-xs'
                            : 'text-zinc-600 hover:text-black hover:bg-zinc-200/50'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{s.nombre} ({s.ciudad})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Address & Hours details */}
            <div className="p-5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Dirección Presencial — {sede.nombre}
                  </h3>
                  <p className="text-xs text-zinc-800 font-semibold">
                    {sede.direccionCompleta}
                  </p>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    {sede.referencia}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Horario de Atención y WhatsApp de Mostrador
                  </h3>
                  <p className="text-xs text-zinc-700 font-medium">
                    {sede.horario}
                  </p>
                  <span className="text-[11px] text-emerald-700 font-mono font-bold block mt-0.5">
                    WhatsApp {sede.nombre}: {sede.whatsappDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={sede.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm active:scale-95 group"
              >
                <Navigation className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                <span>Cómo Llegar a {sede.nombre}</span>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp {sede.nombre}</span>
              </a>
            </div>
          </div>

          {/* Right Column: 3 Feature Cards */}
          <div className="lg:col-span-6 space-y-4">
            
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 transition-all shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-900">
                <Armchair className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-950">
                  Estaciones de Práctica con Sillones Hidráulicos
                </h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Aulas climatizadas equipadas con espejos profesionales, tomas de corriente para máquinas, vaporizadores y modelos reales para el aprendizaje activo.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 transition-all shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-900">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-950">
                  Módulo de Recojo Express en 15 Minutos
                </h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Pide tus insumos, ceras o cuchillas desde la web y retíralos sin demoras ni gastos de envío en nuestro mostrador con tu código de ticket o DNI.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 transition-all shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-900">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-950">
                  Vitrinas de Herramientas Originales en Vivo
                </h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Pruébalas en tu propia mano antes de comprar. Comprueba el peso, ergonomía, vibración del motor y filo de las máquinas líderes del mercado.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
