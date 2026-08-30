import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Termos de Uso",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Legal · versão preliminar"
      title="Termos de Uso"
      summary="Regras preliminares para uso da identidade competitiva, inventário virtual e servidores Kurage."
      sections={[
        {
          title: "1. Plataforma e elegibilidade",
          content: <p>Kurage é uma plataforma independente para jogadores de Counter-Strike 2. O uso é destinado a pessoas com 18 anos ou mais, por meio de uma conta Steam válida. Kurage não é afiliada, patrocinada ou endossada pela Valve, Steam ou FACEIT.</p>,
        },
        {
          title: "2. Conta e segurança",
          content: <p>Você é responsável por proteger sua conta Steam e por atividades realizadas em sua sessão. Não compartilhe credenciais nem tente acessar contas, servidores ou dados de terceiros. Podemos encerrar sessões ou restringir uma conta para proteger usuários e a plataforma.</p>,
        },
        {
          title: "3. Inventário virtual",
          content: <p>O inventário Kurage é um simulador de preferências cosméticas. Os itens não são propriedade transferível, não possuem valor monetário, não podem ser sacados, apostados ou negociados pela plataforma e não alteram seu inventário oficial da Steam.</p>,
        },
        {
          title: "4. Servidores e competição",
          content: <p>O acesso aos servidores depende de capacidade, manutenção e regras de cada modo. Estatísticas e rankings podem ser corrigidos quando houver erro técnico, abuso ou partida inválida. Cheats, manipulação de resultados e evasão de sanções são proibidos.</p>,
        },
        {
          title: "5. Plano Maré",
          content: <p>Maré ainda não está à venda. Preço, renovação, cancelamento, reembolso e benefícios vinculantes serão publicados antes da primeira cobrança. A apresentação atual é informativa e não constitui oferta comercial.</p>,
        },
        {
          title: "6. Disponibilidade e responsabilidade",
          content: <p>A versão atual é uma alfa técnica e pode mudar ou ficar temporariamente indisponível. Nada nestes termos exclui direitos obrigatórios do consumidor ou responsabilidades que a lei brasileira não permita limitar.</p>,
        },
        {
          title: "7. Titularidade e contato",
          content: <p>O software, a marca e os materiais próprios pertencem ao titular do Kurage; marcas de terceiros permanecem com seus titulares. A identificação legal do operador, foro aplicável e canal oficial serão preenchidos e revisados antes do lançamento público.</p>,
        },
      ]}
    />
  );
}
