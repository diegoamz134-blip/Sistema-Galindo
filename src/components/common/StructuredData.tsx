import React from 'react';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export function StructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://galindobarber.com/#organization',
        name: 'Galindo Barber Academy & Supply',
        alternateName: ['Galindo Barber', 'Academia de Barbería Galindo'],
        url: 'https://galindobarber.com',
        logo: 'https://galindobarber.com/logo.jpg',
        image: 'https://galindobarber.com/baner.webp',
        description:
          'Escuela técnica especializada en formación de barberos profesionales, estilistas masculinos y distribución de herramientas oficiales de corte (Wahl, BaBylissPRO) en Ica y Huancayo, Perú.',
        email: BUSINESS_INFO.email,
        telephone: '+51914614424',
        sameAs: [
          'https://instagram.com/galindo.barbershop',
          'https://facebook.com/galindobarberacademy',
        ],
        knowsAbout: [
          'Barbería Profesional',
          'Estilismo Masculino',
          'Técnicas de Fade y Degradados',
          'Visagismo Capilar',
          'Corte Clásico a Tijera',
          'Colorimetría y Diseños Freestyle',
          'Barboterapia y Afeitado Tradicional',
          'Herramientas Profesionales de Barbería',
        ],
        areaServed: [
          {
            '@type': 'City',
            name: 'Ica',
          },
          {
            '@type': 'City',
            name: 'Huancayo',
          },
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Programas de Formación y Carreras Técnicas',
          itemListElement: [
            {
              '@type': 'Course',
              name: 'Carrera de Barbería Profesional Integral',
              description:
                'Formación técnica completa para desempeñarse como Barbero Profesional: técnicas de fade, corte a tijera, visagismo, afeitado tradicional con toalla caliente y bioseguridad.',
              educationalCredentialAwarded: 'Certificado Técnico de Barbero Profesional',
              occupationalCategory: 'Barbero Profesional, Estilista Masculino',
              provider: {
                '@id': 'https://galindobarber.com/#organization',
              },
            },
            {
              '@type': 'Course',
              name: 'Especialización en Fades, Degradados y Visagismo',
              description:
                'Perfeccionamiento en técnicas modernas de Low Fade, Mid Fade, High Fade, Taper y armonización facial para clientes exigentes.',
              educationalCredentialAwarded: 'Certificado de Especialización en Fades y Visagismo',
              occupationalCategory: 'Barbero Especialista en Degradados',
              provider: {
                '@id': 'https://galindobarber.com/#organization',
              },
            },
            {
              '@type': 'Course',
              name: 'Taller de Barboterapia y Afeitado Tradicional',
              description:
                'Dominio de navaja clásica, toallas calientes, vapor ozono, aceites esenciales y perfilado de barba profesional.',
              educationalCredentialAwarded: 'Certificado en Barboterapia y Cuidado Facial Masculino',
              occupationalCategory: 'Especialista en Barboterapia y Barba',
              provider: {
                '@id': 'https://galindobarber.com/#organization',
              },
            },
          ],
        },
        subOrganization: [
          {
            '@type': ['HairSalon', 'EducationalOrganization', 'Store'],
            '@id': 'https://galindobarber.com/#sede-ica',
            name: 'Galindo Barber Academy & Supply - Sede Central Ica',
            telephone: SEDES.ica.whatsappDisplay,
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Calle Bolívar 536',
              addressLocality: 'Ica',
              addressRegion: 'Ica',
              postalCode: '11000',
              addressCountry: 'PE',
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: -14.0678,
              longitude: -75.7286,
            },
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                ],
                opens: '09:00',
                closes: '20:00',
              },
            ],
            priceRange: 'S/.',
            paymentAccepted: ['Cash', 'Yape', 'Plin', 'Credit Card', 'Bank Transfer'],
          },
          {
            '@type': ['HairSalon', 'EducationalOrganization', 'Store'],
            '@id': 'https://galindobarber.com/#sede-huancayo',
            name: 'Galindo Barber Academy & Supply - Sede Huancayo',
            telephone: SEDES.huancayo.whatsappDisplay,
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Jr. Guido 654',
              addressLocality: 'Huancayo',
              addressRegion: 'Junín',
              postalCode: '12000',
              addressCountry: 'PE',
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: -12.0651,
              longitude: -75.2049,
            },
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                ],
                opens: '09:00',
                closes: '20:00',
              },
            ],
            priceRange: 'S/.',
            paymentAccepted: ['Cash', 'Yape', 'Plin', 'Credit Card', 'Bank Transfer'],
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://galindobarber.com/#website',
        url: 'https://galindobarber.com',
        name: 'Galindo Barber Academy & Supply',
        description: 'Academia de Barbería Profesional y Tienda de Herramientas de Corte en Perú',
        publisher: {
          '@id': 'https://galindobarber.com/#organization',
        },
        inLanguage: 'es-PE',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
