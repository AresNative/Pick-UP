import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from "firebase/messaging";

import { EnvConfig } from "@/utils/constants/env.config";

const { firebaseVapidKey } = EnvConfig();

const firebaseConfig = {
  apiKey: "AIzaSyBUSZg4RZ00oxJ-U_hVej2C6gkqU6gsqBE",
  authDomain: "pick-up-d6179.firebaseapp.com",
  projectId: "pick-up-d6179",
  storageBucket: "pick-up-d6179.firebasestorage.app",
  messagingSenderId: "776885501942",
  appId: "1:776885501942:web:1d4dce3265881f8818d1d7",
};

let app: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

/** Devuelve la instancia de Messaging, o null si el navegador no lo soporta (Safari viejo, contexto no seguro, etc). */
export async function getWebMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn("Este navegador no soporta Firebase Cloud Messaging.");
    return null;
  }

  messagingInstance = getMessaging(getFirebaseApp());
  return messagingInstance;
}

/** Registra el Service Worker que recibe notificaciones en segundo plano / con la pestaña cerrada. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  } catch (error) {
    console.error("Error al registrar el service worker de FCM:", error);
    return null;
  }
}

/** Obtiene el token FCM del navegador (requiere permiso ya concedido). */
export async function getWebFcmToken(): Promise<string | null> {
  const messaging = await getWebMessaging();
  if (!messaging) return null;

  const registration = await registerServiceWorker();
  if (!registration) return null;

  if (!firebaseVapidKey) {
    console.warn(
      "Falta VITE_FIREBASE_VAPID_KEY; no se puede obtener el token FCM web.",
    );
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (error) {
    console.error("Error al obtener el token FCM (web):", error);
    return null;
  }
}

/** Escucha mensajes push que llegan mientras la pestaña está en primer plano. */
export async function listenForegroundMessages(
  callback: (payload: any) => void,
): Promise<() => void> {
  const messaging = await getWebMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
