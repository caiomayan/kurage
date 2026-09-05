# Plano Maré

[English version](../en/12_mare_membership.md)

**Estado:** contrato de produto e entitlements implementados; cobrança planejada.  
**Última validação:** 31/08/2026.

## Proposta

Maré é a única assinatura mensal da Kurage. Ela pertence ao passaporte do
usuário e atravessa todos os modos, servidores e recursos atuais ou futuros da
plataforma. Não é um plano de Retake e não concede vantagem competitiva.

## Identidade visual

- nome comercial: **Maré**;
- cor: **Coral Vivo `#FF4D6D`**;
- o frontend troca o acento Sea Glass padrão pelo Coral Vivo enquanto o usuário
  autenticado possui uma assinatura Maré válida;
- verde continua reservado a sucesso e vermelho semântico continua reservado a
  erro/perigo, evitando que o tema prejudique a compreensão da interface;
- selo Maré aparece no perfil, hovercard e menu da conta;
- `isVerifiedPro` e o selo profissional dourado são independentes e não podem ser
  comprados.

## Benefícios definidos

1. identidade Maré: tema Coral Vivo e selo exclusivo;
2. visão ampliada: visitantes do perfil, histórico, estatísticas e filtros
   avançados conforme cada tela for disponibilizada;
3. prioridade global: prioridade em filas de servidores oficiais, sem expulsar
   jogadores ativos;
4. acesso antecipado a novos modos e experiências.

O rastreamento de visitas já existe no PostgreSQL e a API atual permite a um
Maré/Admin/Dono consultar até 20 visitantes do **próprio** perfil. O quadro visual
e a consulta autorizada dos visitantes de outro perfil ainda estão planejados no
[plano de evolução](./19_plano_evolucao_identidade_rating_perfil.md); usuários
sem entitlement nunca devem receber identidades ou horários dessa lista.

Maré nunca altera dano, economia, equipamentos, matchmaking por habilidade ou o
resultado de uma partida. Benefícios futuros precisam respeitar essa regra.

## Contrato técnico atual

O backend aceita apenas `FREE` e `MARE`. As permissões Maré são `MARE_BADGE`,
`PROFILE_VISITORS`, `ADVANCED_STATS`, `RANKING_FILTERS`, `SERVER_PRIORITY`,
`PROFILE_HIGHLIGHT` e `EARLY_ACCESS`. Uma assinatura expirada é exposta como
`FREE`, mesmo antes da conciliação persistir a mudança.

A migração `V8__single_mare_subscription_tier.sql` converte registros legados
`PLUS`, `PRO` e `MAX` para `MARE` e restringe novos valores no PostgreSQL.

## Limite antes da cobrança

Preço, checkout, webhook idempotente, renovação, cancelamento, reembolso,
conciliação e portal do assinante ainda não existem. Nenhum botão deve simular
uma compra concluída. O gateway será integrado em uma etapa separada e somente o
backend poderá ativar ou expirar a assinatura.
