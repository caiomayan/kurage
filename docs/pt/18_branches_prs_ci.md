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

Estes arquivos foram preparados na branch local `codex/ci-dev`; alterações locais
não configuram automaticamente o GitHub. Não houve push, PR ou deploy pelo agente.

1. Revise os arquivos e faça commit/push dessa branch, sem incluir `.env` reais.
2. Abra excepcionalmente um PR com **base `main`**, **compare `codex/ci-dev`**.
3. Aguarde os três checks, revise o diff e faça merge. Isso pode publicar o sistema.
4. Depois desse merge, crie `dev` a partir da `main` atualizada. Assim ela já nasce
   com os novos workflows e com os previews Vercel desativados.

No terminal local, com a árvore de trabalho limpa, execute uma linha por vez:

```powershell
git switch main
git pull --ff-only origin main
git switch -c dev
git push -u origin dev
```

O comando de criação é usado somente uma vez. Se `dev` já existir, troque para
ela e atualize-a; não recrie nem force o histórico. Branches antigas precisam
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

## Referências

- [Gatilhos e checks pendentes por filtros](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [Proteção de branches e disponibilidade por plano](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Controle de deploy por branch na Vercel](https://vercel.com/docs/project-configuration/git-configuration)
