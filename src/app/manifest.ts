import { MetadataRoute } from 'next/types'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PaintMixr - Professional Paint Color Matching',
    short_name: 'PaintMixr',
    description: 'Accurate color matching and paint mixing calculator for artists and professionals using advanced color science algorithms.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1f2937',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en-US',
    categories: ['productivity', 'utilities', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Color Matching',
        short_name: 'Match',
        description: 'Find paint mixing formulas for target colors',
        url: '/?mode=color_matching',
        icons: [{ src: '/icons/shortcut-color-match.png', sizes: '96x96' }],
      },
      {
        name: 'Ratio Prediction',
        short_name: 'Predict',
        description: 'Predict colors from paint mixing ratios',
        url: '/?mode=ratio_prediction',
        icons: [{ src: '/icons/shortcut-ratio-predict.png', sizes: '96x96' }],
      },
      {
        name: 'Session History',
        short_name: 'History',
        description: 'View your mixing session history',
        url: '/history',
        icons: [{ src: '/icons/shortcut-history.png', sizes: '96x96' }],
      },
    ],
    screenshots: [
      {
        src: '/screenshots/desktop-main.png',
        sizes: '1280x720',
        type: 'image/png',
      },
      {
        src: '/screenshots/mobile-main.png',
        sizes: '390x844',
        type: 'image/png',
      },
      {
        src: '/screenshots/color-matching.png',
        sizes: '390x844',
        type: 'image/png',
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
    protocol_handlers: [],
    file_handlers: [
      {
        action: '/image-upload',
        accept: {
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/png': ['.png'],
          'image/webp': ['.webp'],
          'image/gif': ['.gif'],
        },
      },
    ] as unknown as MetadataRoute.Manifest['file_handlers'],
  }
}