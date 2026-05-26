# AZIEL PRO - Versión Android

Esta aplicación ha sido diseñada con una arquitectura **"Mobile-First"** (App Shell) y configurada como una PWA (Progressive Web App).

## Método 1: Instalación Directa (PWA - Recomendado)
Debido a que el código ya contiene el archivo `manifest.json` y las etiquetas meta correctas, cualquier celular puede instalar esto como una App Nativa sin necesidad de tiendas.

1. Sube tu carpeta de archivos (`index.html`, `app.js`, `style.css`, `manifest.json`) a tu repositorio de **GitHub**.
2. Activa **GitHub Pages** en la configuración de tu repositorio para obtener un enlace público (ej: `https://tu-usuario.github.io/aziel-pro/`).
3. Abre ese enlace desde Google Chrome en tu celular Android.
4. Toca los 3 puntitos del navegador y selecciona **"Agregar a la pantalla principal"** (o "Instalar aplicación").
5. ¡Listo! Se creará un ícono en tu celular y al abrirlo se mostrará a pantalla completa sin barra de navegación del navegador (exactamente igual que una App descargada de Play Store).

## Método 2: Convertir a APK real con Capacitor / Cordova (Opcional)
Si estrictamente necesitas el archivo `.apk` para mandarlo por WhatsApp o subirlo a la Play Store:

1. Instala Node.js en tu PC.
2. Abre la consola y ejecuta: `npm install -g @capacitor/cli @capacitor/core`
3. Inicializa el proyecto en tu carpeta: `npx cap init`
4. Agrega la plataforma de Android: `npx cap add android`
5. Copia tus archivos al folder público de Capacitor.
6. Ejecuta `npx cap open android` para abrirlo en Android Studio y compilar tu `.apk`.

*(Nota: El Método 1 es infinitamente más rápido y permite que actualices la app en GitHub y todos tus celulares se actualicen solos instantáneamente)*
