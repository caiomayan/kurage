# Operação, recuperação e gate de release

**Estado:** infraestrutura web da alfa privada operacional; procedimentos de
release público ainda precisam ser executados. **Última validação:** 31/08/2026.

## Decisão de lançamento

O primeiro release é uma **alfa técnica fechada e gratuita**, com um servidor
Retake fixo. Não é produção comercial: Maré permanece sem preço e sem checkout.
Cobrança só pode começar após billing, suporte e documentos jurídicos revisados
funcionarem de ponta a ponta.

## Topologia inicial

- frontend Next.js em host gerenciado;
- Caddy como único ponto público da API (`80/443`);
- API, PostgreSQL e Redis na rede privada do Compose;
- PostgreSQL como fonte de verdade;
- Redis como estado efêmero de sessão, rate limit e presença;
- R2 para mídia; servidor CS2 separado com credencial individual;
- segredos injetados pelo ambiente, nunca pelo repositório.

O Compose de produção já exige os segredos essenciais, mantém PostgreSQL e Redis
sem portas públicas, autentica Redis e possui healthchecks. O firewall da VPS
deve liberar somente SSH administrativo restrito, HTTP/HTTPS e as portas
estritamente necessárias do CS2.

## Backup e recuperação

Meta inicial da alfa: **RPO de 24 horas** e **RTO de 4 horas**.

1. executar diariamente `pg_dump --format=custom` dentro do container `db`;
2. cifrar e copiar o arquivo para destino externo à VPS;
3. gerar SHA-256, registrar data, versão da aplicação e versão máxima do Flyway;
4. manter 7 backups diários, 4 semanais e 6 mensais;
5. habilitar versionamento/lifecycle no bucket de mídia;
6. não tratar Redis como backup: sessões podem ser encerradas após desastre;
7. mensalmente restaurar o dump em banco isolado, iniciar uma API da mesma versão
   e validar migrations, login técnico, contagens e leitura de inventário;
8. nunca testar `pg_restore --clean` no banco de produção.

Um backup só é considerado válido após restore comprovado. Credenciais e arquivos
de dump não entram no Git; o operador registra resultado, duração e checksum do
ensaio em local privado.

## Deploy e rollback

Antes do deploy:

- tag/commit identificável e imagem imutável;
- lint, testes, build, integração Postgres/Redis e scan de segredos verdes;
- migrations revisadas como forward-only e backup recente verificado;
- configuração de domínio, CORS, cookies, R2 e credencial do servidor conferida;
- smoke em staging para login Steam, perfil, inventário e heartbeat.

Depois do deploy, validar `/actuator/health`, taxa de erro, latência, login,
ranking vazio/indisponível, upload e heartbeat. Para rollback, retornar à imagem
anterior. Migration destrutiva exige uma release separada e plano explícito de
compatibilidade; rollback de binário não desfaz schema automaticamente.

## Monitoramento e incidentes

Alertas mínimos:

- API indisponível por 2 minutos;
- erro 5xx acima de 2% por 5 minutos;
- p95 acima de 1 segundo por 10 minutos;
- PostgreSQL sem backup válido há 26 horas;
- disco acima de 80%;
- servidor fixo sem heartbeat além da janela configurada;
- crescimento anormal de 401/403/429 ou falhas de refresh.

Severidade: **SEV-1** perda/exposição de dados ou indisponibilidade total;
**SEV-2** autenticação, inventário ou servidor principal degradado; **SEV-3**
função secundária. Primeiro conter, depois preservar evidências, recuperar,
comunicar quando aplicável e registrar causa/ação sem culpabilização.

## Gate da alfa fechada

- [x] domínio, DNS/TLS e contas da infraestrutura web configurados pelo proprietário (31/08/2026);
- [ ] segredos exclusivos gerados e quaisquer valores antigos rotacionados;
- [ ] primeiro restore isolado executado dentro do RPO/RTO;
- [ ] controlador e canal de privacidade preenchidos; minutas revisadas;
- [ ] smoke visual desktop/mobile e partida Retake real concluídos;
- [ ] alertas e contato de incidente testados;
- [ ] nenhum link para função inexistente no fluxo público;
- [ ] aceite explícito de que ELO, 5v5 dinâmico, DM e billing ainda não existem.

## Gate adicional para produção paga

Além dos itens anteriores: Mercado Pago sandbox e produção, webhook idempotente,
reconciliação, entitlement, cancelamento, reembolso, nota/recibo, suporte,
proteção ao consumidor e testes E2E precisam estar concluídos. A presença visual
de Maré não satisfaz esse gate.
