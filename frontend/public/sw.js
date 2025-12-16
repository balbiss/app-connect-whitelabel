// Service Worker para PWA
const CACHE_NAME = 'connect-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Em localhost, não interceptar NADA - deixar tudo passar direto
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return; // Não interceptar em desenvolvimento
  }
  
  // NÃO interceptar requisições para APIs (Supabase, WhatsApp API, etc)
  // Deixar passar direto sem interceptação para evitar problemas de CORS
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('weeb.inoovaweb.com.br') ||
      url.hostname.includes('api.') ||
      event.request.method !== 'GET') {
    // Para APIs, NÃO interceptar - deixar passar direto
    // Isso evita problemas de CORS
    return; // Não chama event.respondWith, deixa o navegador fazer a requisição normalmente
  }
  
  // Para recursos estáticos, usar cache
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request).catch((error) => {
          // Se falhar, retornar erro sem bloquear
          console.error('Service Worker: Erro ao fazer fetch:', error);
          return new Response(null, { status: 500 });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - receber notificações push mesmo com app fechado
self.addEventListener('push', (event) => {
  console.log('Push notification recebida:', event);
  
  let notificationData = {
    title: 'Connect',
    body: 'Você tem uma nova notificação',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'default',
    requireInteraction: false,
    data: {}
  };

  // Se tiver dados no push, usar eles
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || data.id || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
        actions: data.actions || []
      };
    } catch (e) {
      // Se não for JSON, usar como texto
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    })
  );
});

// Notification click event - quando usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event);
  
  event.notification.close();

  // Se tiver URL nos dados, abrir
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    // Abrir o app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notificação fechada:', event);
});




