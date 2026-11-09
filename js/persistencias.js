// ==================== PERSISTÊNCIA (localStorage) ====================

const CHAVE_ESTADO = 'almoxarifado_estado_v1';

function salvarDados() {
  try {
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
  } catch (e) {
    console.warn('Não foi possível salvar os dados:', e);
  }
}

function carregarDados() {
  try {
    const bruto = localStorage.getItem(CHAVE_ESTADO);
    if (!bruto) {
      carregarDadosIniciais();
      salvarDados();
      return false; // não havia dados salvos
    }
    const dados = JSON.parse(bruto);
    if (!dados || !Array.isArray(dados.produtos) || !Array.isArray(dados.movimentacoes)) {
      carregarDadosIniciais();
      salvarDados();
      return false;
    }
    aplicarEstado(dados);
    return true;
  } catch (e) {
    console.warn('Dados corrompidos, recarregando iniciais:', e);
    carregarDadosIniciais();
    salvarDados();
    return false;
  }
}

function limparDados() {
  try { localStorage.removeItem(CHAVE_ESTADO); } catch (e) { /* ignore */ }
}

function aplicarEstado(dados) {
  estado = {
    produtos: dados.produtos,
    movimentacoes: dados.movimentacoes,
    proximoIdProduto: Math.max(dados.proximoIdProduto || 1,
      ...dados.produtos.map(p => p.id + 1), 1),
    proximoIdMovimentacao: Math.max(dados.proximoIdMovimentacao || 1,
      ...dados.movimentacoes.map(m => m.id + 1), 1)
  };
}