# Kurage Web

Aplicação web do Kurage, construída com Next.js 16, React 19 e TypeScript.
Consulte o [README principal](../README.md) e a
[auditoria do frontend](../docs/pt/08_auditoria_estado_atual.md) antes de tratar uma
tela como capacidade comercial concluída.

## Estado

Alfa técnica. Build e 19 testes unitários passam; o lint ainda falha com 85 erros e
86 warnings. Billing, dashboard de servidores, páginas de times e o fluxo E2E de
partida/ELO ainda não existem.

Rotas atuais:

- `/` — marketing e cards de preços sem checkout;
- `/auth/callback` — conclusão da sessão Steam;
- `/inventory` — simulador de inventário/loadout virtual;
- `/mar` — telemetria pública de servidor;
- `/ranking` — ranking de jogadores e times;
- `/player/[kurageId]` e `/player/[kurageId]/[slug]` — perfil público;
- `/settings` — perfil e integrações;
- duas Route Handlers de proxy para inventário/equipados.

## Desenvolvimento

```powershell
Copy-Item .env.local.example .env.local
npm ci
npm run dev
```

O backend deve responder em `http://localhost:8080`. Variáveis públicas:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Qualidade

```powershell
npm test
npm run lint
npm run build
```

O gate de produção exige teste, lint e build aprovados separadamente. Não use a
aprovação do build para ignorar a dívida do ESLint.

## Restrições de produto

- O access token fica apenas em memória; refresh usa cookie HttpOnly do backend.
- Autorização e entitlements devem ser decididos no backend.
- O inventário é virtual, sem valor monetário, prêmio ou cash-out.
- Estados ausentes/indisponíveis não podem ser exibidos como números simulados.
- Imagens de jogo precisam de registro de direitos e otimização antes de publicação.

O código desta pasta está sob a [licença proprietária Kurage](../LICENSE).

