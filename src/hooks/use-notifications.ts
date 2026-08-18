// src/hooks/use-notifications.ts
import { useEffect } from "react";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isPlatform } from "@ionic/react";
import { EnvConfig } from "@/utils/constants/env.config";
import { getLocalStorageItem } from "@/utils/functions/local-storage";

const { apiMongoDb } = EnvConfig();

// ── Registro del token en el backend ──
async function registerTokenOnBackend(token: string) {
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
        platform: isPlatform("android")
          ? "android"
          : isPlatform("ios")
            ? "ios"
            : "web",
      }),
    });
  } catch (error) {
    console.error("Error al registrar el token FCM:", error);
  }
}

// ── Mostrar notificación local ──
async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  try {
    // Crea el canal si no existe (solo Android)
    if (isPlatform("android")) {
      await LocalNotifications.createChannel({
        id: "default",
        name: "Canal por defecto",
        description: "Notificaciones de la aplicación",
        importance: 4, // alta
        sound: "default",
        vibration: true,
      });
    }

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

// ── Hook principal ──
export const usePushNotifications = () => {
  useEffect(() => {
    if (!isPlatform("android") && !isPlatform("ios")) return;

    const initialize = async () => {
      // 1. Solicitar permiso
      const permission = await FirebaseMessaging.requestPermissions();
      if (permission.receive !== "granted") {
        console.warn("Permiso de notificaciones denegado");
        return;
      }
      console.log("Permiso concedido");

      // 2. Obtener token
      try {
        const { token } = await FirebaseMessaging.getToken();
        console.log("Token FCM:", token);
        if (token) await registerTokenOnBackend(token);
      } catch (error) {
        console.error("Error al obtener token:", error);
      }
    };

    initialize();

    // 3. Escuchar notificaciones en primer plano
    const onMessage = FirebaseMessaging.addListener(
      "notificationReceived",
      async (payload: any) => {
        console.log("Notificación en primer plano:", payload);
        const title = payload.notification?.title || "Nueva notificación";
        const body = payload.notification?.body || "";
        const data = payload.data as Record<string, string> | undefined;
        await showLocalNotification(title, body, data);
      },
    );

    // 4. Escuchar apertura desde notificación
    const onAction = FirebaseMessaging.addListener(
      "notificationActionPerformed",
      (event) => {
        console.log("Abierto desde notificación:", event);
        const data = event.notification?.data as
          | Record<string, string>
          | undefined;
        const url = data?.url;
        if (url) {
          window.location.href = url;
        }
      },
    );

    // 5. Escuchar renovación de token
    const onTokenRefresh = FirebaseMessaging.addListener(
      "tokenReceived",
      (event) => {
        if (event.token) registerTokenOnBackend(event.token);
      },
    );

    // Limpieza
    return () => {
      onMessage.then((sub) => sub.remove());
      onAction.then((sub) => sub.remove());
      onTokenRefresh.then((sub) => sub.remove());
    };
  }, []);
};
