import React from 'react';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export function StructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://galindobarber.pe/#organization',
        name: 'Galindo Barber Academy & Supply',
        alternateName: 'Galindo Barber',
        url: 'https://galindobarber.pe',
        logo: 'https://galindobarber.pe/logo.jpg',
        image: 'https://galindobarber.pe/baner.webp',
        description:
          'Escuela técnica de barbería profesional y tienda de herramientas originales de corte en Ica y Huancayo, Perú.',
        email: BUSINESS_INFO.email,
        telephone: '+51914614424',
        sameAs: [
          'https://instagram.com/galindo.barbershop',
          'https://facebook.com/galindobarberacademy',
        ],
        subOrganization: [
          {
            '@type': ['HairSalon', 'Store'],
            '@id': 'https://galindobarber.pe/#sede-ica',
            name: 'Galindo Barber - Sede Central Ica',
            telephone: SEDES.ica.whatsappDisplay,
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Calle Bolívar 536',
              addressLocality: 'Ica',
              addressRegion: 'Ica',
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
            '@type': ['HairSalon', 'Store'],
            '@id': 'https://galindobarber.pe/#sede-huancayo',
            name: 'Galindo Barber - Sede Huancayo',
            telephone: SEDES.huancayo.whatsappDisplay,
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Jr. Guido 654',
              addressLocality: 'Huancayo',
              addressRegion: 'Junín',
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
        '@id': 'https://galindobarber.pe/#website',
        url: 'https://galindobarber.pe',
        name: 'Galindo Barber',
        description: 'Academia de Barbería y Tienda de Herramientas Originales en Perú',
        publisher: {
          '@id': 'https://galindobarber.pe/#organization',
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
