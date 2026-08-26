# 📱 n8n Nodes WhatsApp Baileys (Standalone & Local)

<p align="center">
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" />
  <img src="https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
</p>

> [!WARNING]
> ### ⚠️ AVISO LEGAL Y DESCARGO DE RESPONSABILIDAD (USO RESPONSABLE)
> - **Uso Educativo y Pruebas**: Este proyecto utiliza la librería de código abierto `@whiskeysockets/baileys` (protocolo multi-dispositivo de WhatsApp Web). Está diseñado **exclusivamente con fines de aprendizaje, investigación, prototipado y automatización personal**.
> - **Riesgo de Suspensión de Cuenta (Baneo)**: El uso de automatizaciones no oficiales, envío masivo o spam infringe los Términos de Servicio de WhatsApp y puede resultar en el bloqueo temporal o definitivo de tu línea. Úsalo bajo tu propia responsabilidad.
> - **Solución Oficial para Empresas**: Para entornos de producción comercial, clientes reales o mensajería masiva, debes utilizar la **API Oficial de Meta (WhatsApp Cloud API)**.

---

## 📑 Tabla de Contenidos

1. [Lanzador de 1 Clic para Windows](#-lanzador-de-1-clic-para-windows)
2. [¿Cómo Conectar con n8n? (Local, Docker o Cloud)](#-cómo-conectar-con-n8n-local-docker-o-cloud)
3. [Identificación Dinámica de Números y Remitentes](#-identificación-dinámica-de-números-y-remitentes)
4. [Características Principales](#-características-principales)
5. [Panel de Control Web (Hub)](#-panel-de-control-web-hub)
6. [Plantillas de Automatización Listas para Usar](#-plantillas-de-automatización-listas-para-usar)
7. [Referencia de la API REST (Bridge Server)](#-referencia-de-la-api-rest-bridge-server)
8. [Licencia](#-licencia)

---

## 🖱️ Lanzador de 1 Clic para Windows

Diseñado para que cualquier persona pueda encender y apagar el bot fácilmente:

1. **Para encender el Bot**: Haz doble clic en **`INICIAR-BOT.bat`**.
   - Inicia el servidor nativo en menos de 1 segundo.
   - Abre automáticamente en tu navegador el **Panel de WhatsApp** (`http://localhost:3100/qr/page`).
2. **Para apagar el Bot**: Haz doble clic en **`DETENER-BOT.bat`** (o cierra la ventana de la terminal).
   - Libera los puertos y detiene cualquier proceso activo de inmediato.

---

## 🌐 ¿Cómo Conectar con n8n? (Local, Docker o Cloud)

El sistema es **100% dinámico y universal**: funciona con cualquier instalación de n8n.

### 🔹 Opción A: Tienes n8n ejecutándose en Docker Desktop (Más habitual)
1. En el Panel Web (`http://localhost:3100/qr/page`), pon como Webhook destino:  
   `http://localhost:5678/webhook/whatsapp-trigger`
2. En tus nodos de n8n para enviar mensajes (HTTP Request), la URL del servidor local es:  
   `http://host.docker.internal:3100/send/text` *(Ya configurado por defecto en los flujos incluidos)*

### 🔹 Opción B: Tienes n8n ejecutándose directo con Node.js (`npx n8n`)
1. En el Panel Web (`http://localhost:3100/qr/page`), pon como Webhook destino:  
   `http://localhost:5678/webhook/whatsapp-trigger`
2. En tus nodos de n8n para enviar mensajes (HTTP Request), la URL es:  
   `http://localhost:3100/send/text`

### 🔹 Opción C: Tienes n8n en la Nube (VPS o n8n Cloud)
1. En el Panel Web, pega la URL pública de tu n8n en la nube:  
   `https://tu-instancia.app.n8n.cloud/webhook/whatsapp-trigger`
2. Para que tu n8n en la nube le envíe mensajes a tu computadora local, puedes abrir un túnel seguro gratuito con ngrok (`ngrok http 3100`) y usar la URL pública en n8n:  
   `https://tu-subdominio.ngrok-free.app/send/text`

---

## 👤 Identificación Dinámica de Números y Remitentes

Cada vez que entra un mensaje a tu n8n a través del Webhook, el sistema envía un objeto JSON enriquecido con **todos los datos del remitente ya procesados e identificados dinámicamente**, sin que tengas que parsear textos ni tocar código:

| Campo en n8n | Tipo | Ejemplo | Descripción |
| :--- | :--- | :--- | :--- |
| `{{ $json.body.senderNumber }}` | `String` | `"5491122334455"` | **Número limpio** (solo dígitos, sin símbolos). |
| `{{ $json.body.senderFormatted }}` | `String` | `"+5491122334455"` | **Número internacional formateado** con signo `+`. |
| `{{ $json.body.fromName }}` | `String` | `"Juan Pérez"` | **Nombre visible** del contacto en WhatsApp. |
| `{{ $json.body.from }}` | `String` | `"5491122334455@s.whatsapp.net"` | **Dirección JID** lista para usar en el campo `to:` de respuesta. |
| `{{ $json.body.isSelfChat }}` | `Boolean` | `true` / `false` | `true` si es tu propio chat personal ("Tú" / Notas), `false` si es otra persona. |
| `{{ $json.body.isGroup }}` | `Boolean` | `true` / `false` | `true` si el mensaje proviene de un grupo de WhatsApp. |
| `{{ $json.body.body }}` | `String` | `"Hola, quisiera consultar el menú"` | **Texto o descripción** del mensaje recibido. |
| `{{ $json.body.type }}` | `String` | `"text"`, `"image"`, `"audio"` | Tipo de contenido del mensaje. |

### 💡 Ejemplo de Expresión en n8n:
```javascript
"¡Hola " + $json.body.fromName + " (" + $json.body.senderFormatted + ")! Recibí tu mensaje: " + $json.body.body
```

---

## ✨ Características Principales

- ⚡ **100% Nativo y Ultraligero**: Funciona directamente con Node.js en Windows/Linux/Mac.
- 🖼️ **Panel de Control Web (`/qr/page`)**: Código QR dinámico, monitor de mensajes en vivo, hora local automática y botón de desvinculación.
- ⏸️ **Botón de Pausa / Reanudar Reenvío**: Silencia o activa el reenvío de mensajes a n8n en 1 clic desde el Panel Web sin apagar el bot.
- 🔄 **Reconexión Infinita Inteligente**: Genera nuevos códigos QR y reintenta la conexión de forma autónoma ante caídas de internet.
- 🛡️ **Protección Anti-Bucle (Anti-Loop)**: Ignora automáticamente los mensajes generados por el propio bot (prefijo `🤖`) y deduplica eventos repetidos en menos de 2.5 segundos.
- 📩 **Soporte Multimedia**: Envío y recepción de texto, imágenes, audios, documentos PDF/Office, ubicaciones GPS, stickers y tarjetas de contacto.
- 💾 **Persistencia Automática**: Las credenciales de sesión se guardan de forma encriptada en la carpeta `bridge/auth_info/` para no tener que escanear el QR cada vez.

---

## 📦 Plantillas de Automatización Incluidas

En la raíz del proyecto encontrarás 3 flujos listos para importar directamente en n8n (**Menú → Import from File**):

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

## 🔌 Referencia de la API REST (Puerto 3100)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/qr/page` | Panel de Control Web interactivo con QR y monitor en vivo. |
| `GET` | `/qr` | Devuelve el código QR en formato JSON o imagen PNG. |
| `GET` | `/status` | Estado detallado de la conexión y número vinculado. |
| `GET` | `/activity` | Lista de los últimos eventos procesados por la consola. |
| `POST` | `/webhook/toggle-pause` | Pausa o reanuda el reenvío de mensajes a los webhooks de n8n. |
| `POST` | `/logout` | Desvincula la sesión activa y reinicia el generador de QR. |
| `POST` | `/send/text` | Envía un mensaje de texto plano (`{ "to": "...", "message": "..." }`). |
| `POST` | `/send/image` | Envía una imagen con pie de foto opcional (`{ "to": "...", "url": "...", "caption": "..." }`). |
| `POST` | `/webhook/register`| Registra una URL de Webhook receptora (`{ "url": "...", "id": "..." }`). |

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT** — Libre para uso personal, comercial y modificaciones.
