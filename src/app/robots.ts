import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/ticket/*'],
      },
    ],
    sitemap: 'https://galindobarber.com/sitemap.xml',
    host: 'https://galindobarber.com',
  };
}
