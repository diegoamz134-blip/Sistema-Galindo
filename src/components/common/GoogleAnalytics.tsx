'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';

const COOKIE_CONSENT_KEY = 'galindo_cookie_consent_v1';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-DEMOGALINDO1';
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Verificar si el usuario aceptó cookies
    const checkConsent = () => {
      try {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (consent === 'accepted' || consent === 'all') {
          setHasConsent(true);
        }
      } catch {
        // En entornos restringidos no activar
      }
    };

    checkConsent();

    const handleConsentEvent = () => checkConsent();
    window.addEventListener('galindo_cookie_consent_updated', handleConsentEvent);

    return () => {
      window.removeEventListener('galindo_cookie_consent_updated', handleConsentEvent);
    };
  }, []);

  // Si no hay consentimiento otorgado, no inyectamos scripts de terceros
  if (!hasConsent) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              anonymize_ip: true
            });
          `,
        }}
      />
    </>
  );
}
