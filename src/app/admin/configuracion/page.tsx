'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Store, 
  Users, 
  Receipt, 
  ShieldAlert,
  Save,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { SEDES } from '@/lib/constants';
import { GestionUsuariosPanel } from '@/components/admin/configuracion/GestionUsuariosPanel';

type TabType = 'NEGOCIO' | 'USUARIOS' | 'TICKETS';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<TabType>('NEGOCIO');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Estados de Configuración (Mock de Base de Datos / LocalStorage)
  const [ticketFooter, setTicketFooter] = useState('¡Gracias por tu preferencia!\nSíguenos en IG: @galindobarbershop');
  const [imprimirAutomatico, setImprimirAutomatico] = useState(true);
  const [whatsappNotifs, setWhatsappNotifs] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simular guardado
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const tabs = [
    { id: 'NEGOCIO', label: 'Mi Negocio', icon: Store, desc: 'Información de sedes y contacto' },
    { id: 'TICKETS', label: 'Tickets & POS', icon: Receipt, desc: 'Textos de recibos e impresión' },
    { id: 'USUARIOS', label: 'Usuarios y Staff', icon: Users, desc: 'Accesos y permisos del sistema' },
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 min-h-screen bg-zinc-50/50">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 flex items-center gap-3">
          <Settings className="w-8 h-8 text-zinc-400" />
          Configuración del Sistema
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Ajustes globales, personalización y permisos de Sistema Galindo.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* SIDEBAR TABS */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                activeTab === tab.id 
                  ? 'bg-white border-zinc-300 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-zinc-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${activeTab === tab.id ? 'bg-zinc-100 text-zinc-900' : 'bg-transparent text-zinc-500'}`}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${activeTab === tab.id ? 'text-zinc-900' : 'text-zinc-600'}`}>
                    {tab.label}
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5 hidden md:block">{tab.desc}</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'text-zinc-400 translate-x-1' : 'text-transparent'}`} />
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl border border-zinc-200 p-6 md:p-8 shadow-sm"
            >
              
              {/* TAB: NEGOCIO */}
              {activeTab === 'NEGOCIO' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">Sedes y Direcciones</h2>
                    <p className="text-xs text-zinc-500 mt-1">Esta información es pública y aparecerá en los comprobantes.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sede Ica */}
                    <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4 relative overflow-hidden">
                      <h3 className="font-black text-lg text-zinc-900">Sede Ica</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">Dirección Física</label>
                          <input type="text" defaultValue={SEDES.ica.direccion} className="w-full mt-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">Horario de Atención</label>
                          <input type="text" defaultValue={SEDES.ica.horario} className="w-full mt-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">WhatsApp (Opcional)</label>
                          <input type="text" placeholder="+51 999 999 999" className="w-full mt-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm outline-none focus:border-black" />
                        </div>
                      </div>
                    </div>

                    {/* Sede Huancayo */}
                    <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                      <h3 className="font-black text-lg text-zinc-900">Sede Huancayo</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">Dirección Física</label>
                          <input type="text" defaultValue={SEDES.huancayo.direccion} className="w-full mt-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">Horario de Atención</label>
                          <input type="text" defaultValue={SEDES.huancayo.horario} className="w-full mt-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm outline-none focus:border-black" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">WhatsApp (Opcional)</label>
                          <input type="text" placeholder="+51 999 999 999" className="w-full mt-1 px-3 py-2 bg-white border border-zinc-300 rounded-xl text-sm outline-none focus:border-black" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: TICKETS */}
              {activeTab === 'TICKETS' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">Personalización de POS</h2>
                    <p className="text-xs text-zinc-500 mt-1">Ajusta cómo se comportan y ven los tickets de venta.</p>
                  </div>

                  <div className="space-y-6 max-w-xl">
                    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">Impresión Automática</h4>
                        <p className="text-[11px] text-zinc-500 mt-1">Lanzar ventana de impresión al confirmar venta en POS</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={imprimirAutomatico} onChange={(e) => setImprimirAutomatico(e.target.checked)} />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">Notificaciones WhatsApp</h4>
                        <p className="text-[11px] text-zinc-500 mt-1">Abrir chat de WP automáticamente si el cliente dio número</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={whatsappNotifs} onChange={(e) => setWhatsappNotifs(e.target.checked)} />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">Texto de Pie de Página (Ticket)</label>
                      <p className="text-[11px] text-zinc-500">Aparecerá al final del ticket térmico impreso (max 4 líneas).</p>
                      <textarea 
                        rows={4}
                        value={ticketFooter}
                        onChange={(e) => setTicketFooter(e.target.value)}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-mono focus:bg-white focus:border-zinc-400 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: USUARIOS */}
              {activeTab === 'USUARIOS' && (
                <GestionUsuariosPanel />
              )}

              {/* ACTION BAR (Save Button para Mi Negocio y Tickets) */}
              {activeTab !== 'USUARIOS' && (
                <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-end">
                  <AnimatePresence>
                    {showSuccess && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-emerald-600 mr-4"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-bold">Cambios Guardados</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-950 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Guardando...' : 'Guardar Preferencias'}
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
