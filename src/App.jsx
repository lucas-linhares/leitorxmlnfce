import { useState } from "react";
import "./App.css";

export default function App() {
  const [xmlDocs, setXmlDocs] = useState([]);
  const [xmlSelecionado, setXmlSelecionado] = useState(null);
  const [ordemProduto, setOrdemProduto] = useState("");
  const [resultado, setResultado] = useState(null);
  const [chaveInfo, setChaveInfo] = useState(null);

  const NAMESPACE = "http://www.portalfiscal.inf.br/nfe";

  // Função de validação da chave NFC-e (44 dígitos)
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

  // Ler e processar XML
  function lerXML(file) {
    const reader = new FileReader();

    reader.onload = e => {
      let text = e.target.result.replace(/^\uFEFF/, "");
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");

      const parserError = xml.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        alert(`O arquivo "${file.name}" não é um XML válido.`);
        return;
      }

      const infNFe = xml.getElementsByTagNameNS(NAMESPACE, "infNFe")[0];
      if (!infNFe) {
        alert(`O arquivo "${file.name}" não contém infNFe.`);
        return;
      }

      const idAttr = infNFe.getAttribute("Id");
      if (!idAttr || !idAttr.startsWith("NFe")) {
        alert(`Não foi possível localizar a chave no XML "${file.name}".`);
        return;
      }

      const chave = idAttr.replace("NFe", "");

      setXmlDocs(prev => [...prev, { nome: file.name, xml, chave }]);
      setXmlSelecionado(file.name);
      setChaveInfo({
        chave,
        valida: validarChave(chave)
      });
      setResultado(null);
    };

    reader.readAsText(file);
  }

  // Buscar produto
  function buscarProduto() {
    if (!xmlSelecionado || !ordemProduto) return;

    const doc = xmlDocs.find(d => d.nome === xmlSelecionado)?.xml;
    if (!doc) return;

    const itens = Array.from(doc.getElementsByTagNameNS(NAMESPACE, "det"));
    const index = parseInt(ordemProduto) - 1;
    const prod = itens[index]?.getElementsByTagNameNS(NAMESPACE, "prod")[0];

    if (!prod) {
      setResultado({ erro: "Produto não encontrado para essa ordem." });
      return;
    }

    setResultado({
      descricao: prod.getElementsByTagNameNS(NAMESPACE, "xProd")[0]?.textContent || "—",
      ncm: prod.getElementsByTagNameNS(NAMESPACE, "NCM")[0]?.textContent || "—",
      codigo: prod.getElementsByTagNameNS(NAMESPACE, "cProd")[0]?.textContent || "—"
    });
  }

  return (
    <main className="page">
      <section className="card">
        <header className="header">
          <h1>Leitor NFC-e</h1>
          <p>Consulta de NCM por ordem do produto</p>
        </header>

        <div className="form">
          <label className="file-upload">
            <input
              type="file"
              accept=".xml"
              multiple
              onChange={e => Array.from(e.target.files).forEach(lerXML)}
            />
            <span>Selecionar XML(s)</span>
          </label>

          {xmlDocs.length > 0 && (
            <div className="xml-list">
              {xmlDocs.map((doc) => (
                <button
                  key={doc.nome}
                  className={`xml-btn ${xmlSelecionado === doc.nome ? "selected" : ""}`}
                  onClick={() => {
                    setXmlSelecionado(doc.nome);
                    setChaveInfo({
                      chave: doc.chave,
                      valida: validarChave(doc.chave)
                    });
                    setResultado(null);
                  }}
                >
                  {doc.nome}
                </button>
              ))}
            </div>
          )}

          {chaveInfo && (
            <div className={`alert ${chaveInfo.valida ? "success" : "error"}`}>
              <strong>Chave:</strong> {chaveInfo.chave}
              <br />
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
                <div>
                  <span>Código do produto</span>
                  <strong>{resultado.codigo}</strong>
                </div>
                <div>
                  <span>Descrição</span>
                  <strong>{resultado.descricao}</strong>
                </div>
                <div>
                  <span>NCM</span>
                  <strong>{resultado.ncm}</strong>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
