"""Documented invariants of the Kurage project as knowledge-graph concept nodes.

These are the rules a refactor must not silently break. They live in `docs/pt`
(the audit in 08 and the evolution plan in 19 outrank the rest) and are attached
here to the code they govern, so a design question surfaces the rule before the
implementation.

Maintained by hand — nothing here is model-generated at build time. When a rule
changes in `docs/pt`, change it here in the same pull request. `rebuild.py`
verifies that every edge target still exists and fails the build if a symbol was
renamed or removed.
"""

from __future__ import annotations

from pathlib import Path

_B = "backend_src_main_java_com_kurage_api_"


def _svc(name: str) -> str:
    return f"{_B}service_{name}_{name}"


def _dom(name: str) -> str:
    return f"{_B}domain_{name}_{name}"


_HANDLER = f"{_B}exception_globalexceptionhandler_globalexceptionhandler"
_IDENTITY = "frontend_src_lib_identity_resolveidentity"
_THEME = "frontend_src_lib_theme_createthemecontroller"
_SAFE_RATIO = "frontend_src_lib_metrics_saferatio"
_DEPTH_FIELD = "frontend_src_components_profile_profiledepthfield_profiledepthfield"
_SEARCH_HISTORY = "frontend_src_lib_search_history_historykey"
_SHORTCUTS = "frontend_src_lib_search_shortcuts_shortcutsfor"
_PLAYTIME = "backend_src_main_java_com_kurage_api_service_playtimeservice_playtimeservice"
_RATING = "backend_src_main_java_com_kurage_api_competitive_ratingcalculator_ratingcalculator"
_ELO = "backend_src_main_java_com_kurage_api_competitive_elocalculator_elocalculator"
_INGESTION = "backend_src_main_java_com_kurage_api_service_roundingestionservice_roundingestionservice"

D05 = "docs/pt/05_game_servers_subsystem.md"
D07 = "docs/pt/07_frontend_design_system.md"
D08 = "docs/pt/08_auditoria_estado_atual.md"
D09 = "docs/pt/09_produto_mercado.md"
D10 = "docs/pt/10_notificacoes_postgres.md"
D11 = "docs/pt/11_testes_integracao.md"
D12 = "docs/pt/12_plano_mare.md"
D13 = "docs/pt/13_autenticacao_seguranca.md"
D14 = "docs/pt/14_consistencia_observabilidade.md"
D15 = "docs/pt/15_operacao_e_release.md"
D18 = "docs/pt/18_branches_prs_ci.md"
D19 = "docs/pt/19_plano_evolucao_identidade_rating_perfil.md"

# (doc, slug, label, rationale)
CONCEPTS: list[tuple[str, str, str, str]] = [
    (D08, "regra_dados_honestos", "Honest Data Rule",
     "Nenhuma tela ou contrato pode converter ausencia, indisponibilidade ou calibracao em zero, "
     "posicao #1, ELO 2000, rating 1.00 ou inventario vazio. Os cinco estados live, stale, offline, "
     "unavailable e not-collected devem permanecer distintos. Motivo: rankings e resultados sem "
     "origem clara destroem a confianca que e a propria proposta de valor do produto."),
    (D19, "calibracao_cinco_partidas", "Five-Match Calibration Screening",
     "Um jogador so entra na classificacao definitiva e pode receber Level S apos concluir 5 "
     "partidas validas processadas. Nao basta criar a conta. Bots, aquecimento, AFK e reenvio do "
     "mesmo evento nao completam a triagem, e desconexao nao reinicia a contagem."),
    (D19, "sem_mocks_em_producao", "No Mocks in the Production Path",
     "Mocks, fixtures servidas como dado real e fallbacks numericos ou textuais que inventem estado "
     "de producao devem ser removidos do caminho de producao. Mocks permanecem aceitos apenas na "
     "camada de teste unitario, para isolar regras puras."),
    (D08, "postgres_fonte_unica", "PostgreSQL as Single Transactional Source",
     "PostgreSQL e a unica fonte transacional; MongoDB foi removido da operacao. Redis e cache, "
     "presenca efemera, debounce e sessao, nunca fonte de verdade de um dominio persistente."),
    (D14, "redis_apenas_efemero", "Redis Is Ephemeral Only",
     "Invalidacoes de cache e a publicacao dos jogadores do heartbeat sao executadas apenas apos o "
     "commit. Em rollback, o debounce criado no Redis e liberado. Consultas feitas dentro de uma "
     "mutacao ignoram o cache para nao ler uma versao anterior ao commit."),
    (D13, "fail_open_fail_closed", "Fail-Open Reads, Fail-Closed Mutations",
     "Leituras publicas mantem fail-open para disponibilidade. Autenticacao, mutacao de inventario, "
     "convites, solicitacoes e upload falham FECHADO quando o Redis nao consegue aplicar o limite. "
     "Motivo: disponibilidade nunca pode custar a fronteira de seguranca."),
    (D13, "steam_state_one_time", "One-Time Steam OpenID State",
     "O state de 256 bits vive 10 minutos no Redis, e espelhado em cookie HttpOnly e consumido com "
     "GETDEL. Expiracao, repeticao e troca de navegador falham. A API nao cria mais perfil ficticio "
     "quando a Steam Web API esta indisponivel: o login falha de forma visivel."),
    (D13, "rotacao_refresh_cas", "Atomic Refresh Rotation",
     "A rotacao e um compare-and-set em Lua e o Redis guarda apenas o SHA-256 do refresh token. A "
     "familia tem vida absoluta de 30 dias e rotacoes nao renovam esse prazo. Reuso apos a "
     "tolerancia de 10 segundos, ou divergencia de dispositivo, revoga a familia inteira."),
    (D13, "jwt_nao_autoritativo", "JWT Is Not Authoritative for Privileges",
     "O JWT carrega a identidade, mas papel e account_status sao relidos no PostgreSQL a cada "
     "requisicao. Um claim de papel antigo ou adulterado nao concede acesso, e contas SUSPENDED "
     "deixam de autenticar imediatamente."),
    (D13, "distincao_401_403", "401 Refreshes, 403 Does Not",
     "O frontend tenta refresh somente apos 401. Um 403 representa autorizacao negada e nao altera "
     "uma sessao saudavel. Uma negacao de autorizacao jamais deve chegar ao cliente como 5xx: isso "
     "a transforma em falha de servidor e quebra essa distincao."),
    (D12, "plano_mare_unico", "Mare Is the Only Subscription",
     "O backend aceita apenas FREE e MARE. As permissoes Mare sao MARE_BADGE, PROFILE_VISITORS, "
     "ADVANCED_STATS, RANKING_FILTERS, SERVER_PRIORITY, PROFILE_HIGHLIGHT e EARLY_ACCESS. Uma "
     "assinatura expirada e exposta como FREE mesmo antes de a conciliacao persistir a mudanca."),
    (D12, "sem_cobranca_ainda", "No Checkout Until Billing Exists",
     "Preco, checkout, webhook idempotente, renovacao, cancelamento, reembolso, conciliacao e "
     "portal ainda nao existem. Nenhum botao pode simular uma compra concluida e somente o backend "
     "podera ativar ou expirar a assinatura."),
    (D12, "mare_nao_afeta_partida", "Mare Never Affects Match Outcome",
     "Mare nunca altera dano, economia, equipamentos, matchmaking por habilidade ou o resultado de "
     "uma partida. Prioridade de fila nunca expulsa um jogador ativo. Beneficios futuros precisam "
     "respeitar essa regra."),
    (D19, "cargo_e_plano_independentes", "Role and Subscription Are Independent",
     "Cargo de plataforma (USER, ADMIN, OWNER) e assinatura (FREE, MARE) sao dimensoes "
     "independentes. Um admin pode ser assinante; comprar Mare nao concede administracao; ser dono "
     "de um time nao torna alguem dono da plataforma. isVerifiedPro e verificacao editorial e "
     "jamais e vendida. Precedencia de tema: Dono > Admin > Mare > padrao."),
    (D19, "autorizacao_de_visitantes", "Visitors Authorized by the Observer",
     "A autorizacao do quadro de 20 visitantes pertence ao OBSERVADOR, nao ao titular: um assinante "
     "Mare ativo, OWNER ou ADMIN consulta os visitantes de qualquer perfil, e o titular nao ganha "
     "acesso apenas por ser titular. A verificacao ocorre no backend a cada requisicao, porque "
     "esconder o componente no cliente nao protege os dados. Auto-visitas sao ignoradas e o par "
     "visitante/perfil tem debounce de uma hora."),
    (D05, "identidade_fixa_de_servidor", "Server Identity Is Fixed per Process",
     "PostgreSQL e autoritativo para gameMode e serverKind. O plugin repete esses valores no "
     "heartbeat apenas para detectar configuracao incorreta: uma divergencia retorna 409 Conflict e "
     "o heartbeat NUNCA reclassifica o registro. Nao existe comando de troca de modo em jogo."),
    (D05, "credencial_por_servidor", "Per-Server Credential, Fail-Closed",
     "Cada ServerId possui credencial propria. A API calcula SHA-256 e compara em tempo constante "
     "com o hash daquele registro. A chave de outro servidor retorna 401 e a ausencia de hash falha "
     "fechado com 503. O segredo em texto puro nunca e persistido."),
    (D05, "janela_de_heartbeat", "Ninety-Second Heartbeat Validity",
     "Um heartbeat vale 90 segundos. Depois dessa janela a API, o cache Redis e o frontend tratam a "
     "instancia como offline e descartam roster, lotacao e placar volateis. O cliente aplica a mesma "
     "expiracao mesmo quando a API fica indisponivel, para nunca exibir telemetria fantasma."),
    (D14, "concorrencia_sem_sucesso_falso", "Concurrency Never Returns False Success",
     "O inventario possui versao otimista e convites, pedidos, vagas e links usam locks de linha. Ao "
     "detectar concorrencia ou violacao de integridade a API responde 409 Conflict; ela nao retorna "
     "um sucesso falso. Estados expirados respondem 410 Gone apos confirmar a expiracao."),
    (D11, "testes_com_servicos_reais", "Integration Tests Use Real Services",
     "A suite de integracao usa PostgreSQL 16 e Redis 7 reais via Testcontainers e e obrigatoria no "
     "CI. H2, Redis em memoria e servicos simulados sao proibidos. Cada migration nova exige uma "
     "assercao de integracao, e provedores externos precisam de sandbox proprio em vez de mock."),
    (D10, "convite_nao_e_notificacao", "Invitations Are Not Notifications",
     "Convites, pedidos de entrada e links continuam em suas proprias tabelas, que guardam validade, "
     "status, permissoes e invariantes de negocio. A notificacao apenas informa o usuario e aponta "
     "em metadata para a entidade responsavel pela acao. A tela deve consultar a relacao real para "
     "executar uma acao, nunca inferir permissao de uma notificacao lida ou expirada."),
    (D09, "inventario_sem_valor_economico", "Inventory Has No Economic Value",
     "O simulador de inventario e gratuito, privado por padrao e nao possui valor monetario, compra "
     "aleatoria, cash-out ou promessa de premio. Apostas, caixas pagas e ativos com valor real estao "
     "explicitamente fora de escopo."),
    (D08, "gate_de_producao", "Paid Production Gate",
     "O primeiro pagamento so pode ser aceito com zero P0 aberto, restore de backup demonstrado, E2E "
     "de pagamento e de provisionamento, autorizacao de tenant testada negativamente, documentos "
     "juridicos publicados e monitoramento ativo. O deploy web de alfa NAO satisfaz esse gate."),
    (D08, "motor_de_partida_ausente", "No Match or ELO Engine Exists",
     "Nao existe ingestao de partida nem operacao que atualize estatistica competitiva. O ELO e "
     "inicializado em 200 e nada o altera. Um grafo bem conectado em torno de ranking NAO significa "
     "que o loop competitivo esteja implementado."),
    (D08, "monolito_modular", "Modular Monolith, Not Microservices",
     "Manter o backend como monolito modular. Nao extrair microservicos, nao adicionar outro banco "
     "nem outra linguagem antes que escala, disponibilidade, equipe ou compliance produzam uma "
     "fronteira mensuravel."),
    (D07, "regras_estritas_de_design", "Strict Anti-Cliche Design Rules",
     "Proibidos gradientes decorativos, texto em degrade, bordas brilhantes, qualquer tom roxo ou "
     "violeta no tema escuro e bento-boxes com icones vazios. Elementos nao recebem fundo ou borda "
     "sem razao clara. Tabelas, placares e estatisticas exigem font-variant-numeric tabular-nums."),
    (D19, "perfil_usa_tema_do_titular", "Profile Uses the Owner Theme",
     "Ao abrir um perfil, a pagina assume a identidade visual do usuario DAQUELE perfil, nao a do "
     "visitante; ao sair, o tema do visitante e restaurado. Visitar um perfil nunca muda sessao, "
     "permissoes ou assinatura, e a regra vale tambem para visitante anonimo e acesso direto por "
     "URL."),
    (D19, "level_s_top_30", "Level S Is the General Top 30",
     "Os 30 primeiros do ranking geral exibem Level S depois de concluir a calibracao. S nao exige "
     "nivel-base 10, ELO minimo extra, assinatura ou cargo: com 12 jogadores calibrados, os 12 podem "
     "ser S. Inatividade nunca reduz ELO nem remove alguem do ranking automaticamente."),
    (D18, "fluxo_de_branches", "Branch and Release Flow",
     "O trabalho sai de dev em uma branch temporaria, vai por pull request para dev com squash e so "
     "promove para main por merge commit. Apenas main publica, no backend OCI e na Vercel. Os checks "
     "obrigatorios sao quality, test e gitleaks. Nao recriar dev nem forcar o historico."),
    (D08, "documentacao_no_mesmo_pr", "Docs Change in the Same PR",
     "Cada documento indica implementado, prototipo ou planejado e a data da ultima validacao. "
     "Qualquer divergencia entre documentacao e codigo deve ser corrigida no MESMO pull request da "
     "implementacao. A auditoria 08 e o plano 19 sao a referencia factual; os documentos 01 a 07 "
     "descrevem componentes e intencao."),
    (D19, "historico_de_busca_privado", "Search History Is Private and Local",
     "O historico de busca fica no dispositivo, em namespace por conta, e nunca e enviado ao "
     "servidor. Entrar ou sair da conta nao pode expor o que a outra sessao digitou, cada entrada e "
     "apagavel e o painel nao publica termos digitados por outras pessoas. Um bloco de mais "
     "procurados so e permitido com coleta real, janela temporal, amostra minima e protecao contra "
     "manipulacao; enquanto o trafego for pequeno, fabricar popularidade e proibido."),
    (D19, "elo_mede_sucesso_rating_mede_contribuicao", "ELO Measures Success, Rating Measures Contribution",
     "Sao duas medidas independentes que se correlacionam, e nenhuma deriva da outra. O ELO olha "
     "apenas para o resultado e para a forca do adversario: ele nao sabe quantos abates o jogador "
     "fez. O Rating olha apenas para a producao individual: ele nao sabe se o round foi vencido. "
     "Derivar um do outro transformaria a correlacao em tautologia e destruiria a leitura mais util "
     "do par, que e a divergencia — quem carrega time que perde tem Rating alto e ELO baixo."),
    (D19, "unidade_valida_e_versionada", "Every Computed Unit Carries Its Version",
     "Uma unidade valida de retake sao 20 rounds, acumulaveis entre sessoes, e cinco delas concluem "
     "a calibracao. Toda unidade fechada grava a versao do algoritmo que a produziu, junto do evento "
     "cru que a originou. Corrigir uma formula nunca e editar valores calculados: e reprocessar os "
     "eventos sob uma versao nova, preservando as linhas antigas para auditoria e disputa."),
    (D19, "ingestao_idempotente", "Round Ingestion Is Idempotent and All-or-Nothing",
     "Um plugin que perdeu a resposta reenvia o mesmo round; isso e esperado e nao pode contar duas "
     "vezes. A chave de idempotencia garante isso no banco. Sequencia fora de ordem e modo divergente "
     "do registro sao recusados com 409, e o modo vem sempre do PostgreSQL — um evento nunca "
     "reclassifica o servidor. Nenhum round e aplicado pela metade."),
    (D19, "level_s_diario_e_desempate", "Level S Is Granted Daily, Never Live",
     "O Level S e recalculado uma vez por dia, a meia-noite, e vale o dia inteiro que comeca: quem "
     "estiver no topo elegivel naquele instante mantem o S mesmo que o ELO mude no meio do dia. Sao "
     "30 vagas entre calibrados; com menos de 30 elegiveis, todos recebem. O desempate e ELO, depois "
     "K/D, depois menos horas jogadas, e por fim o identificador, para que a ordem seja "
     "deterministica e a vaga 30 nunca fique ambigua."),
    (D19, "horas_jogadas_medidas", "Playtime Is Measured, Not Assumed",
     "Horas jogadas sao o tempo que a plataforma observou por heartbeat, nao o historico do jogador "
     "no CS2. Cada avistamento credita apenas o intervalo desde o anterior, limitado a janela de 90 "
     "segundos: silencio do servidor nao vira hora, espectador nao acumula, e quem nao tem conta "
     "vinculada nao credita a ninguem. O contador comeca em zero e so conta a partir do deploy."),
    (D15, "backup_so_vale_com_restore", "A Backup Is Only Valid After a Restore",
     "Meta da alfa: RPO de 24 horas e RTO de 4 horas. Um backup so e considerado valido apos um "
     "restore comprovado em banco isolado. Redis nao e backup. Nunca testar pg_restore --clean no "
     "banco de producao."),
]

# (source slug, target slug or code node id, relation, confidence, score)
LINKS: list[tuple[str, str, str, str, float]] = [
    ("regra_dados_honestos", _svc("rankingservice"), "rationale_for", "INFERRED", 0.95),
    ("regra_dados_honestos", _svc("userservice"), "rationale_for", "INFERRED", 0.95),
    ("regra_dados_honestos", _svc("searchservice"), "rationale_for", "INFERRED", 0.85),
    ("regra_dados_honestos", _SAFE_RATIO, "rationale_for", "INFERRED", 0.95),
    ("regras_estritas_de_design", _DEPTH_FIELD, "rationale_for", "INFERRED", 0.85),
    ("calibracao_cinco_partidas", _dom("playerstats"), "rationale_for", "INFERRED", 0.95),
    ("calibracao_cinco_partidas", _svc("rankingservice"), "rationale_for", "INFERRED", 0.95),
    ("calibracao_cinco_partidas", "regra_dados_honestos", "conceptually_related_to", "EXTRACTED", 1.0),
    ("sem_mocks_em_producao", "regra_dados_honestos", "conceptually_related_to", "EXTRACTED", 1.0),
    ("postgres_fonte_unica", "redis_apenas_efemero", "conceptually_related_to", "EXTRACTED", 1.0),
    ("fail_open_fail_closed", _svc("ratelimitingservice"), "rationale_for", "INFERRED", 0.95),
    ("redis_apenas_efemero", _svc("inventoryservice"), "rationale_for", "INFERRED", 0.85),
    ("steam_state_one_time", _svc("steamauthservice"), "rationale_for", "INFERRED", 0.95),
    ("rotacao_refresh_cas", _svc("refreshtokenservice"), "rationale_for", "INFERRED", 0.95),
    ("jwt_nao_autoritativo", _svc("userservice"), "rationale_for", "INFERRED", 0.85),
    ("distincao_401_403", _HANDLER, "rationale_for", "INFERRED", 0.95),
    ("distincao_401_403", "jwt_nao_autoritativo", "conceptually_related_to", "INFERRED", 0.85),
    ("plano_mare_unico", _svc("subscriptionservice"), "rationale_for", "INFERRED", 0.95),
    ("plano_mare_unico", _svc("permissionservice"), "rationale_for", "INFERRED", 0.95),
    ("cargo_e_plano_independentes", _svc("permissionservice"), "rationale_for", "INFERRED", 0.85),
    ("mare_nao_afeta_partida", "plano_mare_unico", "conceptually_related_to", "EXTRACTED", 1.0),
    ("sem_cobranca_ainda", "plano_mare_unico", "conceptually_related_to", "EXTRACTED", 1.0),
    ("autorizacao_de_visitantes", _svc("profilevisitservice"), "rationale_for", "INFERRED", 0.95),
    ("autorizacao_de_visitantes", _svc("permissionservice"), "rationale_for", "INFERRED", 0.95),
    ("autorizacao_de_visitantes", "plano_mare_unico", "conceptually_related_to", "EXTRACTED", 1.0),
    ("identidade_fixa_de_servidor", _svc("gameserverservice"), "rationale_for", "INFERRED", 0.95),
    ("credencial_por_servidor", _svc("gameserverservice"), "rationale_for", "INFERRED", 0.95),
    ("janela_de_heartbeat", _svc("gameserverservice"), "rationale_for", "INFERRED", 0.95),
    ("credencial_por_servidor", "fail_open_fail_closed", "conceptually_related_to", "INFERRED", 0.85),
    ("janela_de_heartbeat", "regra_dados_honestos", "conceptually_related_to", "INFERRED", 0.85),
    ("concorrencia_sem_sucesso_falso", _svc("inventoryservice"), "rationale_for", "INFERRED", 0.95),
    ("concorrencia_sem_sucesso_falso", _svc("teamservice"), "rationale_for", "INFERRED", 0.85),
    ("testes_com_servicos_reais", "sem_mocks_em_producao", "conceptually_related_to", "EXTRACTED", 1.0),
    ("testes_com_servicos_reais", "concorrencia_sem_sucesso_falso", "conceptually_related_to", "INFERRED", 0.75),
    ("convite_nao_e_notificacao", _svc("notificationservice"), "rationale_for", "INFERRED", 0.95),
    ("convite_nao_e_notificacao", "postgres_fonte_unica", "conceptually_related_to", "EXTRACTED", 1.0),
    ("gate_de_producao", "sem_cobranca_ainda", "conceptually_related_to", "EXTRACTED", 1.0),
    ("motor_de_partida_ausente", "calibracao_cinco_partidas", "conceptually_related_to", "INFERRED", 0.95),
    ("motor_de_partida_ausente", _svc("rankingservice"), "rationale_for", "INFERRED", 0.95),
    ("monolito_modular", "postgres_fonte_unica", "conceptually_related_to", "EXTRACTED", 1.0),
    ("inventario_sem_valor_economico", _svc("inventoryservice"), "rationale_for", "INFERRED", 0.85),
    ("perfil_usa_tema_do_titular", "cargo_e_plano_independentes", "conceptually_related_to", "EXTRACTED", 1.0),
    ("perfil_usa_tema_do_titular", _THEME, "rationale_for", "INFERRED", 0.95),
    ("cargo_e_plano_independentes", _IDENTITY, "rationale_for", "INFERRED", 0.95),
    ("plano_mare_unico", _IDENTITY, "rationale_for", "INFERRED", 0.85),
    ("level_s_top_30", "calibracao_cinco_partidas", "conceptually_related_to", "EXTRACTED", 1.0),
    ("regras_estritas_de_design", "perfil_usa_tema_do_titular", "conceptually_related_to", "INFERRED", 0.75),
    ("documentacao_no_mesmo_pr", "regra_dados_honestos", "conceptually_related_to", "INFERRED", 0.85),
    ("fluxo_de_branches", "documentacao_no_mesmo_pr", "conceptually_related_to", "INFERRED", 0.75),
    ("fluxo_de_branches", "testes_com_servicos_reais", "conceptually_related_to", "INFERRED", 0.85),
    ("backup_so_vale_com_restore", "gate_de_producao", "conceptually_related_to", "EXTRACTED", 1.0),
    ("level_s_diario_e_desempate", _svc("rankingservice"), "rationale_for", "INFERRED", 0.95),
    ("elo_mede_sucesso_rating_mede_contribuicao", _RATING, "rationale_for", "INFERRED", 0.95),
    ("elo_mede_sucesso_rating_mede_contribuicao", _ELO, "rationale_for", "INFERRED", 0.95),
    ("unidade_valida_e_versionada", _INGESTION, "rationale_for", "INFERRED", 0.95),
    ("unidade_valida_e_versionada", "calibracao_cinco_partidas", "conceptually_related_to", "EXTRACTED", 1.0),
    ("ingestao_idempotente", _INGESTION, "rationale_for", "INFERRED", 0.95),
    ("ingestao_idempotente", "concorrencia_sem_sucesso_falso", "conceptually_related_to", "INFERRED", 0.85),
    ("ingestao_idempotente", "identidade_fixa_de_servidor", "conceptually_related_to", "INFERRED", 0.85),
    ("motor_de_partida_ausente", _INGESTION, "conceptually_related_to", "INFERRED", 0.75),
    ("level_s_diario_e_desempate", "calibracao_cinco_partidas", "conceptually_related_to", "EXTRACTED", 1.0),
    ("horas_jogadas_medidas", _PLAYTIME, "rationale_for", "INFERRED", 0.95),
    ("horas_jogadas_medidas", "regra_dados_honestos", "conceptually_related_to", "INFERRED", 0.85),
    ("horas_jogadas_medidas", "redis_apenas_efemero", "conceptually_related_to", "INFERRED", 0.85),
    ("historico_de_busca_privado", _SEARCH_HISTORY, "rationale_for", "INFERRED", 0.95),
    ("historico_de_busca_privado", "regra_dados_honestos", "conceptually_related_to", "INFERRED", 0.75),
    ("documentacao_no_mesmo_pr", _SHORTCUTS, "rationale_for", "INFERRED", 0.65),
]

# (id, label, member slugs, relation, doc)
GROUPS: list[tuple[str, str, list[str], str, str]] = [
    ("invariantes_de_integridade", "Data Integrity Invariants",
     ["regra_dados_honestos", "calibracao_cinco_partidas", "sem_mocks_em_producao",
      "motor_de_partida_ausente", "testes_com_servicos_reais"], "form", D19),
    ("fronteira_de_confianca", "Trust Boundary",
     ["steam_state_one_time", "rotacao_refresh_cas", "jwt_nao_autoritativo",
      "distincao_401_403", "fail_open_fail_closed", "credencial_por_servidor"],
     "participate_in", D13),
    ("gate_comercial", "Commercial Readiness Gate",
     ["gate_de_producao", "sem_cobranca_ainda", "plano_mare_unico",
      "backup_so_vale_com_restore", "inventario_sem_valor_economico"],
     "participate_in", D08),
]


def _stem(doc: str) -> str:
    return doc[:-3].replace("/", "_").replace(".", "_").replace("-", "_")


def build_semantic_layer(root) -> dict:
    """Return the invariant layer as a graphify extraction fragment."""
    root = Path(root).resolve()

    def source(doc: str) -> str:
        return str(root / doc)

    doc_of = {slug: doc for doc, slug, _, _ in CONCEPTS}
    ident = {slug: f"{_stem(doc)}_{slug}" for doc, slug, _, _ in CONCEPTS}

    def resolve(ref: str) -> str:
        return ident.get(ref, ref)

    nodes = [{
        "id": ident[slug],
        "label": label,
        "file_type": "rationale",
        "source_file": source(doc),
        "source_location": None,
        "source_url": None,
        "captured_at": None,
        "author": None,
        "contributor": None,
        "rationale": rationale,
    } for doc, slug, label, rationale in CONCEPTS]

    edges = [{
        "source": resolve(src),
        "target": resolve(dst),
        "relation": relation,
        "confidence": confidence,
        "confidence_score": score,
        "source_file": source(doc_of[src]) if src in doc_of else None,
        "source_location": None,
        "weight": 1.0,
    } for src, dst, relation, confidence, score in LINKS]

    hyperedges = [{
        "id": gid,
        "label": label,
        "nodes": [resolve(m) for m in members],
        "relation": relation,
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": source(doc),
    } for gid, label, members, relation, doc in GROUPS]

    return {"nodes": nodes, "edges": edges, "hyperedges": hyperedges,
            "input_tokens": 0, "output_tokens": 0}
