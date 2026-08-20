/* // public/firebase-messaging-sw.js
//
// Debe vivir en la RAÍZ del sitio (public/firebase-messaging-sw.js) para
// poder registrarse con scope "/". Los Service Workers no pueden leer
// variables de entorno de Vite, así que la config va escrita en texto
// plano aquí. NO es un secreto: es la misma config pública que usa el
// cliente (apiKey de Firebase Web ≠ credencial privada).
//
// Reemplaza estos valores por los de tu proyecto de Firebase
// (Configuración del proyecto > General > Tus apps > SDK de Firebase).
// Deben coincidir con las variables VITE_FIREBASE_* del frontend.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBUSZg4RZ00oxJ-U_hVej2C6gkqU6gsqBE",
  authDomain: "pick-up-d6179.firebaseapp.com",
  projectId: "pick-up-d6179",
  storageBucket: "pick-up-d6179.firebasestorage.app",
  messagingSenderId: "776885501942",
  appId: "1:776885501942:web:1d4dce3265881f8818d1d7"
});

const messaging = firebase.messaging();

// Se dispara cuando llega un push y la pestaña está cerrada o en segundo plano.
messaging.onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title || payload.data?.title || "Nueva notificación";
  const options = {
    body: payload.notification?.body || payload.data?.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// Click en la notificación: enfoca una pestaña existente o abre una nueva en la URL indicada.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      }),
  );
}); */