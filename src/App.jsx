import { useState } from "react";
import "./App.css";

export default function App() {
  const [xmlDocs, setXmlDocs] = useState([]);
  const [xmlSelecionado, setXmlSelecionado] = useState("");
  const [ordemProduto, setOrdemProduto] = useState("");
  const [resultado, setResultado] = useState(null);
  const [chaveInfo, setChaveInfo] = useState(null);

  const NAMESPACE = "www.portalfiscal.inf.br";

  function validarChave(chave) {
    if (!/^\d{44}$/.test(chave)) return false;
    const numeros = chave.substr(0, 43).split("").map(Number);
    let multiplicador = 2;
    let soma = 0;
    for (let i = numeros.length - 1; i >= 0; i--) {
      soma += numeros[i] * multiplicador;
      multiplicador++;
      if (multiplicador > 9) multiplicador = 2;
    }
    const dvCalculado = 11 - (soma % 11);
    const dv = dvCalculado > 9 ? 0 : dvCalculado;
    return dv === parseInt(chave[43]);
  }

  function lerXML(file) {
    const reader = new FileReader();
    reader.onload = e => {
      let text = e.target.result.replace(/^\uFEFF/, "").trim();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");

      if (xml.getElementsByTagName("parsererror").length > 0) {
        alert(`Erro ao ler o arquivo "${file.name}".`);
        return;
      }

      let infNFe =
        xml.getElementsByTagNameNS(NAMESPACE, "infNFe")[0] ||
        xml.getElementsByTagName("infNFe")[0];

      if (!infNFe) {
        alert(`O arquivo "${file.name}" não contém infNFe.`);
        return;
      }

      const idAttr = infNFe.getAttribute("Id") || "";
      const chave = idAttr.replace("NFe", "");

      setXmlDocs(prev => {
        if (prev.find(d => d.nome === file.name)) return prev;
        return [...prev, { nome: file.name, xml, chave }];
      });

      setXmlSelecionado(file.name);
      setChaveInfo({ chave, valida: validarChave(chave) });
      setResultado(null);
    };
    reader.readAsText(file);
  }

  function buscarProduto() {
    if (!xmlSelecionado || !ordemProduto) return;

    const doc = xmlDocs.find(d => d.nome === xmlSelecionado)?.xml;
    if (!doc) return;

    let itens = Array.from(doc.getElementsByTagNameNS(NAMESPACE, "det"));
    if (itens.length === 0) itens = Array.from(doc.getElementsByTagName("det"));

    const index = parseInt(ordemProduto) - 1;
    const item = itens[index];

    if (!item) {
      setResultado({ erro: "Produto não encontrado para essa ordem." });
      return;
    }

    const prod =
      item.getElementsByTagNameNS(NAMESPACE, "prod")[0] ||
      item.getElementsByTagName("prod")[0];

    if (!prod) {
      setResultado({ erro: "Tag <prod> não encontrada." });
      return;
    }

    const getVal = (parent, tag) => {
      let el =
        parent.getElementsByTagNameNS(NAMESPACE, tag)[0] ||
        parent.getElementsByTagName(tag)[0];
      return el ? el.textContent : "—";
    };

    setResultado({
      codigo: getVal(prod, "cProd"),
      descricao: getVal(prod, "xProd"),
      ncm: getVal(prod, "NCM"),
      cfop: getVal(prod, "CFOP")
    });
  }

  // 🔹 NOVA FUNÇÃO – consulta NCM atualizado no Portal Único Siscomex
  function consultarNcmAtualizado(ncm) {
    if (!ncm || ncm === "—") return;

    const ncmLimpo = ncm.replace(/\D/g, "");
    if (ncmLimpo.length < 2) return;

    const ncmBase = ncmLimpo.slice(0, -1); // remove o último dígito

    const url = `https://portalunico.siscomex.gov.br/classif/#/nomenclatura/${ncmBase}?criterio=${ncmLimpo}`;

    window.open(url, "_blank");
  }

  return (
    <main className="page">
      <section className="card">
        <header className="header">
          <h1>Leitor de NFC-e</h1>
          <p>Consulta de NCM e CFOP por ordem do produto</p>
        </header>

        <div className="form">
          <label className="file-upload">
            <input
              type="file"
              accept=".xml"
              multiple
              onChange={e =>
                Array.from(e.target.files).forEach(lerXML)
              }
            />
            <span>Selecionar XML(s)</span>
          </label>

          {xmlDocs.length > 0 && (
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "14px", marginBottom: "5px", display: "block" }}>
                Selecione o arquivo:
              </label>
              <select
                className="xml-select"
                value={xmlSelecionado}
                onChange={e => {
                  const nome = e.target.value;
                  const doc = xmlDocs.find(d => d.nome === nome);
                  setXmlSelecionado(nome);
                  setChaveInfo({
                    chave: doc.chave,
                    valida: validarChave(doc.chave)
                  });
                  setResultado(null);
                }}
              >
                {xmlDocs.map(doc => (
                  <option key={doc.nome} value={doc.nome}>
                    {doc.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {chaveInfo && (
            <div className={`alert ${chaveInfo.valida ? "success" : "error"}`}>
              <strong>Chave:</strong> {chaveInfo.chave} <br />
              {chaveInfo.valida ? "Chave válida" : "Chave inválida"}
            </div>
          )}

          <label>Ordem do produto</label>
          <input
            type="number"
            min="1"
            value={ordemProduto}
            onChange={e => setOrdemProduto(e.target.value)}
            placeholder="Ex: 1, 2, 3..."
          />

          <button onClick={buscarProduto}>Buscar</button>
        </div>

        {resultado && (
          <div className="result-card">
            {resultado.erro ? (
              <p className="error-text">{resultado.erro}</p>
            ) : (
              <>
                <div><span>Código</span><strong>{resultado.codigo}</strong></div>
                <div><span>Descrição</span><strong>{resultado.descricao}</strong></div>
                <div><span>NCM</span><strong>{resultado.ncm}</strong></div>
                <div><span>CFOP</span><strong>{resultado.cfop}</strong></div>

                {/* 🔹 BOTÃO DE CONSULTA DO NCM ATUALIZADO */}
                <button
                  style={{ marginTop: "12px" }}
                  onClick={() => consultarNcmAtualizado(resultado.ncm)}
                >
                  Consultar NCM atualizado
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
