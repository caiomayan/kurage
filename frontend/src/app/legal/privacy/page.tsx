import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacidade",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="LGPD · versão preliminar"
      title="Aviso de Privacidade"
      summary="Como os dados pessoais são usados na versão atual da plataforma Kurage."
      sections={[
        {
          title: "1. Dados tratados",
          content: <p>Podemos tratar SteamID64, nome e avatar públicos da Steam, identificador Kurage, país informado pelo edge, e-mail e telefone opcionais, preferências, inventário virtual, times, telemetria de jogo, eventos de autenticação e registros técnicos necessários à segurança.</p>,
        },
        {
          title: "2. Finalidades",
          content: <p>Os dados servem para autenticar, manter o perfil, operar inventário e times, exibir rankings verdadeiros, conectar servidores, prevenir abuso, atender solicitações e melhorar confiabilidade. E-mail e telefone opcionais não autorizam marketing ou WhatsApp sem base legal e preferência específicas.</p>,
        },
        {
          title: "3. Compartilhamento e transferências",
          content: <p>Dados podem ser processados por provedores estritamente necessários, como Steam, FACEIT, hospedagem, banco de dados, cache, armazenamento de mídia, CDN e observabilidade. A lista nominal, países e salvaguardas contratuais serão confirmados antes da produção.</p>,
        },
        {
          title: "4. Retenção",
          content: <p>Convites expiram rapidamente; sessões e registros de segurança seguem janelas limitadas; notificações e histórico competitivo podem ter retenção longa para formar o passaporte do jogador. Prazos finais, critérios de anonimização e rotina de exclusão ainda serão aprovados no inventário de dados.</p>,
        },
        {
          title: "5. Seus direitos",
          content: <p>Nos limites da LGPD, você poderá solicitar confirmação, acesso, correção, informação sobre compartilhamento, portabilidade quando aplicável, revisão e eliminação nos casos legais. O canal verificará identidade antes de revelar ou alterar dados.</p>,
        },
        {
          title: "6. Segurança e cookies",
          content: <p>Kurage usa sessão autenticada, cookies essenciais HttpOnly, limites de requisição, isolamento dos bancos e validação de uploads. Nenhum sistema é infalível; incidentes relevantes seguirão avaliação e comunicação conforme a legislação.</p>,
        },
        {
          title: "7. Controlador e contato",
          content: <p>A identificação do controlador, endereço e canal de privacidade estão pendentes. Esses campos são bloqueadores formais de lançamento e deverão estar publicados antes de receber usuários reais.</p>,
        },
      ]}
    />
  );
}
