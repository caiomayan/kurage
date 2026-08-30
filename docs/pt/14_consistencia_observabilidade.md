# Consistência transacional e observabilidade

**Estado:** implementado no backend em 27/08/2026. Alertas, dashboards e tracing
distribuído continuam planejados.

## Fonte de verdade e concorrência

PostgreSQL é a fonte transacional. A migração `V9`:

- normaliza inventários legados para o envelope `{items, version}` e o valida
  com `CHECK` no banco;
- adiciona versão otimista ao inventário, impedindo que duas transações gravem
  silenciosamente sobre a mesma versão;
- garante apenas um convite direto e um pedido de entrada pendentes por
  usuário/time, inclusive com múltiplas instâncias da API;
- valida os contadores dos links de convite e corrige registros legados antes
  de ativar as restrições.

Convites, pedidos, limites de vagas, links e mudanças administrativas usam locks
de linha. O consumo do último uso de um link deixa de depender de uma sequência
`ler → incrementar → salvar` desprotegida. Ao detectar concorrência no inventário
ou uma violação de integridade, a API responde `409 Conflict`; ela não retorna um
sucesso falso.

Estados expirados usam uma exceção específica que permite confirmar `EXPIRED` ou
desativar o link antes de responder `410 Gone`. Outras exceções continuam
revertendo integralmente a transação.

## PostgreSQL e Redis

Redis continua sendo cache, presença efêmera, debounce e sessão — nunca a fonte
de verdade dos domínios persistentes. Invalidações de perfil/time e a publicação
dos jogadores do heartbeat são executadas apenas após o commit. Em rollback, o
debounce de visita criado no Redis é liberado. Consultas de time feitas dentro de
uma mutação ignoram o cache para não ler nem publicar uma versão anterior ao
commit.

## Telemetria disponível

- Toda resposta recebe `X-Request-ID`. Um identificador recebido só é preservado
  se usar o formato seguro e limitado; o MDC é sempre limpo ao final.
- Requisições acima de `SLOW_REQUEST_THRESHOLD_MS` (1.000 ms por padrão) geram
  um log estruturado de alerta. O log `INFO` de toda requisição foi removido.
- Exceções inesperadas são registradas pelo logger com stack trace e request ID,
  sem `printStackTrace` nem detalhes internos na resposta.
- Spring Actuator fornece `health`, `info`, `metrics` e `prometheus`. Somente
  `health` é público; os demais endpoints continuam protegidos para
  `ADMIN`/`OWNER`.
- Todas as métricas recebem a tag `application=kurage-api`.

## Próxima camada operacional

Antes da produção pública ainda são necessários Prometheus/Grafana efetivamente
implantados, alertas com SLO, retenção centralizada de logs, backup/restore
ensaiado e runbooks. Este documento afirma instrumentação disponível, não uma
operação 24/7 já montada.
