# ====================================
# OPTIMIZACIONES EXTREMAS DE R8
# ====================================

# Realiza 7 pasadas de optimización (más que 5, máximo rendimiento)
-optimizationpasses 7

# Permite modificar el acceso a métodos y clases (public -> private) para ofuscar mejor
-allowaccessmodification

# Renombra todos los paquetes a un nombre muy corto (ofuscación máxima)
# Cambia 'com.eusebiodev.pickupliz' por 'a.b.c' en el código final
-repackageclasses ''

# Fusiona interfaces agresivamente (reduce el número de métodos)
-mergeinterfacesaggressively

# Optimizaciones avanzadas: desactiva solo las que suelen dar problemas
# Esto habilita casi todas las optimizaciones menos las que rompen reflexión
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*,!code/allocation/variable

# Elimina atributos de depuración (reduce aún más el tamaño)
# ¡CUIDADO! Si usas Firebase Crashlytics, DEJA SourceFile y LineNumberTable
# Si no usas Crashlytics, descomenta la siguiente línea:
# -dontkeepattributes SourceFile,LineNumberTable

# Si usas Crashlytics, mantenlas:
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*

# ====================================
# OFUSCACIÓN DE NOMBRES DE MÉTODOS
# ====================================

# Ofusca los nombres de los métodos nativos (los que usan JNI)
-keepclasseswithmembernames class * {
    native <methods>;
}

# Esto mantiene los nombres de las clases que usas en el manifiesto (Activity, Service)
# pero ofusca todo lo demás al máximo
-keep class com.eusebiodev.pickupliz.MainActivity { *; }
-keep class com.eusebiodev.pickupliz.BuildConfig { *; }