// src/hooks/use-notifications.ts
import { useEffect } from "react";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isPlatform } from "@ionic/react";
import { EnvConfig } from "@/utils/constants/env.config";
import { getLocalStorageItem } from "@/utils/functions/local-storage";
import {
  getWebFcmToken,
  listenForegroundMessages,
} from "@/hooks/firebase-web";

const { apiMongoDb } = EnvConfig();

type NotificationPlatform = "android" | "ios" | "web";

const isNative = () => isPlatform("android") || isPlatform("ios");

// ── Registro del token en el backend ──
async function registerTokenOnBackend(
  token: string,
  platform: NotificationPlatform,
) {
  if (!apiMongoDb) {
    console.warn("VITE_MONGO_API_URL no configurado; no se registró el token.");
    return;
  }
  try {
    const userId = getLocalStorageItem("user-id");
    await fetch(`${apiMongoDb}/push-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        userId: userId ?? null,
        platform,
      }),
    });
  } catch (error) {
    console.error("Error al registrar el token FCM:", error);
  }
}

// ── Canal de notificaciones de Android (se crea UNA sola vez, no por notificación) ──
async function ensureAndroidChannel() {
  if (!isPlatform("android")) return;
  try {
    await LocalNotifications.createChannel({
      id: "default",
      name: "Canal por defecto",
      description: "Notificaciones de la aplicación",
      importance: 4, // alta
      sound: "default",
      vibration: true,
    });
  } catch (error) {
    console.error("Error al crear el canal de notificaciones:", error);
  }
}

// ── Mostrar notificación local nativa (Android/iOS) ──
async function showNativeLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title,
          body,
          extra: data,
          sound: "default",
          channelId: "default",
        },
      ],
    });
  } catch (error) {
    console.error("Error al mostrar notificación local:", error);
  }
}

// ── Mostrar notificación del navegador (Web Notifications API) ──
function showBrowserNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  try {
    const notification = new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      data,
    });
    notification.onclick = () => {
      window.focus();
      if (data?.url) window.location.href = data.url;
      notification.close();
    };
  } catch (error) {
    console.error("Error al mostrar notificación en el navegador:", error);
  }
}

// ── Inicialización para Android/iOS ──
function initNative(cleanupList: Array<() => void>) {
  const platform: NotificationPlatform = isPlatform("android")
    ? "android"
    : "ios";

  const initialize = async () => {
    // 1. Permiso de mensajería push (Firebase)
    const pushPermission = await FirebaseMessaging.requestPermissions();
    if (pushPermission.receive !== "granted") {
      console.warn("Permiso de notificaciones push denegado");
      return;
    }

    // 2. Permiso de notificaciones LOCALES (necesario aparte del anterior;
    //    sin esto, las notificaciones en primer plano pueden no mostrarse).
    const localPermission = await LocalNotifications.requestPermissions();
    if (localPermission.display !== "granted") {
      console.warn("Permiso de notificaciones locales denegado");
    }

    await ensureAndroidChannel();

    // 3. Obtener y registrar el token
    try {
      const { token } = await FirebaseMessaging.getToken();
      if (token) await registerTokenOnBackend(token, platform);
    } catch (error) {
      console.error("Error al obtener token:", error);
    }
  };

  initialize();

  // Notificación recibida con la app en primer plano
  const onMessage = FirebaseMessaging.addListener(
    "notificationReceived",
    async (payload: any) => {
      const title = payload.notification?.title || "Nueva notificación";
      const body = payload.notification?.body || "";
      const data = payload.data as Record<string, string> | undefined;
      await showNativeLocalNotification(title, body, data);
    },
  );

  // Usuario tocó la notificación
  const onAction = FirebaseMessaging.addListener(
    "notificationActionPerformed",
    (event) => {
      const data = event.notification?.data as
        | Record<string, string>
        | undefined;
      if (data?.url) window.location.href = data.url;
    },
  );

  // Renovación de token
  const onTokenRefresh = FirebaseMessaging.addListener(
    "tokenReceived",
    (event) => {
      if (event.token) registerTokenOnBackend(event.token, platform);
    },
  );

  cleanupList.push(() => onMessage.then((sub) => sub.remove()));
  cleanupList.push(() => onAction.then((sub) => sub.remove()));
  cleanupList.push(() => onTokenRefresh.then((sub) => sub.remove()));
}

// ── Inicialización para navegador (Web Push con FCM) ──
function initWeb(cleanupList: Array<() => void>) {
  if (!("Notification" in window)) {
    console.warn("Este navegador no soporta notificaciones.");
    return;
  }

  const initialize = async () => {
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      console.warn("Permiso de notificaciones del navegador denegado");
      return;
    }

    const token = await getWebFcmToken();
    if (token) await registerTokenOnBackend(token, "web");
  };

  initialize();

  let unsubscribe: (() => void) | undefined;
  listenForegroundMessages((payload: any) => {
    const title =
      payload.notification?.title ||
      payload.data?.title ||
      "Nueva notificación";
    const body = payload.notification?.body || payload.data?.body || "";
    const data = payload.data as Record<string, string> | undefined;
    showBrowserNotification(title, body, data);
  }).then((unsub) => {
    unsubscribe = unsub;
  });

  cleanupList.push(() => unsubscribe?.());
}

// ── Hook principal ──
export const usePushNotifications = () => {
  useEffect(() => {
    const cleanupList: Array<() => void> = [];

    if (isNative()) {
      initNative(cleanupList);
    } else {
      initWeb(cleanupList);
    }

    return () => {
      cleanupList.forEach((fn) => fn());
    };
  }, []);
};
