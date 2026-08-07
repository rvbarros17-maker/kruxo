import {
  getOrcamentosDoMes,
  setOrcamento,
  excluirOrcamento,
  getGastosPorCategoriaDoMes,
} from '../services/financeService.js';
import { CATEGORIAS_DESPESA } from '../constants/categorias.js';

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function renderOrcamento(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando seus orçamentos...</p>';

  let orcamentos, gastos;
  try {
    [orcamentos, gastos] = await Promise.all([
      getOrcamentosDoMes(),
      getGastosPorCategoriaDoMes(),
    ]);
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, orcamentos, gastos);
}

function desenharTela(container, orcamentos, gastos) {
  const porCategoriaId = {};
  orcamentos.forEach((o) => (porCategoriaId[o.categoriaId] = o));

  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Orçamento</h2>
    </div>
    <p class="legenda-progresso" style="margin-bottom:16px">Defina um limite mensal por categoria. Quando estourar, o alerta aparece no Dashboard.</p>

    <div class="lista-contas">
      ${CATEGORIAS_DESPESA.map((cat) => linhaOrcamento(cat, porCategoriaId[cat.id], gastos[cat.nome] || 0)).join('')}
    </div>
  `;

  container.querySelectorAll('[data-acao="definir"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const categoriaId = e.currentTarget.dataset.categoria;
      const orcamentoAtual = porCategoriaId[categoriaId];
      abrirFormularioLimite(container, categoriaId, orcamentoAtual);
    });
  });

  container.querySelectorAll('[data-acao="remover-limite"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const orcamentoId = e.currentTarget.dataset.id;
      e.currentTarget.textContent = '...';
      await excluirOrcamento(orcamentoId);
      renderOrcamento(container);
    });
  });
}

function linhaOrcamento(categoria, orcamento, gasto) {
  const limite = orcamento?.limite || 0;
  const percentual = limite > 0 ? Math.round((gasto / limite) * 100) : 0;
  const estourou = limite > 0 && gasto > limite;

  return `
    <div class="linha-conta-item" style="flex-wrap:wrap">
      <div class="info-conta" style="flex-basis:100%">
        <p class="nome-conta">${categoria.nome}</p>
        <p class="meta-conta">
          Gasto: R$ ${formatarMoeda(gasto)}
          ${limite > 0 ? ` de R$ ${formatarMoeda(limite)} (${percentual}%)` : ' · sem limite definido'}
        </p>
        ${limite > 0 ? `
          <div class="progresso-orcamento" style="margin-top:8px;margin-bottom:0">
            <div style="width:${Math.min(percentual, 100)}%;background:${estourou ? 'var(--red)' : 'var(--amber)'}"></div>
          </div>
        ` : ''}
      </div>
      <div style="display:flex;gap:8px;margin-left:auto;margin-top:8px">
        <button class="btn-nova" style="padding:6px 10px;font-size:12px" data-acao="definir" data-categoria="${categoria.id}">
          ${limite > 0 ? 'Editar limite' : '+ Definir limite'}
        </button>
        ${orcamento ? `<button class="btn-duplicar" style="width:auto;padding:0 10px;font-size:12px" data-acao="remover-limite" data-id="${orcamento.id}">Remover</button>` : ''}
      </div>
    </div>
  `;
}

function abrirFormularioLimite(container, categoriaId, orcamentoAtual) {
  const categoria = CATEGORIAS_DESPESA.find((c) => c.id === categoriaId);

  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 4px">Limite de orçamento</p>
      <p style="font-size:13px;color:var(--ink-muted);margin:0 0 16px">${categoria.nome}</p>

      <label for="o-limite">Limite mensal</label>
      <input id="o-limite" type="number" step="0.01" placeholder="0,00" value="${orcamentoAtual?.limite || ''}">

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
    const limite = parseFloat(fundo.querySelector('#o-limite').value);
    if (!limite || limite <= 0) {
      alert('Informe um limite maior que zero.');
      return;
    }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      await setOrcamento({ categoriaId, limite });
      fundo.remove();
      renderOrcamento(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
