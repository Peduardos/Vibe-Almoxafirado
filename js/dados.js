// ==================== DADOS E REGRAS DE NEGÓCIO ====================

let estado = criarEstadoInicial();

function criarEstadoInicial() {
  return {
    produtos: [],
    movimentacoes: [],
    proximoIdProduto: 1,
    proximoIdMovimentacao: 1
  };
}

function situacaoEstoque(produto) {
  if (produto.quantidade <= 0) return 'SEM_ESTOQUE';
  if (produto.quantidade <= produto.estoqueMinimo) return 'BAIXO';
  return 'NORMAL';
}

function produtosEmAlerta() {
  return estado.produtos.filter(p => situacaoEstoque(p) !== 'NORMAL');
}

function buscarProdutoPorCodigo(codigo) {
  const c = String(codigo).trim().toUpperCase();
  return estado.produtos.find(p => p.codigo.toUpperCase() === c) || null;
}

function buscarProdutoPorId(id) {
  return estado.produtos.find(p => p.id === id) || null;
}

function cadastrarProduto(dados) {
  if (buscarProdutoPorCodigo(dados.codigo)) {
    return { erro: 'Já existe um produto com o código ' + dados.codigo + '.' };
  }
  const produto = {
    id: estado.proximoIdProduto++,
    codigo: String(dados.codigo).trim(),
    nome: dados.nome.trim(),
    categoria: dados.categoria.trim(),
    preco: Number(dados.preco),
    estoqueMinimo: parseInt(dados.estoqueMinimo, 10),
    quantidade: parseInt(dados.quantidade || 0, 10),
    localizacao: (dados.localizacao || '').trim(),
    descricao: (dados.descricao || '').trim()
  };
  estado.produtos.push(produto);
  return { produto };
}

function atualizarProduto(id, dados) {
  const produto = buscarProdutoPorId(id);
  if (!produto) return { erro: 'Produto não encontrado.' };
  const existente = buscarProdutoPorCodigo(dados.codigo);
  if (existente && existente.id !== id) {
    return { erro: 'Já existe outro produto com o código ' + dados.codigo + '.' };
  }
  produto.codigo = String(dados.codigo).trim();
  produto.nome = dados.nome.trim();
  produto.categoria = dados.categoria.trim();
  produto.preco = Number(dados.preco);
  produto.estoqueMinimo = parseInt(dados.estoqueMinimo, 10);
  produto.localizacao = (dados.localizacao || '').trim();
  produto.descricao = (dados.descricao || '').trim();
  return { produto };
}

function excluirProduto(id) {
  const indice = estado.produtos.findIndex(p => p.id === id);
  if (indice === -1) return { erro: 'Produto não encontrado.' };
  estado.produtos.splice(indice, 1);
  return { ok: true };
}

function registrarMovimentacao(produtoId, tipo, quantidade, responsavel) {
  const produto = buscarProdutoPorId(produtoId);
  if (!produto) return { erro: 'Produto não encontrado.' };
  quantidade = parseInt(quantidade, 10);
  if (!quantidade || quantidade <= 0) return { erro: 'Quantidade deve ser maior que zero.' };

  if (tipo === 'SAIDA' && quantidade > produto.quantidade) {
    return { erro: 'Saída bloqueada: quantidade solicitada (' + quantidade +
      ') excede o estoque disponível (' + produto.quantidade + ').' };
  }

  produto.quantidade += (tipo === 'ENTRADA') ? quantidade : -quantidade;

  const mov = {
    id: estado.proximoIdMovimentacao++,
    produtoId: produto.id,
    produtoNome: produto.nome,
    tipo: tipo,
    quantidade: quantidade,
    responsavel: responsavel,
    data: new Date().toISOString()
  };
  estado.movimentacoes.unshift(mov);
  return { mov, produto };
}

// ==================== DADOS INICIAIS (DEMONSTRAÇÃO) ====================

function carregarDadosIniciais() {
  const agora = Date.now();
  const dia = 24 * 60 * 60 * 1000;
  estado = criarEstadoInicial();

  const iniciais = [
    { codigo: 'P001', nome: 'Parafuso Sextavado 1/2', categoria: 'Fixadores', preco: 0.35, estoqueMinimo: 100, quantidade: 850, localizacao: 'Corredor A, Prateleira 1' },
    { codigo: 'P002', nome: 'Porca Galvanizada 1/2', categoria: 'Fixadores', preco: 0.25, estoqueMinimo: 100, quantidade: 60, localizacao: 'Corredor A, Prateleira 2' },
    { codigo: 'P003', nome: 'Cabo de Aço 5mm', categoria: 'Elétricos', preco: 12.90, estoqueMinimo: 20, quantidade: 0, localizacao: 'Corredor B, Prateleira 3' },
    { codigo: 'P004', nome: 'Fita Isolante 20m', categoria: 'Elétricos', preco: 8.50, estoqueMinimo: 30, quantidade: 45, localizacao: 'Corredor B, Prateleira 4' },
    { codigo: 'P005', nome: 'Luva PVC 25mm', categoria: 'Hidráulicos', preco: 2.10, estoqueMinimo: 50, quantidade: 200, localizacao: 'Corredor C, Prateleira 1' },
    { codigo: 'P006', nome: 'Teflon Industrial', categoria: 'Hidráulicos', preco: 4.75, estoqueMinimo: 25, quantidade: 25, localizacao: 'Corredor C, Prateleira 2' }
  ];

  iniciais.forEach(d => {
    const r = cadastrarProduto(d);
    if (r.erro) console.warn('Erro ao criar produto inicial:', r.erro);
  });

  const movimentos = [
    { produtoCodigo: 'P001', tipo: 'ENTRADA', quantidade: 500, responsavel: 'Administrador', data: new Date(agora - 5 * dia).toISOString() },
    { produtoCodigo: 'P002', tipo: 'SAIDA',   quantidade: 90,  responsavel: 'Administrador', data: new Date(agora - 4 * dia).toISOString() },
    { produtoCodigo: 'P003', tipo: 'SAIDA',   quantidade: 15,  responsavel: 'Usuário Comum', data: new Date(agora - 3 * dia).toISOString() },
    { produtoCodigo: 'P004', tipo: 'ENTRADA', quantidade: 45,  responsavel: 'Usuário Comum', data: new Date(agora - 2 * dia).toISOString() },
    { produtoCodigo: 'P006', tipo: 'SAIDA',   quantidade: 30,  responsavel: 'Administrador', data: new Date(agora - 1 * dia).toISOString() }
  ];

  movimentos.forEach(m => {
    const p = buscarProdutoPorCodigo(m.produtoCodigo);
    if (p) {
      const mov = {
        id: estado.proximoIdMovimentacao++,
        produtoId: p.id,
        produtoNome: p.nome,
        tipo: m.tipo,
        quantidade: m.quantidade,
        responsavel: m.responsavel,
        data: m.data
      };
      estado.movimentacoes.push(mov);
    }
  });

  estado.movimentacoes.sort((a, b) => b.data.localeCompare(a.data));
}