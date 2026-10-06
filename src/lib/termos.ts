export const TERMOS_VERSAO = "1.1";

export const TERMOS_TITULO = "Termos de uso — locadoras";

export const TERMOS_RESUMO: Array<{ titulo: string; texto: string }> = [
  {
    titulo: "Finalidade",
    texto:
      "O Histórico registra ocorrências de locação (danos, atrasos, uso indevido) para consulta interna da sua locadora e, quando confirmado com confiança alta, para cruzamento na rede de locadoras parceiras.",
  },
  {
    titulo: "Papel das partes",
    texto:
      "A locadora parceira é controladora dos dados do seu cadastro e do fluxo operacional. O desenvolvedor atua como operador, nos termos da LGPD (Lei 13.709/2018), conforme ADR 0004.",
  },
  {
    titulo: "Quem pode ver o quê",
    texto:
      "Cada locadora vê apenas os próprios incidentes. O superadmin não lê motoristas nem incidentes: só aprova locadoras e decide recursos de contestação. Anexos nunca saem da pasta da locadora dona.",
  },
  {
    titulo: "Retenção e purge",
    texto:
      "Incidentes em suspeita não confirmados em 30 dias são apagados automaticamente. Registros confirmados ou contestados são apagados 5 anos após o registro, com seus anexos e contestações. A trilha de auditoria guarda só o fato (ação, data, autor), sem placa, descrição nem dados do motorista.",
  },
  {
    titulo: "Contestação pelo titular",
    texto:
      "O motorista pode contestar em /contestar confirmando CPF e data de nascimento (por isso a data é obrigatória no cadastro do motorista). A contestação suspende a visibilidade na rede até a decisão da locadora (15 dias úteis) ou do superadmin (recurso). Contestação julgada improcedente não reabre pelo canal público.",
  },
  {
    titulo: "Prova e auditoria",
    texto:
      "Consultas, mudanças de estado e decisões ficam em logs append-only (audit_log e consulta_log). Anexos guardam hash SHA-256 para provar integridade.",
  },
  {
    titulo: "Aceite",
    texto:
      "Ao cadastrar a locadora você declara ter lido estes termos (versão " + TERMOS_VERSAO + "). O aceite fica gravado com data, versão e usuário. O texto completo orientativo está em docs/juridico/termos-locadora-v1.md e deve ser revisado por advogado.",
  },
];
