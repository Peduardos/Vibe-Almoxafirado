// ==================== CONTROLE DE ACESSO ====================

const USUARIOS = [
  { usuario: 'admin', senha: 'admin123', nome: 'Administrador', perfil: 'ADMIN' },
  { usuario: 'comum', senha: 'comum123', nome: 'Usuário Comum', perfil: 'USUARIO' }
];

// Operações x Perfis
const OPERACOES = {
  'produto.cadastrar':   ['ADMIN'],
  'produto.editar':      ['ADMIN'],
  'produto.excluir':     ['ADMIN'],
  'produto.listar':      ['ADMIN', 'USUARIO'],
  'entrada.cadastrar':   ['ADMIN', 'USUARIO'],
  'saida.cadastrar':     ['ADMIN', 'USUARIO'],
  'estoque.consultar':   ['ADMIN', 'USUARIO'],
  'historico.listar':    ['ADMIN', 'USUARIO']
};

let usuarioAtual = null;

function autenticar(usuario, senha) {
  return USUARIOS.find(u => u.usuario === usuario && u.senha === senha) || null;
}

function temPermissao(operacao) {
  if (!usuarioAtual) return false;
  const perfis = OPERACOES[operacao];
  if (!perfis) return false;
  return perfis.includes(usuarioAtual.perfil);
}

function podeAcessarSecao(secao) {
  const itemMenu = document.querySelector('.item-menu[data-secao="' + secao + '"]');
  if (!itemMenu) return true; // seção sem restrição de menu (dashboard)
  const permissao = itemMenu.getAttribute('data-permissao');
  return !permissao || temPermissao(permissao);
}