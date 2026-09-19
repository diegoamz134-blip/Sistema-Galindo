'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { BUSINESS_INFO } from '@/lib/constants';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'exp-previa',
    question: '¿Necesito experiencia previa para matricularme en el curso básico?',
    answer:
      'No necesitas ningún conocimiento previo. El curso de Barbería Integral parte desde los fundamentos absolutos: ergonomía y manejo de tijeras, agarre de máquinas, técnicas de bioseguridad, desvanecido moderno (Fade), visagismo y afeitado clásico con toalla caliente.',
    category: 'Academia',
  },
  {
    id: 'recojo-tienda',
    question: '¿Cómo funciona la compra online y el recojo en tienda física?',
    answer:
      'Al añadir tus productos y completar tu pedido en el checkout, seleccionas si prefieres retirar en Sede Ica o en Sede Huancayo. El sistema te emite un Ticket oficial y lo envías directamente al WhatsApp de la sede seleccionada para que separen tu paquete en mostrador sin costo adicional (S/ 0.00).',
    category: 'Tienda & Envíos',
  },
  {
    id: 'garantia-maquinas',
    question: '¿Las máquinas y herramientas son 100% originales con garantía?',
    answer:
      'Totalmente. Trabajamos como distribuidores autorizados en Ica para las marcas líderes mundiales como Wahl, BaBylissPRO y Andis. Todas las máquinas se entregan en caja sellada original con garantía de fábrica de 1 año y disponibilidad de cuchillas y repuestos de servicio técnico en tienda.',
    category: 'Garantía',
  },
  {
    id: 'herramientas-clases',
    question: '¿Necesito llevar mis propias herramientas para iniciar las clases?',
    answer:
      'Para tus primeras sesiones prácticas, la academia te proporciona el mobiliario, sillones y puestos de trabajo. Te asesoramos desde el primer día para que elijas las herramientas y máquinas adecuadas en nuestro supply oficial.',
    category: 'Herramientas',
  },
  {
    id: 'certificacion-oficial',
    question: '¿Qué certificación recibo al finalizar el programa académico?',
    answer:
      'Al culminar satisfactoriamente el temario y las evaluaciones prácticas con modelos reales, se te otorga la Certificación Oficial a nombre de Galindo Barber Academy, que valida tus horas formativas y competencias técnicas para desempeñarte en cualquier barbería profesional o aperturar tu propio estudio.',
    category: 'Certificación',
  },
];

export function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>('exp-previa');

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const whatsappUrl = `https://wa.me/${BUSINESS_INFO.whatsapp}?text=${encodeURIComponent(
    'Hola Galindo Barber, tengo una consulta adicional sobre los cursos y productos que no encontré en las preguntas frecuentes.'
  )}`;

  return (
    <section className="py-20 bg-white border-b border-zinc-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block">
            Resolvemos tus Dudas
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
            Todo lo que necesitas saber sobre la academia, recojo de compras en mostrador y respaldo oficial.
          </p>
        </div>

        {/* Accordion list */}
        <div className="space-y-3">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-zinc-200 bg-white overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-zinc-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 shrink-0">
                      {faq.category}
                    </span>
                    <span className="text-sm font-bold text-zinc-900 leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-zinc-950' : ''
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-600 leading-relaxed border-t border-zinc-100">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Bottom Contact Callout */}
        <div className="mt-10 p-6 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                ¿Tienes alguna otra consulta específica?
              </h4>
              <p className="text-xs text-zinc-500">
                Nuestro equipo de secretaría y mostrador te atiende de inmediato por WhatsApp.
              </p>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition-all duration-200 shrink-0 shadow-xs"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>Chatear con Asesor</span>
          </a>
        </div>

      </div>
    </section>
  );
}
