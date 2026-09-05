# Plano de evolução — identidade, perfil, Rating e ranking

[Voltar ao índice](./00_index.md)

**Estado:** aprovado; revisão 3 em execução por entregas pequenas.  
**Atualização:** 31/08/2026.  
**Base de código inspecionada:** `184a7dc`, branch `dev`.  
**Execução deste ciclo:** etapa 1 iniciada; primeiro recorte funcional implementado e aguardando validação de integração com Docker.

Este documento é a referência de continuidade deste ciclo. Consolida as decisões
da conversa e substitui propostas anteriores conflitantes. Não descreve todas as
funcionalidades atuais como concluídas, nem autoriza implementar todas as etapas
de uma vez. O proprietário revisará o plano antes do início.

## Pré-requisito documental concluído nesta revisão

Antes da implementação, a documentação relevante foi confrontada com o código e
com o estado operacional informado/testado em 31/08. Foram corrigidas divergências
materiais sobre o primeiro deploy web, a remoção já concluída do MongoDB, a
visibilidade pública do repositório, o entitlement de visitantes e o rating
`1.00` ainda fabricado pelo hovercard. Documentos históricos continuam
identificados como baseline; não foram reescritos como se descrevessem o snapshot
atual.

Esta revisão não transforma a auditoria em garantia de que toda afirmação antiga
do repositório foi revalidada. Ela corrige o conjunto que altera este plano e o
estado de início. A implementação de cada etapa ainda deve atualizar a documentação
afetada no mesmo PR.

## 1. Objetivo e limites

Polir a identidade e a experiência do Kurage, mantendo sua estrutura reconhecível,
e preparar estatísticas e classificações confiáveis para os modos da plataforma.
O público inclui jogadores novos, calibrados, assinantes e equipe administrativa.

Diretrizes:

- preservar estrutura visual e fluxos úteis; não substituir tudo por um template;
- combinar a referência Resend em `frontend/DESIGN.md` com a identidade marinha
  existente e as decisões deste plano;
- privilegiar beleza, leitura, interação e desempenho simultaneamente;
- remover de todo o sistema mocks, fixtures servidas como dado real e fallbacks
  numéricos/textuais que inventem estado de produção; ausência, indisponibilidade
  e calibração devem permanecer estados explícitos;
- não simular atividade, classificação, pagamentos, servidores ou estatísticas;
- desenvolver e validar localmente, com entregas pequenas para avaliação;
- preservar o ambiente publicado; nenhum deploy ou merge em `main` é implícito;
- manter PostgreSQL e Redis: este plano não requer outro banco ou linguagem;
- pagamentos, backup, servidor público de CS2 e implementação de 5v5 ficam fora
  deste ciclo. Somente suas dependências pertinentes são consideradas.

## 2. Cargo e assinatura independentes

Cargo da plataforma: `USER`, `ADMIN` ou `OWNER`. Assinatura: `FREE` ou `MARE`.
Um admin pode ser assinante; comprar Maré não concede administração. Cargo não
ativa automaticamente uma assinatura. Ser dono/admin de um time também não
equivale a ser dono/admin da plataforma.

Os enums de cargo já existem no backend. A execução deverá revisar sua aplicação,
exposição nos contratos e autorização; não criar uma segunda representação
concorrente do mesmo cargo.

Proposta de permissões para detalhar na etapa 1: proprietário controla a concessão
de cargos; admins recebem permissões operacionais específicas, sem autopromoção
ou transferência de propriedade. A matriz exata deve ser aprovada antes de expor
ações administrativas. Alterações sensíveis devem ser auditáveis no backend.

### 2.1. Paleta e precedência

| Identidade | Cor de destaque |
|---|---|
| Dono | Dourado âmbar `#E9B95F` |
| Admin | Turquesa vivo `#29D3B0` |
| Maré | Coral Vivo atual `#FF4D6D` |
| Comum/visitante | Verde-água atual, preservando os tokens existentes |

Precedência: **Dono > Admin > Maré > padrão**. O admin assinante mantém as duas
identidades e seus benefícios, mas o tema resolvido é o de admin.

Não usar azul comum, azul-escuro ou roxo-escuro como novas cores de cargo/plano.
Superfícies neutras, texto e cores semânticas de erro/sucesso não são repintados
indiscriminadamente. Cargo, assinatura e habilidade não concedem pontos entre si.

### 2.2. Tema de navegação versus tema de perfil

- Em páginas gerais, resolver a identidade de quem está navegando.
- Ao abrir um perfil, a página assume a identidade do **usuário daquele perfil**,
  incluindo sua ambientação e seus acentos visuais.
- Ao sair do perfil, restaurar o tema do visitante autenticado ou o padrão.
- Selos e avatar da própria conta continuam representando a própria conta;
  visitar um perfil não muda sessão, permissões ou assinatura.
- A regra também funciona para visitantes não autenticados e acesso direto por URL.

Exemplo: Dono navega em dourado, visita usuário comum e vê seu perfil verde-água;
visita assinante e vê seu perfil coral; volta à home e recupera o dourado.

Implementar resolução central de identidade e escopo de tema. Componentes,
portais/modais e materiais gráficos precisam receber o tema correto sem vazamento
entre rotas. Resolver cores CSS para valores utilizáveis pelo renderizador 3D;
não assumir que uma string `var(...)` será interpretada como cor em qualquer API.

**Aceite:** testar combinações de visitante/perfil, navegação rápida, recarga,
login/logout, troca de conta, assinatura expirada e erro de carregamento. Nenhum
conteúdo de um perfil deve usar dados ou permissões do visitante por engano.

## 3. Dados reais, calibração e elegibilidade

Separar explicitamente ausência de dados, calibração e classificação concluída.
Valores internos iniciais de um modelo não representam habilidade comprovada.
Ausência de estatística deve ser apresentada como indisponível, e não inventada.

Foi identificado `hltvRating = 1.00` fixo no hovercard em `UserService.java` quando
há partidas. Sua remoção entra na etapa 1, junto à revisão de ELOs substitutos,
misturas de fontes e diferenças entre perfil, busca, hovercard e menu da conta.
Estatísticas FACEIT podem ser exibidas como FACEIT, nunca como atividade Kurage.

### 3.1. Triagem inicial: referência de 5 partidas válidas

O jogador deve concluir uma triagem de calibração antes de entrar na classificação
definitiva e poder ser Level S. A referência inicial solicitada é **5 partidas
válidas**. Não basta criar a conta nem apenas aparecer entre os primeiros usuários.

- mostrar progresso real, como `3/5 partidas de calibração`;
- não mostrar classificação definitiva nem S antes de concluir a triagem;
- a quinta partida precisa ser validada e processada, não apenas iniciada;
- repetição de um evento não pode contar duas vezes;
- bots, aquecimento, AFK e atividade inválida não completam a triagem;
- não recomeçar a calibração só porque o usuário desconectou ou ficou inativo;
- calibrar cada modo separadamente; considerar no geral somente contribuições
  elegíveis segundo o contrato de cada modo.

**Detalhe técnico ainda a fechar na etapa 5:** o retake é contínuo e não tem a
mesma unidade de partida do 5v5. Definir uma sessão/bloco válido, número mínimo de
rounds e tratamento de entradas/saídas. Não converter silenciosamente as cinco
partidas em cinco rounds, cinco conexões ou cinco trocas de mapa. Validar a
quantidade de evidência antes de ativar o cálculo público.

## 4. Rating principal da plataforma, ELO e futuro HLTV

O **Rating** é o indicador principal de desempenho do jogador na plataforma. Na
interface, chama-se apenas **Rating**, sem denominação comercial adicional. Seu
valor geral é calculado a partir de todos os modos Kurage em que o jogador possua
amostra válida. O 5v5 terá o maior peso entre os modos quando for implementado.
Internamente, registrar versão, componentes e metodologia para auditoria e
possibilidade de recálculo.

- Rating geral: principal dado de desempenho do perfil, combinado a partir das
  contribuições válidas dos modos jogados, com maior influência futura do 5v5.
- Rating por modo: componente contextual que explica a contribuição de retake,
  DM, 5v5 ou outro modo elegível ao Rating geral.
- ELO: estimativa de habilidade relativa, que pode subir ou cair.
- Level: apresentação da classificação; S é uma distinção por posição geral.

Projetar uma metodologia comum de Rating com tratamento adequado a cada modo.
Não transportar diretamente K/D, vitórias ou economia do DM para retake/5v5.
O componente 5v5 deve ter o maior coeficiente/influência, mas a ausência de 5v5
não elimina nem zera automaticamente um especialista de retake. A combinação
precisa permitir que ele alcance o topo geral, conforme decisão de produto, sem
incentivar a omissão estratégica de um modo ruim ou o farming de volume. A fórmula
e seus pesos são gate da etapa 5, a serem simulados antes da ativação pública.

O heartbeat atual não fornece sozinho o histórico necessário. Preparar eventos
confiáveis do servidor: identificação de servidor/modo/sessão/round/jogador,
sequência temporal, mortes, dano, assistências, trades, objetivos, sobrevivência,
equipamentos e contexto pertinente. Detalhar o contrato antes de ampliar a coleta.

Recepção deve ser autenticada, idempotente e tolerante a reenvio/reconexão. Os
eventos e resultados precisam permitir explicar e recalcular alterações sem
duplicar pontos. Definir também retenção, volume e proteção contra manipulação.

### 4.1. Requisito futuro do 5v5

Disponibilizar, quando tecnicamente viável de forma fiel:

- rating HLTV por partida 5v5;
- agregado de partidas 5v5 com filtros de período;
- versão da metodologia e quantidade de partidas/rounds da amostra.

O HLTV Rating é um dado adicional do jogador exclusivamente relacionado ao 5v5;
**não é, não substitui e não compõe automaticamente o Rating principal da
plataforma**. Essa entrega é separada do Rating padrão. A documentação pública do HLTV 3.0
não estabelece uma implementação completa que possamos assumir reproduzível.
Antes de prometer a funcionalidade, verificar metodologia e fonte dos dados.
Não rotular uma aproximação própria como HLTV oficial nem definir o agregado
como média simples antes de verificar a metodologia correta.

Referências: [apresentação do HLTV 3.0](https://www.hltv.org/news/42485/introducing-rating-30)
e [ajustes posteriores](https://www.hltv.org/news/43047/rating-30-adjustments-go-live).

## 5. Ranking geral, rankings por modo e inatividade

- Manter classificação geral e preparar retake, competitivo e DM separadamente.
- Hoje, havendo somente retake, o geral reflete esse modo.
- O Rating geral combina todos os modos em que o jogador possua amostra válida.
- Um especialista em retake pode disputar o topo geral; jogar todos os modos não
  será obrigatório nem a ausência de um modo será tratada simplesmente como zero.
- No futuro, o componente 5v5 terá o maior peso no Rating geral.
- Maior peso não significa bônus fixos indiscriminados ou soma ilimitada de pontos.
- Definir pesos, normalização e limites de exploração com dados e cenários reais.
- Modos sem dados não recebem jogadores, resultados ou posições inventadas.

O cálculo deve considerar dificuldade/adversários, amostra e contexto. No retake,
avaliar lado, mapa, composição, equipamento e participação real. No DM, definir
um critério próprio; no 5v5, respeitar o resultado coletivo e o contexto competitivo.

O teto visual é o nível 10, com S por posição. Não introduzir um corte bruto no
ELO que empate artificialmente todos os melhores. Níveis não são XP acumulado.
Os limites numéricos e mecanismos de controle de inflação serão especificados
antes de ativar a nova classificação, não inventados durante a implementação UI.

### 5.1. Inatividade

Não haverá redução automática de ELO, recalibração obrigatória ou retirada do
ranking somente por inatividade neste ciclo. O jogador pode perder posição e S
porque outros o ultrapassaram, mantendo exatamente seu ELO anterior.

Não implementar reset sazonal ou decaimento sem nova decisão do proprietário.

## 6. Levels e top 30 S

Após concluir a calibração, os **30 primeiros do ranking geral** exibem Level S.

- Não exigir nível-base 10, ELO mínimo extra ou assinatura/cargo.
- Com 12 jogadores calibrados, os 12 podem ser S, mesmo havendo outras contas
  ainda em calibração. A exclusividade aumenta com a base de jogadores.
- Ao entrar no top 30, mostrar S; ao sair, mostrar o nível-base correspondente ao ELO.
- Preservar nível-base e ELO internamente; não alterar pontos ao conceder o S.
- S não é um cargo administrativo nem uma assinatura e não troca o tema inteiro.
- A distinção é geral: rankings por modo não criam outros grupos de 30 usuários S.
- Aplicar um desempate documentado e determinístico para nunca exceder 30 vagas.

Paleta aprovada como direção:

| Nível | Família de cores |
|---|---|
| 1–3 | Cinza mineral e verdes discretos |
| 4–6 | Verde-água, jade e turquesa |
| 7 | Âmbar |
| 8 | Laranja |
| 9 | Vermelho |
| 10 | Rosa intenso |
| S | Preto obsidiana, contorno contrastante e letra legível |

As cores de nível são estáveis entre visitantes, perfis e temas. Não depender
somente de cor: manter número/letra, contraste e descrição acessível.

**Aceite:** nenhum S com 0–4 partidas válidas; elegibilidade só após concluir a
quinta unidade válida; verificar bases menores/maiores que 30, empate na posição
30, entrada/saída do top, reenvio de resultados e consistência entre telas/plugin.

## 7. Perfil: frente dedicada de remoção de slop e desempenho

### 7.1. O que preservar

Preservar a identidade/avatar, o header e os fluxos úteis de visão geral,
estatísticas, inventário e partidas. **Depois do avatar/header, a composição pode
ser reorganizada livremente**: cards podem virar faixas, listas, agrupamentos ou
outra hierarquia mais coesa. Não preservar quantidade/posição de cards apenas por
inércia, nem esconder recursos para produzir aparência artificialmente limpa.

A página deve permitir entender quem é o jogador, sua classificação e atividade,
com distinguir claramente dados Kurage e externos. Visitantes e titular devem
perceber corretamente suas ações disponíveis.

### 7.2. Diagnóstico verificável antes do primeiro ajuste

Registrar capturas desktop/mobile e medir o perfil em build de produção. Avaliar
estados vazio, calibrando e preenchido usando dados reais disponíveis. Quando
faltarem estados para validação, registrar a lacuna em vez de inventar atividade.

O código atual apresenta pontos concretos a revisar: fundos com múltiplos halos
grandes desfocados, morphing contínuo de paths SVG, `mix-blend-screen`, azul fixo
em efeitos, superfícies com blur/sombra e tratamento desigual dos botões de abas.
São candidatos a simplificação; o custo real deve ser medido, não presumido.

### 7.3. Seções, botões e cards

1. **Hierarquia:** nome/avatar como foco; cargo, Maré, level e ELO organizados sem
   competição visual. Evitar métricas repetidas no cabeçalho, cards e dropdown.
2. **Seções:** reduzir caixas dentro de caixas, excesso de cabeçalhos e espaços
   sem função. Separar assuntos com ritmo, alinhamento e divisórias discretas.
3. **Botões/abas:** uma linguagem consistente para selecionado, hover, foco,
   pressionado e desabilitado. Ícones úteis, rótulos curtos, alvos confortáveis no
   toque; nada depende exclusivamente de hover ou de ícones sem nome acessível.
4. **Cards:** padronizar raio, borda, tipografia e espaçamento; cor como destaque
   intencional, não contorno brilhante em todas as caixas. Não dar aparência de
   clicável a um card apenas informativo.
5. **Estatísticas/gráficos:** período, modo e amostra claros; comparação só quando
   há evidência. Não desenhar curva fictícia para preencher espaço.
6. **Inventário e partidas:** preservar imagens úteis e dados reais; revisar
   densidade, ações, alinhamento e carregamento. Não reintroduzir recursos removidos.
7. **Texto:** português natural e conciso; remover floreios e jargões desnecessários,
   como títulos longos quando uma palavra simples comunica a mesma função.
8. **Estados:** vazio, erro, carregamento, conteúdo longo e falta de permissão com
   feedback apropriado, sem enfeites que disputem atenção com a ação principal.

### 7.4. Quadro dos últimos visitantes

Adicionar ao perfil um quadro compacto com os **20 visitantes mais recentes** do
perfil exibido. A experiência mostra prioritariamente avatar/logo e data/hora da
visita; não deve virar uma grade de cards estatísticos. Nome acessível/tooltip e
link para o perfil podem apoiar reconhecimento e navegação sem poluir a composição.

Autorização é determinada pelo **visitante que está consultando o quadro**:

- assinante Maré ativo, `OWNER` ou `ADMIN` pode consultar os visitantes da própria
  página e de qualquer outro perfil;
- usuário comum/gratuito e visitante anônimo não recebem identidades ou horários;
- a autorização deve ocorrer no backend para cada requisição; esconder o componente
  no cliente não protege os dados;
- o titular do perfil não ganha acesso por ser titular se não satisfizer um dos
  critérios acima;
- auto-visitas continuam ignoradas e o debounce atual de uma hora por par pode
  ser preservado, desde que validado em integração real;
- limitar resposta a 20 e ordenar da visita mais recente para a mais antiga;
- data/hora usa timezone/locale de apresentação sem alterar o instante persistido;
- definir transparência e retenção antes de ampliar o uso dos registros.

Estado atual auditado: PostgreSQL já persiste `ProfileVisit`; existe
`GET /users/me/visitors?limit=20`, protegido por `PROFILE_VISITORS`, com override
de Admin/Dono. Ele consulta apenas o próprio usuário e não há componente no perfil.
A etapa deverá criar consulta autorizada para o perfil-alvo, reduzir o contrato ao
necessário para a UI e eliminar ELO/level substitutos da resposta.

O recurso só será considerado pronto quando funcionar ponta a ponta: gravação de
visita autenticada, deduplicação, consulta do perfil-alvo, autorização no backend,
limite/ordenação, contrato sem dados artificiais, renderização no perfil e estados
de carregamento, vazio, proibido e erro. Testes devem usar PostgreSQL e Redis reais
via Testcontainers, sem substituir persistência ou autorização por mocks.

### 7.5. Substituir a ambientação do perfil nesta etapa

O fundo do perfil será trabalhado **junto do seu polimento**, e não adiado até a
última etapa global. Direção: sensação submersa, luz filtrada por ondulações da
superfície e presença marinha discreta. Avatar e informação permanecem o foco.

- Trocar a sobreposição de enfeites por uma composição visual coerente.
- Usar a paleta do titular do perfil, sem azul fixo escapando ao tema.
- Incluir ondas/correntes/luz aquática com movimento orgânico e boa composição.
- Águas-vivas podem integrar a cena quando melhorarem o resultado, não como
  obrigação de multiplicar organismos ou partículas em todas as seções.
- A riqueza vem de forma, luz e movimento; não do número de filtros/efeitos.
- Definir referência visual antes do código e validar com o proprietário.

### 7.6. Beleza e desempenho como critérios conjuntos

Escolher CSS/SVG/Three.js conforme a composição e o custo medido; não migrar tudo
para WebGL por princípio. Evitar múltiplos loops/canvases decorativos concorrentes.
Reutilizar recursos, limitar resolução e sobreposição transparente, liberar
recursos ao sair da rota e pausar atividade fora de vista/aba oculta.

Não atualizar estado React por quadro para mover o fundo. Evitar animações de
layout custosas em listas/cards. Carregar efeitos e conteúdo pesado sob demanda
quando isso não causar saltos ou atrasos visíveis.

Registrar antes/depois no notebook do proprietário: tempo por quadro, picos e
travadas, resposta de abas/busca/dropdown, memória e custo de renderização. Testar
scroll, troca de perfis/temas e retorno repetido à página.

A meta é navegação fluida próxima de 60 FPS no equipamento-alvo, não uma garantia
universal. Não aceitar média alta que esconda travadas frequentes. Qualidade
adaptativa e modo de movimento reduzido devem manter uma composição bonita,
legível e intencional, não uma versão visualmente abandonada.

**Aceite da etapa de perfil:** comparação visual aprovada desktop/mobile; todos
os estados e temas coerentes; teclado/toque funcionais; dados verdadeiros;
evidência de desempenho sem regressão nos fluxos centrais. Registrar pendências
se a máquina/navegador necessário para a medição não estiver disponível.

## 8. Dropdown, busca e página de ranking

### Dropdown do avatar

Simplificar a organização em identidade, cargo/plano e ações da conta. Remover
mini-dashboard redundante, descrições óbvias e decoração excessiva. Manter foco,
teclado, fechamento previsível e distinção de ações sensíveis. Selos continuam
referindo-se à conta autenticada mesmo ao visitar outro perfil.

### Busca global

Preservar visual e animação que já funcionam. Ao abrir sem consulta, oferecer
recentes privados e apagáveis, atalhos contextuais e destinos úteis reais.
Separar histórico por conta e evitar vazamento após logout/troca de usuário.

Adicionar mais procurados somente com coleta real, janela temporal, amostra mínima
e proteção contra manipulação. Não publicar textos pessoais digitados por outras
pessoas nem fabricar popularidade quando o tráfego ainda for pequeno.

Manter debounce, resultados estáveis, teclado, feedback de falha/ausência e
permissões apropriadas. Sugestões não podem bloquear a digitação ou gerar
carregamento pesado a cada abertura.

### Página de ranking

Preservar estrutura e melhorar tabela/cards, densidade, tipografia e alinhamento.
Adicionar visões geral/por modo, localização da própria posição, Level S e
calibração. Período, origem e momento da atualização precisam ficar claros.

Revisar consultas, paginação, desempates e cache para que desempenho e consistência
acompanhem o polimento visual. Não anunciar um modo ainda inexistente como ativo.

## 9. Animações marinhas globais

Expandir a linguagem validada no perfil para outras superfícies, conforme contexto:

- superfície do mar: ondas, reflexos, ondulações e horizonte;
- interior do mar: profundidade, correntes, partículas e luz filtrada;
- vida marinha: águas-vivas e bioluminescência.

Não usar todas as famílias simultaneamente em todas as páginas. Home pode receber
maior presença; leitura de perfil/ranking e operação do inventário têm prioridade.
Preservar proteções atuais de resolução, visibilidade e movimento reduzido.

Skills instaladas como ferramentas de apoio, fora do repositório:

- `threejs-animation` e `threejs-shaders`, [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills),
  referência `b1c623076c661fc9b03dac19292e825a5d106823`;
- `impeccable`, [pbakaus/impeccable](https://github.com/pbakaus/impeccable),
  referência `b0594c72d18006b5865c70eb3a97e8b04064e600`.

Skills não substituem o briefing, as instruções do repositório ou validação real.
Não adicionar hooks, serviços ou outras dependências só por recomendação de skill.

## 10. Etapas e checkpoints

O proprietário autorizou o início. A execução segue por recortes verificáveis;
nenhuma etapa posterior deve ser presumida concluída pela existência de código parcial.

| Etapa | Entrega | Condição para concluir |
|---|---|---|
| 1 | **Em andamento:** contratos de cargo/plano, estados de calibração e remoção global de mocks/fallbacks artificiais | Auditoria concluída, contratos honestos e testes reais das respostas/autorizações afetadas |
| 2 | Temas pessoais e tema contextual de perfil | Matriz visitante/perfil, navegação e sessão validadas |
| 3 | Perfil completo: composição pós-header, quadro de 20 visitantes, botões/cards, novo fundo e desempenho; dropdown | Autorização real e aprovação visual/funcional local, com comparação de desempenho |
| 4 | Busca enriquecida com recentes e sugestões reais | Privacidade, teclado, estados e latência validados |
| 5 | Unidade válida de calibração, eventos e modelo de Rating/ELO do retake | Regras numéricas revisadas e cálculo testado antes de afetar ranking público |
| 6 | Rankings geral/por modo, níveis coloridos, S top 30 e polimento | Calibração, elegibilidade, desempates e consistência ponta a ponta validados |
| 7 | Evolução das animações globais e revisão final | Identidade coesa e medições nos equipamentos-alvo |

Na etapa 5, primeiro definir o contrato de partida/sessão e modelo; depois coletar
e validar resultados sem alterar a classificação pública. Ativação ocorre só após
revisão. Não contar testes/simulações como partidas reais de usuários.

Cada entrega deve incluir escopo, arquivos alterados, validações executadas,
limitações e próxima ação. Testes de autorização/persistência usam serviços reais
quando aplicável; testes determinísticos do cálculo não substituem integração
PostgreSQL/Redis e validação de eventos reais do servidor. UI requer navegador,
responsividade, acessibilidade e build de produção para medir desempenho.

Seguir o fluxo documentado em [branches e CI](./18_branches_prs_ci.md): branch de
trabalho a partir de `dev`, PR e checks. Não misturar todo o ciclo em um único PR,
nem promover para `main` sem decisão específica.

## 11. Decisões técnicas que a implementação não deve inventar

As direções de produto acima estão registradas. Antes de implementar cada parte,
detalhar e revisar seu contrato específico:

- matriz efetiva de permissões OWNER/ADMIN e operações de concessão;
- unidade de partida válida no retake e evidência mínima para a triagem de 5;
- fórmula/versionamento do Rating, ELO e faixas de nível;
- agregação do Rating entre todos os modos jogados, maior peso futuro do 5v5,
  tratamento de modos ausentes e proteção contra farming/omissão estratégica;
- desempate do ranking e instante consistente de atualização do S;
- retenção dos eventos, reprocessamento e tratamento de resultados inválidos;
- viabilidade de reprodução fiel do HLTV quando o 5v5 entrar no escopo.

Esses detalhes não bloqueiam a revisão do plano ou o polimento inicial. São gates
das etapas correspondentes, não funcionalidades implicitamente aprovadas.

## 12. Registro de continuidade e retomada

**Próxima ação:** continuar a etapa 1 migrando, por domínio, os 20 arquivos de
teste que ainda usam Mockito para integração/contratos reais. Reexecutar os testes
de ranking e visitantes com PostgreSQL/Redis assim que o Docker Engine estiver
disponível; não substituir essa validação por H2 ou mocks.

Para retomar após interrupção, resumo de conversa ou em outra tarefa:

1. Ler este documento e verificar `git status`/branch atual.
2. Consultar o registro abaixo; não inferir conclusão pela existência de código.
3. Identificar a última etapa validada e a próxima ação autorizada.
4. Preservar decisões consolidadas; se surgir conflito, registrar e discutir antes
   de mudar a regra de produto.
5. Ao encerrar uma entrega, atualizar aqui o status, commit quando houver, testes,
   aprovação do proprietário, pendências e próxima ação. Não marcar validado sem
   evidência nem aprovado sem avaliação do proprietário.

| Data | Marco | Evidência/status |
|---|---|---|
| 31/08/2026 | Plano consolidado com triagem inicial de 5 partidas e perfil dedicado | Somente documentação; aguardando revisão; etapas 1–7 não iniciadas |
| 31/08/2026 | Revisão 2: Rating multimodo/5v5, HLTV secundário, visitantes e liberdade pós-header | Auditoria documental de pré-início concluída; implementação não iniciada |
| 31/08/2026 | Revisão 3 e início da etapa 1 | Rating/hovercard/busca/ranking deixaram de expor números substitutos; calibração mínima de 5 entrou nos contratos; visitantes ganharam gravação explícita, consulta por perfil e UI autorizada; `RankingServiceTest` mockado foi substituído por integração real. Suíte unitária: 161 testes verdes; integração aguarda Docker Engine |

Correções que não podem ser perdidas ao retomar:

- o perfil usa o tema do titular, não o tema do visitante;
- Level S exige calibração concluída antes de disputar o top 30;
- menos de 30 jogadores calibrados não impede conceder S a esses jogadores;
- S não exige nível-base 10 e não é exclusivo de assinantes/cargos;
- inatividade não reduz ELO nem elimina alguém do ranking/S automaticamente;
- retake pode chegar ao topo geral; 5v5 terá maior peso no futuro;
- Rating é o dado principal e combina todos os modos jogados; 5v5 terá o maior
  peso; HLTV é um dado secundário futuro e separado, específico de 5v5;
- nenhum mock ou fallback que fabrique dados pode permanecer no caminho de
  produção; ausência e falha são estados explícitos e testáveis;
- Maré/Admin/Dono podem ver os 20 visitantes recentes de qualquer perfil; a
  autorização é do observador e ocorre no backend; o fluxo só conclui funcionando
  ponta a ponta com PostgreSQL e Redis reais;
- após avatar/header, o perfil pode ser reorganizado para ganhar coesão;
- polimento e novas animações do perfil acontecem juntos na etapa 3;
- ondas e mar acima/abaixo da superfície fazem parte da identidade;
- preservar estrutura, remover ruído e comprovar beleza/desempenho em cada etapa.
