import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ConfiancaBadge, EstadoBadge } from "@/components/dominio";
import { BotaoInstalarApp } from "@/components/instalar-app";
import { formatarBytes } from "@/lib/anexos";
import {
  MAX_ANEXOS,
  TIPOS,
  formatarDataHora,
  formatarMoeda,
  iniciais,
} from "@/lib/dominio";
import { rotaInicial } from "@/lib/permissao";
import { modoApp } from "@/lib/pwa";
import { useSessao } from "@/lib/sessao-contexto";
import { useTitulo } from "@/lib/use-titulo";
import { Alert, Avatar, ButtonLink, Card, CardDesc, controlClass, cx } from "@/ui";

/** cena ilustrada do balcão (arte fornecida; trocável depois mantendo o caminho) */
const CENA = "/landing-page.jpg";

/** dados de exemplo, rotulados como tal na própria tela */
const DEMO = {
  termo: "390.533.447-05",
  nome: "Joana Pereira da Silva",
  cpfMascarado: "***.533.447-**",
  placa: "QXZ4D12",
  descricao: "Retrovisor quebrado na devolução, com avaria registrada na vistoria.",
  valor: 480,
  registradoEm: "2026-09-14T14:32:00",
  anexos: [
    { nome: "retrovisor.jpg", bytes: 1_842_301 },
    { nome: "lataria.jpg", bytes: 2_106_442 },
    { nome: "vistoria.pdf", bytes: 341_998 },
  ],
};

function acoesDe(perfil: { papel: "dono" | "superadmin" } | null) {
  if (perfil) {
    return (
      <ButtonLink href={rotaInicial(perfil.papel)} size="lg">
        Abrir o Histórico
      </ButtonLink>
    );
  }
  return (
    <>
      <ButtonLink href="/cadastro" size="lg">
        Sou locadora
      </ButtonLink>
      <ButtonLink href="/login" variant="outline" size="lg">
        Entrar
      </ButtonLink>
    </>
  );
}

const movimentoReduzido = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Home() {
  const { perfil } = useSessao();
  useTitulo("Histórico — histórico de incidentes de motoristas");

  const [digitado, setDigitado] = useState(() =>
    movimentoReduzido() ? DEMO.termo : "",
  );
  const [pronto, setPronto] = useState(movimentoReduzido);

  // momento único da página: o CPF é digitado e a ficha responde
  useEffect(() => {
    if (pronto) return;
    let i = 0;
    const tecla = window.setInterval(() => {
      i += 1;
      setDigitado(DEMO.termo.slice(0, i));
      if (i >= DEMO.termo.length) {
        window.clearInterval(tecla);
        setPronto(true);
      }
    }, 55);
    return () => {
      window.clearInterval(tecla);
    };
  }, [pronto]);

  // instalado, o app abre direto na tela de trabalho, não na vitrine
  if (perfil && modoApp()) return <Navigate to={rotaInicial(perfil.papel)} replace />;

  return (
    <div className="vitrine">
      <section className="vitrine-abertura">
        <div className="container vitrine-abertura-topo">
          <h1 className="vitrine-titulo">Esse motorista já gerou prejuízo?</h1>
          <p className="vitrine-resumo">
            O Histórico é onde locadoras registram e consultam o histórico de
            incidentes de motoristas. No balcão você digita o CPF e a ficha responde —
            com estado, confiança e evidência na mesma tela.
          </p>
          <div className="vitrine-acoes">
            {acoesDe(perfil)}
            <BotaoInstalarApp variant="ghost" size="lg" />
          </div>
          <p className="vitrine-nota">
            O cadastro da locadora é aprovado pela plataforma antes de valer a rede.
          </p>
        </div>

        <figure className="vitrine-cena">
          <img
            src={CENA}
            alt="Ilustração do balcão de uma locadora: atendente com um tablet na mão, carros na vitrine e fichas de motoristas flutuando ao lado."
          />
        </figure>

        <div className="container">
          <figure className="vitrine-placa">
            <div className="vitrine-placa-ui" aria-hidden="true">
              <div className="vitrine-campo">
                <span className="label">CPF ou nome completo</span>
                <span className={cx(controlClass("input"), "vitrine-campo-valor")}>
                  {digitado}
                  {digitado.length < DEMO.termo.length ? (
                    <span className="vitrine-caret" />
                  ) : null}
                </span>
                <span className="btn btn-primary">Buscar</span>
              </div>
              <div className={cx("vitrine-resultado", pronto && "vitrine-resultado-pronta")}>
                <Avatar initials={iniciais(DEMO.nome)} />
                <div className="vitrine-resultado-texto">
                  <strong>{DEMO.nome}</strong>
                  <span className="hint">CPF {DEMO.cpfMascarado}</span>
                </div>
                <span className="btn btn-outline btn-sm">Abrir ficha</span>
              </div>
            </div>
            <figcaption className="vitrine-placa-legenda">
              Demonstração com dados de exemplo: a busca por CPF devolve a ficha do
              motorista.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="vitrine-secao" id="busca" aria-labelledby="titulo-busca">
        <div className="container vitrine-grid">
          <div className="vitrine-texto">
            <h2 id="titulo-busca">Buscável, nunca listável</h2>
            <p className="vitrine-paragrafo">
              Nenhuma tela devolve uma lista de motoristas. Sem termo digitado, nada
              aparece — nem recentes, nem registros de ninguém.
            </p>
            <ul className="vitrine-lista">
              <li>
                <strong>CPF é identidade.</strong> Toda ficha tem CPF; nome completo
                só nomeia, e a abertura da ficha pede o documento.
              </li>
              <li>
                <strong>Estado e confiança são coisas diferentes.</strong> Suspeita,
                confirmado e contestado dizem o que aconteceu; baixa, média e alta dizem
                o quanto quem registrou tem certeza.
              </li>
              <li>
                <strong>Vazio não é atestado.</strong> Quando nada aparece, a tela diz
                que nem sua locadora nem a rede têm registro visível para aquele CPF.
              </li>
            </ul>
          </div>

          <div
            className="vitrine-fragmento"
            role="img"
            aria-label="Demonstração: tela de busca com o CPF 390.533.447-05, aviso de que busca por nome só nomeia e um resultado com o botão Abrir ficha."
          >
            <Card className="vitrine-ui">
              <div className="vitrine-ui-campo">
                <span className="label">CPF ou nome completo</span>
                <span className={controlClass("input")}>{DEMO.termo}</span>
                <span className="btn btn-primary">Buscar</span>
              </div>
              <span className="hint">
                Ex.: 390.533.447-05 ou Joana Pereira da Silva
              </span>
              <Alert variant="info">
                <span>
                  <strong>Busca por nome só nomeia.</strong> Escolha a pessoa e confirme
                  o CPF para abrir a ficha.
                </span>
              </Alert>
              <ul className="vitrine-ui-lista">
                <li className="vitrine-ui-resultado">
                  <span className="vitrine-ui-quem">
                    <Avatar initials={iniciais(DEMO.nome)} />
                    <span className="vitrine-ui-nome">
                      <strong>{DEMO.nome}</strong>
                      <span className="hint">CPF {DEMO.cpfMascarado}</span>
                    </span>
                  </span>
                  <span className="btn btn-outline btn-sm">Abrir ficha</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section
        className="vitrine-secao vitrine-secao--tinta"
        id="evidencia"
        aria-labelledby="titulo-evidencia"
      >
        <div className="container vitrine-grid vitrine-grid--invertida">
          <div className="vitrine-texto">
            <h2 id="titulo-evidencia">A prova fica na sua locadora</h2>
            <p className="vitrine-paragrafo">
              Foto, descrição, valor e quem registrou ficam no armazenamento privado da
              locadora dona. O que passa adiante é o registro do incidente, nunca os
              arquivos.
            </p>
            <ul className="vitrine-lista">
              <li>
                <strong>Suspeita é sua.</strong> O registro nasce privado e só a sua
                locadora o enxerga.
              </li>
              <li>
                <strong>Anexo não viaja.</strong> As outras locadoras veem tipo, data,
                descrição, valor e estado — nunca os anexos.
              </li>
              <li>
                <strong>Tudo fica registrado.</strong> Quem criou, quem mudou, quando e o
                que era antes: a trilha de auditoria não se apaga.
              </li>
            </ul>
          </div>

          <div
            className="vitrine-fragmento"
            role="img"
            aria-label="Demonstração: cartão de um incidente confirmado com confiança alta, com descrição, valor, data e três anexos."
          >
            <Card className="vitrine-ui">
              <div className="vitrine-ui-topo">
                <div>
                  <p className="hint">
                    Placa {DEMO.placa} · {DEMO.nome}
                  </p>
                  <p className="card-title">{TIPOS.dano_veiculo}</p>
                </div>
                <div className="vitrine-ui-selos">
                  <EstadoBadge estado="confirmado" />
                  <ConfiancaBadge confianca="alta" />
                </div>
              </div>
              <CardDesc>{DEMO.descricao}</CardDesc>
              <dl className="vitrine-ui-dados">
                <div>
                  <dt>Prejuízo</dt>
                  <dd>{formatarMoeda(DEMO.valor)}</dd>
                </div>
                <div>
                  <dt>Registrado em</dt>
                  <dd>{formatarDataHora(DEMO.registradoEm)}</dd>
                </div>
                <div>
                  <dt>Registrado por</dt>
                  <dd>Balcão · locadora</dd>
                </div>
              </dl>
              <ul className="vitrine-ui-anexos">
                {DEMO.anexos.map((anexo) => (
                  <li key={anexo.nome}>
                    <div className="anexo-thumb grid place-items-center">
                      <span className="label">
                        {anexo.nome.endsWith(".pdf") ? "PDF" : "Foto"}
                      </span>
                    </div>
                    <span className="hint">{formatarBytes(anexo.bytes)}</span>
                  </li>
                ))}
              </ul>
              <span className="hint">
                De 1 a {MAX_ANEXOS} arquivos (imagem ou PDF, até 10 MB). Ficam num
                armazenamento privado da sua locadora e nunca são mostrados à rede.
              </span>
            </Card>
          </div>
        </div>
      </section>

      <section className="vitrine-secao" id="rede" aria-labelledby="titulo-rede">
        <div className="container">
          <div className="vitrine-texto vitrine-texto--larga">
            <h2 id="titulo-rede">A rede vê só o que está confirmado</h2>
            <p className="vitrine-paragrafo">
              Não existe feed, ranking nem lista de recentes. O que cruza a fronteira é
              o incidente confirmado com confiança alta — e ele é buscado, não
              divulgado.
            </p>
          </div>

          <div
            className="vitrine-fronteira"
            role="img"
            aria-label="Comparação: de um lado a sua locadora vê suspeitas, anexos, painel e auditoria; do outro a rede vê apenas incidentes confirmados com confiança alta."
          >
            <div className="vitrine-fronteira-lado">
              <p className="vitrine-fronteira-titulo">Sua locadora</p>
              <ul className="vitrine-lista">
                <li>Suspeitas, inclusive as que só você registrou</li>
                <li>Anexos e fotos do incidente</li>
                <li>Painel de números da própria locadora</li>
                <li>Trilha de auditoria com antes e depois</li>
              </ul>
            </div>
            <div className="vitrine-fronteira-lado vitrine-fronteira-rede">
              <p className="vitrine-fronteira-titulo">A rede</p>
              <ul className="vitrine-lista">
                <li>Incidentes confirmados com confiança alta</li>
                <li>Tipo, data, descrição, valor e estado</li>
                <li>Busca por CPF ou nome completo exato</li>
                <li>Nunca anexos, nunca listagens</li>
              </ul>
            </div>
          </div>

          <Alert variant="info" className="vitrine-alerta">
            <span>
              <strong>Ele entra na rede apenas quando você confirmar com confiança
              alta.</strong>{" "}
              Até lá, só a sua locadora vê este registro.
            </span>
          </Alert>
        </div>
      </section>

      <section
        className="vitrine-secao vitrine-secao--tinta"
        aria-labelledby="titulo-passos"
      >
        <div className="container">
          <div className="vitrine-texto vitrine-texto--larga">
            <h2 id="titulo-passos">Como funciona no balcão</h2>
          </div>
          <ol className="vitrine-passos">
            <li className="vitrine-passo">
              <span className="vitrine-passo-num">1</span>
              <h3>Cadastre a locadora</h3>
              <p>
                O cadastro entra na fila e é aprovado pela plataforma antes de valer a
                rede.
              </p>
            </li>
            <li className="vitrine-passo">
              <span className="vitrine-passo-num">2</span>
              <h3>Busque no balcão</h3>
              <p>
                CPF ou nome completo exato. A ficha abre com o que a rede permite que
                você veja.
              </p>
            </li>
            <li className="vitrine-passo">
              <span className="vitrine-passo-num">3</span>
              <h3>Registre com prova</h3>
              <p>
                Descrição, fotos e estado. Suspeita fica sua; confirmado com confiança
                alta é o que passa para a rede.
              </p>
            </li>
          </ol>
          <p className="vitrine-nota vitrine-nota--centro">
            Instala como aplicativo no celular da loja: o rascunho do incidente
            sobrevive à queda de conexão.
          </p>
          <div className="mt-4 flex justify-center">
            <BotaoInstalarApp>Instalar no celular</BotaoInstalarApp>
          </div>
        </div>
      </section>

      <section className="vitrine-secao vitrine-fecha" aria-labelledby="titulo-fecha">
        <div className="container vitrine-fecha-caixa">
          <h2 id="titulo-fecha">Coloque sua locadora no Histórico</h2>
          <p className="vitrine-paragrafo">
            Comece pelo cadastro: a locadora entra na fila e, quando aprovada, a busca
            já vale no seu balcão.
          </p>
          <div className="vitrine-acoes">{acoesDe(perfil)}</div>
        </div>
      </section>

      <footer className="rodape">
        <div className="container rodape-grade">
          <div className="rodape-marca">
            <img src="/logo.png" alt="" width={32} height={32} className="h-8 w-8" />
            <strong>Histórico</strong>
            <p>
              Histórico de incidentes de motoristas para locadoras de veículos.
              Buscável, nunca listável.
            </p>
          </div>
          <nav aria-label="Produto">
            <p className="rodape-titulo">Produto</p>
            <ul>
              <li>
                <a href="#busca">Busca no balcão</a>
              </li>
              <li>
                <a href="#evidencia">Evidência</a>
              </li>
              <li>
                <a href="#rede">A rede</a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Conta">
            <p className="rodape-titulo">Conta</p>
            <ul>
              <li>
                <Link to="/cadastro">Cadastrar locadora</Link>
              </li>
              <li>
                <Link to="/login">Entrar</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="container rodape-base">
          <span>Histórico · plataforma interna de locadoras</span>
          <span>Os dados ficam com as locadoras que os registraram.</span>
        </div>
      </footer>
    </div>
  );
}
