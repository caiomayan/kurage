# Kurage — documentação profissional de produto e mercado

**Versão:** 1.0  
**Data:** 20 de agosto de 2026  
**Mercado inicial:** Brasil, pt-BR, BRL, usuários com 18 anos ou mais  
**Estado:** estratégia aprovada para validação; produto em alfa técnica

## 1. Resumo do negócio

Kurage será o sistema operacional competitivo para times amadores e
semiprofissionais de Counter-Strike 2. Em vez de oferecer apenas uma página de
estatísticas ou um painel de hospedagem, a plataforma conecta toda a sessão:

> **Steam → time → servidor privado → partida instrumentada → ELO e passaporte
> competitivo compartilhável.**

O comprador inicial é o capitão que hoje coordena elenco, servidor, resultado e
histórico em ferramentas separadas. O usuário também é o jogador que deseja uma
identidade confiável e evolução visível. O valor aparece quando uma partida real
vira um registro verificável sem trabalho manual.

### Declaração de posicionamento

Para capitães e jogadores de times competitivos de CS2 no Brasil, Kurage é uma
plataforma de identidade e operação competitiva que inicia servidores privados
sob demanda, registra partidas e constrói histórico/ELO auditável. Diferente de
um host genérico ou de um site de estatísticas importadas, Kurage controla o fluxo
da sessão e conecta cada resultado ao time e ao jogador.

### Promessa curta

**Jogue com seu time. Registre o resultado. Construa sua história competitiva.**

## 2. Problema e oportunidade

Um time emergente normalmente precisa combinar login/identidade, chat, planilha de
elenco, host de servidor, prints de placar e plataformas externas. Esse arranjo
gera quatro problemas:

1. **fragmentação:** a identidade do jogador não acompanha a operação do time;
2. **fricção:** preparar um servidor e organizar a sessão exige conhecimento e
   coordenação manual;
3. **baixa confiança:** resultados e rankings sem origem clara perdem valor;
4. **memória curta:** a evolução do time fica espalhada ou desaparece.

A oportunidade não é substituir redes competitivas maduras. É entregar um fluxo
próprio para treinos, scrims e comunidades pequenas, com excelente experiência em
português, servidores locais e um passaporte que cresce a cada partida Kurage.

## 3. Público-alvo

### ICP primário

Capitão ou manager, 18–34 anos, de time amador/semiprofissional brasileiro com
cinco a dez membros, que joga semanalmente, organiza scrims/treinos e aceita pagar
para reduzir trabalho e registrar evolução.

Jobs to be done:

- “quero colocar meu time em um servidor confiável sem administrar Linux”;
- “quero que lineup, placar e histórico sejam registrados automaticamente”;
- “quero mostrar a evolução do meu time e dos jogadores”;
- “quero compartilhar um perfil competitivo profissional”.

### Usuário secundário

Jogador competitivo que entra por convite, autentica com Steam, monta seu
passaporte, acompanha histórico e depois leva Kurage a outro time.

### Fora do escopo inicial

- menores de 18 anos;
- matchmaking público massivo;
- anti-cheat proprietário;
- apostas, caixas pagas, cash-out ou ativos com valor real;
- notícias/editorial esports;
- aluguel genérico de VPS ou painel para operadores terceiros;
- operação mundial e múltiplas moedas.

## 4. Produto inicial

### 4.1 Loop de ativação

1. Login Steam.
2. Passaporte mínimo criado automaticamente.
3. Usuário cria ou entra em um time.
4. Capitão compra créditos e inicia um servidor em São Paulo.
5. Time conecta por link/Steam connect.
6. Plugin envia roster e resultado final assinado.
7. Kurage registra partida, atualiza ELO e gera relatório compartilhável.
8. Time retorna para comparar evolução e iniciar nova sessão.

**Evento de ativação:** primeiro resultado de partida válido em até 24 horas após a
criação do time.

### 4.2 Superfícies do MVP

- marketing: home, produto, preços, confiança, status e documentos legais;
- público: perfil, time, ranking, partida e busca;
- dashboard: overview, time, servidor, partidas, créditos, billing e configurações;
- servidor: provisionar, iniciar, parar, senha, mapa, jogadores, logs resumidos e
  consumo;
- suporte: FAQ, contato, incidentes e exclusão/exportação de dados.

### 4.3 Regra de verdade

Toda tela deve distinguir:

- `live`: recebido recentemente do servidor;
- `stale`: último dado conhecido, fora da janela esperada;
- `offline`: encerramento confirmado ou timeout;
- `unavailable`: dependência falhou;
- `not collected`: nunca houve dado.

Nenhum desses estados pode ser convertido em zero, `#1`, ELO 2000 ou inventário
vazio sem indicação.

## 5. Modelo comercial único

Existe uma única assinatura mensal da plataforma, vinculada ao passaporte do
usuário. O backend entrega entitlements concretos; o frontend nunca concede
acesso apenas com base em decoração visual.

| Plano | Preço/mês | Entitlements de lançamento |
|---|---:|---|
| Livre | R$ 0 | passaporte, ranking, times, servidores públicos e inventário virtual |
| Maré | A definir antes do checkout | tema coral global, selo Maré, visitantes do perfil, histórico e análises avançadas, filtros de ranking, prioridade em filas oficiais e acesso antecipado |

Regras comerciais:

- cobrança inicial em BRL via Mercado Pago;
- free tier permanente substitui trial;
- sem plano anual no lançamento;
- prioridade nunca expulsa um jogador ativo nem altera regras, dano, economia ou resultado da partida;
- benefícios valem para toda a plataforma e não ficam presos ao modo Retake;
- pagamento confirmado por webhook idempotente, nunca pelo redirect do browser;
- downgrade preserva dados, mas reduz consulta/ação aos limites do novo plano;
- grace period e cancelamento seguem termos claros e o estado do provedor;
- `isVerifiedPro` é verificação editorial/manual, separada da assinatura Maré;
- o simulador de inventário é gratuito e não possui valor econômico.

Preço, tributos, taxas do gateway e custo de suporte devem ser validados antes da
ativação do checkout. A existência do catálogo no código não autoriza cobrança.

## 6. Unit economics e metas

O ledger registra, por lease, minutos cobrados do cliente, custo do provedor, taxa
de pagamento, crédito promocional e margem. Nenhum crédito pode ser abatido apenas
no cliente.

Fórmulas:

```text
MRR = soma das assinaturas recorrentes ativas
Receita de uso = créditos consumidos no período
Margem SaaS = (MRR - fees - suporte variável) / MRR
Margem servidor = (receita de uso - provedor - fees - perdas) / receita de uso
LTV simplificado = ARPA mensal × margem bruta / churn mensal
CAC payback = CAC / contribuição mensal por conta
```

Metas iniciais, não resultados atuais:

| Métrica | Meta de validação |
|---|---:|
| Times que concluem ativação | ≥ 60% dos times criados por design partners |
| Retenção semanal de times ativados | ≥ 40% na semana 4 |
| Conversão de time ativo para pagante | ≥ 10% |
| Margem bruta da assinatura | ≥ 80% |
| Margem bruta dos créditos | ≥ 50% |
| Falha de provisionamento | < 2% das solicitações |
| Partida processada sem intervenção | ≥ 99% |
| CAC payback | < 3 meses após canal repetível |

**North star:** times ativos por semana com ao menos uma partida instrumentada
concluída.

Guardrails: incidentes por 100 sessões, disputas de resultado, custo por hora,
falha de cobrança, chargeback, taxa de auto-stop e solicitações LGPD.

## 7. Mercado e concorrência

O mercado já valida demanda por quatro categorias:

| Categoria | Exemplos | O que validam | Resposta Kurage |
|---|---|---|---|
| Rede competitiva/matchmaking | FACEIT, Gamers Club | identidade, ranking, anti-cheat e comunidade têm valor | não competir em matchmaking/anti-cheat; servir sessões de time |
| Dados/editorial | HLTV | perfis e histórico públicos geram recorrência | publicar apenas dados Kurage com origem explícita |
| Analytics | Leetify, SCOPE.GG | jogadores querem diagnóstico e progresso | conectar análise à sessão first-party, começando simples |
| Hosting | DatHost e hosts CS2 | há disposição a pagar por servidor simples | usar DatHost como infraestrutura invisível e vender o workflow |

Referências de produto: [FACEIT](https://www.faceit.com/),
[Gamers Club](https://gamersclub.com.br/), [Leetify](https://leetify.com/),
[SCOPE.GG](https://scope.gg/), [HLTV](https://www.hltv.org/) e
[DatHost for Platforms](https://dathost.com/for-platforms).

### Diferenciação defensável

O visual não é moat. A defesa cresce com:

1. histórico first-party de partidas instrumentadas;
2. grafo de jogadores, times, sessões e evolução;
3. workflow de capitão que reduz tempo até o servidor;
4. confiabilidade do resultado, auditoria e disputa;
5. integrações e switching cost do histórico do time;
6. comunidade local e relatórios compartilháveis.

Kurage não deve copiar identidade visual, layout, conteúdo ou métricas proprietárias
dos concorrentes. Inspiração funcional precisa resultar em design e implementação
originais.

## 8. Go-to-market

### Fase design partner

- recrutar cinco times e aproximadamente vinte capitães/managers em comunidades de
  CS2, circuitos universitários e grupos de scrim;
- acompanhar onboarding ao vivo;
- oferecer créditos controlados em troca de sessão semanal e entrevista;
- medir tempo até primeira partida, falhas e tarefas ainda feitas fora do Kurage;
- publicar somente depoimentos autorizados e métricas agregadas.

### Aquisição após product-market signal

1. **Loop de convite:** capitão convida quatro jogadores; cada perfil expõe marca
   Kurage e leva o produto a outros times.
2. **Relatório compartilhável:** partida/time/perfil indexável com CTA contextual.
3. **Conteúdo técnico:** guias de scrim, gestão de time e leitura de evolução, sem
   se posicionar como portal de notícias.
4. **Comunidades:** parcerias pequenas com ligas universitárias e organizadores.
5. **Portfólio do fundador:** case público demonstra engenharia, transparência e
   execução, sem transformar o repositório proprietário em distribuição grátis.

Não comprar tráfego antes de ativação e retenção dos design partners. A primeira
mensagem deve vender resultado, não uma lista de tecnologias.

## 9. Narrativa da marca

- **Categoria:** competitive team operations.
- **Tom:** técnico, calmo, preciso, sem promessas exageradas.
- **Personalidade:** profundidade oceânica, clareza e movimento coordenado.
- **Prova:** cada número aponta para uma partida e origem verificável.
- **Evitar:** “plataforma definitiva”, “anti-cheat infalível”, “ELO oficial”,
  “servidor 128 tick” ou “produção” sem evidência.

Mensagem da home:

```text
Seu time entra. A partida acontece. A evolução fica.

Servidores privados sob demanda, resultados verificáveis e um passaporte
competitivo para cada jogador e time de CS2.
```

CTA primário: **Criar meu time com Steam**.  
CTA secundário: **Ver uma partida Kurage**.

## 10. Métricas e instrumentação

Eventos mínimos, sem dados desnecessários:

- `steam_login_completed`;
- `team_created`, `team_member_joined`;
- `server_credit_purchased`;
- `server_provision_requested`, `server_running`, `server_stopped`;
- `match_started`, `match_result_accepted`, `match_result_disputed`;
- `report_shared`;
- `subscription_started`, `payment_failed`, `subscription_cancelled`.

Todo evento possui versão de schema, timestamp server-side, user/team/lease IDs
pseudonimizáveis e correlation ID. Métricas de produto não devem reutilizar logs
operacionais como banco analítico. Consentimento e retenção precisam estar no
inventário LGPD.

## 11. Confiança, segurança e compliance

### LGPD

Antes do beta externo:

- mapear controlador, operadores e subprocessadores;
- documentar finalidade/base legal para Steam ID, IP, telemetria e pagamento;
- minimizar dados live e definir retenção/expurgo;
- oferecer acesso, correção, portabilidade quando aplicável, revogação e exclusão;
- registrar transferências internacionais e contratos com provedores;
- manter canal do titular e processo de incidente;
- separar analytics, operação e marketing;
- lançar apenas para 18+ enquanto proteção de menores não estiver implementada.

Fontes: [texto da LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
e [direitos dos titulares — ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).

### Documentos comerciais obrigatórios

- Termos de Serviço;
- Política de Privacidade;
- Política de cancelamento/reembolso;
- Política de Uso Aceitável para servidores;
- política de suporte e status/SLA somente quando houver compromisso;
- DPA/contratos de operador e resposta a incidente.

Esses documentos exigem revisão jurídica brasileira e coerência com o checkout.
Esta documentação de produto não é aconselhamento jurídico.

## 12. Propriedade intelectual, INPI e Git

### Estratégia única de publicação

1. manter o monorepo canônico privado;
2. criar releases assinadas e arquivos imutáveis;
3. publicar um case sanitizado separado com screenshots próprios, diagrama,
   métricas e decisões;
4. conceder acesso temporário, nominal e revogável a recrutadores;
5. nunca publicar `.env`, dumps, provider IDs, algoritmo antifraude ou ativos sem
   cadeia de direitos.

O motivo é prático e jurídico: sem licença pública, copyright fica reservado, mas
um repositório público no GitHub ainda pode ser visualizado e bifurcado pela
funcionalidade da plataforma. O repositório privado mantém melhor controle sobre
segredo, cadeia de titularidade e avaliação. Consulte a
[orientação de licenças do GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
e os [Termos do GitHub](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service).

### Licenciamento aplicado

- raiz, backend, frontend, documentação e design original: licença proprietária
  Kurage, todos os direitos reservados, com permissão limitada de avaliação;
- `server/plugins`: MIT, pois a exceção oficial do CounterStrikeSharp permite aos
  plugins derivados usar MIT;
- dependências e ativos: termos próprios, registrados em notices/SBOM.

Fonte: [licença oficial do CounterStrikeSharp](https://github.com/roflmuffin/CounterStrikeSharp/blob/main/LICENSE).

### Registro de programa de computador

Para o primeiro depósito:

1. limpar secrets/artefatos e concluir a auditoria de direitos;
2. fixar versão `1.0.0-registration`, commit atribuído e tag assinada;
3. produzir um arquivo determinístico do código proprietário, excluindo
   dependências, `.env`, dados, binários e plugins MIT quando tratados separadamente;
4. gerar SHA-256 e guardar exatamente o arquivo, o hash, algoritmo, manifesto,
   SBOM, data, titular e cadeia de autoria em pelo menos dois meios;
5. preencher e-Software/GRU/Declaração de Veracidade com certificado digital
   aceito e preservar o pacote durante a vigência;
6. repetir o processo para versões materialmente novas conforme estratégia de PI;
7. realizar busca e pedido de marca “Kurage” separadamente — registro de software
   não concede exclusividade do nome.

O INPI informa que o pedido usa resumo digital hash e que a guarda da documentação
técnica cabe ao titular. Consulte o [Guia de registro de programa de computador](https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/guia-basico)
e o [Guia de marcas](https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico/guia-basico).

## 13. Roadmap de mercado

| Período | Resultado de negócio | Entrega de produto |
|---|---|---|
| 0–30 dias | confiança para demo | P0, legal, CI, dados honestos, restore |
| 31–90 dias | cinco times ativos | time + DatHost + partida + ELO E2E |
| 91–180 dias | primeiras receitas | Mercado Pago + entitlement + créditos + billing UI |
| 181–365 dias | retenção e canal repetível | temporadas, fraude, comunidade, API MAX e escala guiada por uso |

Uma fase só termina com o critério de saída da auditoria, não por calendário.

## 14. Riscos de negócio e mitigação

| Risco | Mitigação escolhida |
|---|---|
| Custo de servidor supera receita | créditos pré-pagos, auto-stop, ledger e margem mínima de 50% |
| Poucos times recorrentes | design partners antes de mídia paga; north star por partida |
| Resultado contestado | evento assinado, audit log, disputa e reprocessamento versionado |
| Dependência de Valve/FACEIT/host | adapters, cache, degradação clara e termos revisados |
| Abuso/smurf/fraude | 18+, server authority, limites, revisão e trilha de auditoria |
| Marca/ativos de terceiros | busca INPI e asset register antes de publicação |
| Vazamento do diferencial | repositório privado e case sanitizado |
| Complexidade prematura | monólito modular, um país, uma moeda, um provider por domínio |

## 15. Como apresentar no portfólio

O case público deve contar uma história verificável:

1. problema real do capitão;
2. pesquisa e decisão de nicho;
3. arquitetura como construída e arquitetura-alvo;
4. decisões difíceis: sessão, ELO idempotente, control plane e billing;
5. screenshots próprios, demo sem dados reais e diagrama;
6. testes executados com números exatos, inclusive lint ainda pendente;
7. incidentes/riscos descobertos e como foram priorizados;
8. resultado de design partners quando existir;
9. link para documentação bilíngue e acesso privado sob solicitação.

Para vagas, honestidade aumenta o valor técnico: “alfa com 137 testes e build
frontend aprovado, ainda bloqueada por P0” é mais profissional que alegar produção
sem domínio operacional.

## 16. Critério de sucesso

Kurage deixa de ser protótipo quando um novo capitão consegue, sem intervenção do
fundador:

1. entrar com Steam;
2. criar o time;
3. pagar via Mercado Pago;
4. comprar e consumir crédito;
5. iniciar e parar um servidor;
6. concluir uma partida;
7. ver ELO/histórico corretos;
8. cancelar/excluir/exportar conforme política;
9. receber suporte e status em falha.

Até esse fluxo passar E2E, o posicionamento externo correto é **alfa técnica / beta
privado**, nunca SaaS em produção.
