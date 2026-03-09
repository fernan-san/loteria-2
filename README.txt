# Lotería Chiapaneca Refactor

Estructura modular incluida:

- index.html
- css/styles.css
- js/data/cartas.js
- js/core/state.js
- js/core/utils.js
- js/services/firebase.js
- js/game/local.js
- js/game/multiplayer.js
- js/ui/render.js
- js/ui/navigation.js
- js/lib/patterns.js
- js/lib/audio.js
- js/main.js

Notas:
- La app sigue usando Firebase Realtime Database con la misma configuración del proyecto original.
- El bug del label del anfitrión quedó corregido usando una referencia explícita al nodo creado.
- Las cartas quedaron separadas en `js/data/cartas.js`.
- La lógica se dividió en capas para que sea más mantenible.

Para correrlo:
1. Abre `index.html` en un servidor estático local.
2. Si el navegador bloquea módulos por `file://`, usa algo como Live Server.
