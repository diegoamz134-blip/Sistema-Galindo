'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Printer, MessageCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export default function LibroReclamacionesPage() {
  const [enviado, setEnviado] = useState(false);
  const [codigoReclamo, setCodigoReclamo] = useState('');
  
  // Formulario
  const [tipoReclamo, setTipoReclamo] = useState<'RECLAMO' | 'QUEJA'>('RECLAMO');
  const [sedeReclamo, setSedeReclamo] = useState<'ica' | 'huancayo'>('ica');
  const [tipoBien, setTipoBien] = useState<'PRODUCTO' | 'SERVICIO'>('PRODUCTO');
  
  // Datos del Consumidor
  const [nombre, setNombre] = useState('');
  const [tipoDoc, setTipoDoc] = useState('DNI');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  
  // Datos del Menor de edad si aplica
  const [esMenor, setEsMenor] = useState(false);
  const [nombreTutor, setNombreTutor] = useState('');
  
  // Detalle del Reclamo
  const [montoReclamado, setMontoReclamado] = useState('');
  const [descripcionBien, setDescripcionBien] = useState('');
  const [detalle, setDetalle] = useState('');
  const [pedido, setPedido] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !numeroDoc.trim() || !telefono.trim() || !detalle.trim()) {
      alert('Por favor completa todos los campos obligatorios marcados con asterisco (*).');
      return;
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const codigoGenerado = `REC-${new Date().getFullYear()}-${randomNum}`;
    setCodigoReclamo(codigoGenerado);
    setEnviado(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-200">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16 bg-zinc-50/60 border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Breadcrumb */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la tienda</span>
            </Link>
          </div>

          {/* Encabezado Oficial INDECOPI Sobrio */}
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
            <div className="border-b border-zinc-200 pb-5 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                <span>Libro de Reclamaciones Virtual</span>
                <span>•</span>
                <span>D.S. N° 011-2011-PCM</span>
                <span>•</span>
                <span>INDECOPI</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
                Hoja de Reclamación
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                Plataforma de Atención y Registro Oficial
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed pt-2">
                De conformidad con lo dispuesto en el Código de Protección y Defensa del Consumidor (Ley N° 29571), ponemos a tu disposición este formulario para registrar cualquier queja o reclamo.
              </p>
            </div>

            {/* Datos del Proveedor */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <p><b>Razón Social:</b> {BUSINESS_INFO.yapeHolder}</p>
              <p><b>Nombre Comercial:</b> Galindo Barber Academy & Supply</p>
              <p><b>Sede Ica:</b> {SEDES.ica.direccionCompleta}</p>
              <p><b>Sede Huancayo:</b> {SEDES.huancayo.direccionCompleta}</p>
            </div>
          </div>

          {/* Estado Confirmado o Formulario */}
          {enviado ? (
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-zinc-200 shadow-xs space-y-6 text-center">
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
                  Registro Oficial Completado
                </span>
                <h2 className="text-2xl font-black text-zinc-950 uppercase tracking-tight">
                  Código de Reclamación: <span className="font-mono text-black">{codigoReclamo}</span>
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
                  Estimado(a) <b>{nombre}</b>, hemos registrado formalmente tu {tipoReclamo === 'RECLAMO' ? 'Reclamo' : 'Queja'}. Conforme al Decreto Supremo N° 011-2011-PCM y modificatorias, te brindaremos una respuesta debidamente motivada en un plazo máximo de <b>15 días hábiles improrrogables</b> al correo proporcionado: <b>{email || 'WhatsApp registrado'}</b>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-left text-xs space-y-2 font-mono text-zinc-700">
                <p><b>Fecha y Hora de Registro:</b> {new Date().toLocaleString('es-PE')}</p>
                <p><b>Tipo de Registro:</b> {tipoReclamo}</p>
                <p><b>Sede Implicada:</b> {sedeReclamo === 'ica' ? 'Sede Ica' : 'Sede Huancayo'}</p>
                <p><b>Bien / Servicio:</b> {tipoBien} - {descripcionBien || 'General'}</p>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`https://wa.me/${SEDES[sedeReclamo]?.whatsapp || BUSINESS_INFO.whatsapp}?text=${encodeURIComponent(
                    `*HOJA DE RECLAMACIÓN VIRTUAL (${tipoReclamo})*\n` +
                    `*CÓDIGO:* ${codigoReclamo}\n` +
                    `*SEDE:* ${sedeReclamo === 'ica' ? 'Sede Ica' : 'Sede Huancayo'}\n` +
                    `*CLIENTE:* ${nombre}\n` +
                    `*${tipoDoc}:* ${numeroDoc}\n` +
                    `*TELÉFONO:* ${telefono}\n` +
                    `*CORREO:* ${email}\n` +
                    `*BIEN/SERVICIO:* ${tipoBien} - ${descripcionBien}\n` +
                    `*DETALLE:* ${detalle}\n` +
                    `*PEDIDO CONCRETO:* ${pedido}\n\n` +
                    `_Registrado conforme a la Ley N° 29571 (INDECOPI)._`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Notificar por WhatsApp ({sedeReclamo === 'ica' ? 'Ica' : 'Huancayo'})</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar Constancia</span>
                </button>

                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Regresar a la Tienda
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-2xl border border-zinc-200 shadow-xs space-y-8">
              
              {/* Sección 1: Tipo de Disconformidad */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-2">
                  1. Naturaleza de la Disconformidad
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-1.5 ${
                    tipoReclamo === 'RECLAMO'
                      ? 'bg-zinc-950 text-white border-black'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs uppercase tracking-wider">Reclamo</span>
                      <input
                        type="radio"
                        name="tipoReclamo"
                        value="RECLAMO"
                        checked={tipoReclamo === 'RECLAMO'}
                        onChange={() => setTipoReclamo('RECLAMO')}
                        className="accent-white cursor-pointer"
                      />
                    </div>
                    <p className={`text-[11px] leading-relaxed ${tipoReclamo === 'RECLAMO' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      Disconformidad relacionada a los productos o servicios adquiridos (falla de fábrica, garantía, etc.).
                    </p>
                  </label>

                  <label className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-1.5 ${
                    tipoReclamo === 'QUEJA'
                      ? 'bg-zinc-950 text-white border-black'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs uppercase tracking-wider">Queja</span>
                      <input
                        type="radio"
                        name="tipoReclamo"
                        value="QUEJA"
                        checked={tipoReclamo === 'QUEJA'}
                        onChange={() => setTipoReclamo('QUEJA')}
                        className="accent-white cursor-pointer"
                      />
                    </div>
                    <p className={`text-[11px] leading-relaxed ${tipoReclamo === 'QUEJA' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      Malestar o descontento respecto a la atención al público o trato recibido en tienda física o virtual.
                    </p>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sedeReclamo" className="block text-xs font-bold text-zinc-700">
                    Sede donde ocurrió el hecho *
                  </label>
                  <select
                    id="sedeReclamo"
                    value={sedeReclamo}
                    onChange={(e) => setSedeReclamo(e.target.value as 'ica' | 'huancayo')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="ica">Sede Ica (Calle Bolívar 536)</option>
                    <option value="huancayo">Sede Huancayo (Jr. Guido 654)</option>
                  </select>
                </div>
              </div>

              {/* Sección 2: Identificación del Consumidor */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-2">
                  2. Identificación del Consumidor Reclamante
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="nombreReclamante" className="block text-xs font-bold text-zinc-700">
                      Nombres y Apellidos Completos *
                    </label>
                    <input
                      id="nombreReclamante"
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Carlos Alberto Ramos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <label htmlFor="tipoDocReclamante" className="block text-xs font-bold text-zinc-700">
                        Doc. *
                      </label>
                      <select
                        id="tipoDocReclamante"
                        value={tipoDoc}
                        onChange={(e) => setTipoDoc(e.target.value)}
                        className="w-full px-2 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CE">C.E.</option>
                        <option value="RUC">RUC</option>
                        <option value="PASAPORTE">Pasap.</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label htmlFor="numDocReclamante" className="block text-xs font-bold text-zinc-700">
                        Número de Documento *
                      </label>
                      <input
                        id="numDocReclamante"
                        type="text"
                        required
                        value={numeroDoc}
                        onChange={(e) => setNumeroDoc(e.target.value)}
                        placeholder="Número de documento"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="telReclamante" className="block text-xs font-bold text-zinc-700">
                      Teléfono / WhatsApp de Contacto *
                    </label>
                    <input
                      id="telReclamante"
                      type="tel"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: 914614424"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="emailReclamante" className="block text-xs font-bold text-zinc-700">
                      Correo Electrónico para Notificación *
                    </label>
                    <input
                      id="emailReclamante"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label htmlFor="dirReclamante" className="block text-xs font-bold text-zinc-700">
                      Domicilio Legal / Residencia (Calle, N°, Distrito, Ciudad) *
                    </label>
                    <input
                      id="dirReclamante"
                      type="text"
                      required
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Ej: Av. Cutervo 240, Ica"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={esMenor}
                      onChange={(e) => setEsMenor(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                    />
                    <span>El reclamante es menor de edad (requiere datos del padre o apoderado)</span>
                  </label>
                </div>

                {esMenor && (
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                    <label htmlFor="nombreTutor" className="block text-xs font-bold text-zinc-700">
                      Nombres del Padre, Madre o Tutor Legal *
                    </label>
                    <input
                      id="nombreTutor"
                      type="text"
                      required={esMenor}
                      value={nombreTutor}
                      onChange={(e) => setNombreTutor(e.target.value)}
                      placeholder="Nombre del apoderado"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                )}
              </div>

              {/* Sección 3: Identificación del Bien Contratado */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-2">
                  3. Identificación del Bien o Servicio Contratado
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700">
                      Tipo de Contratación *
                    </label>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="tipoBien"
                          value="PRODUCTO"
                          checked={tipoBien === 'PRODUCTO'}
                          onChange={() => setTipoBien('PRODUCTO')}
                          className="accent-black cursor-pointer"
                        />
                        <span>Producto (Máquina / Supply)</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="tipoBien"
                          value="SERVICIO"
                          checked={tipoBien === 'SERVICIO'}
                          onChange={() => setTipoBien('SERVICIO')}
                          className="accent-black cursor-pointer"
                        />
                        <span>Servicio (Curso / Academia)</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="montoReclamado" className="block text-xs font-bold text-zinc-700">
                      Monto Reclamado (S/)
                    </label>
                    <input
                      id="montoReclamado"
                      type="text"
                      value={montoReclamado}
                      onChange={(e) => setMontoReclamado(e.target.value)}
                      placeholder="Ej: 250.00"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label htmlFor="descripcionBien" className="block text-xs font-bold text-zinc-700">
                      Descripción del Producto o Curso / Número de Ticket o Boleta *
                    </label>
                    <input
                      id="descripcionBien"
                      type="text"
                      required
                      value={descripcionBien}
                      onChange={(e) => setDescripcionBien(e.target.value)}
                      placeholder="Ej: Wahl Magic Clip Gold / Ticket GAL-2026-8492"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 4: Detalle de la Reclamación y Pedido */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-2">
                  4. Detalle de la Reclamación y Pedido del Consumidor
                </h2>

                <div className="space-y-1">
                  <label htmlFor="detalleReclamo" className="block text-xs font-bold text-zinc-700">
                    Detalle de los hechos que sustentan el reclamo o queja *
                  </label>
                  <textarea
                    id="detalleReclamo"
                    required
                    rows={4}
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    placeholder="Explica detalladamente lo ocurrido, fechas y circunstancias..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="pedidoReclamo" className="block text-xs font-bold text-zinc-700">
                    Pedido concreto del consumidor *
                  </label>
                  <textarea
                    id="pedidoReclamo"
                    required
                    rows={2}
                    value={pedido}
                    onChange={(e) => setPedido(e.target.value)}
                    placeholder="Indica qué solución o respuesta específica solicitas (ej: cambio de producto, revisión de garantía, etc.)."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
                  />
                </div>
              </div>

              {/* Aviso Legal de Plazo */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5 text-xs text-zinc-600">
                <p className="font-bold text-zinc-950">Aviso sobre el Plazo Legal de Atención:</p>
                <p>
                  Conforme a la Ley N° 29571 y el D.S. N° 011-2011-PCM modificado por D.S. N° 101-2022-PCM, el proveedor deberá dar respuesta al reclamo o queja en un plazo <b>no mayor a quince (15) días hábiles improrrogables</b>.
                </p>
                <p className="text-[11px] text-zinc-500">
                  La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
                </p>
              </div>

              {/* Botón de Envío */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-xl bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Registrar Hoja de Reclamación</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
