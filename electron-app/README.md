# AZIEL PRO - Compilador a .EXE

Para convertir tu sistema en un programa instalable de Windows (.exe) que puedas instalar en cualquier computadora, hemos preparado esta carpeta.

Dado que quieres que todos compartan una **Base de Datos Única**, la mejor estrategia es subir tu sistema a un Hosting web y hacer que este `.exe` se conecte a ese hosting (como un navegador privado y exclusivo para tu sistema).

## Instrucciones:
1. Necesitas tener instalado `Node.js` en tu PC (descárgalo de nodejs.org).
2. Abre tu terminal o CMD en esta carpeta (`c:\xampp\htdocs\aziel_ordenes\electron-app\`).
3. Ejecuta el comando: `npm install` (Esto descargará las herramientas de compilación).
4. *Opcional:* Edita `main.js` en la línea 17 y cambia la URL `http://localhost...` por el dominio real donde subas el sistema en internet, así todas tus computadoras se conectarán a la misma base de datos nivel Dios en la nube.
5. Copia el archivo `icon.png` (que generamos por IA) desde la carpeta principal y pégalo aquí adentro (`electron-app/icon.png`).
6. Finalmente, ejecuta: `npm run build`
7. ¡Listo! En unos minutos se creará una carpeta llamada `dist` y adentro encontrarás `AZIEL PRO Setup 1.0.0.exe`.

¡Instálalo y disfruta de tu propio software de escritorio!
