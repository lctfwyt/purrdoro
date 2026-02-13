// Service Worker for 猫猫番茄钟 PWA
const CACHE_NAME = 'purrdoro-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求并使用缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 缓存命中则返回，否则请求网络
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        // 缓存新的 GET 请求
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // 网络失败时返回离线页面（如果有的话）
      return caches.match('./index.html');
    })
  );
});

// 接收页面消息，发送通知
self.addEventListener('message', (event) => {
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, requireInteraction } = event.data;
    self.registration.showNotification(title, {
      body,
      tag,
      requireInteraction: requireInteraction || false,
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%2393c5fd' width='192' height='192' rx='20'/%3E%3Ctext x='96' y='130' text-anchor='middle' font-size='120'%3E🍅%3C/text%3E%3C/svg%3E",
      badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%2393c5fd' width='192' height='192' rx='20'/%3E%3Ctext x='96' y='130' text-anchor='middle' font-size='120'%3E🍅%3C/text%3E%3C/svg%3E",
      silent: false,
      // 添加操作按钮
      actions: requireInteraction ? [
        { action: 'dismiss', title: '知道了' }
      ] : undefined
    });
  }
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // 如果已有窗口打开，聚焦它
      for (const client of clientList) {
        if (client.url.includes(self.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

// 处理周期性同步（如果浏览器支持）
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'timer-sync') {
    event.waitUntil(
      // 通知所有客户端进行同步
      clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_TIMER' });
        });
      })
    );
  }
});
