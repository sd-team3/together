self.addEventListener('push', (event) => {
    if (!event.data) return;
    const { id, title, body, route } = event.data.json();
    event.waitUntil(self.registration.showNotification(title, {
        body,
        tag: id,
        data: { route }
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.route || '/', self.location.origin);
    if (url.origin !== self.location.origin) return;

    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const existing = windows.find(client => client.url === url.href);
        if (existing) return existing.focus();
        return self.clients.openWindow(url.href);
    })());
});
