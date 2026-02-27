# RouteLog — Tray App

Aplicativo de bandeja do sistema (system tray) para receber notificações em tempo real das operações de entrega do RouteLog. Conecta-se à retaguarda via Server-Sent Events (SSE) e exibe notificações nativas do sistema operacional quando rotas são iniciadas ou encerradas.

**Desenvolvido por Josevan Oliveira — JTarcio Softhouse**

---

## Funcionalidades

- Ícone na bandeja do sistema (próximo ao relógio)
- Notificação nativa do SO ao iniciar uma rota
- Notificação nativa do SO ao encerrar uma rota (com KM percorridos)
- Clique na notificação abre o dashboard no navegador
- Reconexão automática ao servidor a cada 7 segundos se a conexão cair
- Auto-launch: inicia automaticamente junto com o sistema operacional
- Menu de contexto: Abrir Dashboard / Sair

---

## Stack

| Tecnologia | Uso |
|---|---|
| Electron 33 | Framework desktop |
| TypeScript | Linguagem |
| Node.js `http`/`https` | Conexão SSE nativa (sem biblioteca extra) |
| auto-launch | Inicialização automática com o SO |
| electron-builder | Geração de instaladores |

---

## Instalação completa (recomendado)

Use os scripts de instalação da [Retaguarda](https://github.com/josivantarcio/GestaoFrotaEntrega-Retaguarda) — eles instalam Docker, Node.js, sobem a Retaguarda **e** configuram o Tray com auto-start nativo do SO, tudo de uma vez.

> Os scripts ficam na pasta `logistica-retaguarda/` e precisam que `logistica-retaguarda` e `logistica-tray` estejam lado a lado no mesmo diretório.

**Linux** (Ubuntu, Debian, Fedora, Arch):
```bash
chmod +x install.sh && ./install.sh
```
Auto-start via `.desktop` em `~/.config/autostart`.

**macOS** (Monterey 12+):
```bash
chmod +x install-mac.sh && ./install-mac.sh
```
Auto-start via **LaunchAgent** em `~/Library/LaunchAgents`.

**Windows** (10/11):
```
# Double-click em install.bat  (solicita Admin automaticamente)
```
Auto-start via **Task Scheduler** no logon do usuário.

---

## Pré-requisitos (instalação manual)

- Node.js 18+
- Retaguarda RouteLog rodando e acessível

---

## Instalação manual

```bash
npm install
npm run build
```

---

## Executar manualmente

### Linux
```bash
ROUTELOG_DASHBOARD_URL="http://localhost:3000/dashboard" \
ROUTELOG_SSE_URL="http://localhost:3000/api/events" \
npm start
```

### macOS
```bash
ROUTELOG_DASHBOARD_URL="http://localhost:3000/dashboard" \
ROUTELOG_SSE_URL="http://localhost:3000/api/events" \
npm start
```

### Windows
```cmd
set ROUTELOG_DASHBOARD_URL=http://192.168.1.100:3000/dashboard
set ROUTELOG_SSE_URL=http://192.168.1.100:3000/api/events
npm start
```

O ícone aparecerá na bandeja do sistema. No Linux, pode ser necessário instalar a extensão `gnome-shell-extension-appindicator` para exibir ícones de tray no GNOME.

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `ROUTELOG_DASHBOARD_URL` | `http://routelog.duckdns.org:3000` | URL aberta ao clicar no ícone ou na notificação |
| `ROUTELOG_SSE_URL` | `http://routelog.duckdns.org:3000/api/events` | Endpoint SSE da retaguarda |

---

## Gerar instalador

### Linux (AppImage)
```bash
npm run dist:linux
```

### Windows (.exe com instalador NSIS)
```bash
npm run dist:win
```

Os arquivos gerados ficam na pasta `release/`.

### Ícones necessários

| Arquivo | Tamanho | Plataforma |
|---|---|---|
| `assets/icon.png` | 32×32 px | Linux |
| `assets/icon.ico` | multi-resolução | Windows |

---

## Como funciona

```
[App Mobile RouteLog]
        │ POST /api/sync/rota
        ▼
[Retaguarda Next.js]
        │ broadcast SSE
        ▼
[RouteLog Tray — conectado via SSE]
        │ recebe evento "rota_upserted"
        ▼
[Notificação nativa do SO]
  "Rota Iniciada — João · ABC-1234 saiu às 08:00"
        │ clique na notificação
        ▼
[Abre dashboard no navegador]
```

O Tray mantém uma conexão SSE permanente com a retaguarda. Se a conexão cair (servidor reiniciado, rede instável), reconecta automaticamente após 7 segundos.

---

## Estrutura do projeto

```
src/
  main.ts          # Lógica principal: tray, SSE, notificações, auto-launch
assets/
  icon.png         # Ícone do tray (Linux)
  icon.ico         # Ícone do tray (Windows)
dist/
  main.js          # Compilado TypeScript (gerado por npm run build)
```

---

## Projetos relacionados

- **[RouteLog App Mobile](https://github.com/josivantarcio/GestaoFrotaEntrega)** — app Android que gera os eventos
- **[RouteLog Retaguarda](https://github.com/josivantarcio/GestaoFrotaEntrega-Retaguarda)** — servidor que distribui os eventos via SSE

---

## Licença

Uso interno — JTarcio Softhouse.
