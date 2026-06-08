import { app, Tray, Menu, shell, Notification, nativeImage } from "electron";
import * as http from "http";
import * as https from "https";
import * as path from "path";
import AutoLaunch from "auto-launch";
import { parsearEvento, gerarMensagem, extrairEventosDoBuffer } from "./lib/eventos";

// ── Configuração ─────────────────────────────────────────────────
const DASHBOARD_URL =
  process.env.ROUTELOG_DASHBOARD_URL ?? "http://routelog.duckdns.org:3000/dashboard";
const SSE_URL =
  process.env.ROUTELOG_SSE_URL ?? "http://routelog.duckdns.org:3000/api/events";

// ── Singleton: evitar múltiplas instâncias ───────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// ── Variáveis globais ────────────────────────────────────────────
let tray: Tray | null = null;
let sseRequest: http.ClientRequest | null = null;
let reconectarTimeout: NodeJS.Timeout | null = null;
let appPronto = false;
let quitting = false;

// ── Auto-launch ──────────────────────────────────────────────────
const autoLauncher = new AutoLaunch({
  name: "RouteLog",
  path: app.getPath("exe"),
});

// ── Auto-launch: garantir habilitado ─────────────────────────────
async function garantirAutoLaunch() {
  try {
    const habilitado = await autoLauncher.isEnabled();
    if (!habilitado) await autoLauncher.enable();
  } catch {
    // auto-launch pode falhar em ambientes sem desktop — ignora
  }
}

// ── Abrir dashboard ──────────────────────────────────────────────
function abrirDashboard() {
  shell.openExternal(DASHBOARD_URL).catch(() => {});
}

// ── Notificação nativa ───────────────────────────────────────────
function notificar(titulo: string, corpo: string) {
  if (!Notification.isSupported()) return;
  const notif = new Notification({ title: titulo, body: corpo, silent: false });
  notif.on("click", abrirDashboard);
  notif.show();
}

// ── Processar evento SSE ─────────────────────────────────────────
function processarEvento(raw: string) {
  const evento = parsearEvento(raw);
  if (!evento) return;
  const msg = gerarMensagem(evento);
  if (msg) notificar(msg.titulo, msg.corpo);
}

// ── SSE: conectar ao servidor ────────────────────────────────────
function conectarSSE() {
  if (reconectarTimeout) {
    clearTimeout(reconectarTimeout);
    reconectarTimeout = null;
  }

  const parsedUrl = new URL(SSE_URL);
  const proto = parsedUrl.protocol === "https:" ? https : http;

  const options: http.RequestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
  };

  sseRequest = proto.request(options, (res) => {
    if (res.statusCode !== 200) {
      agendarReconexao();
      return;
    }

    let buffer = "";

    res.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const linhas = buffer.split("\n");
      buffer = linhas.pop() ?? "";

      extrairEventosDoBuffer(linhas.join("\n")).forEach(processarEvento);
    });

    res.on("end", agendarReconexao);
    res.on("error", agendarReconexao);
  });

  sseRequest.on("error", agendarReconexao);
  sseRequest.end();
}

function agendarReconexao() {
  sseRequest = null;
  if (!quitting) {
    reconectarTimeout = setTimeout(conectarSSE, 7_000);
  }
}

// ── Criar Tray ───────────────────────────────────────────────────
function criarTray() {
  const iconPath = path.join(__dirname, "..", "assets", "icon.png");
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 22, height: 22 }));
  tray.setToolTip("RouteLog — monitoramento em tempo real");

  const menu = Menu.buildFromTemplate([
    {
      label: "Abrir Dashboard",
      click: abrirDashboard,
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", abrirDashboard);
}

// ── App ready ────────────────────────────────────────────────────
app.whenReady().then(() => {
  appPronto = true;

  // Não mostrar na dock/taskbar — apenas tray
  if (app.dock) app.dock.hide();

  criarTray();
  garantirAutoLaunch();
  conectarSSE();
});

app.on("window-all-closed", () => {
  // Manter rodando em background — só encerra via menu "Sair"
});

app.on("before-quit", () => {
  quitting = true;
  if (reconectarTimeout) clearTimeout(reconectarTimeout);
  sseRequest?.destroy();
});
