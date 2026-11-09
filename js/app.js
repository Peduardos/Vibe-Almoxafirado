// ==================== APLICAÇÃO (app.js) ====================

// ---------- Utilidades ----------
function $(id) { return document.getElementById(id); }

function formatarPreco(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

function formatarData(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function exibirMensagem(idElemento, texto, tipo) {
  const el = $(idElemento);
  if (!el) return;
  el.textContent = texto;
  el.className = 'mensagem mensagem-' + tipo;
}

function ocultarMensagem(idElemento) {
  const el = $(idElemento);
  if (!el) return;
  el.className = 'mensagem oculto';
  el.textContent = '';
}

let toastTimer = null;
function exibirToast(texto, tipo) {
  const toast = $('toast');
  toast.textContent = texto;
  toast.className = 'toast toast-' + tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast oculto'; }, 3200);
}

function limparFormulario(form) {
  form.reset();
}

function preencherSelect(seletor, incluirVazio, textoVazio) {
  const select = $(seletor);
  select.innerHTML = '';
  if (incluirVazio) {
    const op = document.createElement('option');
    op.value = '';
    op.textContent = textoVazio;
    select.appendChild(op);
  }
  const ordenados = [...estado.produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  ordenados.forEach(p => {
    const op = document.createElement('option');
    op.value = String(p.id);
    op.textContent = p.codigo + ' — ' + p.nome + ' (' + p.quantidade + ' un.)';
    select.appendChild(op);
  });
}

function classeSituacao(situacao) {
  if (situacao === 'SEM_ESTOQUE') return 'situacao-zero';
  if (situacao === 'BAIXO') return 'situacao-baixo';
  return 'situacao-normal';
}

function rotuloSituacao(situacao) {
  if (situacao === 'SEM_ESTOQUE') return 'SEM ESTOQUE';
  if (situacao === 'BAIXO') return 'BAIXO';
  return 'NORMAL';
}

// ---------- Login / Logout ----------
function iniciarLogin() {
  $('form-login').addEventListener('submit', function (e) {
    e.preventDefault();
    const usuario = $('login-usuario').value.trim();
    const senha = $('login-senha').value;
    const conta = autenticar(usuario, senha);
    if (!conta) {
      $('login-erro').classList.remove('oculto');
      return;
    }
    $('login-erro').classList.add('oculto');
    usuarioAtual = { usuario: conta.usuario, nome: conta.nome, perfil: conta.perfil };
    limparFormulario(this);
    entrarNaAplicacao();
  });

  $('btn-sair').addEventListener('click', function () {
    usuarioAtual = null;
    sairDaAplicacao();
  });
}

function entrarNaAplicacao() {
  $('tela-login').classList.add('oculto');
  $('app').classList.remove('oculto');
  $('usuario-logado').textContent = usuarioAtual.nome + ' (' + (usuarioAtual.perfil === 'ADMIN' ? 'Administrador' : 'Usuário Comum') + ')';

  // esconder itens de menu sem permissão
  document.querySelectorAll('[data-permissao]').forEach(el => {
    const tem = temPermissao(el.getAttribute('data-permissao'));
    el.classList.toggle('oculto', !tem);
  });

  carregarDados();           // restaura estado salvo (ou dados iniciais)
  exibirSecao('dashboard');
  atualizarInterface();
}

function sairDaAplicacao() {
  $('app').classList.add('oculto');
  $('tela-login').classList.remove('oculto');
}

// ---------- Navegação ----------
function exibirSecao(secao) {
  if (!podeAcessarSecao(secao)) {
    exibirToast('Você não tem permissão para acessar esta seção.', 'erro');
    return;
  }
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  const destino = $('secao-' + secao);
  if (destino) destino.classList.add('ativa');

  document.querySelectorAll('.item-menu').forEach(b => {
    b.classList.toggle('ativo', b.getAttribute('data-secao') === secao);
  });

  // atualiza dados da seção exibida
  if (secao === 'dashboard') atualizarDashboard();
  if (secao === 'produtos') atualizarTabelaProdutos();
  if (secao === 'entrada') { preencherSelect('entrada-produto', true, 'Selecione um produto'); ocultarMensagem('entrada-msg'); }
  if (secao === 'saida') { preencherSelect('saida-produto', true, 'Selecione um produto'); ocultarMensagem('saida-msg'); atualizarDisponivel(); }
  if (secao === 'estoque') atualizarAlertas();
  if (secao === 'historico') atualizarTabelaHistorico();
}

function iniciarNavegacao() {
  document.querySelectorAll('.item-menu, .atalho').forEach(botao => {
    botao.addEventListener('click', function () {
      exibirSecao(this.getAttribute('data-secao'));
    });
  });
}

// ---------- Atualização geral ----------
function atualizarInterface() {
  atualizarDashboard();
  atualizarTabelaProdutos();
  atualizarAlertas();
  atualizarTabelaHistorico();
  preencherFiltroCategorias();
  preencherFiltroHistorico();
}

// ---------- Dashboard ----------
function atualizarDashboard() {
  $('card-total-produtos').textContent = estado.produtos.length;
  const baixo = estado.produtos.filter(p => situacaoEstoque(p) === 'BAIXO').length;
  const zero = estado.produtos.filter(p => situacaoEstoque(p) === 'SEM_ESTOQUE').length;
  $('card-estoque-baixo').textContent = baixo;
  $('card-sem-estoque').textContent = zero;
  $('card-movimentacoes').textContent = estado.movimentacoes.length;

  const lista = $('lista-movimentacoes');
  lista.innerHTML = '';
  const recentes = estado.movimentacoes.slice(0, 5);

  if (recentes.length === 0) {
    $('dashboard-mov-vazio').classList.remove('oculto');
  } else {
    $('dashboard-mov-vazio').classList.add('oculto');
    recentes.forEach(m => {
      const li = document.createElement('li');
      li.className = 'item-mov';
      li.innerHTML =
        '<span class="' + (m.tipo === 'ENTRADA' ? 'tipo-entrada' : 'tipo-saida') + '">' +
        (m.tipo === 'ENTRADA' ? '📥 ENTRADA' : '📤 SAÍDA') + '</span>' +
        '<span>' + m.quantidade + ' un. — ' + m.produtoNome + '</span>' +
        '<span class="data-mov">' + formatarData(m.data) + ' • ' + m.responsavel + '</span>';
      lista.appendChild(li);
    });
  }
}

// ---------- Produtos: filtros, pesquisa e ordenação ----------
function preencherFiltroCategorias() {
  const select = $('filtro-categoria');
  const valorAtual = select.value;
  const categorias = [...new Set(estado.produtos.map(p => p.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  select.innerHTML = '<option value="">Todas as categorias</option>';
  categorias.forEach(c => {
    const op = document.createElement('option');
    op.value = c;
    op.textContent = c;
    select.appendChild(op);
  });
  if ([...select.options].some(o => o.value === valorAtual)) select.value = valorAtual;
}

function obterProdutosFiltrados() {
  const termo = $('filtro-pesquisa').value.trim().toLowerCase();
  const categoria = $('filtro-categoria').value;
  const situacao = $('filtro-situacao').value;
  const ordenacao = $('filtro-ordenacao').value;

  let lista = estado.produtos.filter(p => {
    const combinaTermo = !termo ||
      p.nome.toLowerCase().includes(termo) ||
      p.codigo.toLowerCase().includes(termo);
    const combinaCategoria = !categoria || p.categoria === categoria;
    const combinaSituacao = !situacao || situacaoEstoque(p) === situacao;
    return combinaTermo && combinaCategoria && combinaSituacao;
  });

  const comparadores = {
    'nome-asc': (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
    'nome-desc': (a, b) => b.nome.localeCompare(a.nome, 'pt-BR'),
    'codigo-asc': (a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'),
    'codigo-desc': (a, b) => b.codigo.localeCompare(a.codigo, 'pt-BR'),
    'quantidade-asc': (a, b) => a.quantidade - b.quantidade,
    'quantidade-desc': (a, b) => b.quantidade - a.quantidade,
    'preco-desc': (a, b) => b.preco - a.preco,
    'preco-asc': (a, b) => a.preco - b.preco
  };

  if (comparadores[ordenacao]) lista.sort(comparadores[ordenacao]);
  return lista;
}

function atualizarTabelaProdutos() {
  const tbody = $('corpo-tabela-produtos');
  tbody.innerHTML = '';
  const lista = obterProdutosFiltrados();

  if (lista.length === 0) {
    $('produtos-vazio').classList.remove('oculto');
    return;
  }
  $('produtos-vazio').classList.add('oculto');

  lista.forEach(p => {
    const situacao = situacaoEstoque(p);
    const tr = document.createElement('tr');

    const celulas =
      '<td><strong>' + p.codigo + '</strong></td>' +
      '<td>' + p.nome + '</td>' +
      '<td>' + p.categoria + '</td>' +
      '<td>' + p.quantidade + ' un. <small>(mín. ' + p.estoqueMinimo + ')</small></td>' +
      '<td>' + formatarPreco(p.preco) + '</td>' +
      '<td><span class="situacao ' + classeSituacao(situacao) + '">' + rotuloSituacao(situacao) + '</span></td>';

    const acoes = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'acoes-tabela';

    const btnDetalhe = document.createElement('button');
    btnDetalhe.type = 'button';
    btnDetalhe.className = 'btn btn-neutro btn-mini';
    btnDetalhe.textContent = 'Detalhes';
    btnDetalhe.addEventListener('click', () => abrirDetalhe(p.id));

    const btnEditar = document.createElement('button');
    btnEditar.type = 'button';
    btnEditar.className = 'btn btn-primario btn-mini';
    btnEditar.textContent = 'Editar';
    if (!temPermissao('produto.editar')) btnEditar.disabled = true;
    btnEditar.addEventListener('click', () => abrirEdicao(p.id));

    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.className = 'btn btn-perigo btn-mini';
    btnExcluir.textContent = 'Excluir';
    if (!temPermissao('produto.excluir')) btnExcluir.disabled = true;
    btnExcluir.addEventListener('click', () => abrirConfirmacaoExclusao(p.id));

    div.appendChild(btnDetalhe);
    div.appendChild(btnEditar);
    div.appendChild(btnExcluir);
    acoes.appendChild(div);

    tr.innerHTML = celulas;
    tr.appendChild(acoes);
    tbody.appendChild(tr);
  });
}

function iniciarFiltrosProdutos() {
  ['filtro-pesquisa', 'filtro-categoria', 'filtro-situacao', 'filtro-ordenacao'].forEach(id => {
    $(id).addEventListener('input', atualizarTabelaProdutos);
    $(id).addEventListener('change', atualizarTabelaProdutos);
  });

  $('btn-limpar-filtros').addEventListener('click', function () {
    $('filtro-pesquisa').value = '';
    $('filtro-categoria').value = '';
    $('filtro-situacao').value = '';
    $('filtro-ordenacao').value = 'nome-asc';
    atualizarTabelaProdutos();
    exibirToast('Filtros limpos.', 'aviso');
  });
}

// ---------- Cadastro de produto ----------
function iniciarCadastroProduto() {
  $('form-produto').addEventListener('submit', function (e) {
    e.preventDefault();
    ocultarMensagem('form-produto-msg');
    ocultarMensagem('form-produto-aviso');

    const dados = {
      codigo: $('prod-codigo').value,
      nome: $('prod-nome').value,
      categoria: $('prod-categoria').value,
      preco: $('prod-preco').value,
      estoqueMinimo: $('prod-estoque-minimo').value,
      quantidade: $('prod-quantidade').value || 0,
      localizacao: $('prod-localizacao').value,
      descricao: $('prod-descricao').value
    };

    if (!dados.codigo.trim() || !dados.nome.trim() || !dados.categoria.trim()) {
      exibirMensagem('form-produto-msg', 'Preencha todos os campos obrigatórios (*).', 'erro');
      return;
    }
    if (Number(dados.preco) <= 0 || isNaN(Number(dados.preco))) {
      exibirMensagem('form-produto-msg', 'Informe um preço válido maior que zero.', 'erro');
      return;
    }
    if (dados.estoqueMinimo === '' || parseInt(dados.estoqueMinimo, 10) < 0) {
      exibirMensagem('form-produto-msg', 'Informe um estoque mínimo válido (zero ou mais).', 'erro');
      return;
    }
    if (parseInt(dados.quantidade, 10) < 0) {
      exibirMensagem('form-produto-msg', 'A quantidade inicial não pode ser negativa.', 'erro');
      return;
    }

    const resultado = cadastrarProduto(dados);
    if (resultado.erro) {
      exibirMensagem('form-produto-msg', resultado.erro, 'erro');
      return;
    }

    salvarDados();
    atualizarInterface();
    limparFormulario(this);

    const situacao = situacaoEstoque(resultado.produto);
    if (situacao !== 'NORMAL') {
      exibirMensagem('form-produto-aviso',
        'Produto salvo, mas atenção: ' + resultado.produto.nome +
        (situacao === 'SEM_ESTOQUE' ? ' está SEM ESTOQUE.' : ' já nasce com estoque BAIXO.') +
        ' Consulte a seção "Consultar Estoque".', 'aviso');
    }
    exibirToast('Produto "' + resultado.produto.nome + '" cadastrado com sucesso!', 'sucesso');
  });

  $('btn-limpar-form').addEventListener('click', function () {
    limparFormulario($('form-produto'));
    ocultarMensagem('form-produto-msg');
    ocultarMensagem('form-produto-aviso');
  });
}

// ---------- Detalhes / Edição / Exclusão ----------
function abrirDetalhe(id) {
  const p = buscarProdutoPorId(id);
  if (!p) return;
  const situacao = situacaoEstoque(p);
  $('detalhe-conteudo').innerHTML =
    '<p><strong>Código</strong>' + p.codigo + '</p>' +
    '<p><strong>Nome</strong>' + p.nome + '</p>' +
    '<p><strong>Categoria</strong>' + p.categoria + '</p>' +
    '<p><strong>Preço</strong>' + formatarPreco(p.preco) + '</p>' +
    '<p><strong>Quantidade em estoque</strong>' + p.quantidade + ' un.</p>' +
    '<p><strong>Estoque mínimo</strong>' + p.estoqueMinimo + ' un.</p>' +
    '<p><strong>Situação</strong><span class="situacao ' + classeSituacao(situacao) + '">' + rotuloSituacao(situacao) + '</span></p>' +
    '<p><strong>Localização</strong>' + (p.localizacao || '—') + '</p>' +
    '<p><strong>Descrição</strong>' + (p.descricao || '—') + '</p>';

  $('btn-editar-do-detalhe').classList.toggle('oculto', !temPermissao('produto.editar'));
  $('btn-editar-do-detalhe').onclick = () => { fecharModais(); abrirEdicao(id); };

  abrirModal('modal-detalhe');
}

let produtoEmExclusao = null;

function abrirConfirmacaoExclusao(id) {
  const p = buscarProdutoPorId(id);
  if (!p) return;
  produtoEmExclusao = id;
  $('excluir-texto').textContent =
    'Tem certeza que deseja excluir o produto "' + p.nome + '" (' + p.codigo + ')? Esta ação não pode ser desfeita.';
  abrirModal('modal-excluir');
}

function confirmarExclusao() {
  if (produtoEmExclusao === null) return;
  const resultado = excluirProduto(produtoEmExclusao);
  produtoEmExclusao = null;
  fecharModais();
  if (resultado.erro) {
    exibirToast('Erro ao excluir: ' + resultado.erro, 'erro');
    return;
  }
  salvarDados();
  atualizarInterface();
  exibirToast('Produto excluído com sucesso.', 'sucesso');
}

function abrirEdicao(id) {
  const p = buscarProdutoPorId(id);
  if (!p) return;
  $('edit-codigo').value = p.codigo;
  $('edit-nome').value = p.nome;
  $('edit-categoria').value = p.categoria;
  $('edit-preco').value = p.preco;
  $('edit-estoque-minimo').value = p.estoqueMinimo;
  $('edit-localizacao').value = p.localizacao || '';
  $('edit-descricao').value = p.descricao || '';
  $('form-edicao').setAttribute('data-id', String(id));
  ocultarMensagem('form-edicao-msg');
  abrirModal('modal-edicao');
}

function salvarEdicao(e) {
  e.preventDefault();
  const id = parseInt($('form-edicao').getAttribute('data-id'), 10);
  const dados = {
    codigo: $('edit-codigo').value,
    nome: $('edit-nome').value,
    categoria: $('edit-categoria').value,
    preco: $('edit-preco').value,
    estoqueMinimo: $('edit-estoque-minimo').value,
    localizacao: $('edit-localizacao').value,
    descricao: $('edit-descricao').value
  };

  if (!dados.codigo.trim() || !dados.nome.trim() || !dados.categoria.trim()) {
    exibirMensagem('form-edicao-msg', 'Preencha todos os campos obrigatórios (*).', 'erro');
    return;
  }
  if (Number(dados.preco) <= 0 || isNaN(Number(dados.preco))) {
    exibirMensagem('form-edicao-msg', 'Informe um preço válido maior que zero.', 'erro');
    return;
  }
  if (dados.estoqueMinimo === '' || parseInt(dados.estoqueMinimo, 10) < 0) {
    exibirMensagem('form-edicao-msg', 'Informe um estoque mínimo válido.', 'erro');
    return;
  }

  const resultado = atualizarProduto(id, dados);
  if (resultado.erro) {
    exibirMensagem('form-edicao-msg', resultado.erro, 'erro');
    return;
  }

  salvarDados();
  fecharModais();
  atualizarInterface();
  const situacao = situacaoEstoque(resultado.produto);
  exibirToast('Produto atualizado com sucesso!' +
    (situacao !== 'NORMAL' ? ' Atenção: estoque ' + rotuloSituacao(situacao) + '.' : ''),
    situacao === 'NORMAL' ? 'sucesso' : 'aviso');
}

// ---------- Modais ----------
function abrirModal(idModal) {
  $('modal-overlay').classList.remove('oculto');
  $('modal-detalhe').classList.add('oculto');
  $('modal-excluir').classList.add('oculto');
  $('modal-edicao').classList.add('oculto');
  $(idModal).classList.remove('oculto');
}

function fecharModais() {
  $('modal-overlay').classList.add('oculto');
  $('modal-detalhe').classList.add('oculto');
  $('modal-excluir').classList.add('oculto');
  $('modal-edicao').classList.add('oculto');
  produtoEmExclusao = null;
}

function iniciarModais() {
  $('btn-fechar-detalhe').addEventListener('click', fecharModais);
  $('btn-cancelar-exclusao').addEventListener('click', fecharModais);
  $('btn-confirmar-exclusao').addEventListener('click', confirmarExclusao);
  $('btn-cancelar-edicao').addEventListener('click', fecharModais);
  $('form-edicao').addEventListener('submit', salvarEdicao);
  $('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) fecharModais();
  });
}

// ---------- Entrada de estoque ----------
function iniciarEntrada() {
  $('form-entrada').addEventListener('submit', function (e) {
    e.preventDefault();
    ocultarMensagem('entrada-msg');

    const produtoId = parseInt($('entrada-produto').value, 10);
    const quantidade = $('entrada-quantidade').value;

    if (!produtoId) {
      exibirMensagem('entrada-msg', 'Selecione um produto.', 'erro');
      return;
    }
    if (!quantidade || parseInt(quantidade, 10) <= 0) {
      exibirMensagem('entrada-msg', 'Informe uma quantidade maior que zero.', 'erro');
      return;
    }

    const resultado = registrarMovimentacao(produtoId, 'ENTRADA', quantidade, usuarioAtual.nome);
    if (resultado.erro) {
      exibirMensagem('entrada-msg', resultado.erro, 'erro');
      return;
    }

    salvarDados();
    limparFormulario(this);
    preencherSelect('entrada-produto', true, 'Selecione um produto');
    atualizarInterface();

    const situacao = situacaoEstoque(resultado.produto);
    exibirToast('Entrada de ' + resultado.mov.quantidade + ' un. de "' + resultado.mov.produtoNome + '" registrada!' +
      (situacao !== 'NORMAL' ? ' Atenção: produto ainda com estoque ' + rotuloSituacao(situacao) + '.' : ''),
      situacao === 'NORMAL' ? 'sucesso' : 'aviso');
  });
}

// ---------- Saída de estoque ----------
function atualizarDisponivel() {
  const select = $('saida-produto');
  const label = $('saida-disponivel');
  const id = parseInt(select.value, 10);
  const p = id ? buscarProdutoPorId(id) : null;
  label.textContent = p ? ('Disponível: ' + p.quantidade + ' un. (mínimo: ' + p.estoqueMinimo + ')') : 'Disponível: —';
}

function iniciarSaida() {
  $('saida-produto').addEventListener('change', atualizarDisponivel);

  $('form-saida').addEventListener('submit', function (e) {
    e.preventDefault();
    ocultarMensagem('saida-msg');

    const produtoId = parseInt($('saida-produto').value, 10);
    const quantidade = $('saida-quantidade').value;

    if (!produtoId) {
      exibirMensagem('saida-msg', 'Selecione um produto.', 'erro');
      return;
    }
    if (!quantidade || parseInt(quantidade, 10) <= 0) {
      exibirMensagem('saida-msg', 'Informe uma quantidade maior que zero.', 'erro');
      return;
    }

    const resultado = registrarMovimentacao(produtoId, 'SAIDA', quantidade, usuarioAtual.nome);
    if (resultado.erro) {
      exibirMensagem('saida-msg', resultado.erro, 'erro');
      return;
    }

    salvarDados();
    limparFormulario(this);
    preencherSelect('saida-produto', true, 'Selecione um produto');
    atualizarDisponivel();
    atualizarInterface();

    const situacao = situacaoEstoque(resultado.produto);
    exibirToast('Saída de ' + resultado.mov.quantidade + ' un. de "' + resultado.mov.produtoNome + '" registrada!' +
      (situacao !== 'NORMAL' ? ' Atenção: produto agora com estoque ' + rotuloSituacao(situacao) + '.' : ''),
      situacao === 'NORMAL' ? 'sucesso' : 'aviso');
  });
}

// ---------- Consulta de estoque (alertas) ----------
function atualizarAlertas() {
  const lista = $('lista-alertas');
  lista.innerHTML = '';
  const alertas = produtosEmAlerta();

  if (alertas.length === 0) {
    $('estoque-vazio').classList.remove('oculto');
    return;
  }
  $('estoque-vazio').classList.add('oculto');

  alertas.forEach(p => {
    const situacao = situacaoEstoque(p);
    const li = document.createElement('li');
    li.className = 'item-alerta ' + (situacao === 'SEM_ESTOQUE' ? 'alerta-zero' : 'alerta-baixo');
    li.textContent = (situacao === 'SEM_ESTOQUE' ? '🚨 ' : '⚠️ ') +
      p.codigo + ' — ' + p.nome + ': ' + p.quantidade + ' un. em estoque (mínimo: ' + p.estoqueMinimo + ')';
    lista.appendChild(li);
  });
}

// ---------- Histórico de movimentações ----------
function preencherFiltroHistorico() {
  const selectProduto = $('filtro-produto');
  const valorProduto = selectProduto.value;
  selectProduto.innerHTML = '<option value="">Todos os produtos</option>';
  [...estado.produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).forEach(p => {
    const op = document.createElement('option');
    op.value = p.nome;
    op.textContent = p.nome;
    selectProduto.appendChild(op);
  });
  if ([...selectProduto.options].some(o => o.value === valorProduto)) selectProduto.value = valorProduto;

  const selectResp = $('filtro-responsavel');
  const valorResp = selectResp.value;
  const responsaveis = [...new Set(estado.movimentacoes.map(m => m.responsavel))].sort();
  selectResp.innerHTML = '<option value="">Todos os responsáveis</option>';
  responsaveis.forEach(r => {
    const op = document.createElement('option');
    op.value = r;
    op.textContent = r;
    selectResp.appendChild(op);
  });
  if ([...selectResp.options].some(o => o.value === valorResp)) selectResp.value = valorResp;
}

function atualizarTabelaHistorico() {
  const tbody = $('corpo-tabela-historico');
  tbody.innerHTML = '';

  const tipo = $('filtro-tipo').value;
  const produto = $('filtro-produto').value;
  const responsavel = $('filtro-responsavel').value;
  const inicio = $('filtro-data-inicio').value;
  const fim = $('filtro-data-fim').value;

  let lista = estado.movimentacoes.filter(m => {
    if (tipo && m.tipo !== tipo) return false;
    if (produto && m.produtoNome !== produto) return false;
    if (responsavel && m.responsavel !== responsavel) return false;
    if (inicio) {
      const dataMov = m.data.slice(0, 10);
      if (dataMov < inicio) return false;
    }
    if (fim) {
      const dataMov = m.data.slice(0, 10);
      if (dataMov > fim) return false;
    }
    return true;
  });

  if (lista.length === 0) {
    $('historico-vazio').classList.remove('oculto');
    return;
  }
  $('historico-vazio').classList.add('oculto');

  lista.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + formatarData(m.data) + '</td>' +
      '<td>' + m.produtoNome + '</td>' +
      '<td><span class="' + (m.tipo === 'ENTRADA' ? 'tipo-entrada' : 'tipo-saida') + '">' + m.tipo + '</span></td>' +
      '<td>' + m.quantidade + ' un.</td>' +
      '<td>' + m.responsavel + '</td>';
    tbody.appendChild(tr);
  });
}

function iniciarHistorico() {
  ['filtro-tipo', 'filtro-produto', 'filtro-responsavel', 'filtro-data-inicio', 'filtro-data-fim'].forEach(id => {
    $(id).addEventListener('change', atualizarTabelaHistorico);
  });

  $('btn-limpar-filtros-historico').addEventListener('click', function () {
    $('filtro-tipo').value = '';
    $('filtro-produto').value = '';
    $('filtro-responsavel').value = '';
    $('filtro-data-inicio').value = '';
    $('filtro-data-fim').value = '';
    atualizarTabelaHistorico();
    exibirToast('Filtros do histórico limpos.', 'aviso');
  });
}

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', function () {
  iniciarLogin();
  iniciarNavegacao();
  iniciarFiltrosProdutos();
  iniciarCadastroProduto();
  iniciarModais();
  iniciarEntrada();
  iniciarSaida();
  iniciarHistorico();
});