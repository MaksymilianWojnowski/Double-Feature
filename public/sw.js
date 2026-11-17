// Service worker: match notifications only (no offline caching).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Always show something: iOS revokes push for sites that receive pushes without showing a notification.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Double Feature', {
      body: data.body,
      tag: data.tag, // one notification per match, even if sent twice
      icon: '/icon/192',
      badge: '/icon/192',
      data: { url: data.url || '/' },
    }),
  )
})

// Tap → open the app on Matches (reuse an open window when there is one).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const w of windows) {
        if ('focus' in w) {
          await w.focus()
          return w.navigate ? w.navigate(url).catch(() => self.clients.openWindow(url)) : undefined
        }
      }
      return self.clients.openWindow(url)
    })(),
  )
})
