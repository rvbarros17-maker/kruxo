const GRUPOS = [
  {
    titulo: 'Visão Geral',
    abas: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'calendario', label: 'Calendário' },
    ],
  },
  {
    titulo: 'Financeiro',
    abas: [
      { id: 'despesas', label: 'Despesas' },
      { id: 'receitas', label: 'Receitas' },
      { id: 'investimentos', label: 'Investimentos' },
      { id: 'casal', label: 'Casal' },
      { id: 'orcamento', label: 'Orçamento' },
    ],
  },
  {
    titulo: 'Planner',
    abas: [
      { id: 'habitos', label: 'Hábitos' },
      { id: 'diario', label: 'Diário' },
      { id: 'metas', label: 'Metas' },
      { id: 'leituras', label: 'Leituras' },
    ],
  },
];

const colapsados = {};

export function renderNav(container, abaAtiva, aoTrocarAba) {
  container.innerHTML = `
    <p class="sidebar-titulo">Meu Planner</p>
    ${GRUPOS.map((grupo) => {
      const fechado = !!colapsados[grupo.titulo];
      return `
        <button class="nav-grupo-cabecalho" data-grupo="${grupo.titulo}">
          <span class="nav-grupo-titulo">${grupo.titulo}</span>
          <span class="nav-grupo-seta ${fechado ? 'fechado' : ''}">▾</span>
        </button>
        <div class="nav-tabs" style="${fechado ? 'display:none' : ''}">
          ${grupo.abas.map((aba) => `
            <button class="nav-tab ${aba.id === abaAtiva ? 'active' : ''}" data-aba="${aba.id}">
              ${aba.label}
            </button>
          `).join('')}
        </div>
      `;
    }).join('')}
  `;

  container.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => aoTrocarAba(btn.dataset.aba));
  });

  container.querySelectorAll('.nav-grupo-cabecalho').forEach((btn) => {
    btn.addEventListener('click', () => {
      const grupo = btn.dataset.grupo;
      colapsados[grupo] = !colapsados[grupo];
      renderNav(container, abaAtiva, aoTrocarAba);
    });
  });
}

export { GRUPOS };
