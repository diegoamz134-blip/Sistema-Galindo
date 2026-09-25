import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Galindo Barber Academy & Supply',
  description: 'Política de protección de datos personales de Galindo Barber en cumplimiento de la Ley N° 29733 de la República del Perú.',
};

export default function PoliticaPrivacidadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-200">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16 bg-zinc-50/60 border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Enlace volver */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la tienda</span>
            </Link>
          </div>

          {/* Tarjeta de Contenido */}
          <div className="bg-white p-6 sm:p-12 rounded-2xl border border-zinc-200 shadow-xs space-y-8">
            
            {/* Encabezado Corporativo Sobrio */}
            <div className="border-b border-zinc-200 pb-6 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                <span>Normativa: Ley N° 29733</span>
                <span>•</span>
                <span>Protección de Datos Personales</span>
                <span>•</span>
                <span>Perú</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
                Política de Privacidad y Protección de Datos
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                Última revisión: Septiembre de 2026
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed pt-2">
                En <b>Galindo Barber Academy & Supply</b> tratamos los datos personales de nuestros clientes y alumnos con estricto apego a la <b>Ley N° 29733 (Ley de Protección de Datos Personales del Perú)</b> y su Reglamento aprobado mediante Decreto Supremo N° 003-2013-JUS.
              </p>
            </div>

            {/* Articulado Legal */}
            <div className="space-y-8 text-xs sm:text-sm leading-relaxed text-zinc-700 divide-y divide-zinc-100">
              
              {/* 1. Responsable del Tratamiento */}
              <section className="space-y-3 pt-6 first:pt-0">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  1. Titular del Banco de Datos
                </h2>
                <p>
                  El responsable del tratamiento de los datos personales recabados a través de esta plataforma web es:
                </p>
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1 font-mono text-xs text-zinc-800">
                  <p><b>Razón Social:</b> {BUSINESS_INFO.yapeHolder} (Galindo Barber)</p>
                  <p><b>Sede Ica:</b> {SEDES.ica.direccionCompleta}</p>
                  <p><b>Sede Huancayo:</b> {SEDES.huancayo.direccionCompleta}</p>
                  <p><b>Correo de Contacto Oficial:</b> {BUSINESS_INFO.email}</p>
                  <p><b>Canal de Atención:</b> WhatsApp +51 {BUSINESS_INFO.whatsapp}</p>
                </div>
              </section>

              {/* 2. Principio de Proporcionalidad */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  2. Datos Recopilados y Principio de Proporcionalidad
                </h2>
                <p>
                  Conforme al artículo 6 de la Ley N° 29733, únicamente recopilamos los datos estrictamente pertinentes para procesar pedidos de tienda y matrículas:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
                  <li><b>Identificación:</b> Nombres, apellidos y documento de identidad (DNI o Carnet de Extranjería), requeridos para verificar la entrega del pedido y emitir el comprobante de pago electrónico.</li>
                  <li><b>Contacto:</b> Teléfono / WhatsApp, utilizado para notificar la preparación del pedido o coordinar turnos académicos.</li>
                  <li><b>Instrucciones:</b> Notas opcionales sobre el recojo en mostrador o agencia.</li>
                </ul>
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-mono">
                  <b>Seguridad en Pagos:</b> Galindo Barber no almacena números de tarjeta ni contraseñas bancarias. Las transacciones por Yape, Plin o BCP se efectúan directamente a través de los canales bancarios oficiales regulados por la SBS.
                </div>
              </section>

              {/* 3. Finalidad del Tratamiento */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  3. Finalidad del Tratamiento
                </h2>
                <p>
                  Los datos personales proporcionados se destinan exclusivamente a:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="font-bold text-zinc-900 mb-1">A. Gestión de Pedidos</p>
                    <p className="text-zinc-600">Procesar órdenes de compra, control de inventario local y emisión de tickets de compra.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="font-bold text-zinc-900 mb-1">B. Matrículas Académicas</p>
                    <p className="text-zinc-600">Registro de alumnos en cursos presenciales, control de asistencia y emisión de certificados.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="font-bold text-zinc-900 mb-1">C. Obligaciones Tributarias</p>
                    <p className="text-zinc-600">Emisión de comprobantes de pago de conformidad con la normativa de la SUNAT.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="font-bold text-zinc-900 mb-1">D. Atención al Consumidor</p>
                    <p className="text-zinc-600">Gestión de garantías, consultas postventa y atención de solicitudes del Libro de Reclamaciones.</p>
                  </div>
                </div>
              </section>

              {/* 4. No Cesión a Terceros */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  4. Confidencialidad y No Comercialización
                </h2>
                <p>
                  Galindo Barber <b>no vende, no alquila ni comercializa</b> datos personales a terceros bajo ninguna modalidad. La información solo podrá ser compartida con empresas de mensajería (Olva Courier, Shalom) cuando el cliente solicite explícitamente un envío a provincia, exclusivamente para el rotulado del paquete.
                </p>
              </section>

              {/* 5. Ejercicio de Derechos ARCO */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  5. Ejercicio de los Derechos ARCO
                </h2>
                <p>
                  El titular de los datos puede ejercer en cualquier momento sus derechos de <b>Acceso, Rectificación, Cancelación y Oposición (ARCO)</b> de manera gratuita enviando una solicitud con copia de su documento de identidad a:
                </p>
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-800 space-y-1">
                  <p><b>Correo Oficial:</b> {BUSINESS_INFO.email}</p>
                  <p><b>Presencialmente:</b> Sede Ica (Calle Bolívar 536) o Sede Huancayo (Jr. Guido 654)</p>
                  <p className="text-zinc-500 pt-1">
                    Las solicitudes se atienden dentro de los plazos fijados por el Reglamento de la Ley N° 29733 (10 a 20 días hábiles).
                  </p>
                </div>
              </section>

              {/* 6. Seguridad */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  6. Seguridad de la Información
                </h2>
                <p>
                  Implementamos medidas técnicas y organizativas para salvaguardar la información en nuestra base de datos (cifrado SSL/TLS en tránsito y en reposo mediante Supabase PostgreSQL), previniendo accesos indebidos, adulteraciones o pérdidas.
                </p>
              </section>

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
