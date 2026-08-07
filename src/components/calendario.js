import { getContasDoMes, atualizarStatusConta, mesAtualRef } from '../services/financeService.js';
import { getConsultas, alternarConsultaConcluida } from '../services/saudeService.js';
import { getMetas, alternarConcluida as alternarMetaConcluida } from '../services/metasService.js';
import { nomeCategoria } from '../constants/categorias.js';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

let mesExibido = new Date();

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function paraDate(valor) {
  if (!valor) return null;
  if (valor.toDate) return valor.toDate();
  if (typeof valor === 'string') {
    const [ano, mes, dia] = valor.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
  return new Date(valor);
}

export async function renderCalendario(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando o calendário...</p>';

  const mesReferencia = mesAtualRef(mesExibido);
  let contas, consultas, metas;
  try {
    [contas, consultas, metas] = await Promise.all([
      getContasDoMes(mesReferencia),
      getConsultas(),
      getMetas(),
    ]);
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar. ${erro.message}</p>`;
    return;
  }

  desenharTela(container, contas, consultas, metas);
}

function montarEventos(contas, consultas, metas, ano, mes) {
  const eventos = [];

  contas.forEach((c) => {
    if (!c.dataVencimento) return;
    const data = paraDate(c.dataVencimento);
    if (data.getMonth() !== mes || data.getFullYear() !== ano) return;
    eventos.push({
      id: c.id,
      dia: data.getDate(),
      nome: c.nome,
      tipo: c.natureza, // 'despesa' | 'receita'
      concluido: c.status === 'pago',
      origem: 'conta',
      detalhe: `${nomeCategoria(c.categoriaId, c.natureza)} · R$ ${formatarMoeda(c.valor)}`,
    });
  });

  consultas.forEach((c) => {
    const data = paraDate(c.data);
    if (!data || data.getMonth() !== mes || data.getFullYear() !== ano) return;
    eventos.push({
      id: c.id,
      dia: data.getDate(),
      nome: c.titulo,
      tipo: 'consulta',
      concluido: c.concluida,
      origem: 'consulta',
      detalhe: c.local || 'Consulta',
    });
  });

  metas.forEach((m) => {
    if (!m.prazo) return;
    const data = paraDate(m.prazo);
    if (!data || data.getMonth() !== mes || data.getFullYear() !== ano) return;
    eventos.push({
      id: m.id,
      dia: data.getDate(),
      nome: m.titulo,
      tipo: 'meta',
      concluido: m.concluida,
      origem: 'meta',
      detalhe: `Prazo da meta · ${m.progresso}%`,
    });
  });

  return eventos;
}

function desenharTela(container, contas, consultas, metas) {
  const ano = mesExibido.getFullYear();
  const mes = mesExibido.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date();

  const eventos = montarEventos(contas, consultas, metas, ano, mes);
  const eventosPorDia = {};
  eventos.forEach((ev) => {
    eventosPorDia[ev.dia] = eventosPorDia[ev.dia] || [];
    eventosPorDia[ev.dia].push(ev);
  });

  const nomeMes = mesExibido.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let celulas = '';
  for (let i = 0; i < primeiroDiaSemana; i++) {
    celulas += '<div class="dia-celula vazia"></div>';
  }
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const eventosDoDia = eventosPorDia[dia] || [];
    const ehHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;
    celulas += `
      <div class="dia-celula ${ehHoje ? 'hoje' : ''}">
        <span class="dia-numero">${dia}</span>
        ${eventosDoDia.map((ev) => chipEvento(ev)).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="calendario-header">
      <button class="btn-duplicar" id="mes-anterior">‹</button>
      <h2 style="text-transform:capitalize">${nomeMes}</h2>
      <button class="btn-duplicar" id="mes-seguinte">›</button>
    </div>

    <div class="calendario-grid">
      ${DIAS_SEMANA.map((d) => `<div class="dia-semana-nome">${d}</div>`).join('')}
      ${celulas}
    </div>

    <p class="legenda-progresso" style="margin-top:16px">
      <span style="color:var(--red)">●</span> Despesa &nbsp;
      <span style="color:var(--green)">●</span> Receita &nbsp;
      <span style="color:var(--blue)">●</span> Consulta &nbsp;
      <span style="color:var(--purple)">●</span> Meta &nbsp;
      · clique num item pra marcar como concluído
    </p>
  `;

  container.querySelector('#mes-anterior').addEventListener('click', () => {
    mesExibido = new Date(ano, mes - 1, 1);
    renderCalendario(container);
  });
  container.querySelector('#mes-seguinte').addEventListener('click', () => {
    mesExibido = new Date(ano, mes + 1, 1);
    renderCalendario(container);
  });

  container.querySelectorAll('[data-acao="toggle-evento"]').forEach((chip) => {
    chip.addEventListener('click', async (e) => {
      const { id, origem, concluido } = e.currentTarget.dataset;
      const novo = concluido === 'true' ? false : true;
      if (origem === 'conta') {
        await atualizarStatusConta(id, novo ? 'pago' : 'pendente');
      } else if (origem === 'consulta') {
        await alternarConsultaConcluida(id, novo);
      } else if (origem === 'meta') {
        await alternarMetaConcluida(id, novo);
      }
      renderCalendario(container);
    });
  });
}

const COR_TIPO = {
  despesa: 'var(--red)',
  receita: 'var(--green)',
  consulta: 'var(--blue)',
  meta: 'var(--purple)',
};

function chipEvento(ev) {
  const cor = COR_TIPO[ev.tipo] || 'var(--ink-muted)';
  return `
    <button class="chip-conta" data-acao="toggle-evento" data-id="${ev.id}" data-origem="${ev.origem}" data-concluido="${ev.concluido}"
      style="border-left:2px solid ${cor}; opacity:${ev.concluido ? 0.5 : 1}; text-decoration:${ev.concluido ? 'line-through' : 'none'}"
      title="${ev.detalhe}">
      ${ev.nome}
    </button>
  `;
}
