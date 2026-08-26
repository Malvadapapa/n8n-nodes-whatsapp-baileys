# 📱 n8n Nodes WhatsApp Baileys (Standalone & Local)

<p align="center">
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" />
  <img src="https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
</p>

Conector e integración nativa de **WhatsApp** para **n8n** impulsado por [@whiskeysockets/baileys](https://baileys.wiki/). Permite automatizar chats, enviar multimedia, recibir mensajes en tiempo real y construir bots con inteligencia artificial **sin dependencias complejas, sin costos por conversación de Meta y con inicio en 1 solo clic**.

---

## 📑 Tabla de Contenidos

1. [Lanzador de 1 Clic para Windows](#-lanzador-de-1-clic-para-windows)
2. [Identificación Dinámica de Números y Remitentes](#-identificación-dinámica-de-números-y-remitentes)
3. [Características Principales](#-características-principales)
4. [Arquitectura del Sistema](#-arquitectura-del-sistema)
5. [Panel de Control Web (Hub)](#-panel-de-control-web-hub)
6. [Referencia de Nodos n8n](#-referencia-de-nodos-n8n)
7. [Referencia de la API REST (Bridge Server)](#-referencia-de-la-api-rest-bridge-server)
8. [Plantillas de Automatización Listas para Usar](#-plantillas-de-automatización-listas-para-usar)
9. [Protecciones y Seguridad](#-protecciones-y-seguridad)
10. [Licencia](#-licencia)

---

## 🖱️ Lanzador de 1 Clic para Windows

Diseñado para que cualquier persona sin conocimientos técnicos pueda encender y apagar el bot fácilmente:

1. **Para encender el Bot**: Haz doble clic en **`INICIAR-BOT.bat`**.
   - Inicia el servidor nativo en menos de 1 segundo de forma ultraligera.
   - Abre automáticamente en tu navegador el **Panel de WhatsApp** (`http://localhost:3100/qr/page`).
2. **Para apagar el Bot**: Haz doble clic en **`DETENER-BOT.bat`** (o cierra la ventana de la terminal).
   - Libera los puertos y detiene cualquier proceso de WhatsApp de inmediato.

---

## 👤 Identificación Dinámica de Números y Remitentes

Cada vez que entra un mensaje a tu n8n a través del Webhook, el sistema envía un objeto JSON enriquecido con **todos los datos del remitente ya procesados e identificados dinámicamente**, sin que tengas que parsear textos ni tocar código:

| Campo en n8n | Tipo | Ejemplo | Descripción |
| :--- | :--- | :--- | :--- |
| `{{ $json.body.senderNumber }}` | `String` | `"5493517883811"` | **Número limpio** (solo dígitos, sin símbolos). |
| `{{ $json.body.senderFormatted }}` | `String` | `"+5493517883811"` | **Número internacional formateado** con signo `+`. |
| `{{ $json.body.fromName }}` | `String` | `"Cristian"`, `"Karina"` | **Nombre visible** del contacto en WhatsApp. |
| `{{ $json.body.from }}` | `String` | `"5493517883811@s.whatsapp.net"` | **Dirección JID** lista para usar en el campo `to:` de respuesta. |
| `{{ $json.body.isSelfChat }}` | `Boolean` | `true` / `false` | `true` si es tu propio chat personal ("Tú" / Notas), `false` si es otra persona. |
| `{{ $json.body.isGroup }}` | `Boolean` | `true` / `false` | `true` si el mensaje proviene de un grupo de WhatsApp. |
| `{{ $json.body.body }}` | `String` | `"Hola, cuánto cuesta el producto?"` | **Texto o descripción** del mensaje recibido. |
| `{{ $json.body.type }}` | `String` | `"text"`, `"image"`, `"audio"` | Tipo de contenido del mensaje. |

### 💡 Ejemplo de Respuesta en n8n:
En tu nodo de enviar mensaje puedes escribir expresiones tan sencillas como:
```javascript
"¡Hola " + $json.body.fromName + " (" + $json.body.senderFormatted + ")! Recibí tu mensaje: " + $json.body.body
```

---

## ✨ Características Principales

- ⚡ **100% Nativo y Ultraligero**: Funciona directamente con Node.js en Windows/Linux/Mac con velocidad y rendimiento óptimos.
- 🖼️ **Panel de Control Visual**: Interfaz web intuitiva en `http://localhost:3100/qr/page` con código QR dinámico, monitor de mensajes en vivo, hora local automática y botón de desvinculación / cerrar sesión.
- 🔄 **Reconexión Infinita Inteligente**: Si se corta internet o el QR expira, el sistema genera nuevos códigos y reintenta la conexión de forma autónoma.
- 🛡️ **Protección Anti-Bucle (Anti-Loop)**: Ignora automáticamente los mensajes generados por el propio bot (prefijo `🤖`) y deduplica eventos repetidos en menos de 2.5 segundos.
- 📩 **Soporte Multimedia**: Envío y recepción de texto, imágenes, audios, documentos PDF/Office, ubicaciones GPS, stickers y tarjetas de contacto.
- 💾 **Persistencia Automática**: Las credenciales de sesión se guardan de forma encriptada en la carpeta `bridge/auth_info/` para no tener que escanear el QR cada vez.

---

## 🏗️ Arquitectura del Sistema

```
  ┌─────────────────┐             ┌─────────────────────────────┐             ┌─────────────────────┐
  │                 │  WebSocket  │   WhatsApp Gateway (Local)  │  HTTP /     │         n8n         │
  │  WhatsApp Web   │ ◄─────────► │      (Express + Baileys)    │  Webhooks   │ (Workflows & Logic) │
  │   (Servidores)  │             │        [Puerto 3100]        │ ◄─────────► │    (Local o Cloud)  │
  └─────────────────┘             └─────────────────────────────┘             └─────────────────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   Panel Web de QR     │
                                     │  (/qr/page en vivo)   │
                                     └───────────────────────┘
```

---

## 🌐 Panel de Control Web (Hub)

Al ingresar a **`http://localhost:3100/qr/page`** tendrás acceso a:

1. **Estado de Conexión en Tiempo Real**: Nombre de la cuenta conectada, número telefónico y estado del enlace.
2. **Código QR con Auto-Recuperación**: Generación instantánea en caso de no haber vinculado ninguna cuenta.
3. **🔴 Botón Cerrar Sesión / Desvincular**: Elimina la sesión actual con un solo clic y genera un nuevo QR de inmediato.
4. **🔗 Configuración de Webhook Destino**: Campo para pegar la URL de n8n (ej: `http://localhost:5678/webhook/whatsapp-trigger` o tu servidor en la nube) con persistencia automática entre reinicios.
5. **📊 Monitor de Mensajes en Vivo**: Consola interactiva con la hora local de tu computadora que muestra mensajes entrantes, confirmación de entrega a n8n (HTTP 200) y respuestas automáticas del bot.

---

## 🔌 Referencia de la API REST (Puerto 3100)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/qr/page` | Panel de Control Web interactivo con QR y monitor en vivo. |
| `GET` | `/qr` | Devuelve el código QR en formato JSON o imagen PNG (`/qr/image`). |
| `GET` | `/status` | Estado detallado de la conexión y número vinculado. |
| `GET` | `/activity` | Lista de los últimos 80 eventos procesados por la consola. |
| `POST` | `/logout` | Desvincula la sesión activa y reinicia el generador de QR. |
| `POST` | `/send/text` | Envía un mensaje de texto plano (`{ "to": "...", "message": "..." }`). |
| `POST` | `/send/image` | Envía una imagen con pie de foto opcional (`{ "to": "...", "url": "...", "caption": "..." }`). |
| `POST` | `/webhook/register`| Registra una URL de Webhook receptora (`{ "url": "...", "id": "..." }`). |

---

## 📦 Plantillas de Automatización Incluidas

En la raíz del proyecto encontrarás 3 flujos listos para importar directamente en n8n:

1. **`workflow-menu-bot.json` (Recomendado - Menú Interactivo de 4 Opciones)**:
   - 1️⃣ **Saludar**: Envía un saludo cordial y personalizado con el nombre del usuario.
   - 2️⃣ **Dólar en Vivo**: Consulta la API pública de `DolarApi.com` y responde con la cotización de compra/venta del Dólar Blue al instante.
   - 3️⃣ **Eco con Retardo (10s)**: Demostración de tareas asíncronas con el nodo `Wait` de n8n, respondiendo tras 10 segundos exactos.
   - 4️⃣ **TODO / Notas CRUD**: Demostración de consulta y gestión de tareas y notas.
   - 🔄 **Menú Automático (Fallback)**: Si el usuario escribe cualquier otra cosa (ej: *"hola"*, *"menu"*), le despliega el menú con las 4 opciones interactivas.

2. **`workflow-eco-bot.json` (Bot Eco Privado)**:
   - Responde únicamente a los mensajes que te envías en tu propio chat privado de WhatsApp ("Tú" / Notas personales).

3. **`workflow-whatsapp-bot.json` (Auto-Respuesta Dinámica)**:
   - Responde automáticamente a cualquier cliente o contacto saludándolo por su nombre de WhatsApp y número formateado internacionalmente.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT** — Libre para uso personal, comercial y modificaciones.
