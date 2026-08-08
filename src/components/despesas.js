import {
  getContasPorNatureza,
  addConta,
  atualizarConta,
  excluirConta,
  atualizarStatusConta,
  duplicarConta,
  mesAtualRef,
  getGastosRapidosDoMes,
  excluirGastoRapido,
} from '../services/financeService.js';
import { CATEGORIAS_DESPESA, nomeCategoria } from '../constants/categorias.js';

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

function valorPessoal(conta) {
  return conta.compartilhada ? conta.valor / 2 : conta.valor;
}

export async function renderDespesas(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando suas despesas...</p>';

  let contas, gastosRapidos;
  try {
    [contas, gastosRapidos] = await Promise.all([
      getContasPorNatureza('despesa'),
      getGastosRapidosDoMes(),
    ]);
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, contas, gastosRapidos);
}

function desenharTela(container, contas, gastosRapidos) {
  const fixas = contas.filter((c) => c.tipoFrequencia === 'fixa');
  const variaveis = contas.filter((c) => c.tipoFrequencia === 'variavel');
  const totalFixas = fixas.reduce((soma, c) => soma + valorPessoal(c), 0);
  const totalVariaveis = variaveis.reduce((soma, c) => soma + valorPessoal(c), 0);
  const totalRapidos = gastosRapidos.reduce((soma, g) => soma + g.valor, 0);

  const ordenadas = [...contas].sort((a, b) => {
    const da = a.dataVencimento?.toDate ? a.dataVencimento.toDate() : new Date(a.dataVencimento || 0);
    const db_ = b.dataVencimento?.toDate ? b.dataVencimento.toDate() : new Date(b.dataVencimento || 0);
    return da - db_;
  });

  const gastosOrdenados = [...gastosRapidos].sort((a, b) => {
    const da = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    const db_ = b.data?.toDate ? b.data.toDate() : new Date(b.data);
    return db_ - da;
  });

  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Despesas</h2>
      <button class="btn-nova" id="btn-nova-conta">+ Nova conta</button>
    </div>

    <div class="cards-resumo" style="grid-template-columns:repeat(3,1fr)">
      <div class="card-resumo">
        <p class="eyebrow">Fixas</p>
        <p class="valor" style="color:var(--ink)">R$ ${formatarMoeda(totalFixas)}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Variáveis</p>
        <p class="valor" style="color:var(--ink)">R$ ${formatarMoeda(totalVariaveis)}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Gastos rápidos</p>
        <p class="valor" style="color:var(--ink)">R$ ${formatarMoeda(totalRapidos)}</p>
      </div>
    </div>

    <p class="eyebrow" style="margin:20px 0 8px">Contas (${ordenadas.length})</p>
    <div class="lista-contas">
      ${ordenadas.length === 0
        ? '<p class="legenda-progresso">Nenhuma despesa lançada este mês ainda.</p>'
        : ordenadas.map((c) => linhaConta(c)).join('')
      }
    </div>

    <p class="eyebrow" style="margin:20px 0 8px">Gastos rápidos do mês (${gastosOrdenados.length})</p>
    <div class="lista-contas">
      ${gastosOrdenados.length === 0
        ? '<p class="legenda-progresso">Nenhum gasto rápido lançado este mês ainda.</p>'
        : gastosOrdenados.map((g) => linhaGastoRapido(g)).join('')
      }
    </div>
  `;

  container.querySelector('#btn-nova-conta').addEventListener('click', () => {
    abrirFormularioConta(() => renderDespesas(container));
  });

  container.querySelectorAll('[data-acao="pagar"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const statusAtual = e.currentTarget.dataset.status;
      const novo = statusAtual === 'pago' ? 'pendente' : 'pago';
      e.currentTarget.textContent = '...';
      await atualizarStatusConta(id, novo);
      renderDespesas(container);
    });
  });

  container.querySelectorAll('[data-acao="editar"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const conta = contas.find((c) => c.id === e.currentTarget.dataset.id);
      abrirFormularioConta(() => renderDespesas(container), { contaExistente: conta });
    });
  });

  container.querySelectorAll('[data-acao="excluir-conta"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir essa conta?')) return;
      await excluirConta(e.currentTarget.dataset.id);
      renderDespesas(container);
    });
  });

  container.querySelectorAll('[data-acao="duplicar"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const conta = contas.find((c) => c.id === e.currentTarget.dataset.id);
      abrirConfirmarDuplicacao(conta, () => renderDespesas(container));
    });
  });

  container.querySelectorAll('[data-acao="excluir-gasto-rapido"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Excluir esse gasto rápido?')) return;
      await excluirGastoRapido(e.currentTarget.dataset.id);
      renderDespesas(container);
    });
  });
}

export function linhaConta(conta) {
  const valorExibido = valorPessoal(conta);
  return `
    <div class="linha-conta-item">
      <div class="info-conta">
        <p class="nome-conta">${conta.nome} ${conta.compartilhada ? '<span class="tag-casal">Casal · 50%</span>' : ''}</p>
        <p class="meta-conta">${nomeCategoria(conta.categoriaId, 'despesa')} · vence em ${formatarData(conta.dataVencimento)}</p>
      </div>
      <p class="valor-conta">R$ ${formatarMoeda(valorExibido)}</p>
      <button class="badge-status ${conta.status}" data-acao="pagar" data-id="${conta.id}" data-status="${conta.status}">
        ${conta.status === 'pago' ? 'Pago' : 'Pendente'}
      </button>
      <button class="btn-duplicar" data-acao="editar" data-id="${conta.id}" title="Editar">✎</button>
      <button class="btn-duplicar" data-acao="duplicar" data-id="${conta.id}" title="Duplicar para o mês seguinte">⤴</button>
      <button class="btn-remover-habito" data-acao="excluir-conta" data-id="${conta.id}" title="Excluir">×</button>
    </div>
  `;
}

function linhaGastoRapido(gasto) {
  const data = gasto.data?.toDate ? gasto.data.toDate() : new Date(gasto.data);
  return `
    <div class="linha-conta-item">
      <div class="info-conta">
        <p class="nome-conta">${nomeCategoria(gasto.categoriaId, 'despesa')}</p>
        <p class="meta-conta">${data.toLocaleDateString('pt-BR')}${gasto.nota ? ' · ' + gasto.nota : ''}</p>
      </div>
      <p class="valor-conta">R$ ${formatarMoeda(gasto.valor)}</p>
      <button class="btn-remover-habito" data-acao="excluir-gasto-rapido" data-id="${gasto.id}" title="Excluir">×</button>
    </div>
  `;
}

export function abrirFormularioConta(aoSalvar, opcoes = {}) {
  const compartilhadaForcada = opcoes.compartilhadaForcada || false;
  const contaExistente = opcoes.contaExistente || null;

  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">${contaExistente ? 'Editar conta' : 'Nova conta'}</p>

      <label for="c-nome">Nome</label>
      <input id="c-nome" type="text" placeholder="Ex: Internet" value="${contaExistente?.nome || ''}">

      <label for="c-valor">Valor</label>
      <input id="c-valor" type="number" step="0.01" placeholder="0,00" value="${contaExistente?.valor || ''}">

      <label for="c-categoria">Categoria</label>
      <select id="c-categoria">
        ${CATEGORIAS_DESPESA.map((cat) => `<option value="${cat.id}" ${contaExistente?.categoriaId === cat.id ? 'selected' : ''}>${cat.nome}</option>`).join('')}
      </select>

      <label for="c-frequencia">Frequência</label>
      <select id="c-frequencia">
        <option value="fixa" ${contaExistente?.tipoFrequencia === 'fixa' ? 'selected' : ''}>Fixa</option>
        <option value="variavel" ${contaExistente?.tipoFrequencia === 'variavel' ? 'selected' : ''}>Variável</option>
      </select>

      <label for="c-vencimento">Vencimento</label>
      <input id="c-vencimento" type="date" value="${paraInputDate(contaExistente?.dataVencimento)}">

      ${compartilhadaForcada
        ? '<p style="font-size:12px;color:var(--ink-muted);margin:0 0 16px">Essa conta já entra como despesa do casal — só 50% conta nas suas finanças pessoais.</p>'
        : `<label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer">
             <input id="c-compartilhada" type="checkbox" style="width:auto;margin:0" ${contaExistente?.compartilhada ? 'checked' : ''}>
             Despesa do casal (conta só 50% pra mim)
           </label>`
      }

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
    const nome = fundo.querySelector('#c-nome').value.trim();
    const valor = parseFloat(fundo.querySelector('#c-valor').value);
    const categoriaId = fundo.querySelector('#c-categoria').value;
    const tipoFrequencia = fundo.querySelector('#c-frequencia').value;
    const vencimentoStr = fundo.querySelector('#c-vencimento').value;
    const compartilhada = compartilhadaForcada || fundo.querySelector('#c-compartilhada')?.checked || false;

    if (!nome || !valor || valor <= 0 || !vencimentoStr) {
      alert('Preenche nome, valor e vencimento antes de salvar.');
      return;
    }

    const dataVencimento = new Date(`${vencimentoStr}T00:00:00`);
    const mesReferencia = mesAtualRef(dataVencimento);

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      if (contaExistente) {
        await atualizarConta(contaExistente.id, {
          nome, valor, categoriaId, tipoFrequencia, dataVencimento, compartilhada, mesReferencia,
        });
      } else {
        await addConta({
          nome, valor, categoriaId, natureza: 'despesa', tipoFrequencia, dataVencimento, compartilhada, mesReferencia,
        });
      }
      fundo.remove();
      aoSalvar();
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}

export function abrirConfirmarDuplicacao(conta, aoSucesso) {
  const dataAtual = conta.dataVencimento?.toDate ? conta.dataVencimento.toDate() : new Date();
  const proximoMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, dataAtual.getDate());
  const dataSugerida = proximoMes.toISOString().slice(0, 10);

  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 4px">Duplicar "${conta.nome}"</p>
      <p style="font-size:13px;color:var(--ink-muted);margin:0 0 16px">Confirma a data de vencimento no mês seguinte</p>

      <label for="d-data">Nova data de vencimento</label>
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
      aoSucesso();
    } catch (erro) {
      btn.textContent = 'Duplicar';
      btn.disabled = false;
      alert('Não deu pra duplicar: ' + erro.message);
    }
  });
}
