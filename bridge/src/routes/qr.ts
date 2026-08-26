import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { BaileysManager } from '../baileys-manager';

/**
 * QR Code & Web Control Hub routes
 */
export function createQRRouter(manager: BaileysManager): Router {
  const router = Router();

  /**
   * GET /qr — Returns QR code as PNG image
   */
  router.get('/', async (req: Request, res: Response) => {
    const qr = manager.getQRCode();
    if (!qr) {
      const status = manager.getStatus();
      if (status.connected) {
        res.status(200).json({
          status: 'connected',
          message: 'Ya autenticado. No se requiere código QR.',
          phoneNumber: status.phoneNumber,
          name: status.name,
        });
      } else {
        res.status(202).json({
          status: 'waiting',
          message: 'Código QR aún no generado o expirado.',
        });
      }
      return;
    }

    try {
      const qrImage = await QRCode.toBuffer(qr, { type: 'png', width: 400, margin: 2 });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.send(qrImage);
    } catch (err) {
      res.status(500).json({ error: 'Error al generar imagen del QR' });
    }
  });

  /**
   * GET /qr/raw — Returns QR string as JSON
   */
  router.get('/raw', (req: Request, res: Response) => {
    const qr = manager.getQRCode();
    if (!qr) {
      res.status(404).json({ qr: null, message: 'No hay código QR disponible' });
      return;
    }
    res.json({ qr });
  });

  /**
   * GET /qr/page — Full Web Control Hub with live console and logout button
   */
  router.get('/page', (req: Request, res: Response) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Gateway - Control Hub</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2325D366'><path d='M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.029-.477-.852-.352-1.428-1.205-1.47-1.263-.043-.058-.352-.468-.352-.892 0-.424.222-.633.301-.72.079-.086.172-.108.23-.108.058 0 .115.001.165.004.053.003.123-.02.193.148.072.172.247.603.269.646.022.043.036.094.007.151-.029.058-.043.094-.086.144-.043.05-.091.112-.13.151-.044.043-.09.09-.039.177.051.086.227.375.488.607.336.298.62.391.708.434.088.043.14.036.192-.023.052-.059.222-.259.281-.346.059-.086.118-.072.199-.043.081.029.516.243.604.287.088.043.147.065.169.101.022.036.022.209-.122.614z'/></svg>">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: radial-gradient(circle at 10% 20%, #0d1b2a 0%, #08121e 50%, #04080e 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
    }

    .header {
      width: 100%;
      max-width: 1080px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-title h1 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #25D366;
      letter-spacing: -0.5px;
    }
    .header-title .badge {
      font-size: 0.75rem;
      background: rgba(37,211,102,0.15);
      color: #25D366;
      padding: 4px 10px;
      border-radius: 999px;
      font-weight: 600;
      border: 1px solid rgba(37,211,102,0.3);
    }

    .grid-container {
      width: 100%;
      max-width: 1080px;
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 20px;
    }

    @media (max-width: 860px) {
      .grid-container {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      padding: 24px;
    }

    .conn-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .conn-card h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 16px;
      align-self: flex-start;
    }

    #qr-wrapper {
      width: 240px;
      height: 240px;
      background: #ffffff;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    #qr-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    #qr-wrapper.hidden {
      display: none;
    }

    .connected-box {
      display: none;
      width: 100%;
      background: rgba(37, 211, 102, 0.08);
      border: 1px solid rgba(37, 211, 102, 0.25);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .connected-box .avatar {
      font-size: 2.2rem;
      margin-bottom: 8px;
    }
    .connected-box .phone {
      font-size: 1.15rem;
      font-weight: 700;
      color: #25D366;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .connected-box .name {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 16px;
      width: 100%;
      justify-content: center;
    }
    .status-badge.connected { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .status-badge.connecting { background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); }
    .status-badge.waiting_qr { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .status-badge.disconnected, .status-badge.error, .status-badge.offline { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

    .btn-logout {
      display: none;
      width: 100%;
      padding: 10px 16px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      margin-bottom: 12px;
    }
    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: #fee2e2;
    }

    .btn-pause {
      width: 100%;
      padding: 9px 14px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .instructions-box {
      width: 100%;
      text-align: left;
      font-size: 0.8rem;
      color: #94a3b8;
      line-height: 1.5;
      background: rgba(0,0,0,0.2);
      padding: 12px;
      border-radius: 8px;
      border-left: 3px solid #25D366;
    }

    .console-card {
      display: flex;
      flex-direction: column;
      height: 600px;
    }

    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .console-header h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .console-actions {
      display: flex;
      gap: 8px;
    }
    .btn-small {
      padding: 5px 10px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      color: #94a3b8;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-small:hover {
      background: rgba(255,255,255,0.12);
      color: #fff;
    }

    .console-logs {
      flex: 1;
      background: #020617;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 14px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .empty-logs {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      font-style: italic;
    }

    .log-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      background: rgba(255,255,255,0.02);
      line-height: 1.4;
    }

    .log-time {
      color: #64748b;
      font-size: 0.75rem;
      white-space: nowrap;
      padding-top: 2px;
    }
    .log-tag {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .log-tag.incoming { background: rgba(59,130,246,0.2); color: #60a5fa; }
    .log-tag.outgoing { background: rgba(34,197,94,0.2); color: #4ade80; }
    .log-tag.system { background: rgba(168,85,247,0.2); color: #c084fc; }
    .log-tag.error { background: rgba(239,68,68,0.2); color: #f87171; }

    .log-body {
      flex: 1;
      word-break: break-word;
    }
    .log-body .actor {
      font-weight: 600;
      color: #94a3b8;
      margin-right: 6px;
    }
    .log-body .text {
      color: #f1f5f9;
    }

    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: currentColor;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-title">
      <h1>📱 WhatsApp Baileys Hub</h1>
      <span class="badge">n8n Integration</span>
    </div>
    <div id="live-indicator" style="display:flex; align-items:center; gap:6px; font-size:0.8rem; color:#4ade80;">
      <span style="width:8px; height:8px; background:#4ade80; border-radius:50%; box-shadow:0 0 8px #4ade80;"></span>
      En Vivo
    </div>
  </div>

  <!-- Main Grid -->
  <div class="grid-container">

    <!-- Left Column: QR & Status -->
    <div class="card conn-card">
      <h2>Estado de Conexión</h2>

      <div id="qr-wrapper">
        <img id="qr-img" src="/qr" alt="Código QR WhatsApp" onerror="this.style.display='none'">
      </div>

      <div id="connected-box" class="connected-box">
        <div class="avatar">📱</div>
        <div class="phone" id="user-phone">Conectado</div>
        <div class="name" id="user-name">Sesión Activa</div>
      </div>

      <div id="status-badge" class="status-badge disconnected">
        <span class="spinner"></span> Conectando con el servidor...
      </div>

      <button id="btn-logout" class="btn-logout" onclick="handleLogout()">
        🔴 Cerrar Sesión / Desvincular
      </button>

      <div id="instructions" class="instructions-box">
        <strong>Vincular Dispositivo:</strong><br>
        1. Abre <strong>WhatsApp</strong> en tu teléfono.<br>
        2. Ve a <strong>Configuración / Ajustes → Dispositivos vinculados</strong>.<br>
        3. Toca <strong>Vincular un dispositivo</strong> y escanea el código QR.
      </div>

      <!-- Webhook Destination Configuration Card -->
      <div style="width:100%; margin-top:20px; text-align:left; border-top:1px solid rgba(255,255,255,0.08); padding-top:16px;">
        <h3 style="font-size:0.95rem; color:#f8fafc; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          🔗 Webhook Destino (n8n)
        </h3>
        <p style="font-size:0.8rem; color:#94a3b8; margin-bottom:10px;">
          Pega la URL de tu n8n (Local, VPS o n8n Cloud) donde enviarás los mensajes entrantes:
        </p>
        <div style="display:flex; gap:6px; margin-bottom:8px;">
          <input id="input-webhook" type="text" placeholder="http://localhost:5678/webhook/whatsapp-trigger" style="flex:1; background:#020617; border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:8px 12px; font-size:0.82rem; color:#fff; font-family:monospace;">
          <button class="btn-small" style="background:#25D366; color:#000; font-weight:700; border:none;" onclick="handleSaveWebhook()">Guardar</button>
        </div>
        <div id="webhook-feedback" style="font-size:0.78rem; color:#64748b; margin-bottom:12px;"></div>

        <!-- Pause / Resume forwarding toggle button -->
        <button id="btn-toggle-pause" class="btn-pause" onclick="handleTogglePause()" style="background:rgba(234,179,8,0.15); color:#facc15; border:1px solid rgba(234,179,8,0.3);">
          ⏸️ Pausar Reenvío a n8n
        </button>
      </div>
    </div>

    <!-- Right Column: Live Activity Feed Console -->
    <div class="card console-card">
      <div class="console-header">
        <h2>📊 Monitor de Mensajes en Vivo</h2>
        <div class="console-actions">
          <button class="btn-small" onclick="clearLocalLogs()">Limpiar Vista</button>
        </div>
      </div>

      <div id="console-logs" class="console-logs">
        <div class="empty-logs">
          <span>⏳ Esperando actividad...</span>
        </div>
      </div>
    </div>

  </div>

  <script>
    let isConnected = false;
    let renderedLogIds = new Set();
    let isPausedState = false;

    async function updateStatus() {
      const qrWrapper = document.getElementById('qr-wrapper');
      const qrImg = document.getElementById('qr-img');
      const connBox = document.getElementById('connected-box');
      const statusBadge = document.getElementById('status-badge');
      const btnLogout = document.getElementById('btn-logout');
      const instructions = document.getElementById('instructions');
      const userPhone = document.getElementById('user-phone');
      const userName = document.getElementById('user-name');

      try {
        const res = await fetch('/status');
        const data = await res.json();
        const state = data.state || (data.connected ? 'connected' : 'disconnected');

        statusBadge.className = 'status-badge ' + state;
        statusBadge.innerHTML = (state === 'connecting' ? '<span class="spinner"></span> ' : '') + (data.statusMessage || 'Estado desconocido');

        updatePauseButton(Boolean(data.isWebhooksPaused));

        if (state === 'connected') {
          isConnected = true;
          qrWrapper.className = 'hidden';
          connBox.style.display = 'block';
          btnLogout.style.display = 'flex';
          instructions.style.display = 'none';
          userPhone.textContent = data.phoneNumber ? ('+' + data.phoneNumber) : 'Conectado';
          userName.textContent = data.name || 'WhatsApp Web Activo';
        } else if (state === 'waiting_qr') {
          isConnected = false;
          qrWrapper.className = '';
          connBox.style.display = 'none';
          btnLogout.style.display = 'none';
          instructions.style.display = 'block';
          qrImg.src = '/qr?t=' + Date.now();
          qrImg.style.display = 'block';
        } else {
          isConnected = false;
          qrWrapper.className = 'hidden';
          connBox.style.display = 'none';
          btnLogout.style.display = 'none';
          instructions.style.display = 'block';
        }
      } catch (e) {
        statusBadge.className = 'status-badge offline';
        statusBadge.textContent = '❌ Servidor Bridge no responde';
      }
    }

    function updatePauseButton(isPaused) {
      isPausedState = isPaused;
      const btn = document.getElementById('btn-toggle-pause');
      if (!btn) return;
      if (isPaused) {
        btn.innerHTML = '▶️ Reanudar Reenvío a n8n';
        btn.style.background = 'rgba(34,197,94,0.15)';
        btn.style.color = '#4ade80';
        btn.style.borderColor = 'rgba(34,197,94,0.3)';
      } else {
        btn.innerHTML = '⏸️ Pausar Reenvío a n8n';
        btn.style.background = 'rgba(234,179,8,0.15)';
        btn.style.color = '#facc15';
        btn.style.borderColor = 'rgba(234,179,8,0.3)';
      }
    }

    async function handleTogglePause() {
      const btn = document.getElementById('btn-toggle-pause');
      btn.disabled = true;
      try {
        const res = await fetch('/webhook/toggle-pause', { method: 'POST' });
        const data = await res.json();
        updatePauseButton(data.isPaused);
      } catch (err) {
        alert('Error al cambiar pausa: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    }

    async function updateActivity() {
      const consoleBox = document.getElementById('console-logs');
      try {
        const res = await fetch('/activity');
        const data = await res.json();
        const logs = data.logs || [];

        if (logs.length === 0) return;

        if (consoleBox.querySelector('.empty-logs')) {
          consoleBox.innerHTML = '';
        }

        for (let i = logs.length - 1; i >= 0; i--) {
          const log = logs[i];
          if (renderedLogIds.has(log.id)) continue;
          renderedLogIds.add(log.id);

          const div = document.createElement('div');
          div.className = 'log-item';

          let tagLabel = 'SISTEMA';
          let tagClass = 'system';
          if (log.type === 'incoming') { tagLabel = '📩 ENTRANTE'; tagClass = 'incoming'; }
          else if (log.type === 'outgoing') { tagLabel = '🤖 BOT'; tagClass = 'outgoing'; }
          else if (log.type === 'error') { tagLabel = '⚠️ ERROR'; tagClass = 'error'; }

          const sender = log.senderName ? (log.senderName + ' (' + log.fromOrTo + ')') : log.fromOrTo;

          let timeStr = log.timestamp;
          try {
            const d = new Date(log.timestamp);
            if (!isNaN(d.getTime())) {
              timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            }
          } catch (err) {}

          div.innerHTML = '<span class="log-time">' + timeStr + '</span>' +
            '<span class="log-tag ' + tagClass + '">' + tagLabel + '</span>' +
            '<div class="log-body">' +
              '<span class="actor">' + escapeHtml(sender) + ':</span>' +
              '<span class="text">' + escapeHtml(log.content) + '</span>' +
            '</div>';

          consoleBox.appendChild(div);
          consoleBox.scrollTop = consoleBox.scrollHeight;
        }
      } catch (e) {
        // Ignore
      }
    }

    async function handleLogout() {
      if (!confirm('¿Estás seguro de que deseas cerrar la sesión de WhatsApp?\\n\\nSe eliminarán las credenciales actuales y se generará un nuevo código QR para vincular otra cuenta.')) {
        return;
      }

      const btnLogout = document.getElementById('btn-logout');
      btnLogout.disabled = true;
      btnLogout.innerHTML = '<span class="spinner"></span> Cerrando sesión...';

      try {
        const res = await fetch('/logout', { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'Sesión cerrada correctamente.');
        await updateStatus();
      } catch (e) {
        alert('Error al cerrar sesión: ' + e.message);
      } finally {
        btnLogout.disabled = false;
        btnLogout.innerHTML = '🔴 Cerrar Sesión / Desvincular';
      }
    }

    function clearLocalLogs() {
      document.getElementById('console-logs').innerHTML = '<div class="empty-logs"><span>⏳ Vista limpiada. Esperando nueva actividad...</span></div>';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function loadCurrentWebhook() {
      try {
        const res = await fetch('/webhook');
        const list = await res.json();
        const input = document.getElementById('input-webhook');
        const feedback = document.getElementById('webhook-feedback');
        if (list && list.length > 0) {
          input.value = list[0].url;
          feedback.innerHTML = '<span style="color:#4ade80;">✓ Activo: ' + escapeHtml(list[0].url) + '</span>';
        }
      } catch (e) {
        // Ignore
      }
    }

    async function handleSaveWebhook() {
      const input = document.getElementById('input-webhook');
      const feedback = document.getElementById('webhook-feedback');
      const url = (input.value || '').trim();

      if (!url) {
        alert('Por favor ingresa una URL válida (ej: http://localhost:5678/webhook/whatsapp-trigger o tu URL de n8n cloud)');
        return;
      }

      feedback.innerHTML = '<span class="spinner"></span> Guardando webhook...';

      try {
        const res = await fetch('/webhook/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'n8n-webhook',
            url: url,
            events: ['*']
          })
        });
        const data = await res.json();
        if (data.success) {
          feedback.innerHTML = '<span style="color:#4ade80;">✓ Guardado con éxito: ' + escapeHtml(url) + '</span>';
        } else {
          feedback.innerHTML = '<span style="color:#f87171;">Error al guardar webhook</span>';
        }
      } catch (e) {
        feedback.innerHTML = '<span style="color:#f87171;">Error de conexión: ' + escapeHtml(e.message) + '</span>';
      }
    }

    updateStatus();
    updateActivity();
    loadCurrentWebhook();
    setInterval(updateStatus, 2500);
    setInterval(updateActivity, 1500);
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  return router;
}
