# ⚔ FPS Chess: Conquest

Prototipo funcional de ajedrez en primera persona con combates FPS y multijugador online.

## 🚀 Cómo jugar

Abre `index.html` en un navegador moderno (Chrome/Firefox recomendado).

**No requiere servidor** — todo corre en el cliente.

---

## 🎮 Controles

### Tablero de ajedrez
- **Click** en pieza propia para seleccionar
- **Click** en casilla válida (resaltada) para mover
- Al capturar una pieza → **comienza el combate FPS**

### Combate FPS
| Tecla | Acción |
|-------|--------|
| WASD / Flechas | Mover |
| Ratón | Apuntar |
| Click izquierdo | Atacar/Disparar |
| E | Habilidad especial |
| Shift | Sprint / Velocidad extra |
| ESC | Salir (debug) |

---

## ⚔ Piezas

| Pieza | HP | Velocidad | Arma | Habilidad |
|-------|-----|-----------|------|-----------|
| Peón | 80 | Alta | Cuchillo | Lanzamiento |
| Torre | 200 | Baja | Escopeta | Barrera (+60HP) |
| Caballo | 100 | Muy Alta | Pistolas duales | Dash |
| Alfil | 90 | Media | Francotirador | Zoom crítico |
| Reina | 150 | Alta | Arsenal | Explosión arcana |
| Rey | 180 | Media | Martillo+Escudo | Escudo real |

---

## 🌐 Multijugador

### Sala privada
1. Jugador A → **Multijugador** → **Crear Sala** → copia el código de 8 caracteres
2. Jugador B → **Multijugador** → pega el código → **Unirse**
3. ¡A jugar!

### Matchmaking
- Haz clic en **Buscar Partida** y comparte tu ID con un amigo mientras no haya servidor de emparejamiento activo.

> **Nota:** El multijugador usa **PeerJS** (WebRTC P2P). Ambos jugadores necesitan estar en la misma red o con el servidor PeerJS público accesible.

---

## 🛠 Tecnologías

- **Three.js r128** — Motor 3D para el combate FPS
- **PeerJS 1.5.2** — Multijugador P2P WebRTC
- **Vanilla JS** — Motor de ajedrez propio (sin dependencias)
- **CSS Custom** — UI con fuentes Orbitron + Share Tech Mono

---

## 📁 Estructura

```
fps-chess/
├── index.html   — HTML principal con todas las pantallas
├── style.css    — Estilos completos
├── game.js      — Lógica: ajedrez + FPS + multijugador
└── README.md    — Este archivo
```

---

## 🔮 Mejoras futuras

- [ ] Servidor de matchmaking dedicado (Socket.io)
- [ ] Modelos 3D de piezas más detallados
- [ ] Modo torneo
- [ ] Skins de piezas personalizables
- [ ] Replay de partidas
- [ ] ELO real con backend
- [ ] Sonido y música
- [ ] Móvil (controles táctiles)
