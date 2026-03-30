import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade — Premier Design Studio",
  description:
    "Política de Privacidade da plataforma Premier Design Studio. Saiba como coletamos, usamos e protegemos seus dados.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        {/* Header */}
        <div className="mb-10 space-y-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-green-500 shrink-0" />
            <span className="text-lg font-semibold text-zinc-300">
              Premier Design Studio
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100">
            Política de Privacidade
          </h1>
          <p className="text-sm text-zinc-500">
            Data de vigência: 30 de março de 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10 text-zinc-300 leading-relaxed">

          <Section title="1. Informações que Coletamos">
            <p>
              Para prestar o Serviço, coletamos as seguintes categorias de
              dados:
            </p>

            <SubSection title="Dados de cadastro">
              <p>
                Nome completo e endereço de e-mail fornecidos no momento do
                registro.
              </p>
            </SubSection>

            <SubSection title="Dados de uso">
              <p>
                Informações sobre a utilização da plataforma, como projetos
                criados, vídeos editados, posts publicados, plano contratado
                e métricas de consumo de IA.
              </p>
            </SubSection>

            <SubSection title="Dados de redes sociais">
              <p>
                Quando você conecta uma conta de rede social (Instagram,
                Facebook, YouTube, TikTok, X ou LinkedIn), acessamos
                exclusivamente:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                <li>Nome de perfil público e foto de perfil</li>
                <li>Permissões de publicação concedidas via OAuth</li>
                <li>Métricas básicas de publicações que você realizou pela plataforma</li>
              </ul>
              <p className="mt-3 text-zinc-400">
                <strong className="text-zinc-300">Não acessamos</strong>{" "}
                mensagens privadas, lista de seguidores, lista de seguindo,
                dados financeiros ou qualquer informação pessoal além do
                estritamente necessário para fornecer o Serviço.
              </p>
            </SubSection>

            <SubSection title="Dados de pagamento">
              <p>
                Pagamentos são processados diretamente pelo{" "}
                <strong className="text-zinc-200">Stripe</strong>. Não
                armazenamos números de cartão de crédito, CVV ou dados
                bancários em nossos servidores. Apenas retemos o identificador
                de assinatura fornecido pelo Stripe para gerenciamento do plano.
              </p>
            </SubSection>
          </Section>

          <Section title="2. Como Usamos seus Dados">
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-300">Fornecer o Serviço</strong> —
                edição de vídeo, publicação agendada, geração de conteúdo com IA
                e exibição de analytics
              </li>
              <li>
                <strong className="text-zinc-300">Processar pagamentos</strong> —
                gerenciar sua assinatura e faturamento
              </li>
              <li>
                <strong className="text-zinc-300">Comunicação</strong> —
                enviar notificações importantes sobre o Serviço, alterações nos
                termos e atualizações de segurança
              </li>
              <li>
                <strong className="text-zinc-300">Melhorar a plataforma</strong> —
                analisar padrões de uso agregados para aprimorar funcionalidades
                e corrigir problemas
              </li>
            </ul>
            <p className="mt-4 font-medium text-zinc-200">
              Não vendemos, alugamos nem compartilhamos seus dados pessoais com
              terceiros para fins comerciais ou publicitários.
            </p>
          </Section>

          <Section title="3. Integração com Redes Sociais">
            <p>
              A integração com plataformas de redes sociais é realizada via
              protocolo OAuth 2.0. Os tokens de acesso concedidos pelas
              plataformas são:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-zinc-400">
              <li>
                Armazenados de forma criptografada em nosso banco de dados
                (Supabase, com criptografia em repouso)
              </li>
              <li>
                Utilizados exclusivamente para publicar conteúdo que você
                autoriza e agenda pela plataforma
              </li>
              <li>
                Nunca compartilhados com terceiros além das próprias APIs das
                redes sociais no momento da publicação
              </li>
            </ul>
            <p className="mt-4">
              Você pode revogar o acesso a qualquer rede social a qualquer
              momento em{" "}
              <strong className="text-zinc-200">
                Configurações &gt; Conexões
              </strong>
              . Ao desconectar, todos os tokens de acesso relacionados àquela
              conta são removidos permanentemente de nossa base de dados de
              forma imediata.
            </p>
            <p className="mt-3">
              Você também pode revogar diretamente pelas configurações de cada
              plataforma social (ex.: Instagram &gt; Aplicativos e Sites).
            </p>
          </Section>

          <Section title="4. Compartilhamento de Dados">
            <p>
              Compartilhamos dados apenas com os seguintes parceiros, na medida
              necessária para a prestação do Serviço:
            </p>
            <div className="mt-4 space-y-3">
              {[
                {
                  name: "Supabase",
                  role: "Banco de dados e hospedagem",
                  note: "Seus dados são armazenados em infraestrutura Supabase com criptografia em repouso e em trânsito.",
                },
                {
                  name: "Stripe",
                  role: "Processamento de pagamentos",
                  note: "Certificado PCI-DSS nível 1. Dados de cartão nunca chegam aos nossos servidores.",
                },
                {
                  name: "OpenRouter / OpenAI (Whisper)",
                  role: "Processamento de IA",
                  note: "Trechos de conteúdo podem ser enviados para processamento de IA (transcrição, geração de texto/imagem). Esses parceiros possuem políticas próprias de privacidade.",
                },
                {
                  name: "APIs das redes sociais",
                  role: "Publicação de conteúdo",
                  note: "Conteúdo é enviado às plataformas (Meta, Google, TikTok, X, LinkedIn) somente quando você autoriza a publicação.",
                },
              ].map((p) => (
                <div
                  key={p.name}
                  className="rounded-lg bg-zinc-900 border border-zinc-800 p-4"
                >
                  <p className="font-semibold text-zinc-200">{p.name}</p>
                  <p className="text-sm text-zinc-500">{p.role}</p>
                  <p className="text-sm text-zinc-400 mt-1">{p.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              Todos os parceiros listados seguem padrões reconhecidos de
              segurança e privacidade de dados. Não autorizamos nenhum parceiro
              a usar seus dados para fins próprios ou publicitários.
            </p>
          </Section>

          <Section title="5. Armazenamento e Segurança">
            <p>
              Adotamos as seguintes medidas técnicas e organizacionais para
              proteger seus dados:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-300">Criptografia em trânsito</strong>{" "}
                — todas as comunicações entre seu dispositivo e nossos servidores
                utilizam HTTPS/TLS
              </li>
              <li>
                <strong className="text-zinc-300">Criptografia em repouso</strong>{" "}
                — dados armazenados no banco de dados são criptografados, incluindo
                tokens de acesso OAuth
              </li>
              <li>
                <strong className="text-zinc-300">Controle de acesso</strong>{" "}
                — acesso aos dados é restrito por autenticação e Row-Level Security
                (RLS), garantindo que cada usuário acesse apenas seus próprios dados
              </li>
              <li>
                <strong className="text-zinc-300">Monitoramento</strong>{" "}
                — monitoramos atividades suspeitas e aplicamos atualizações de
                segurança regularmente
              </li>
            </ul>
          </Section>

          <Section title="6. Seus Direitos (LGPD)">
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (Lei n°
              13.709/2018 — LGPD), você possui os seguintes direitos sobre
              seus dados pessoais:
            </p>
            <div className="mt-4 space-y-3">
              {[
                {
                  right: "Acesso",
                  desc: "Você pode solicitar uma cópia de todos os dados pessoais que mantemos sobre você.",
                },
                {
                  right: "Correção",
                  desc: "Você pode atualizar seus dados cadastrais a qualquer momento em Configurações > Perfil.",
                },
                {
                  right: "Exclusão",
                  desc: "Você pode solicitar a exclusão da sua conta e de todos os dados associados. Após a solicitação, os dados são removidos em até 30 dias.",
                },
                {
                  right: "Portabilidade",
                  desc: "Você pode exportar seus projetos e dados de uso em formato estruturado.",
                },
                {
                  right: "Revogação de consentimento",
                  desc: "Você pode revogar o acesso às redes sociais a qualquer momento em Configurações > Conexões.",
                },
                {
                  right: "Oposição",
                  desc: "Você pode se opor ao processamento de seus dados para finalidades específicas.",
                },
              ].map((item) => (
                <div
                  key={item.right}
                  className="flex gap-3 rounded-lg bg-zinc-900 border border-zinc-800 p-4"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                  <div>
                    <p className="font-semibold text-zinc-200">{item.right}</p>
                    <p className="text-sm text-zinc-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5">
              Para exercer qualquer um desses direitos, entre em contato com
              nosso Encarregado de Proteção de Dados (DPO):
              <br />
              <a
                href="mailto:privacidade@elabdata.com.br"
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                privacidade@elabdata.com.br
              </a>
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              Utilizamos apenas{" "}
              <strong className="text-zinc-200">cookies essenciais</strong>{" "}
              para o funcionamento da plataforma, como manutenção da sessão
              autenticada e preferências de interface.
            </p>
            <p className="mt-3">
              Não utilizamos cookies de rastreamento, cookies de terceiros para
              fins publicitários, pixels de retargeting ou qualquer tecnologia
              de rastreamento comportamental sem o seu consentimento explícito.
            </p>
          </Section>

          <Section title="8. Retenção de Dados">
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa.
              Após a exclusão da conta — seja por solicitação sua ou por
              inatividade prolongada — todos os dados pessoais, projetos e
              tokens de acesso associados são removidos de nossos sistemas em
              até <strong className="text-zinc-200">30 (trinta) dias</strong>.
            </p>
            <p className="mt-3">
              Alguns dados podem ser retidos por período maior quando exigido
              por obrigações legais ou regulatórias (ex.: registros fiscais
              e de faturamento conforme legislação brasileira).
            </p>
          </Section>

          <Section title="9. Alterações nesta Política">
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente.
              Quando realizarmos alterações significativas, notificaremos você
              por e-mail com antecedência mínima de 15 dias. A versão mais
              recente sempre estará disponível em{" "}
              <Link
                href="/privacy"
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                premier.elabdata.com.br/privacy
              </Link>
              .
            </p>
          </Section>

          <Section title="10. Contato">
            <p>
              Para dúvidas, solicitações ou reclamações relacionadas à
              privacidade dos seus dados, entre em contato:
            </p>
            <p className="mt-3">
              <strong className="text-zinc-200">eLabData</strong>
              <br />
              Encarregado de Proteção de Dados (DPO)
              <br />
              E-mail:{" "}
              <a
                href="mailto:privacidade@elabdata.com.br"
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                privacidade@elabdata.com.br
              </a>
            </p>
          </Section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <span>
            &copy; {new Date().getFullYear()} eLabData — Premier Design Studio
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="hover:text-zinc-400 transition-colors"
            >
              Política de Privacidade
            </Link>
            <Link
              href="/terms"
              className="hover:text-zinc-400 transition-colors"
            >
              Termos de Serviço
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-zinc-800/60 pb-10">
      <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
      <div className="text-zinc-300 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-zinc-200 mb-1">{title}</h3>
      <div className="text-zinc-400">{children}</div>
    </div>
  );
}
