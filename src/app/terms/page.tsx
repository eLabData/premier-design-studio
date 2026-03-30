import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Serviço — Premier Design Studio",
  description: "Termos de Serviço da plataforma Premier Design Studio.",
};

export default function TermsPage() {
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
            Termos de Serviço
          </h1>
          <p className="text-sm text-zinc-500">
            Data de vigência: 30 de março de 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10 text-zinc-300 leading-relaxed">

          <Section title="1. Aceitação dos Termos">
            <p>
              Ao acessar ou utilizar a plataforma Premier Design Studio
              (&quot;Serviço&quot;), você concorda em ficar vinculado a estes
              Termos de Serviço. Se você não concordar com qualquer parte
              destes termos, não poderá utilizar o Serviço. O uso continuado
              da plataforma após quaisquer alterações constitui sua aceitação
              dos novos termos.
            </p>
          </Section>

          <Section title="2. Descrição do Serviço">
            <p>
              O Premier Design Studio é uma plataforma de criação de conteúdo
              com inteligência artificial para redes sociais. O Serviço inclui,
              mas não se limita a:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-zinc-400">
              <li>Edição de vídeo com recursos de IA (corte, legendas, overlay, transições)</li>
              <li>Design de posts para feed, stories, carrossel e thumbnails</li>
              <li>Geração de assets, logos e mockups com IA (Studio AI)</li>
              <li>Agendamento e publicação automática em redes sociais</li>
              <li>Analytics de uso e custos de IA</li>
            </ul>
          </Section>

          <Section title="3. Conta de Usuário">
            <p>
              Para utilizar o Serviço, você deve criar uma conta fornecendo
              informações precisas e atualizadas. Você é inteiramente
              responsável por manter a confidencialidade de suas credenciais de
              acesso (e-mail e senha) e por todas as atividades realizadas em
              sua conta.
            </p>
            <p className="mt-3">
              <strong className="text-zinc-200">Idade mínima:</strong> o uso
              do Serviço é permitido apenas para pessoas com 18 (dezoito) anos
              de idade ou mais. Ao criar uma conta, você declara ter pelo menos
              18 anos.
            </p>
            <p className="mt-3">
              Notifique-nos imediatamente em{" "}
              <a
                href="mailto:contato@elabdata.com.br"
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                contato@elabdata.com.br
              </a>{" "}
              caso suspeite de uso não autorizado da sua conta.
            </p>
          </Section>

          <Section title="4. Uso Aceitável">
            <p>
              Ao utilizar o Serviço, você concorda em não:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-zinc-400">
              <li>Enviar ou publicar spam, mensagens em massa não solicitadas ou conteúdo enganoso</li>
              <li>Criar, distribuir ou promover conteúdo ilegal, difamatório, obsceno ou que incite violência ou discriminação</li>
              <li>Violar direitos autorais, marcas registradas ou outros direitos de propriedade intelectual de terceiros</li>
              <li>Distribuir malware, vírus, cavalos de Troia ou qualquer outro código malicioso</li>
              <li>Tentar obter acesso não autorizado a sistemas, redes ou contas de outros usuários</li>
              <li>Usar o Serviço para fins comerciais de revenda sem autorização expressa por escrito</li>
            </ul>
            <p className="mt-3">
              O descumprimento destas regras pode resultar na suspensão ou
              encerramento imediato da sua conta, sem aviso prévio.
            </p>
          </Section>

          <Section title="5. Integração com Redes Sociais">
            <p>
              O Serviço permite a conexão com contas de redes sociais, incluindo
              Instagram, Facebook, YouTube, TikTok, X (Twitter) e LinkedIn.
              Ao conectar uma conta de rede social, você nos autoriza a:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-zinc-400">
              <li>Acessar informações básicas do perfil (nome, foto de perfil)</li>
              <li>Publicar conteúdo em seu nome conforme por você agendado ou autorizado</li>
              <li>Ler métricas de publicações para exibição nos analytics</li>
            </ul>
            <p className="mt-3">
              Os tokens de acesso OAuth concedidos pelas plataformas são
              armazenados de forma segura e criptografada em nosso banco de
              dados. Eles são utilizados exclusivamente para as finalidades
              descritas acima.
            </p>
            <p className="mt-3">
              Você pode revogar o acesso a qualquer momento em{" "}
              <strong className="text-zinc-200">
                Configurações &gt; Conexões
              </strong>
              . Ao revogar, todos os tokens armazenados são removidos
              imediatamente. A manutenção das conexões está sujeita às políticas
              e aos Termos de Serviço de cada plataforma de rede social.
            </p>
          </Section>

          <Section title="6. Conteúdo do Usuário">
            <p>
              Você mantém a propriedade integral de todo o conteúdo que criar,
              enviar ou publicar por meio do Serviço (vídeos, imagens, textos,
              projetos). A plataforma Premier Design Studio não reivindica
              nenhum direito de propriedade intelectual sobre o seu conteúdo.
            </p>
            <p className="mt-3">
              Ao usar o Serviço, você nos concede uma licença limitada,
              não exclusiva e revogável para processar, armazenar e transmitir
              seu conteúdo exclusivamente com a finalidade de fornecer o
              Serviço a você.
            </p>
            <p className="mt-3">
              Você é o único responsável por garantir que possui os direitos
              necessários sobre todo o conteúdo que enviar ou publicar.
            </p>
          </Section>

          <Section title="7. Uso de Inteligência Artificial">
            <p>
              A plataforma utiliza inteligência artificial — incluindo modelos
              disponibilizados via OpenRouter e o modelo Whisper da OpenAI —
              para funcionalidades como transcrição de vídeo, geração de
              legendas, edição assistida e criação de assets visuais.
            </p>
            <p className="mt-3">
              Os resultados gerados por IA são fornecidos como sugestões e
              podem não ser perfeitos, precisos ou adequados para todos os
              contextos. O usuário é responsável por revisar e aprovar qualquer
              conteúdo gerado por IA antes de publicá-lo. Não garantimos a
              precisão, completude ou adequação dos outputs de IA.
            </p>
          </Section>

          <Section title="8. Planos e Pagamentos">
            <p>
              O Serviço é oferecido nos planos <strong className="text-zinc-200">Free</strong>,{" "}
              <strong className="text-zinc-200">Pro</strong> e{" "}
              <strong className="text-zinc-200">Business</strong>, cada um com
              diferentes funcionalidades e limites de uso descritos na página de
              planos.
            </p>
            <p className="mt-3">
              Os pagamentos pelos planos pagos são processados pelo{" "}
              <strong className="text-zinc-200">Stripe</strong>, plataforma de
              pagamentos segura e certificada PCI-DSS. Não armazenamos dados
              de cartão de crédito em nossos servidores.
            </p>
            <p className="mt-3">
              As assinaturas são renovadas automaticamente no período contratado
              (mensal ou anual). Você pode cancelar sua assinatura a qualquer
              momento pela página de configurações, sem multa ou taxa de
              cancelamento. O cancelamento será efetivo ao final do período
              já pago.
            </p>
          </Section>

          <Section title="9. Limitação de Responsabilidade">
            <p>
              O Serviço é fornecido &quot;como está&quot; e &quot;conforme
              disponível&quot;, sem garantias de qualquer natureza, expressas ou
              implícitas. Na máxima extensão permitida pela lei aplicável, a
              Premier Design Studio não se responsabiliza por:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-zinc-400">
              <li>Perda, corrupção ou indisponibilidade de dados</li>
              <li>Indisponibilidade temporária do Serviço por manutenção ou falhas técnicas</li>
              <li>Resultados ou desempenho de publicações realizadas em redes sociais</li>
              <li>Ações ou políticas das plataformas de redes sociais que afetem suas contas</li>
              <li>Danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso do Serviço</li>
            </ul>
          </Section>

          <Section title="10. Modificações dos Termos">
            <p>
              Reservamo-nos o direito de modificar estes Termos de Serviço a
              qualquer momento. Quando realizarmos alterações materiais,
              notificaremos você por e-mail (no endereço cadastrado em sua
              conta) com antecedência mínima de 15 dias antes da entrada em
              vigor das novas condições. O uso continuado do Serviço após essa
              data constitui aceite dos termos revisados.
            </p>
          </Section>

          <Section title="11. Lei Aplicável">
            <p>
              Estes Termos de Serviço são regidos e interpretados de acordo com
              as leis da República Federativa do Brasil. Fica eleito o foro da
              Comarca de São Paulo — SP para dirimir quaisquer controvérsias
              oriundas destes termos, com renúncia expressa a qualquer outro
              foro, por mais privilegiado que seja.
            </p>
          </Section>

          <Section title="12. Contato">
            <p>
              Dúvidas sobre estes Termos de Serviço podem ser enviadas para:
            </p>
            <p className="mt-3">
              <strong className="text-zinc-200">eLabData</strong>
              <br />
              E-mail:{" "}
              <a
                href="mailto:contato@elabdata.com.br"
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                contato@elabdata.com.br
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
