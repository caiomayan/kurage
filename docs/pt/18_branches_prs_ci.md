# Branches, pull requests e CI/CD

## Decisão atual

Desenvolvimento e testes manuais acontecem localmente, com API, frontend,
PostgreSQL e Redis locais. Existe apenas um ambiente web publicado, ligado à
`main`. Não há homologação remota nem database branching nesta fase.

| Branch | Papel | Publicação automática |
| --- | --- | --- |
| `main` | Versão publicada | Backend OCI e frontend Vercel |
| `dev` | Integração dos ajustes antes de publicar | Nenhuma |
| `feat/*`, `fix/*`, `codex/*` e outras temporárias | Uma mudança por branch | Nenhuma |

`dev` é o nome adotado; não criar uma branch permanente chamada `develop`.
Branches Git separam código, não bancos. Merge não copia banco local, `.env`
ignorado ou dados de teste para produção. Migrations novas, porém, acompanham o
código e podem modificar o banco publicado no próximo deploy: revise-as.

## O que é um PR

Um pull request (PR) é uma proposta de incorporar as mudanças de uma branch em
outra. Abrir o PR não faz merge nem publica o site.

- **Compare/head:** branch que contém suas alterações.
- **Base:** branch que receberá as alterações.
- **Files changed:** revisão do que será alterado.
- **Checks:** resultados dos testes automatizados.
- **Draft:** PR ainda em trabalho; os testes rodam, mas o merge fica indisponível
  até marcar como pronto.
- **Merge:** incorpora as alterações ao destino.
- **Close:** encerra a proposta sem incorporar as alterações.

Ao enviar novos commits à mesma branch, o PR aberto é atualizado automaticamente.
Não abra outro PR para cada correção daquele mesmo trabalho.

## Gatilhos e isolamento

Frontend quality, Backend CI/CD e Secret scan rodam em push para qualquer branch
(inclusive nomes com `/`), PRs destinados a `dev` ou `main`, e execução manual.
Push de tag não dispara esses workflows. PRs conflitantes precisam ser resolvidos
antes de o GitHub conseguir executar sua validação de merge.

Não há filtros de caminho nesses três workflows: todos os checks rodam inclusive
em mudanças de documentação. Isso custa mais minutos, mas evita checks
obrigatórios eternamente pendentes por filtro de pasta.

- `quality`: instalação pelo lockfile, ESLint, testes do frontend e build de produção.
- `test`: testes unitários e integração com PostgreSQL/Redis reais via Testcontainers.
- `gitleaks`: varredura de segredos pelo workflow de segurança.

As URLs do build de CI apontam para localhost, não para a aplicação publicada.
Os testes não recebem `BACKEND_ENV_FILE`, chave SSH ou credenciais de produção.
Os containers de integração são descartáveis; não acessam os dados da Oracle.
Isso não equivale a um teste E2E de login Steam nem a uma validação do servidor CS2.

Push testa o commit da branch. PR testa a combinação provisória com a base. Por
isso, os dois podem aparecer no mesmo trabalho: não são a mesma validação.
Novos commits cancelam testes antigos do mesmo evento/branch ou PR. O cancelamento
do backend fica apenas no job de testes, sem interromper publicação/deploy iniciado.

O backend só publica imagem e implanta na `main`, após seus testes; a implantação
também exige `BACKEND_DEPLOY_ENABLED=true`. A infraestrutura continua manual.
Qualquer alteração na `main`, inclusive documentação, pode iniciar essa publicação.

`frontend/vercel.json` permite deploy automático por Git apenas da `main`, usando
um padrão `**` que também cobre nomes como `feat/new-inventory`. Mantenha
**Production Branch = main** e **Root Directory = frontend** na Vercel.
Não há previews automáticos de `dev` ou branches temporárias. Essa configuração
não remove deployments antigos nem controla publicação manual pela CLI/painel.

A Vercel tem pipeline independente: não espera o resultado do GitHub Actions
depois do push na `main`. A barreira comum é exigir os checks no PR **antes do
merge**. O backend também não depende dos outros dois workflows após o push.
Sem proteção de branch, um push direto pode contornar essa barreira.

## Ativação inicial deste fluxo

`dev` nasce dos ajustes preparados em `codex/ci-dev`, incorporando os workflows,
o bloqueio de previews e a organização do Dependabot. Não é necessário mesclar a
branch temporária separadamente: o primeiro PR de **`dev` para `main`** leva o
conjunto. Revise o diff e aguarde os três checks antes de usar **Create a merge
commit**. Esse merge pode publicar o sistema e ativa a política do Dependabot,
que precisa estar na branch padrão. Publicar `dev` sozinho não altera a `main`.

Depois da criação inicial, com a árvore de trabalho limpa:

```powershell
git switch dev
git pull --ff-only origin dev
```

Não recrie `dev` nem force o histórico. Branches antigas precisam
receber esta configuração antes de ter o novo comportamento.

## Rotina de uma melhoria

Com os arquivos salvos/commitados e a branch `dev` já publicada:

```powershell
git switch dev
git pull --ff-only origin dev
git switch -c feat/new-inventory
```

Implemente e teste API/frontend localmente. Depois revise o que vai enviar:

```powershell
git status
git diff
git add caminho/do/arquivo
git diff --cached
git commit -m "feat: improve inventory"
git push -u origin feat/new-inventory
```

`caminho/do/arquivo` é um exemplo: selecione os arquivos reais. Não adicione segredos.
O push salva o código no GitHub e dispara CI, mas não publica essa branch.

No GitHub, vá a **Pull requests → New pull request**:

1. **Base: dev**; **compare: feat/new-inventory**.
2. Descreva objetivo, testes realizados e impactos usando o template.
3. Espere os checks do commit mais recente. Se falharem por código, corrija,
   faça commit e push na mesma branch. Use rerun para falhas transitórias, não
   para ignorar uma falha real.
4. Revise **Files changed** e use **Squash and merge** para essa branch temporária.
5. Depois do merge, pode excluir a branch temporária. Não exclua `dev` ou `main`.

Merge em `dev` executa CI novamente, mas não publica o site. Continue testando o
conjunto localmente antes de liberar uma versão.

## Publicar uma versão

1. Abra PR com **base `main`**, **compare `dev`**.
2. Revise todo o conjunto, incluindo migrations e variáveis novas. Aguarde os checks.
3. Use **Create a merge commit**, não squash/rebase, entre essas branches permanentes.
4. Acompanhe **Actions → Backend CI/CD** e o deployment de produção na Vercel.
5. Teste rapidamente o site publicado. Se falhar, investigue o job/log específico;
   não faça force push nem apague volumes para tentar resolver.
6. Sincronize `main` de volta em `dev` por PR (**base dev**, **compare main**), usando
   merge commit, se houver commits a incorporar. Isso mantém as histórias alinhadas.

Uma correção urgente pode sair da `main` em uma branch `fix/*`, ir por PR para
`main` e depois ser incorporada à `dev`. Fora dessa exceção, mantenha o fluxo normal.

## Proteções no painel do GitHub

Após os checks aparecerem no repositório, configure regras para `main` e `dev`
em **Settings → Rules → Rulesets**, ou em **Branches**, conforme o painel disponível:

- exigir pull request;
- exigir os checks `quality`, `test` e `gitleaks` (selecione os jobs do GitHub Actions);
- exigir que a branch esteja atualizada com a base antes do merge;
- bloquear force push e exclusão das branches permanentes;
- exigir resolução de conversas;
- não exigir histórico linear, pois a promoção `dev → main` usa merge commit.

Como há um único mantenedor, não exija aprovação de outra pessoa para todo PR:
o autor não pode aprovar seu próprio PR. Revisar o diff e passar pelos checks
continua necessário. Não use o check de deploy Vercel/OCI como obrigatório no PR,
pois publicação está desativada fora da `main`.

Em repositórios privados, a aplicação dessas proteções depende do plano GitHub.
Se o plano não permitir, CI ainda roda, mas não há bloqueio técnico de merge/push:
siga o processo manualmente e não torne o repositório público para contornar isso.
As proteções e a configuração do painel Vercel não foram alteradas pelo agente.

## Dependabot: fila pequena e revisão consciente

A configuração em `.github/dependabot.yml` verifica npm, Maven e GitHub Actions
semanalmente, às segundas-feiras, às 10h no fuso `America/Fortaleza` (horário
agendado, não garantia de execução pontual). Atualizações minor/patch ficam
agrupadas por ecossistema; majors continuam individuais. O limite é de dois PRs
de versão abertos por ecossistema, não dois por semana. PRs de segurança são
agrupados separadamente e não entram nesse limite. Não há merge automático.

O bloqueio de major do ESLint continua até confirmar compatibilidade dos plugins.
Grupos minor/patch também exigem revisão e CI: o número da versão não garante
ausência de regressões.

As atualizações comuns usam `target-branch: dev`. Cada ecossistema tem outro
bloco sem `target-branch`, com limite de versões igual a zero e grupo de segurança,
para continuar recebendo correções de segurança na branch padrão (`main`) sem
duplicar PRs comuns nela. O limite zero não desativa alertas nem PRs de segurança.
A configuração é lida da branch padrão: enquanto estiver apenas em `dev`, a
política anterior da `main` continua valendo. Após mesclar uma correção de
segurança na `main`, sincronize-a de volta para `dev`.

O "reset" de PRs é fechamento sem merge, seguido da remoção das branches do bot.
Não apaga o histórico nem modifica versões instaladas. Não dispense alertas de
segurança para limpar a lista. Fechar um PR individual pode fazer o Dependabot
deixar de oferecer aquela versão; não é garantia de recriação automática. Após
publicar a nova política, confira **Insights → Dependency graph → Dependabot**
e solicite uma verificação de atualizações em cada ecossistema. Se uma atualização
necessária não voltar, consulte o PR fechado: restaure a branch/reabra o PR ou use
os comandos suportados do Dependabot, sem ignorar uma vulnerabilidade pendente.

## Referências

- [Gatilhos e checks pendentes por filtros](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [Proteção de branches e disponibilidade por plano](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Controle de deploy por branch na Vercel](https://vercel.com/docs/project-configuration/git-configuration)
- [Opções de configuração do Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
- [Comandos de PRs do Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-pull-request-comment-commands)
