import { getResumoDoMes } from '../services/financeService.js';
import { getConsultas } from '../services/saudeService.js';
import { getMetas } from '../services/metasService.js';
import { getAtividades } from '../services/agendaService.js';
import { paraChaveData } from '../services/habitosService.js';

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ehHoje(valor) {
  if (!valor) return false;
  const data = valor.toDate ? valor.toDate() : new Date(`${valor}T00:00:00`);
  return paraChaveData(data) === paraChaveData(new Date());
}

export async function renderDashboard(container) {
  container.innerHTML = '<p class="estado-carregando">Carregando seu resumo financeiro...</p>';

  let resumo, consultas, metas, atividades;
  try {
    const resultados = await Promise.allSettled([
      getResumoDoMes(),
      getConsultas(),
      getMetas(),
      getAtividades(),
    ]);

    const rotulos = ['resumo financeiro', 'consultas', 'metas', 'atividades'];
    resultados.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Dashboard] Falha ao buscar "${rotulos[i]}":`, r.reason?.message || r.reason);
      }
    });

    resumo = resultados[0].status === 'fulfilled'
      ? resultados[0].value
      : { receitas: 0, despesas: 0, saldo: 0, investimentos: 0, categoriasOrdenadas: [], alertas: [] };
    consultas = resultados[1].status === 'fulfilled' ? resultados[1].value : [];
    metas = resultados[2].status === 'fulfilled' ? resultados[2].value : [];
    atividades = resultados[3].status === 'fulfilled' ? resultados[3].value : [];
  } catch (erro) {
    container.innerHTML = `<p class="estado-carregando">Não deu pra carregar os dados. Confira sua configuração do Firebase.<br><small>${erro.message}</small></p>`;
    return;
  }

  const { receitas, despesas, saldo, investimentos, categoriasOrdenadas, alertas } = resumo;

  const lembretesHoje = [];
  consultas.filter((c) => !c.concluida && ehHoje(c.data)).forEach((c) => {
    lembretesHoje.push({ tipo: 'critico', texto: `Consulta hoje: ${c.titulo}${c.local ? ' · ' + c.local : ''}` });
  });
  metas.filter((m) => !m.concluida && m.prazo && ehHoje(m.prazo)).forEach((m) => {
    lembretesHoje.push({ tipo: 'aviso', texto: `Prazo da meta "${m.titulo}" é hoje (${m.progresso}% concluído)` });
  });
  atividades.filter((a) => !a.concluida && paraChaveData(new Date(`${a.data}T00:00:00`)) === paraChaveData(new Date())).forEach((a) => {
    lembretesHoje.push({ tipo: 'aviso', texto: `Atividade hoje: ${a.titulo}${a.horario ? ' às ' + a.horario : ''}` });
  });

  const todosAlertas = [...lembretesHoje, ...alertas];

  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const percentualMes = Math.round((diaDoMes / diasNoMes) * 100);

  const maiorGasto = categoriasOrdenadas[0]?.valor || 1;

  container.innerHTML = `
    <p class="eyebrow">Saldo do mês</p>
    <p class="saldo-valor ${saldo >= 0 ? 'positivo' : 'negativo'}">
      ${saldo < 0 ? '-' : ''}R$ ${formatarMoeda(Math.abs(saldo))}
    </p>
    <div class="progresso-orcamento">
      <div style="width:${percentualMes}%"></div>
    </div>
    <p class="legenda-progresso">Dia ${diaDoMes} de ${diasNoMes} do mês</p>

    <div class="cards-resumo">
      <div class="card-resumo">
        <p class="eyebrow">Receitas</p>
        <p class="valor" style="color:var(--green)">${formatarMoeda(receitas)}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Despesas</p>
        <p class="valor" style="color:var(--red)">${formatarMoeda(despesas)}</p>
      </div>
      <div class="card-resumo">
        <p class="eyebrow">Investimentos</p>
        <p class="valor">${formatarMoeda(investimentos)}</p>
      </div>
    </div>

    ${todosAlertas.length > 0 ? `
      <div class="alertas">
        ${todosAlertas.map((a) => `<div class="alerta ${a.tipo}">${a.texto}</div>`).join('')}
      </div>
    ` : ''}

    <div class="secao-categorias">
      <h3>Gastos por categoria</h3>
      ${categoriasOrdenadas.length === 0
        ? '<p class="legenda-progresso">Nenhum gasto lançado este mês ainda.</p>'
        : categoriasOrdenadas.map((c) => `
          <div class="linha-categoria">
            <span class="nome">${c.nome}</span>
            <div class="barra"><div style="width:${Math.round((c.valor / maiorGasto) * 100)}%"></div></div>
            <span class="valor">${formatarMoeda(c.valor)}</span>
          </div>
        `).join('')
      }
    </div>
  `;
}
