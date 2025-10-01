import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PaintMixr - Accurate Color Matching for Oil Paints',
  description: 'Professional paint mixing calculator with color science algorithms for accurate oil paint color matching and formula generation.',
  keywords: 'paint mixing, color matching, oil painting, color theory, paint calculator, art supplies',
  authors: [{ name: 'PaintMixr' }],
  manifest: '/manifest.webmanifest',
  metadataBase: new URL('http://localhost:3000'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PaintMixr',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#1f2937',
    'msapplication-TileImage': '/icons/mstile-150x150.png',
  },
  openGraph: {
    title: 'PaintMixr - Paint Color Mixing Calculator',
    description: 'Get accurate paint mixing formulas for any color using professional color science algorithms.',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PaintMixr - Paint Color Mixing Calculator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaintMixr - Paint Color Mixing Calculator',
    description: 'Get accurate paint mixing formulas for any color using professional color science algorithms.',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1f2937',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <div id="root" className="min-h-full">
          {children}
        </div>

        {/* Portal for modals */}
        <div id="modal-root"></div>

        {/* Portal for notifications */}
        <div id="notification-root"></div>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />

        {/* Install PWA prompt */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;

                // Show custom install button/banner
                const installButton = document.getElementById('install-button');
                if (installButton) {
                  installButton.style.display = 'block';
                  installButton.addEventListener('click', (e) => {
                    installButton.style.display = 'none';
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                      if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                      } else {
                        console.log('User dismissed the install prompt');
                      }
                      deferredPrompt = null;
                    });
                  });
                }
              });

              window.addEventListener('appinstalled', (evt) => {
                console.log('PWA was installed');
              });
            `,
          }}
        />
      </body>
    </html>
  )
}