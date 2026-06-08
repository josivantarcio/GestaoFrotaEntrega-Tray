// Lógica pura de parsing e geração de mensagens de notificação.
// Separada do Electron para permitir testes unitários sem dependências nativas.

export type TipoEvento = "rota_upserted";

export interface EventoSSE {
  tipo: TipoEvento | string;
  tabela: string;
  payload: Record<string, unknown>;
}

export interface MensagemNotificacao {
  titulo: string;
  corpo: string;
}

export function parsearEvento(raw: string): EventoSSE | null {
  try {
    return JSON.parse(raw) as EventoSSE;
  } catch {
    return null;
  }
}

export function gerarMensagem(evento: EventoSSE): MensagemNotificacao | null {
  const p = evento.payload ?? {};

  if (evento.tipo === "rota_upserted") {
    const status = p.status as string;
    const motorista = (p.motorista as string) || "Motorista";
    const placa = (p.veiculo_placa as string) || "";
    const hora_saida = (p.hora_saida as string) || "";
    const hora_chegada = (p.hora_chegada as string) || "--";

    if (status === "em_andamento") {
      return {
        titulo: "Rota Iniciada",
        corpo: `${motorista} saiu com ${placa} às ${hora_saida}`,
      };
    }

    if (status === "concluida") {
      const km_saida = (p.km_saida as number) || 0;
      const km_chegada = (p.km_chegada as number) || 0;
      const km = km_chegada > 0 ? ` · ${(km_chegada - km_saida).toFixed(0)} km` : "";
      return {
        titulo: "Rota Encerrada",
        corpo: `${motorista} chegou às ${hora_chegada}${km}`,
      };
    }
  }

  return null;
}

// Extrai eventos de um buffer SSE, retornando os JSONs de linhas "data: ..."
export function extrairEventosDoBuffer(buffer: string): string[] {
  return buffer
    .split("\n")
    .filter((linha) => linha.startsWith("data: "))
    .map((linha) => linha.slice(6).trim())
    .filter(Boolean);
}
