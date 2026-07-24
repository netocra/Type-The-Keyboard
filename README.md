# Type The Keyboard

Juego de mecanografía estilo vertical donde las palabras caen y debes escribirlas antes de que lleguen al fondo. Mejora tu velocidad y precisión mientras disfrutas de música generativa que responde a tu rendimiento.

---

## Dependencias y Frameworks
| Dependencia | Versión | Tipo | Descripción |
|-------------|---------|------|-------------|
| **Tone.js** | 14.8.49 | Librería JS (local en `lib/Tone.js`) | Framework de Web Audio para síntesis de sonido y música generativa en tiempo real |
| **JavaScript ES6+** | ECMAScript 2015+ | Lenguaje | Vanilla JS sin frameworks ni transpiladores |
| **HTML5** | 5 | Markup | Estructura de la aplicación |
| **CSS3** | 3 | Estilos | Tema visual Catppuccin Mocha, animaciones y layout |

### Requisitos del navegador
El juego no requiere instalación de dependencias externas ni build tools. Es una aplicación 100% estática que corre directamente en el navegador.

| Requisito | Versión mínima recomendada |
|-----------|---------------------------|
| **Google Chrome** | 89+ |
| **Mozilla Firefox** | 85+ |
| **Microsoft Edge** | 89+ |
| **Safari** | 15+ |

> **Nota:** La Keyboard API para detección automática de layout solo está disponible en Chrome. En otros navegadores se usa el layout QWERTY Español como predeterminado.

---

## Uso de APIs

### 1. Random Word API (API externa)
**URL base:** `https://random-word-api.herokuapp.com/word`

**¿Para qué se usa?**
Genera palabras aleatorias en español o inglés para construir las oraciones que el jugador debe escribir durante la partida. Esto asegura que cada sesión de juego tenga contenido diferente.

**¿Cómo se usa?**

```
GET https://random-word-api.herokuapp.com/word?lang={idioma}&number={cantidad}
```

| Parámetro | Valores | Descripción |
|-----------|---------|-------------|
| `lang` | `es`, `en` | Idioma de las palabras solicitadas |
| `number` | Entero (ej: 45, 75, 90) | Cantidad de palabras a obtener |

**Ejemplo de petición:**
```
GET https://random-word-api.herokuapp.com/word?lang=es&number=75
```

**Respuesta:** Array JSON de strings con palabras aleatorias.

**Flujo en el juego:**
1. Al seleccionar dificultad, se calcula cuántas palabras se necesitan (fácil: 15, medio: 25, difícil: 30)
2. Se piden 3× más palabras de las necesarias para compensar el filtrado
3. Se filtran palabras inválidas (con acentos, mayúsculas, muy cortas, o que no correspondan al idioma)
4. Se agrupan en oraciones de 5 palabras cada una
5. **Fallback:** Si la API falla o no responde, se usan oraciones predefinidas locales
6. **Feedback visual:** El sistema notifica al usuario cuando la API no está disponible y se está utilizando el contenido local de respaldo

---

### 2. Web Audio API (API del navegador, vía Tone.js)
**¿Para qué se usa?**
Genera música y efectos de sonido en tiempo real que responden al rendimiento del jugador. Los géneros musicales evolucionan según el puntaje y las capas de instrumentos se activan/desactivan según el combo.

**¿Cómo se usa?**
- Se inicializa con un gesto del usuario (presionar Enter para iniciar)
- `audioEngine.playCorrectNote(combo)` — Reproduce una nota musical al teclear correctamente
- `audioEngine.playErrorSound()` — Reproduce un sonido de error al fallar
- `audioEngine.playSentenceComplete()` — Reproduce una progresión de acordes al completar una oración
- `audioEngine.updateLayers(combo)` — Activa/desactiva capas musicales según el nivel de combo
- `audioEngine.updateGenre(score)` — Cambia el género musical según el puntaje acumulado
- `audioEngine.stopAll()` — Detiene toda la reproducción al terminar la partida

**Progresión de géneros por puntaje:**
| Puntaje | Género |
|---------|--------|
| 0–200 | Trap |
| 200–500 | Lo-fi |
| 500–1000 | Synthwave |
| 1000–2000 | Drum & Bass |
| 2000+ | Future Bass |

---

### 3. IndexedDB API (API del navegador)
**¿Para qué se usa?**
Persiste las estadísticas del jugador entre sesiones. Guarda el historial de partidas, errores por tecla y palabras difíciles para mostrar progreso en el dashboard de estadísticas.

**¿Cómo se usa?**
- **Base de datos:** `TypeKeyboardDB` (versión 1)
- **Object stores:**
  - `sessions` — Almacena datos de cada partida (WPM, accuracy, duración, combo, dificultad, idioma)
  - `keyErrors` — Registra qué teclas se fallan con mayor frecuencia
  - `wordErrors` — Registra qué palabras son más difíciles para el jugador
- **Operaciones principales:**
  - `statsTracker.saveSession(data)` — Guarda una sesión al terminar la partida
  - `statsTracker.getOverallStats()` — Obtiene estadísticas agregadas (total palabras, mejor WPM, mejor combo)
  - `statsTracker.getHistoricalAccuracy()` — Obtiene el historial de precisión para graficar
  - `statsTracker.getProblematicKeys()` — Obtiene las teclas con mayor tasa de error
  - `statsTracker.getTopDifficultWords()` — Obtiene las 5 palabras más difíciles

**Fallback:** Si IndexedDB no está disponible (ej: navegación privada), el sistema funciona en modo memoria (los datos no persisten entre sesiones).

---

### 4. Keyboard API (API del navegador)
**¿Para qué se usa?**
Detecta automáticamente el layout físico del teclado del usuario para renderizar el teclado visual con la disposición correcta de teclas.

**¿Cómo se usa?**
```javascript
const layoutMap = await navigator.keyboard.getLayoutMap();
const semicolonKey = layoutMap.get('Semicolon'); // Si retorna 'ñ' → teclado español
```

- Si detecta `Semicolon = 'ñ'` y `Backquote = 'º'` → Layout QWERTY Español (España)
- Si detecta `Semicolon = 'ñ'` y otro Backquote → Layout QWERTY Latinoamericano
- **Fallback:** Si la API no está soportada (Firefox, Safari), usa QWERTY Español por defecto

> **Nota:** Esta API es experimental y solo funciona en Chrome/Edge sobre contextos seguros (HTTPS o localhost).

---

### 5. Canvas API (API del navegador)
**¿Para qué se usa?**
Renderiza efectos visuales en tiempo real sobre un canvas a pantalla completa con `pointer-events: none`, superpuesto al juego sin interferir con la interacción.

**¿Cómo se usa?**
- `canvasEffects.particleExplosion(x, y, color)` — Explosión de 30 partículas radiales al completar una oración
- `canvasEffects.neonTrail(points, color)` — Estela de neón detrás de elementos en movimiento
- `canvasEffects.screenShake(intensity, duration)` — Sacude la pantalla al cometer un error (aplica transform al contenedor del juego)
- `canvasEffects.comboFire(x, y)` — Partículas de fuego continuas cuando el combo es ≥ 21

**Optimizaciones implementadas:**
- Límite máximo de 500 partículas activas
- Object pooling para reutilizar partículas sin crear nuevos objetos
- Sistema de calidad adaptativa (reduce partículas si el FPS baja de 45)
- Tres niveles de calidad: full → half → quarter

---

### 6. LocalStorage API (API del navegador)
**¿Para qué se usa?**
Almacena el estado de logros (achievements) desbloqueados por el jugador.

**¿Cómo se usa?**
- Guarda/lee datos serializados en JSON bajo claves específicas
- Persiste entre sesiones sin necesidad de base de datos

---

## Cómo ejecutar
1. Clona o descarga el repositorio
2. Abre `index.html` directamente en un navegador moderno, o sirve los archivos con cualquier servidor estático:
   ```bash
   # Opción con Python
   python3 -m http.server 8080

   # Opción con Node.js (si tienes npx)
   npx serve .
   ```
3. Accede a `http://localhost:8080` en tu navegador
4. Selecciona una dificultad y presiona Enter para jugar

> **Importante:** Para que la Keyboard API funcione, el juego debe servirse sobre HTTPS o localhost.
