# 📱 WhatsApp Bot para n8n con Baileys

<p align="center">
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" />
  <img src="https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
</p>

Un puente entre WhatsApp y [n8n](https://n8n.io/) que te permite recibir mensajes, responder automáticamente y armar bots desde tus flujos de n8n. Usa la librería [Baileys](https://baileys.wiki/) para conectarse a WhatsApp Web sin depender de la API oficial de Meta ni pagar por conversación.

Viene con 3 bots de ejemplo listos para importar, un panel web para vincular tu cuenta con código QR y un gestor de tareas (TODO) funcional desde el chat.

> [!WARNING]
> **Antes de usar, leé esto:**
> - Este proyecto es para **aprender, experimentar y automatizar cosas personales**. Baileys no es una herramienta oficial de WhatsApp.
> - Si usás automatizaciones para enviar spam o mensajes masivos, **WhatsApp puede bloquear tu número** temporal o permanentemente.
> - Para uso comercial serio con clientes reales, usá la [API Oficial de Meta (WhatsApp Cloud API)](https://developers.facebook.com/docs/whatsapp/cloud-api/).

---

## Tabla de Contenidos

1. [Requisitos previos](#requisitos-previos)
2. [Instalación](#instalación)
3. [Primer uso (guía rápida)](#primer-uso-guía-rápida)
4. [Conectar con n8n](#conectar-con-n8n)
5. [Los 3 bots de ejemplo](#los-3-bots-de-ejemplo)
6. [Cómo funciona por dentro](#cómo-funciona-por-dentro)
7. [Referencia técnica](#referencia-técnica)
8. [Problemas comunes](#problemas-comunes)
9. [Licencia](#licencia)

---

## Requisitos previos

Antes de arrancar, asegurate de tener instalado:

| Programa | Versión mínima | ¿Dónde lo descargo? |
| :--- | :--- | :--- |
| **Node.js** | v18 o superior | [nodejs.org](https://nodejs.org/) |
| **n8n** | Cualquier versión reciente | Ver opciones abajo |

### ¿Cómo instalar n8n?

Hay 3 formas, elegí la que más te convenga:

- **Con Docker Desktop** (la más común): Seguí la [guía oficial de n8n con Docker](https://docs.n8n.io/hosting/installation/docker/).
- **Directo con Node.js**: Ejecutá `npx n8n` en tu terminal y listo, se abre en `http://localhost:5678`.
- **n8n Cloud**: Creá una cuenta en [n8n.io/cloud](https://n8n.io/cloud/) y usalo desde el navegador.

---

## Instalación

### En Windows (1 solo clic)

1. Descargá o cloná el repositorio:
   ```bash
   git clone https://github.com/Malvadapapa/n8n-nodes-whatsapp-baileys.git
   ```
2. Abrí la carpeta y hacé doble clic en **`INICIAR-BOT.bat`**.  
   El script instala las dependencias, compila el código y levanta el servidor automáticamente. Se va a abrir el Panel Web en tu navegador.

### Manual (Windows, Linux o Mac)

Si preferís hacerlo paso a paso desde la terminal:

```bash
git clone https://github.com/Malvadapapa/n8n-nodes-whatsapp-baileys.git
cd n8n-nodes-whatsapp-baileys

# Instalar dependencias del proyecto principal
npm install

# Instalar y compilar el servidor Bridge
cd bridge
npm install
npm run build
cd ..

# Iniciar el servidor
node bridge/dist/server.js
```

El servidor arranca en `http://localhost:3100` y el Panel Web queda en `http://localhost:3100/qr/page`.

Para detener el servidor: cerrá la terminal, o en Windows hacé doble clic en **`DETENER-BOT.bat`**.

---

## Primer uso (guía rápida)

Una vez que el servidor está corriendo:

**Paso 1 — Vincular tu WhatsApp:**
- Abrí `http://localhost:3100/qr/page` en tu navegador.
- Escaneá el código QR desde WhatsApp en tu teléfono (Ajustes → Dispositivos vinculados → Vincular dispositivo).
- Cuando se conecte, vas a ver tu nombre y número en el panel.

**Paso 2 — Configurar el webhook de n8n:**
- En el mismo panel, abajo del QR, hay un campo que dice *"Webhook Destino (n8n)"*.
- Pegá la URL de tu n8n. Si tenés n8n corriendo en tu misma computadora:  
  `http://localhost:5678/webhook/whatsapp-trigger`
- Hacé clic en **Guardar**.

**Paso 3 — Importar un bot de ejemplo:**
- Abrí tu editor de n8n (`http://localhost:5678`).
- Andá a los tres puntitos (`...`) arriba → **Import from File**.
- Seleccioná el archivo **`workflow-menu-bot.json`** de la carpeta del proyecto.
- Hacé clic en **Publish** (el botón verde arriba a la derecha).

**Paso 4 — Probarlo:**
- Desde otro teléfono (o desde tu propio chat), mandá cualquier mensaje al número vinculado.
- El bot debería responder con el menú de opciones. Respondé `1`, `2`, `3` o `4` para probar cada función.

---

## Conectar con n8n

El servidor Bridge (puerto `3100`) y n8n (puerto `5678`) se comunican por HTTP. Dependiendo de cómo tengas instalado n8n, la configuración cambia un poco:

### n8n en Docker Desktop

Esta es la situación más común. Como n8n corre dentro de un contenedor aislado, no puede acceder a tu computadora usando `localhost` — necesita usar una dirección especial:

| Qué configurar | Dónde | URL a usar |
| :--- | :--- | :--- |
| Webhook destino | Panel Web del bot | `http://localhost:5678/webhook/whatsapp-trigger` |
| URL del Bridge (en los nodos HTTP de n8n) | Dentro de n8n | `http://host.docker.internal:3100/send/text` |

> **¿Por qué `host.docker.internal`?** Porque n8n está dentro de un contenedor y necesita esa dirección para "salir" del contenedor y comunicarse con tu computadora donde corre el Bot. Los flujos de ejemplo ya vienen configurados con esta URL.

### n8n directo con Node.js (`npx n8n`)

Si n8n y el bot corren en la misma computadora sin contenedores, todo es `localhost`:

| Qué configurar | URL a usar |
| :--- | :--- |
| Webhook destino | `http://localhost:5678/webhook/whatsapp-trigger` |
| URL del Bridge (en n8n) | `http://localhost:3100/send/text` |

### n8n en la nube (VPS o n8n Cloud)

Si tu n8n está en un servidor remoto o en n8n Cloud:

1. En el Panel Web, poné la URL pública de tu n8n:  
   `https://tu-instancia.app.n8n.cloud/webhook/whatsapp-trigger`
2. Para que n8n en la nube pueda mandarle mensajes a tu computadora, necesitás exponer el puerto 3100 con un túnel como [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3100
   ```
   Y usá la URL que ngrok te da (ej: `https://abc123.ngrok-free.app/send/text`) en los nodos HTTP de n8n.

---

## Los 3 bots de ejemplo

El proyecto incluye 3 flujos de n8n listos para importar (**n8n → ... → Import from File**):

### `workflow-menu-bot.json` — Menú interactivo con 4 opciones

El bot más completo. Cuando alguien te escribe, le muestra un menú y responde según el número que elija:

| El usuario escribe | Qué hace el bot |
| :--- | :--- |
| Cualquier texto (ej: "hola") | Muestra el menú con las 4 opciones |
| `1` | Saluda al usuario por su nombre |
| `2` | Consulta la cotización del Dólar Blue en vivo (API pública) |
| `3` | Espera 10 segundos y responde (demostración del nodo Wait) |
| `4` | Muestra su lista de tareas pendientes |
| `4a Comprar café` | Agrega "Comprar café" a su lista |
| `4b 1` | Marca la tarea #1 como completada |
| `4c 1` | Elimina la tarea #1 |
| `4d` | Borra todas las tareas |

Las tareas se guardan por número de teléfono en un archivo local (`bridge/auth_info/tasks.json`). Esto es intencional: así cualquiera puede probar el CRUD sin necesidad de configurar una base de datos externa.

> **Tip:** Si querés guardar las tareas en otro lado, podés reemplazar los nodos HTTP del flujo por los conectores nativos de n8n (Google Sheets, Notion, PostgreSQL, Supabase, etc.).

### `workflow-eco-bot.json` — Bot espejo para pruebas

Responde solo en tu chat privado ("Tú" / notas personales). Le mandás un mensaje y te devuelve el mismo texto con un prefijo `🤖 Eco:`. Útil para verificar que el bridge y n8n se están comunicando bien sin molestar a tus contactos.

### `workflow-whatsapp-bot.json` — Auto-respuesta a cualquier contacto

Le responde a cualquier persona que te escriba con un saludo personalizado que incluye su nombre y número. Sirve como punto de partida para armar un bot de atención al cliente.

---

## Cómo funciona por dentro

El proyecto tiene dos piezas que trabajan juntas:

```
  ┌─────────────────┐             ┌─────────────────────────────┐             ┌─────────────────────┐
  │                 │  WebSocket  │       Servidor Bridge       │  HTTP /     │         n8n         │
  │  WhatsApp Web   │ ◄─────────► │      (Express + Baileys)    │  Webhooks   │    (tus flujos)     │
  │   (servidores)  │             │      puerto 3100            │ ◄─────────► │    puerto 5678      │
  └─────────────────┘             └─────────────────────────────┘             └─────────────────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   Panel Web (/qr/page)│
                                     └───────────────────────┘
```

**El Bridge** (carpeta `bridge/`) es un servidor Express que:
- Se conecta a WhatsApp Web usando Baileys.
- Recibe los mensajes entrantes, los parsea y se los reenvía a n8n por webhook.
- Expone endpoints HTTP para que n8n le pueda pedir que envíe mensajes de vuelta.
- Sirve el Panel Web para vincular la cuenta con QR y monitorear la actividad en vivo.
- Ignora los mensajes del propio bot para evitar bucles y filtra duplicados.
- Guarda la sesión de WhatsApp en `bridge/auth_info/` para no pedir el QR cada vez.

**n8n** recibe los mensajes del bridge por webhook y ejecuta la lógica que vos definas en tus flujos (responder, consultar APIs, guardar datos, etc.).

### Estructura de carpetas

```
n8n-nodes-whatsapp-baileys/
├── INICIAR-BOT.bat                # Arranca todo en Windows con doble clic
├── DETENER-BOT.bat                # Detiene el servidor y libera el puerto
│
├── bridge/                        # El servidor que conecta con WhatsApp
│   ├── src/                       # Código fuente TypeScript
│   │   ├── baileys-manager.ts     # Conexión WhatsApp, parseo y filtros
│   │   ├── server.ts              # Servidor Express + rutas
│   │   └── routes/                # Endpoints (QR, envíos, tareas, webhooks)
│   ├── auth_info/                 # Sesión de WhatsApp y datos locales
│   │   ├── webhooks_config.json   # URL del webhook de n8n
│   │   └── tasks.json             # Tareas del CRUD (se crea automáticamente)
│   └── package.json
│
├── nodes/                         # Nodos comunitarios para n8n (opcionales)
│   ├── WhatsAppBaileys/           # Nodo para enviar mensajes desde n8n
│   └── WhatsAppBaileysTrigger/    # Nodo trigger para recibir mensajes
│
├── credentials/                   # Credenciales para los nodos de n8n
│
├── workflow-menu-bot.json         # Bot con menú de 4 opciones + CRUD
├── workflow-eco-bot.json          # Bot espejo para pruebas
├── workflow-whatsapp-bot.json     # Bot de auto-respuesta
└── README.md
```

---

## Referencia técnica

### Datos del remitente (lo que recibe n8n en cada mensaje)

Cada vez que llega un mensaje, el bridge le envía a n8n un JSON con estos campos ya procesados:

| Campo en n8n | Tipo | Ejemplo | Qué es |
| :--- | :--- | :--- | :--- |
| `$json.body.from` | String | `"5491122334455@s.whatsapp.net"` | Dirección para responder (usalo en el campo `to:`) |
| `$json.body.fromName` | String | `"María López"` | Nombre del contacto en WhatsApp |
| `$json.body.senderNumber` | String | `"5491122334455"` | Número limpio, solo dígitos |
| `$json.body.senderFormatted` | String | `"+5491122334455"` | Número con formato internacional |
| `$json.body.body` | String | `"Hola, quiero consultar"` | Texto del mensaje |
| `$json.body.type` | String | `"text"`, `"image"` | Tipo de contenido |
| `$json.body.isGroup` | Boolean | `false` | Si viene de un grupo |
| `$json.body.isSelfChat` | Boolean | `false` | Si es tu propio chat ("Tú") |

**Ejemplo de expresión en n8n:**
```javascript
"Hola " + $json.body.fromName + ", recibí tu mensaje: " + $json.body.body
```

### Endpoints del Bridge (puerto 3100)

| Método | Ruta | Para qué sirve |
| :--- | :--- | :--- |
| `GET` | `/qr/page` | Panel web con QR, estado y monitor de mensajes |
| `GET` | `/qr` | Código QR como imagen PNG |
| `GET` | `/status` | Estado de conexión en JSON |
| `GET` | `/activity` | Últimos eventos procesados |
| `POST` | `/send/text` | Enviar mensaje de texto (`{ to, message }`) |
| `POST` | `/send/image` | Enviar imagen (`{ to, url, caption }`) |
| `POST` | `/webhook/register` | Registrar URL del webhook de n8n (`{ url, id }`) |
| `POST` | `/webhook/toggle-pause` | Pausar o reanudar el reenvío de mensajes a n8n |
| `POST` | `/logout` | Cerrar sesión de WhatsApp y generar nuevo QR |
| `POST` | `/tasks/action` | Ejecutar acción CRUD (`{ phone, action, text, index }`) |
| `GET` | `/tasks/:phone` | Ver tareas de un número específico |

---

## Problemas comunes

### "Le escribí al bot y no responde nada"
1. **¿Está corriendo el Bridge?** Fijate que la terminal de `INICIAR-BOT.bat` esté abierta y sin errores.
2. **¿Configuraste el webhook?** En el Panel Web (`/qr/page`), verificá que la URL del webhook esté guardada y en verde.
3. **¿El flujo de n8n está publicado?** Tiene que estar en estado *Published* (punto verde). Si solo lo tenés abierto en el editor, no recibe mensajes de producción.

### "Error: The service refused the connection"
Esto pasa cuando n8n intenta conectarse al Bridge pero usa la dirección equivocada.
- **Si n8n está en Docker**: Los nodos HTTP tienen que apuntar a `http://host.docker.internal:3100/...` (no `localhost`).
- **Si n8n corre directo en tu computadora**: Usá `http://localhost:3100/...`.

### "Los mensajes llegan dobles"
El Bridge tiene un filtro de deduplicación que descarta mensajes repetidos dentro de una ventana de 2.5 segundos. Si aun así te llegan dobles, puede ser un problema de sincronización de WhatsApp Web — generalmente se resuelve solo después de unos minutos.

### "El QR no aparece en el panel"
Probablemente hay una sesión anterior guardada. Hacé clic en **"Cerrar Sesión / Desvincular"** en el Panel Web para borrar las credenciales antiguas y generar un QR nuevo.

### "El bot le responde a contactos que no debería"
El flujo `workflow-menu-bot.json` solo reacciona a **mensajes privados** (no de grupos). Si ves comportamiento raro, verificá que en el nodo "¿Es mensaje privado válido?" esté la condición `isGroup = false`.

---

## Licencia

MIT — Podés usarlo, modificarlo y distribuirlo libremente.
