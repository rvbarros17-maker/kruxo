import { listInvestimentos, addInvestimento, addLancamento } from '../services/financeService.js';

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(timestamp) {
  if (!timestamp) return '—';
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return data.toLocaleDateString('pt-BR');
}

let expandidoId = null;

export async function renderInvestimentos(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando seus investimentos...</p>';

  let investimentos;
  try {
    investimentos = await listInvestimentos();
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, investimentos);
}

function desenharTela(container, investimentos) {
  const totalGeral = investimentos.reduce((soma, inv) => soma + inv.saldo, 0);

  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Investimentos</h2>
      <button class="btn-nova" id="btn-novo-investimento">+ Novo investimento</button>
    </div>

    <div class="cards-resumo" style="grid-template-columns:1fr">
      <div class="card-resumo">
        <p class="eyebrow">Total investido</p>
        <p class="valor" style="color:var(--ink)">R$ ${formatarMoeda(totalGeral)}</p>
      </div>
    </div>

    <div class="lista-contas">
      ${investimentos.length === 0
        ? '<p class="legenda-progresso">Nenhum investimento cadastrado ainda.</p>'
        : investimentos.map((inv) => cardInvestimento(inv)).join('')
      }
    </div>
  `;

  container.querySelector('#btn-novo-investimento').addEventListener('click', () => {
    abrirFormularioInvestimento(container);
  });

  container.querySelectorAll('[data-acao="expandir"]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      expandidoId = expandidoId === id ? null : id;
      desenharTela(container, investimentos);
    });
  });

  container.querySelectorAll('[data-acao="lancamento"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const investimento = investimentos.find((i) => i.id === e.currentTarget.dataset.id);
      abrirFormularioLancamento(container, investimento);
    });
  });
}

function cardInvestimento(inv) {
  const expandido = expandidoId === inv.id;
  return `
    <div>
      <div class="linha-conta-item" data-acao="expandir" data-id="${inv.id}" style="cursor:pointer">
        <div class="info-conta">
          <p class="nome-conta">${inv.nome}</p>
          <p class="meta-conta">${inv.tipo || 'Investimento'} · ${inv.lancamentos.length} lançamento(s)</p>
        </div>
        <p class="valor-conta">R$ ${formatarMoeda(inv.saldo)}</p>
        <button class="btn-nova" style="padding:6px 10px;font-size:12px" data-acao="lancamento" data-id="${inv.id}">+ Lançamento</button>
      </div>
      ${expandido ? `
        <div style="background:var(--surface);padding:0 14px 14px">
          ${inv.lancamentos.length === 0
            ? '<p class="legenda-progresso" style="margin-top:0">Sem lançamentos ainda.</p>'
            : inv.lancamentos.map((l) => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-top:1px solid var(--border)">
                <span style="color:${l.tipo === 'aporte' ? 'var(--green)' : 'var(--red)'}">${l.tipo === 'aporte' ? 'Aporte' : 'Resgate'}</span>
                <span style="color:var(--ink-muted)">${formatarData(l.data)}</span>
                <span class="valor-conta" style="color:${l.tipo === 'aporte' ? 'var(--green)' : 'var(--red)'}">
                  ${l.tipo === 'aporte' ? '+' : '-'} R$ ${formatarMoeda(l.valor)}
                </span>
              </div>
            `).join('')
          }
        </div>
      ` : ''}
    </div>
  `;
}

function abrirFormularioInvestimento(container) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 16px">Novo investimento</p>

      <label for="i-nome">Nome</label>
      <input id="i-nome" type="text" placeholder="Ex: Tesouro Selic, CDB, Ações XPTO">

      <label for="i-tipo">Tipo</label>
      <select id="i-tipo">
        <option value="Renda fixa">Renda fixa</option>
        <option value="Renda variável">Renda variável</option>
        <option value="Fundo">Fundo</option>
        <option value="Cripto">Cripto</option>
        <option value="Outro">Outro</option>
      </select>

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
    const nome = fundo.querySelector('#i-nome').value.trim();
    const tipo = fundo.querySelector('#i-tipo').value;

    if (!nome) {
      alert('Dá um nome pro investimento antes de salvar.');
      return;
    }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      await addInvestimento({ nome, tipo });
      fundo.remove();
      renderInvestimentos(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}

function abrirFormularioLancamento(container, investimento) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal-card">
      <p style="font-family:var(--font-display);font-size:16px;font-weight:500;margin:0 0 4px">Novo lançamento</p>
      <p style="font-size:13px;color:var(--ink-muted);margin:0 0 16px">${investimento.nome}</p>

      <label for="l-tipo">Tipo</label>
      <select id="l-tipo">
        <option value="aporte">Aporte</option>
        <option value="resgate">Resgate</option>
      </select>

      <label for="l-valor">Valor</label>
      <input id="l-valor" type="number" step="0.01" placeholder="0,00">

      <label for="l-data">Data</label>
      <input id="l-data" type="date" value="${new Date().toISOString().slice(0, 10)}">

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
    const tipo = fundo.querySelector('#l-tipo').value;
    const valor = parseFloat(fundo.querySelector('#l-valor').value);
    const dataStr = fundo.querySelector('#l-data').value;

    if (!valor || valor <= 0 || !dataStr) {
      alert('Preenche o valor e a data antes de salvar.');
      return;
    }

    const btn = fundo.querySelector('#btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      await addLancamento(investimento.id, { tipo, valor, data: new Date(`${dataStr}T00:00:00`) });
      fundo.remove();
      renderInvestimentos(container);
    } catch (erro) {
      btn.textContent = 'Salvar';
      btn.disabled = false;
      alert('Não deu pra salvar: ' + erro.message);
    }
  });
}
