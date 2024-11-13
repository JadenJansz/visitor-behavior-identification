self.addEventListener("push", function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/vite.svg", // Make sure to add an icon file to your public folder
    badge: "/vite.svg", // Make sure to add a badge file to your public folder
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  // eslint-disable-next-line no-undef
  event.waitUntil(clients.openWindow("/"));
});
