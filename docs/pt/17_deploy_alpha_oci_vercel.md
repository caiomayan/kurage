# Deploy da alfa — Vercel, Cloudflare e Oracle Cloud

**Estado:** configuração implementada, ainda não aplicada às contas externas.  
**Última validação documental:** 29/08/2026.

## Decisão adotada

O frontend será publicado pela Vercel a partir do diretório `frontend` do
repositório GitHub e responderá por `kurage.caiomayan.com`. O backend, PostgreSQL,
Redis e Caddy ficarão numa instância OCI Ampere A1 de 2 OCPUs e 6 GB, atendida por
`api.caiomayan.com` através da Cloudflare.

Esta é uma implantação de alfa estável, não a arquitetura final de escala. O
monólito e seus dados cabem nessa máquina, o custo inicial é baixo e o contrato
de deploy continua portável. PostgreSQL e Redis não são publicados na internet.

## Fronteiras operacionais

- Vercel: build, CDN, TLS e runtime do frontend.
- Cloudflare: DNS, proxy, proteção de borda e primeira terminação TLS da API.
- OCI: máquina, rede, IP reservado e volumes Docker do backend.
- Caddy: certificado de origem e proxy interno para Spring Boot.
- GitHub Actions: testes, imagem GHCR, Terraform e release.
- Terraform: somente recursos OCI; não controla Vercel ou Cloudflare.

O runbook executável, a lista de segredos e a ordem exata do primeiro deploy
estão em [`infra/README.md`](../../infra/README.md).

## Segurança deliberada

- SSH não aceita senha nem root e usa uma chave exclusiva. Enquanto o deploy usar
  runners hospedados e de IP dinâmico do GitHub, a porta 22 permanece alcançável;
  o próximo endurecimento é um runner privado/túnel e restrição ao CIDR informado.
- HTTP/HTTPS na origem aceitam somente faixas IPv4 oficiais da Cloudflare.
- A imagem é publicada para ARM64 e AMD64 e implantada pelo digest, não por uma
  tag mutável.
- Segredos não entram em imagem, Terraform, Compose versionado ou artefatos.
- O token do GHCR é temporário e removido do host após o deploy.
- O deploy só ocorre depois dos testes com PostgreSQL e Redis reais.
- Uma release sem saúde restaura automaticamente a configuração e a imagem
  anteriores.

## Limites antes de chamar de produção

O terreno de deploy não elimina os gates da auditoria. Ainda são obrigatórios:
backup PostgreSQL criptografado fora da VM, teste real de restauração, smoke E2E
Steam, validação do servidor Retake, monitoramento externo e textos jurídicos
publicados. A instância única também é um ponto único de falha aceito para a alfa.

## Troca futura de provedor

A dependência OCI fica isolada em `infra/terraform/oci`. A aplicação usa uma
imagem OCI padrão, Docker Compose e Caddy. Numa migração, a parte que muda é o
provisionamento da VPS; o domínio, o pipeline de imagem e o contrato de execução
permanecem. Os dados devem ser migrados por backup/restore controlado.
