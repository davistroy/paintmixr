const CACHE_NAME = 'paintmixr-v1'
const STATIC_CACHE_NAME = 'paintmixr-static-v1'
const DYNAMIC_CACHE_NAME = 'paintmixr-dynamic-v1'

// Files to cache immediately on install
const STATIC_FILES = [
  '/',
  '/history',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other static assets as needed
]

// API endpoints that should be cached
const CACHEABLE_APIS = [
  '/api/paints',
  '/api/sessions',
]

// Files that should never be cached
const NEVER_CACHE = [
  '/api/auth/',
  '/api/admin/',
  '/_next/webpack-hmr',
]

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker')

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('[SW] Static files cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error)
      })
  )
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip requests that should never be cached
  if (NEVER_CACHE.some(path => url.pathname.startsWith(path))) {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAsset(request))
  } else {
    event.respondWith(handlePageRequest(request))
  }
})

// Handle API requests with network-first strategy for cacheable APIs
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const isCacheable = CACHEABLE_APIS.some(api => url.pathname.startsWith(api))

  if (!isCacheable) {
    // For non-cacheable APIs, just fetch from network
    return fetch(request)
  }

  try {
    // Try network first
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', request.url)

    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return a custom offline response for API failures
    return new Response(
      JSON.stringify({
        error: 'Offline - data not available',
        code: 'OFFLINE',
        cached: false
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    )
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url)
    throw error
  }
}

// Handle page requests with network-first, fallback to cache
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Cache successful page responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for page request, trying cache:', request.url)

    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Fallback to cached homepage for navigation requests
    if (request.mode === 'navigate') {
      const homePage = await caches.match('/')
      if (homePage) {
        return homePage
      }
    }

    // Ultimate fallback - offline page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PaintMixr - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
              color: #374151;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 0.5rem;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              max-width: 400px;
            }
            h1 { color: #1f2937; margin-bottom: 1rem; }
            p { margin-bottom: 1.5rem; line-height: 1.6; }
            button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.375rem;
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're Offline</h1>
            <p>PaintMixr needs an internet connection to access the latest features. Some cached content may still be available.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      }
    )
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag)

  if (event.tag === 'background-sync-sessions') {
    event.waitUntil(syncOfflineSessions())
  }
})

// Sync offline sessions when connection is restored
async function syncOfflineSessions() {
  try {
    // Get offline sessions from IndexedDB or localStorage
    const offlineSessions = await getOfflineSessions()

    for (const session of offlineSessions) {
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(session),
        })

        if (response.ok) {
          await removeOfflineSession(session.id)
          console.log('[SW] Synced offline session:', session.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync session:', session.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Placeholder functions for offline session management
async function getOfflineSessions() {
  // Implementation would use IndexedDB to store offline sessions
  return []
}

async function removeOfflineSession(sessionId) {
  // Implementation would remove session from IndexedDB
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      {
        action: 'open',
        title: 'Open PaintMixr',
        icon: '/icons/action-open.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/action-close.png',
      },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'PaintMixr', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            if (url !== '/') {
              client.navigate(url)
            }
            return
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Cache management utilities
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_UPDATE') {
    event.waitUntil(updateCache())
  } else if (event.data?.type === 'CACHE_CLEAR') {
    event.waitUntil(clearCache())
  }
})

async function updateCache() {
  const cache = await caches.open(STATIC_CACHE_NAME)
  await cache.addAll(STATIC_FILES)
}

async function clearCache() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  )
}