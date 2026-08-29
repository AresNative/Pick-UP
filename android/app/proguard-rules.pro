# ============================
# Capacitor core
# ============================
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# WebView JS bridge (Capacitor lo usa internamente para @JavascriptInterface)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================
# Plugins Capacitor que usas
# ============================
-keep class com.capacitorjs.plugins.app.** { *; }
-keep class com.capacitorjs.plugins.localnotifications.** { *; }
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }

# ============================
# Firebase (Messaging + Analytics + BOM)
# ============================
-keep class com.google.firebase.** { *; }
-keep class com.google.firebase.messaging.** { *; }
-keepclassmembers class com.google.firebase.messaging.FirebaseMessagingService {
    public void onMessageReceived(com.google.firebase.messaging.RemoteMessage);
    public void onNewToken(java.lang.String);
}
-dontwarn com.google.firebase.**

# ============================
# capacitor-firebase/messaging (community plugin)
# ============================
-keep class io.capawesome.capacitorjs.plugins.firebase.messaging.** { *; }
-dontwarn io.capawesome.capacitorjs.plugins.firebase.**

# ============================
# Google Play Services / GMS (dependencia transitiva de Firebase)
# ============================
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# ============================
# Reglas generales recomendadas por Google/AndroidX
# ============================
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Evita que R8 elimine constructores usados por reflexión (Firebase/Gson los necesita)
-keepclassmembers class * {
    public <init>(...);
}

# Mantén los modelos serializables si usas Gson/Moshi en algún plugin nativo
-keepattributes SourceFile,LineNumberTable
-keep class * implements java.io.Serializable { *; }

# ============================
# Debug: si algo crashea en release, activa esto temporalmente
# para ver el nombre de clase real en el stacktrace
# ============================
#-keepnames class **