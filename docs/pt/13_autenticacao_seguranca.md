# Autenticação, sessão e fronteira de confiança

> **Estado: implementado e validado em 29/08/2026.** A validação compreendeu 157
> testes unitários e 21 integrações com PostgreSQL/Redis reais, além das
> validações anteriores do frontend e do Caddyfile.

[← Índice](./00_index.md)

## Login Steam

1. `GET /auth/steam` sanitiza a rota interna de retorno.
2. A API cria 256 bits aleatórios, guarda `state → returnUrl` por 10 minutos no
   Redis e envia o mesmo state em cookie HttpOnly/Secure/SameSite=Lax.
3. O `return_to` assinado pelo Steam contém somente esse state.
4. O callback exige igualdade em tempo constante entre query e cookie e consome
   a chave Redis com `GETDEL`; expiração, repetição e troca de navegador falham.
5. Namespace, endpoint do provedor, modo, `return_to`, identity/claimed ID,
   assinatura e nonce OpenID são validados antes de consultar o Steam.
6. A confirmação `check_authentication` possui timeouts e aceita apenas a linha
   exata `is_valid:true`. Parâmetros e assinaturas não são registrados em log.

A API não cria mais perfil fictício quando `STEAM_API_KEY` ou a Steam Web API
estão indisponíveis. O login falha de forma visível sem persistir identidade
artificial.

## Sessão

- JWT de acesso: HMAC, issuer `kurage-api`, duração de 15 minutos e memória
  volátil no frontend.
- Refresh token: 256 bits, cookie HttpOnly/Secure/SameSite=Lax e vínculo ao
  `device_id`.
- Redis guarda somente SHA-256 do refresh token nas chaves e famílias. O token
  sucessor existe em texto apenas no valor de grace por no máximo 10 segundos,
  necessário para convergir refreshes simultâneos de abas diferentes.
- A rotação é um compare-and-set Lua: concorrentes recebem exatamente o token
  publicado pelo vencedor durante uma tolerância de 10 segundos.
- A família possui vida absoluta de 30 dias; rotações não renovam esse prazo.
- Reúso após a tolerância ou divergência de dispositivo revoga a família.
- O frontend tenta refresh somente após `401`. Um `403` representa autorização
  negada e não altera uma sessão saudável.
- `apiFetch` aceita caminhos relativos ou URL absoluta da origem configurada da
  API; bearer e cookies nunca são enviados por esse cliente a outra origem.
- O JWT carrega a identidade, mas não é fonte autoritativa para privilégios. Em
  cada requisição, a API confere UUID + Steam ID e relê papel e `account_status`
  no PostgreSQL. Claim de papel antigo ou adulterado não concede acesso.
- Contas `SUSPENDED` deixam de autenticar imediatamente, não conseguem rotacionar
  refresh token nem iniciar uma nova sessão Steam. A família apresentada no
  refresh é revogada e o cookie é expirado.

**Impacto de implantação:** tokens emitidos antes desta mudança usavam chaves
legíveis no Redis e não serão encontrados pelo novo formato hash. O primeiro
deploy encerra as sessões anteriores uma única vez e exige novo login Steam.

## Cookies, CORS e CSRF

`COOKIE_DOMAIN` deve permanecer vazio em produção. Isso cria cookies host-only no
domínio da API e impede que outro subdomínio sobrescreva estado de autenticação.
O CORS aceita somente `FRONTEND_URL` e origens adicionais explícitas. Como
`/auth/refresh` e `/auth/logout` dependem de cookie, requisições POST a essas rotas
também exigem um header `Origin` pertencente a essa allowlist.

As demais mutações usam bearer JWT e continuam protegidas por autenticação e
autorização no backend; a existência de uma página autenticada nunca substitui
essas verificações.

## IP real e rate limiting

Caddy é a fronteira de confiança. Ele remove `Forwarded` e `X-Real-IP`, aceita
`CF-Connecting-IP` somente quando o peer pertence às faixas oficiais da
Cloudflare e envia ao Spring um único `X-Forwarded-For` normalizado. Controllers
e interceptors usam apenas `request.getRemoteAddr()` já processado pelo Spring.

O contador Redis usa Lua para executar `INCR` e `EXPIRE` atomicamente. Leituras
públicas mantêm fail-open para disponibilidade. Autenticação, mutação de
inventário, convites e solicitações falham fechado se o Redis não puder aplicar
o limite.

As faixas Cloudflare no `Caddyfile` devem ser comparadas periodicamente com
`https://www.cloudflare.com/ips-v4` e `https://www.cloudflare.com/ips-v6`. O
origin deve permanecer inacessível diretamente pela internet; no Compose, apenas
Caddy publica portas.

## Limitações restantes

- API/painel operacional para suspender e reativar contas (o estado persistido e
  a revogação imediata já estão implementados);
- audit log durável para login, sessão e ações privilegiadas;
- rotação operacional de segredos sem indisponibilidade;
- teste de contrato/sandbox com a Steam real no pipeline de release;
- alta disponibilidade do Redis e alertas de falha fechada.
