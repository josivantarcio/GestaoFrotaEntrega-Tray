/**
 * Unitários — src/lib/eventos.ts
 * parsearEvento, gerarMensagem, extrairEventosDoBuffer: puras, sem Electron.
 */

import { describe, it, expect } from "vitest";
import { parsearEvento, gerarMensagem, extrairEventosDoBuffer } from "../src/lib/eventos";

// ── parsearEvento ─────────────────────────────────────────────────

describe("parsearEvento", () => {
  it("parseia JSON válido", () => {
    const raw = JSON.stringify({ tipo: "rota_upserted", tabela: "rotas", payload: { status: "em_andamento" } });
    const evt = parsearEvento(raw);
    expect(evt).not.toBeNull();
    expect(evt?.tipo).toBe("rota_upserted");
  });

  it("retorna null para JSON inválido", () => {
    expect(parsearEvento("nao-e-json")).toBeNull();
    expect(parsearEvento("")).toBeNull();
    expect(parsearEvento("{parcial")).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(parsearEvento("")).toBeNull();
  });
});

// ── gerarMensagem — rota_upserted ─────────────────────────────────

describe("gerarMensagem — rota_upserted", () => {
  it("gera mensagem de Rota Iniciada quando status é em_andamento", () => {
    const msg = gerarMensagem({
      tipo: "rota_upserted",
      tabela: "rotas",
      payload: { status: "em_andamento", motorista: "Carlos", veiculo_placa: "ABC1234", hora_saida: "08:00" },
    });
    expect(msg).not.toBeNull();
    expect(msg?.titulo).toBe("Rota Iniciada");
    expect(msg?.corpo).toContain("Carlos");
    expect(msg?.corpo).toContain("ABC1234");
    expect(msg?.corpo).toContain("08:00");
  });

  it("gera mensagem de Rota Encerrada quando status é concluida", () => {
    const msg = gerarMensagem({
      tipo: "rota_upserted",
      tabela: "rotas",
      payload: { status: "concluida", motorista: "João", hora_chegada: "17:30", km_saida: 1000, km_chegada: 1150 },
    });
    expect(msg?.titulo).toBe("Rota Encerrada");
    expect(msg?.corpo).toContain("17:30");
    expect(msg?.corpo).toContain("150 km");
  });

  it("omite km quando km_chegada é 0", () => {
    const msg = gerarMensagem({
      tipo: "rota_upserted",
      tabela: "rotas",
      payload: { status: "concluida", motorista: "João", hora_chegada: "17:30", km_saida: 0, km_chegada: 0 },
    });
    expect(msg?.corpo).not.toContain("km");
  });

  it("usa fallback 'Motorista' quando motorista está ausente", () => {
    const msg = gerarMensagem({
      tipo: "rota_upserted",
      tabela: "rotas",
      payload: { status: "em_andamento", hora_saida: "08:00" },
    });
    expect(msg?.corpo).toContain("Motorista");
  });

  it("retorna null para status desconhecido", () => {
    const msg = gerarMensagem({
      tipo: "rota_upserted",
      tabela: "rotas",
      payload: { status: "aguardando_saida" },
    });
    expect(msg).toBeNull();
  });

  it("retorna null para tipo de evento desconhecido", () => {
    const msg = gerarMensagem({
      tipo: "outro_evento",
      tabela: "outra",
      payload: {},
    });
    expect(msg).toBeNull();
  });
});

// ── extrairEventosDoBuffer ────────────────────────────────────────

describe("extrairEventosDoBuffer", () => {
  it("extrai JSON de linhas data:", () => {
    const buffer = [
      "event: update",
      'data: {"tipo":"rota_upserted","tabela":"rotas","payload":{}}',
      "",
      'data: {"tipo":"outro","tabela":"t","payload":{}}',
    ].join("\n");

    const eventos = extrairEventosDoBuffer(buffer);
    expect(eventos).toHaveLength(2);
    expect(eventos[0]).toContain("rota_upserted");
  });

  it("ignora linhas sem prefixo data:", () => {
    const buffer = "event: ping\nid: 123\n: comentario\n";
    expect(extrairEventosDoBuffer(buffer)).toHaveLength(0);
  });

  it("retorna array vazio para buffer vazio", () => {
    expect(extrairEventosDoBuffer("")).toHaveLength(0);
  });

  it("remove espaço após 'data: '", () => {
    const buffer = "data:   {\"tipo\":\"x\",\"tabela\":\"t\",\"payload\":{}}";
    const [evt] = extrairEventosDoBuffer(buffer);
    expect(evt.startsWith("{")).toBe(true);
  });
});

// ── Integração: parsear + gerar mensagem ─────────────────────────

describe("fluxo SSE completo", () => {
  it("parseia linha SSE e gera notificação correta", () => {
    const payloadJSON = JSON.stringify({
      tipo: "rota_upserted",
      tabela: "rotas",
      payload: { status: "em_andamento", motorista: "Pedro", veiculo_placa: "XYZ9876", hora_saida: "07:30" },
    });
    const buffer = `event: update\ndata: ${payloadJSON}\n`;

    const [raw] = extrairEventosDoBuffer(buffer);
    const evento = parsearEvento(raw);
    const msg = gerarMensagem(evento!);

    expect(msg?.titulo).toBe("Rota Iniciada");
    expect(msg?.corpo).toContain("Pedro");
    expect(msg?.corpo).toContain("XYZ9876");
  });
});
