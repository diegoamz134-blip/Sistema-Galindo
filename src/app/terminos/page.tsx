import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | Galindo Barber Academy & Supply',
  description: 'Términos y condiciones de compra de productos y matrícula en academia de Galindo Barber conforme al Código del Consumidor (Ley N° 29571, Perú).',
};

export default function TerminosCondicionesPage() {
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
                <span>Normativa: Ley N° 29571</span>
                <span>•</span>
                <span>Código de Protección al Consumidor</span>
                <span>•</span>
                <span>Perú</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
                Términos y Condiciones Generales
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                Última revisión: Septiembre de 2026
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed pt-2">
                Los presentes Términos y Condiciones regulan el acceso, navegación y las operaciones comerciales de compra y matrícula presencial celebradas a través del sitio web oficial de <b>Galindo Barber Academy & Supply</b> (en adelante, &quot;Galindo Barber&quot;) bajo el marco legal de la República del Perú.
              </p>
            </div>

            {/* Articulado Legal */}
            <div className="space-y-8 text-xs sm:text-sm leading-relaxed text-zinc-700 divide-y divide-zinc-100">
              
              {/* 1. Información General del Proveedor */}
              <section className="space-y-3 pt-6 first:pt-0">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  1. Identificación del Proveedor
                </h2>
                <p>
                  En cumplimiento del deber de información estipulado en el artículo 47 de la Ley N° 29571, se detallan los datos del proveedor:
                </p>
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1 font-mono text-xs text-zinc-800">
                  <p><b>Titular Comercial:</b> {BUSINESS_INFO.yapeHolder} (Galindo Barber)</p>
                  <p><b>Giro Comercial:</b> Venta minorista de herramientas y artículos de barbería; Capacitación técnica presencial.</p>
                  <p><b>Sede Ica:</b> {SEDES.ica.direccionCompleta}</p>
                  <p><b>Sede Huancayo:</b> {SEDES.huancayo.direccionCompleta}</p>
                  <p><b>Canales Oficiales:</b> Correo: {BUSINESS_INFO.email} | WhatsApp: +51 {BUSINESS_INFO.whatsapp}</p>
                </div>
              </section>

              {/* 2. Precios y Medios de Pago */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  2. Precios, Moneda y Medios de Pago
                </h2>
                <p>
                  Todos los precios de los productos y cursos publicados en la plataforma están expresados en <b>Soles (S/ - PEN)</b>, moneda de curso legal en el Perú, e incluyen los tributos aplicables conforme a la ley.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-600">
                  <li><b>Precios por Sede:</b> El catálogo y los inventarios se sincronizan de forma diferenciada según la ciudad seleccionada por el usuario (Ica o Huancayo).</li>
                  <li><b>Modalidades de Pago:</b> Se aceptan pagos mediante Billeteras Digitales (Yape, Plin), Transferencia Bancaria BCP y pago en efectivo al momento del recojo presencial en mostrador.</li>
                  <li><b>Validación:</b> Para compras confirmadas por medios digitales, el comprobante de operación debe ser verificado antes de la entrega física del producto o del ingreso a clases.</li>
                </ul>
              </section>

              {/* 3. Entrega de Productos */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  3. Modalidad de Entrega y Retiro de Pedidos
                </h2>
                <p>
                  Las órdenes registradas a través de la web se entregan bajo las siguientes condiciones:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                    <p className="font-bold text-zinc-900">A. Recojo en Tienda Física (Express sin costo)</p>
                    <p className="text-zinc-600">El cliente retira su pedido en el mostrador de la sede elegida (Ica o Huancayo), presentando su código de ticket o documento de identidad (DNI o Carnet de Extranjería).</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                    <p className="font-bold text-zinc-900">B. Despachos y Envíos a Nivel Nacional</p>
                    <p className="text-zinc-600">Los envíos a otras ciudades del Perú se coordinan formalmente vía WhatsApp con agencias autorizadas de transporte (Olva Courier, Shalom). El flete corre por cuenta del comprador según la tarifa de la agencia elegida.</p>
                  </div>
                </div>
              </section>

              {/* 4. Garantía, Cambios y Devoluciones */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  4. Garantía Legal, Cambios y Devoluciones
                </h2>
                <p>
                  En cumplimiento de los artículos 18 al 24 de la Ley N° 29571 (Garantía Legal del Consumidor):
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
                  <li><b>Máquinas Eléctricas de Corte:</b> Todas las máquinas de corte (clippers, trimmers y shavers) cuentan con garantía legal por fallas o defectos de fabricación (motor, tarjeta interna o batería). La garantía no cubre caídas, roturas de carcasa, desgaste natural de cuchillas ni daños por sobrevoltaje.</li>
                  <li><b>Revisión Técnica:</b> Para hacer efectiva la garantía, el cliente debe presentar el producto con su comprobante de compra en cualquiera de las sedes físicas para la evaluación técnica correspondiente.</li>
                  <li><b>Restricciones por Sanidad e Higiene:</b> De conformidad con las normas de salud pública, <b>no se aceptan cambios ni devoluciones</b> de productos cosméticos (pomadas, ceras, tónicos, lociones) una vez abiertos o sin precinto, ni de cuchillas o navajas abiertas, a fin de salvaguardar la salud de los clientes.</li>
                </ul>
              </section>

              {/* 5. Cursos y Academia */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  5. Matrícula y Programas Formativos de Barbería
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
                  <li><b>Vacantes Limitadas:</b> Cada grupo cuenta con un número estricto de cupos para asegurar estaciones de práctica individuales con modelos reales. La vacante queda reservada con el pago de la matrícula.</li>
                  <li><b>Asistencia:</b> El alumno se compromete a respetar el turno y horario matriculado. Las reprogramaciones por fuerza mayor deben solicitarse a la coordinación académica de la sede.</li>
                  <li><b>Certificación:</b> Al concluir satisfactoriamente el programa formativo y las evaluaciones prácticas, el alumno recibe el Certificado emitido por Galindo Barber Academy acreditando las horas lectivas completadas.</li>
                </ul>
              </section>

              {/* 6. Propiedad Intelectual */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  6. Propiedad Intelectual y Marcas
                </h2>
                <p>
                  Los signos distintivos, logotipos, contenidos y material visual propio de Galindo Barber pertenecen a su titular.
                </p>
                <p className="text-zinc-600">
                  Las marcas registradas de fabricantes (Wahl®, BaBylissPRO®, Andis®, Gamma+®) pertenecen a sus respectivos titulares y se mencionan únicamente con fines descriptivos para identificar los productos originales comercializados como establecimiento minorista independiente.
                </p>
              </section>

              {/* 7. Libro de Reclamaciones y Jurisdicción */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  7. Libro de Reclamaciones y Solución de Controversias
                </h2>
                <p>
                  Galindo Barber cuenta con un <Link href="/reclamaciones" className="font-bold underline text-black hover:text-zinc-600">Libro de Reclamaciones Virtual</Link> conforme al D.S. N° 011-2011-PCM, garantizando una respuesta en un plazo no mayor a 15 días hábiles.
                </p>
                <p className="text-zinc-600">
                  Toda controversia se regirá bajo las leyes de la República del Perú y la competencia administrativa del INDECOPI y de los Juzgados y Tribunales de Ica o Huancayo.
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
