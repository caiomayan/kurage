# Plano de evolução — identidade, perfil, Rating e ranking

[Voltar ao índice](./00_index.md)

**Estado:** aprovado; revisão 3 em execução por entregas pequenas.  
**Atualização:** 05/09/2026.  
**Base de código inspecionada:** `fbf1195`, branch `dev`.  
**Execução deste ciclo:** etapas 1, 2, 4 e 5 concluídas; etapa 3 entregue no código, faltando aprovação visual e medição de FPS. O ciclo competitivo está fechado de ponta a ponta — o plugin emite rounds, a API ingere, as unidades fecham e a calibração avança. Falta rodar com jogo real.

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

**Próxima ação:** rodar o Retake local com o plugin novo e conferir que os rounds
chegam, as unidades fecham e a calibração avança com jogo de verdade. Confirmado
isso, a etapa 6 fica liberada: rankings geral e por modo, níveis coloridos e o
Level S visível na interface. Seguem pendentes a aprovação visual e a medição de
FPS da etapa 3, e o dropdown do avatar.

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
| 04/09/2026 | Etapa 1 validada em integração real e commitada | Commits `ddbdd2d` e `d88b9be` na `dev`. `verify -Pintegration` com Docker ativo revelou que `ProfileVisitPostgresRedisIT` recebia 500 onde esperava 403: `GlobalExceptionHandler` não tratava `AccessDeniedException` e toda negação de autorização virava erro de servidor, quebrando a distinção 401/403 do documento 13. Handler adicionado. Resultado: 161 unitários + 30 integrações verdes, frontend com lint limpo, 29/29 testes e build de produção. Pendências inalteradas: migração dos demais testes mockados, e etapas 2–7 não iniciadas |
| 04/09/2026 | Grafo de conhecimento do repositório | `graphify-out/` (ignorado pelo Git) com 2.505 nós e 148 comunidades sobre backend, frontend, plugins, migrations, Terraform e `docs/pt`. As invariantes documentadas viraram nós de conceito ligados ao código que governam. `CLAUDE.md` na raiz consolida essas regras para sessões de agente. Ferramenta de apoio: não substitui a auditoria 08 nem este plano como referência de prontidão |
| 05/09/2026 | Etapa 3: composição, fundo e desempenho do perfil | O `ProfileOceanicBackground` foi removido. Ele mantinha **13 animações infinitas simultâneas** — três morphs de path SVG, três halos com `blur-3xl` e sete partículas — todas em `mix-blend-screen`, além de um azul `#92bce3` cravado que escapava do tema. Substituído pelo `ProfileDepthField`: um único canvas, um laço de `requestAnimationFrame`, resolução limitada a 1.5x, suspenso fora da viewport e com a aba oculta, estático sob `prefers-reduced-motion`, e acento resolvido do token CSS com releitura quando o tema de identidade muda (seção 2.2). As abas viraram um componente com uma linguagem visual única, `role="tablist"`, navegação por setas e rótulos curtos: "Visão Geral & Telemetria" virou "Visão geral". A `PlayerMetricsRibbon` perdeu seis funções de tier quase idênticas e passou a derivar a barra do valor medido — antes ela devolvia 95/72/48/25 fixos por tier, então dois valores muito diferentes desenhavam a mesma barra. Correções de honestidade: K/D deixou de cair para `0` e de virar contagem bruta de kills quando `deaths = 0`; o card "Rating 2.0 / HLTV Impacto" virou "Rating", porque a seção 4.1 define HLTV como dado futuro e exclusivo de 5v5 que não compõe o Rating da plataforma; o nível deixou de ser `?? 0`. Contraste corrigido: rótulos usavam `--mute` (#444) sobre quase-preto, cerca de 2.2:1. GSAP entrou como dependência a pedido do proprietário. Validação: lint limpo, 41/41 testes, build de produção, e conferência visual em 1440x900 e 375x812 contra a API local com PostgreSQL e Redis reais |
| 05/09/2026 | Pendências da etapa 3 | Não entregues: aprovação visual do proprietário (seção 7.5) e a medição de antes/depois de FPS no equipamento alvo (seção 7.6), que exigem a máquina dele. O quadro de visitantes já existia da etapa 1 e não foi retrabalhado. O dropdown do avatar, também previsto na etapa 3, continua pendente |
| 05/09/2026 | Etapa 5: parte decidida implementada | Migração `V11`. **Horas jogadas** persistidas em `player_stats.playtime_seconds`, acumuladas pela presença observada no heartbeat: cada avistamento credita apenas o intervalo desde o anterior, limitado à janela de 90s; silêncio do servidor não vira hora, espectador não acumula e ainda quebra a corrente, e quem não tem conta vinculada não credita a ninguém. A soma acontece no banco, então heartbeats concorrentes não perdem incremento. **Desempate** do ranking passou a ser ELO → K/D → menos horas → identificador, corrigindo um defeito real: a consulta ordenava só por `kurage_elo DESC` e devolvia ordem arbitrária em caso de empate. **Level S** ganhou a tabela `level_s_grants` e um job à meia-noite (`America/Sao_Paulo`), idempotente, limitado a 30 vagas e restrito a calibrados; a leitura é a concessão do dia, não a posição atual. Um defeito foi encontrado pelos testes: o job dependia da associação `PlayerStats.user` estar materializada e pulava todos quando ela chegava vazia do contexto de persistência — agora ele usa o identificador. Validação: 165 unitários + 57 integrações verdes com PostgreSQL 16 e Redis 7 reais |
| 05/09/2026 | Etapa 5: proposta registrada | [Documento 20](./20_contrato_rating_e_eventos.md) com a fórmula do Rating centrada em 1.00 e componentes por lado, o ELO ancorado em desempenho, o encolhimento e a janela deslizante contra farming, o contrato `POST /plugin/v1/rounds`, a política de retenção e reprocessamento, e a matriz OWNER/ADMIN. **Nada disso está implementado.** O documento também registra o bloqueio real: o plugin não envia evento de round, então `matchesPlayed` não incrementa e a calibração de 20 rounds não tem como completar até esse contrato existir |
| 05/09/2026 | Documento 20 revisado com o modelo de ELO e Rating do proprietário | O proprietário separou os dois conceitos: **ELO mede sucesso** (o jogador vence?) e **Rating mede contribuição** (o quanto ele é bom e faz o resultado acontecer), medidas independentes que se correlacionam sem que uma derive da outra. A proposta anterior estava errada nisso: ela derivava o ELO do Rating, o que transformaria a correlação em tautologia. O ELO passou a ser Elo clássico sobre resultado, com uma única formulação que serve aos três modos — cada modo produz um score em [0,1] e uma força de adversário: vitória no 5v5, fração de rounds vencidos no bloco de retake, colocação normalizada na sessão de DM. **O ELO é global, sem valor por modo**, por decisão do proprietário; rankings por modo ordenarão pelo Rating daquele modo. O Rating ganhou duas famílias de cálculo — por round para retake e 5v5, por minuto para DM — já deixando DM e 5v5 prontos. Sobre o HLTV Rating: o levantamento das fontes mostrou que 2.1 e 3.0 não têm coeficientes públicos, e que a 3.0 depende do Round Swing, um modelo proprietário de probabilidade de vitória por mapa/lado/economia. A maior versão com fórmula utilizável é a **2.0**, por engenharia reversa consolidada, a ser exibida sempre rotulada como aproximação e apenas para 5v5 |
| 05/09/2026 | Etapa 5: modelo competitivo e ingestão implementados | Documento 20 aprovado; pesos e referências definidos pela implementação sob autorização. Migração `V12` com `round_events` (cru e imutável, com chave de idempotência), `round_participations` e `competitive_blocks`. `CompetitiveScales` concentra pesos, referências e a versão do algoritmo, para que recalibrar seja publicar versão nova em vez de editar valores calculados. `RatingCalculator` mede contribuição em duas famílias — por round para retake e 5v5, por minuto para DM, já prontos — e `EloCalculator` mede sucesso com uma formulação que serve aos três modos. `POST /plugin/v1/servers/{id}/rounds` recebe, autentica pela credencial do servidor, recusa modo divergente e sequência fora de ordem com 409, e aceita reenvio sem contar duas vezes. Ao acumular 20 rounds a unidade fecha: Rating da produção, ELO do resultado, ambos gravados com a versão. **É a primeira vez que `matchesPlayed` incrementa de verdade** — antes disto nada no sistema fazia a calibração avançar. Um defeito foi encontrado pelos testes: a reivindicação dos rounds acontecia antes de a unidade existir, violando a chave estrangeira; agora a unidade é gravada primeiro e uma reivindicação incompleta desfaz a transação em vez de gravar um bloco que declara mais rounds do que reivindicou. Validação: 173 unitários + 67 integrações verdes |
| 05/09/2026 | O que falta para o modelo receber entrada | O plugin `Kurage.Core` ainda não emite eventos de round. Enquanto isso não existir, a ingestão está pronta e testada mas sem entrada em produção. As referências de `CompetitiveScales` são chute informado e precisam ser recalibradas sobre dados reais; as de 5v5 e DM só podem ser fixadas quando os modos existirem |
| 05/09/2026 | Plugin emitindo rounds: o ciclo fechou | `Kurage.Core` ganhou `RoundTracker`, deliberadamente livre de tipos do CounterStrikeSharp para que as regras que importam — o que é trade, o que é abate de abertura, quem participou do round — possam ser verificadas sem subir um servidor de CS2. O plugin engancha `round_start`, `player_hurt`, `player_death` e `round_end`, monta o evento e envia. Participante é só quem estava em CT ou TR no início do round; dano em companheiro de equipe não conta como produção; trade é resolvido pela definição usual — A cai para B e B cai em até cinco segundos, então a morte de A foi trocada. Há fila de reenvio limitada a 60 rounds, que para no primeiro envio falho para não furar a sequência, já que a API recusa sequência fora de ordem. Compila sem avisos com .NET 10. **O ciclo competitivo agora existe de ponta a ponta** |
| 05/09/2026 | Referências fixadas por design, e uma assimetria corrigida | O proprietário recusou a ideia de recalibrar contra a população, e com razão: as referências **definem** a escala, não a medem. Ajustá-las ao conjunto de jogadores faria o jogador médio ler 1.00 para sempre por construção, e um 1.20 num grupo fraco valeria o mesmo que num grupo forte. É assim que as plataformas de CS operam, e é assim que a HLTV trata as suas — valores fixos, trocados só em versão nova. O `ReferenceCalibrationService` e seu teste foram removidos. Na revisão dos valores apareceu um erro real: o CT do retake estava com KPR maior que o TR, e é o contrário. Como abates de um lado são as mortes do outro, o KPR médio de um lado é o número de mortes adversárias dividido pelo tamanho do próprio lado — e o lado que ancora é o menor, então mata mais e morre mais por jogador. Referências corrigidas: retake CT 0,55/70/0,70/0,44/0,12 e TR 0,75/90/0,62/0,25/0,18; o 5v5 passou a usar as médias que a HLTV publicou com a Rating 1.0 (0,679 e 0,317); o DM passou a ter KPM igual a DPM, porque num deathmatch abates e mortes de todos se igualam e o jogador de referência tem K/D 1 |
| 05/09/2026 | Etapa 4 concluída | Busca enriquecida. O painel passou a abrir sem consulta, oferecendo buscas recentes e destinos reais. O histórico é privado e local: fica em `localStorage` sob um namespace por conta, nunca é enviado a lugar nenhum, e o visitante anônimo tem o próprio compartimento — por isso entrar ou sair da conta não expõe o que a outra sessão digitou. Cada entrada é apagável individualmente e há "Limpar" para tudo. Todo acesso ao armazenamento é protegido: navegação privada lança exceção no `localStorage` e a busca precisa continuar funcionando. O componente assina um store observável em vez de espelhar o histórico em estado do React, o que também mantém duas caixas de busca em sincronia. Os atalhos apontam apenas para rotas que existem, com teste que verifica isso, porque o P0-12 nasceu de links para páginas nunca construídas. **Não foi implementado "mais procurados"**: esta seção 8 só o permite com coleta real, janela temporal, amostra mínima e proteção contra manipulação, e proíbe fabricar popularidade enquanto o tráfego é pequeno — nada disso existe. Abrir o painel não dispara requisição alguma. Validação: lint limpo, 48/48 testes, build de produção, e conferência no navegador do ciclo buscar → selecionar → recente → apagar → limpar contra a API local |
| 04/09/2026 | Etapa 1 concluída | Commit `7a369b4`. Os três testes cujo mock escondia a propriedade sob teste migraram para Redis real: rotação de refresh (compare-and-set em Lua), state OAuth (`GETDEL`) e rate limit (`INCR`+`EXPIRE`). Um `StringRedisTemplate` mockado não executa Lua, então a cobertura anterior afirmava a chamada sem provar a atomicidade. `RefreshTokenRotationIT` disputa oito refreshes concorrentes e exige convergência no token do vencedor. Os casos de Redis indisponível permanecem mockados por decisão: derrubar o container compartilhado no meio da suíte não é opção, e são eles que provam fail-open/fail-closed. Suíte: 156 unitários + 43 integrações verdes |
| 04/09/2026 | Etapa 2 concluída | Commit `235c765`. `lib/identity.ts` resolve a precedência Dono > Admin > Maré > padrão como função pura; assinatura expirada lê como FREE. `lib/theme.ts` mantém a identidade do visitante sob uma pilha de escopos de perfil, substituindo os dois escritores que competiam pelo `data-kurage-theme`. O perfil assume a identidade do titular e restaura a do visitante ao sair, inclusive para visitante anônimo e acesso direto por URL. Tokens de Dono e Admin adicionados; cores semânticas de erro/sucesso preservadas. 37/37 testes de frontend, lint limpo, build de produção |

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
