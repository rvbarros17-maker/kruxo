import { getContasDoMes, atualizarStatusConta } from '../services/financeService.js';
import { nomeCategoria } from '../constants/categorias.js';
import { abrirFormularioConta, abrirConfirmarDuplicacao } from './despesas.js';

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(timestamp) {
  if (!timestamp) return '—';
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return data.toLocaleDateString('pt-BR');
}

export async function renderCasal(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando as despesas do casal...</p>';

  let contas;
  try {
    contas = await getContasDoMes();
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  const compartilhadas = contas.filter((c) => c.compartilhada && c.natureza === 'despesa');
  desenharTela(container, compartilhadas);
}

function desenharTela(container, contas) {
  const totalCasa = contas.reduce((soma, c) => soma + c.valor, 0);
  const suaParte = totalCasa / 2;
  const parteParceira = totalCasa / 2;

  const ordenadas = [...contas].sort((a, b) => {
    const da = a.dataVencimento?.toDate ? a.dataVencimento.toDate() : new Date(a.dataVencimento || 0);
    const db_ = b.dataVencimento?.toDate ? b.dataVencimento.toDate() : new Date(b.dataVencimento || 0);
    return da - db_;
  });

  container.innerHTML = `
    <div class="cabecalho-tela">
      <h2>Casal</h2>
      <button class="btn-nova" id="btn-nova-casal">+ Despesa do casal</button>
    </div>

    <div class="cards-resumo" style="grid-template-columns:repeat(3,1fr)">
      <div class="card-resumo">
        <p class="eyebrow">Total da casa</p>
        <p class="valor" style="color:var(--ink)">R$ ${formatarMoeda(totalCasa)}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Sua parte</p>
        <p class="valor" style="color:var(--red)">R$ ${formatarMoeda(suaParte)}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Parte dela</p>
        <p class="valor" style="color:var(--ink-muted)">R$ ${formatarMoeda(parteParceira)}</p>
      </div>
    </div>

    <p class="legenda-progresso" style="margin-bottom:12px">Divisão fixa de 50% pra cada um. Só a sua metade entra no seu saldo pessoal.</p>

    <div class="lista-contas">
      ${ordenadas.length === 0
        ? '<p class="legenda-progresso">Nenhuma despesa do casal lançada este mês ainda.</p>'
        : ordenadas.map((c) => linhaCasal(c)).join('')
      }
    </div>
  `;

  container.querySelector('#btn-nova-casal').addEventListener('click', () => {
    abrirFormularioConta(() => renderCasal(container), { compartilhadaForcada: true });
  });

  container.querySelectorAll('[data-acao="pagar"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const statusAtual = e.currentTarget.dataset.status;
      const novo = statusAtual === 'pago' ? 'pendente' : 'pago';
      e.currentTarget.textContent = '...';
      await atualizarStatusConta(id, novo);
      renderCasal(container);
    });
  });

  container.querySelectorAll('[data-acao="duplicar"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const conta = contas.find((c) => c.id === e.currentTarget.dataset.id);
      abrirConfirmarDuplicacao(conta, () => renderCasal(container));
    });
  });
}

function linhaCasal(conta) {
  return `
    <div class="linha-conta-item">
      <div class="info-conta">
        <p class="nome-conta">${conta.nome}</p>
        <p class="meta-conta">${nomeCategoria(conta.categoriaId, 'despesa')} · vence em ${formatarData(conta.dataVencimento)} · total R$ ${formatarMoeda(conta.valor)}</p>
      </div>
      <p class="valor-conta">R$ ${formatarMoeda(conta.valor / 2)} <span style="color:var(--ink-muted);font-weight:400">(sua parte)</span></p>
      <button class="badge-status ${conta.status}" data-acao="pagar" data-id="${conta.id}" data-status="${conta.status}">
        ${conta.status === 'pago' ? 'Pago' : 'Pendente'}
      </button>
      <button class="btn-duplicar" data-acao="duplicar" data-id="${conta.id}" title="Duplicar para o mês seguinte">⤴</button>
    </div>
  `;
}
