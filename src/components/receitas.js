import {
  getContasPorNatureza,
  addConta,
  atualizarConta,
  excluirConta,
  atualizarStatusConta,
  duplicarConta,
  mesAtualRef,
} from '../services/financeService.js';
import { CATEGORIAS_RECEITA, nomeCategoria } from '../constants/categorias.js';

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(timestamp) {
  if (!timestamp) return '—';
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return data.toLocaleDateString('pt-BR');
}

function paraInputDate(timestamp) {
  if (!timestamp) return '';
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export async function renderReceitas(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando suas receitas...</p>';

  let contas;
  try {
    contas = await getContasPorNatureza('receita');
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, contas);
}

function desenharTela(container, contas) {
  const fixas = contas.filter((c) => c.tipoFrequencia === 'fixa');
  const variaveis = contas.filter((c) => c.tipoFrequencia === 'variavel');
  const totalFixas = fixas.reduce((soma, c) => soma + c.valor, 0);
  const totalVariaveis = variaveis.reduce((soma, c) => soma + c.valor, 0);

  const ordenadas = [...contas].sort((a, b) => {
    const da = a.dataVencimento?.toDate ? a.dataVencimento.toDate() : new Date(a.dataVencimento || 0);
    const db_ = b.dataVencimento?.toDate ? b.dataVencimento.toDate() : new Date(b.dataVencimento || 0);
    return da - db_;
  });

  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Receitas</h2>
      <button class="btn-nova" id="btn-nova-receita">+ Nova receita</button>
    </div>

    <div class="cards-resumo" style="grid-template-columns:repeat(2,1fr)">
      <div class="card-resumo">
        <p class="eyebrow">Fixas</p>
        <p class="valor" style="color:var(--green)">R$ ${formatarMoeda(totalFixas)}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Variáveis</p>
        <p class="valor" style="color:var(--green)">R$ ${formatarMoeda(totalVariaveis)}</p>
      </div>
    </div>

    <div class="lista-contas">
      ${ordenadas.length === 0
        ? '<p class="legenda-progresso">Nenhuma receita lançada este mês ainda.</p>'
        : ordenadas.map((c) => linhaConta(c)).join('')
      }
    </div>
  `;

  container.querySelector('#btn-nova-receita').addEventListener('click', () => {
    abrirFormularioReceita(container);
  });

  container.querySelectorAll('[data-acao="pagar"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const statusAtual = e.currentTarget.dataset.status;
      const novo = statusAtual === 'pago' ? 'pendente' : 'pago';
      e.currentTarget.textContent = '...';
      await atualizarStatusConta(id, novo);
      renderReceitas(container);
    });
  });

  container.querySelectorAll('[data-acao="editar"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const conta = contas.find((c) => c.id === e.currentTarget.dataset.id);
      abrirFormularioReceita(container, conta);
    });
  });

  container.querySelectorAll('[data-acao="excluir-conta"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir essa receita?')) return;
      await excluirConta(e.currentTarget.dataset.id);
      renderReceitas(container);
    });
  });

  container.querySelectorAll('[data-acao="duplicar"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const conta = contas.find((c) => c.id === e.currentTarget.dataset.id);
      abrirConfirmarDuplicacao(container, conta);
    });
  });
}

function linhaConta(conta) {
  return `
    <div class="linha-conta-item">
      <div class="info-conta">
        <p class="nome-conta">${conta.nome}</p>
        <p class="meta-conta">${nomeCategoria(conta.categoriaId, 'receita')} · recebimento em ${formatarData(conta.dataVencimento)}</p>
      </div>
      <p class="valor-conta" style="color:var(--green)">R$ ${formatarMoeda(conta.valor)}</p>
      <button class="badge-status ${conta.status}" data-acao="pagar" data-id="${conta.id}" data-status="${conta.status}">
        ${conta.status === 'pago' ? 'Recebido' : 'Pendente'}
      </button>
      <button class="btn-duplicar" data-acao="editar" data-id="${conta.id}" title="Editar">✎</button>
      <button class="btn-duplicar" data-acao="duplicar" data-id="${conta.id}" title="Duplicar para o mês seguinte">⤴</button>
      <button class="btn-remover-habito" data-acao="excluir-conta" data-id="${conta.id}" title="Excluir">×</button>
    </div>
  `;
}

function abrirFormularioReceita(container, contaExistente = null) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">${contaExistente ? 'Editar receita' : 'Nova receita'}</p>

      <label for="r-nome">Nome</label>
      <input id="r-nome" type="text" placeholder="Ex: Salário" value="${contaExistente?.nome || ''}">

      <label for="r-valor">Valor</label>
      <input id="r-valor" type="number" step="0.01" placeholder="0,00" value="${contaExistente?.valor || ''}">

      <label for="r-categoria">Categoria</label>
      <select id="r-categoria">
        ${CATEGORIAS_RECEITA.map((cat) => `<option value="${cat.id}" ${contaExistente?.categoriaId === cat.id ? 'selected' : ''}>${cat.nome}</option>`).join('')}
      </select>

      <label for="r-frequencia">Frequência</label>
      <select id="r-frequencia">
        <option value="fixa" ${contaExistente?.tipoFrequencia === 'fixa' ? 'selected' : ''}>Fixa</option>
        <option value="variavel" ${contaExistente?.tipoFrequencia === 'variavel' ? 'selected' : ''}>Variável</option>
      </select>

      <label for="r-data">Data prevista de recebimento</label>
      <input id="r-data" type="date" value="${paraInputDate(contaExistente?.dataVencimento)}">

      <div class="botoes">
        <button id="btn-cancelar">Cancelar</button>
        <button id="btn-salvar" class="principal">Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(fundo);

  fundo.querySelector('#btn-cancelar').addEventListener('click', () => fundo.remove());
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });

  fundo.querySelector('#btn-salvar').addEventListener('click', async () => {
    const nome = fundo.querySelector('#r-nome').value.trim();
    const valor = parseFloat(fundo.querySelector('#r-valor').value);
    const categoriaId = fundo.querySelector('#r-categoria').value;
    const tipoFrequencia = fundo.querySelector('#r-frequencia').value;
    const dataStr = fundo.querySelector('#r-data').value;

    if (!nome || !valor || valor <= 0 || !dataStr) {
      alert('Preenche nome, valor e data antes de salvar.');
      return;
    }

    const dataVencimento = new Date(`${dataStr}T00:00:00`);
    const mesReferencia = mesAtualRef(dataVencimento);

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      if (contaExistente) {
        await atualizarConta(contaExistente.id, {
          nome, valor, categoriaId, tipoFrequencia, dataVencimento, mesReferencia,
        });
      } else {
        await addConta({
          nome, valor, categoriaId, natureza: 'receita', tipoFrequencia, dataVencimento, compartilhada: false, mesReferencia,
        });
      }
      fundo.remove();
      renderReceitas(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}

function abrirConfirmarDuplicacao(container, conta) {
  const dataAtual = conta.dataVencimento?.toDate ? conta.dataVencimento.toDate() : new Date();
  const proximoMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, dataAtual.getDate());
  const dataSugerida = proximoMes.toISOString().slice(0, 10);

  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 4px">Duplicar "${conta.nome}"</p>
      <p style="font-size:13px;color:var(--ink-muted);margin:0 0 16px">Confirma a data de recebimento no mês seguinte</p>

      <label for="d-data">Nova data</label>
      <input id="d-data" type="date" value="${dataSugerida}">

      <div class="botoes">
        <button id="btn-cancelar">Cancelar</button>
        <button id="btn-confirmar" class="principal">Duplicar</button>
      </div>
    </div>
  `;
  document.body.appendChild(fundo);

  fundo.querySelector('#btn-cancelar').addEventListener('click', () => fundo.remove());
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });

  fundo.querySelector('#btn-confirmar').addEventListener('click', async () => {
    const novaData = new Date(`${fundo.querySelector('#d-data').value}T00:00:00`);
    const btn = fundo.querySelector('#btn-confirmar');
    btn.textContent = 'Duplicando...';
    btn.disabled = true;
    try {
      await duplicarConta(conta, novaData);
      fundo.remove();
      alert('Receita duplicada pro mês seguinte!');
    } catch (erro) {
      btn.textContent = 'Duplicar';
      btn.disabled = false;
      alert('Não deu pra duplicar: ' + erro.message);
    }
  });
}
