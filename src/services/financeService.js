import { db } from '../firebase.js';
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { nomeCategoria } from '../constants/categorias.js';

// Coleções esperadas no Firestore:
// contas          { nome, valor, categoriaId, natureza: 'despesa'|'receita',
//                   tipoFrequencia: 'fixa'|'variavel', dataVencimento (Timestamp),
//                   status: 'pago'|'pendente', compartilhada: bool,
//                   mesReferencia: 'YYYY-MM' }
// gastosRapidos   { valor, categoriaId, data (Timestamp), nota }
// orcamentos      { categoriaId, mesReferencia: 'YYYY-MM', limite }
// investimentos   { nome, tipo }
//   └ lancamentos { tipo: 'aporte'|'resgate', valor, data (Timestamp) }
//
// Observação: "compartilhada" = true significa que só 50% do valor conta
// nas suas finanças pessoais (a outra metade é da sua parceira).

export function mesAtualRef(date = new Date()) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

function valorPessoal(conta) {
  return conta.compartilhada ? conta.valor / 2 : conta.valor;
}

export async function getContasDoMes(mesReferencia = mesAtualRef()) {
  const q = query(collection(db, 'contas'), where('mesReferencia', '==', mesReferencia));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getContasPorNatureza(natureza, mesReferencia = mesAtualRef()) {
  const q = query(
    collection(db, 'contas'),
    where('mesReferencia', '==', mesReferencia),
    where('natureza', '==', natureza)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getGastosRapidosDoMes(mesReferencia = mesAtualRef()) {
  const inicio = Timestamp.fromDate(new Date(`${mesReferencia}-01T00:00:00`));
  const [ano, mes] = mesReferencia.split('-').map(Number);
  const fim = Timestamp.fromDate(new Date(ano, mes, 1));
  const q = query(
    collection(db, 'gastosRapidos'),
    where('data', '>=', inicio),
    where('data', '<', fim)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getOrcamentosDoMes(mesReferencia = mesAtualRef()) {
  const q = query(collection(db, 'orcamentos'), where('mesReferencia', '==', mesReferencia));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setOrcamento({ categoriaId, mesReferencia = mesAtualRef(), limite }) {
  const q = query(
    collection(db, 'orcamentos'),
    where('categoriaId', '==', categoriaId),
    where('mesReferencia', '==', mesReferencia)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, 'orcamentos', docId), { limite });
    return docId;
  }
  const ref = await addDoc(collection(db, 'orcamentos'), { categoriaId, mesReferencia, limite });
  return ref.id;
}

export async function excluirOrcamento(orcamentoId) {
  await deleteDoc(doc(db, 'orcamentos', orcamentoId));
}

export async function getGastosPorCategoriaDoMes(mesReferencia = mesAtualRef()) {
  const [contas, gastosRapidos] = await Promise.all([
    getContasDoMes(mesReferencia),
    getGastosRapidosDoMes(mesReferencia),
  ]);

  const gastosPorCategoria = {};
  for (const c of contas.filter((c) => c.natureza === 'despesa')) {
    const nome = nomeCategoria(c.categoriaId, 'despesa');
    gastosPorCategoria[nome] = (gastosPorCategoria[nome] || 0) + valorPessoal(c);
  }
  for (const g of gastosRapidos) {
    const nome = nomeCategoria(g.categoriaId, 'despesa');
    gastosPorCategoria[nome] = (gastosPorCategoria[nome] || 0) + g.valor;
  }
  return gastosPorCategoria;
}

async function getTotalInvestimentos() {
  const snap = await getDocs(collectionGroup(db, 'lancamentos'));
  let total = 0;
  snap.docs.forEach((d) => {
    const { tipo, valor } = d.data();
    total += tipo === 'aporte' ? valor : -valor;
  });
  return total;
}

export async function getResumoDoMes(mesReferencia = mesAtualRef()) {
  const [contas, gastosRapidos, orcamentos, investimentos] = await Promise.all([
    getContasDoMes(mesReferencia),
    getGastosRapidosDoMes(mesReferencia),
    getOrcamentosDoMes(mesReferencia),
    getTotalInvestimentos(),
  ]);

  const receitas = contas
    .filter((c) => c.natureza === 'receita')
    .reduce((soma, c) => soma + valorPessoal(c), 0);

  const despesasContas = contas
    .filter((c) => c.natureza === 'despesa')
    .reduce((soma, c) => soma + valorPessoal(c), 0);

  const despesasRapidas = gastosRapidos.reduce((soma, g) => soma + g.valor, 0);
  const despesas = despesasContas + despesasRapidas;
  const saldo = receitas - despesas;

  // Gastos agrupados por categoria (contas de despesa + gastos rápidos)
  const gastosPorCategoria = {};
  for (const c of contas.filter((c) => c.natureza === 'despesa')) {
    const nome = nomeCategoria(c.categoriaId, 'despesa');
    gastosPorCategoria[nome] = (gastosPorCategoria[nome] || 0) + valorPessoal(c);
  }
  for (const g of gastosRapidos) {
    const nome = nomeCategoria(g.categoriaId, 'despesa');
    gastosPorCategoria[nome] = (gastosPorCategoria[nome] || 0) + g.valor;
  }
  const categoriasOrdenadas = Object.entries(gastosPorCategoria)
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);

  // Alertas inteligentes
  const alertas = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em3Dias = new Date(hoje);
  em3Dias.setDate(hoje.getDate() + 3);

  const contasPendentes = contas.filter((c) => c.status === 'pendente' && c.dataVencimento);

  const vencendoHoje = contasPendentes.filter((c) => {
    const venc = c.dataVencimento.toDate ? c.dataVencimento.toDate() : new Date(c.dataVencimento);
    venc.setHours(0, 0, 0, 0);
    return venc.getTime() === hoje.getTime();
  });
  vencendoHoje.forEach((c) => {
    alertas.push({
      tipo: 'critico',
      texto: `"${c.nome}" (${c.natureza === 'receita' ? 'receita' : 'despesa'}) vence hoje`,
    });
  });

  const vencendoEmBreve = contasPendentes.filter((c) => {
    const venc = c.dataVencimento.toDate ? c.dataVencimento.toDate() : new Date(c.dataVencimento);
    venc.setHours(0, 0, 0, 0);
    return venc.getTime() > hoje.getTime() && venc.getTime() <= em3Dias.getTime();
  });
  if (vencendoEmBreve.length > 0) {
    alertas.push({
      tipo: 'aviso',
      texto: `${vencendoEmBreve.length} conta(s) vencem nos próximos 3 dias: ${vencendoEmBreve.map((c) => c.nome).join(', ')}`,
    });
  }

  const diaDoMes = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  for (const orc of orcamentos) {
    const nome = nomeCategoria(orc.categoriaId, 'despesa');
    const gasto = gastosPorCategoria[nome] || 0;
    const percentual = orc.limite > 0 ? Math.round((gasto / orc.limite) * 100) : 0;
    if (percentual >= 100) {
      alertas.push({
        tipo: 'estouro',
        texto: `Você já passou de ${percentual}% do orçamento de ${nome}, e estamos no dia ${diaDoMes} de ${diasNoMes}`,
      });
    }
  }

  if (despesas > receitas && receitas > 0) {
    alertas.push({
      tipo: 'critico',
      texto: 'Suas despesas estão maiores que a receita este mês. Revise seus gastos.',
    });
  }

  return {
    mesReferencia,
    receitas,
    despesas,
    saldo,
    investimentos,
    categoriasOrdenadas,
    alertas,
  };
}

export async function addGastoRapido({ valor, categoriaId, nota, data = new Date() }) {
  return addDoc(collection(db, 'gastosRapidos'), {
    valor,
    categoriaId,
    nota: nota || '',
    data: Timestamp.fromDate(data),
  });
}

export async function addConta({
  nome,
  valor,
  categoriaId,
  natureza = 'despesa',
  tipoFrequencia,
  dataVencimento,
  compartilhada = false,
  status = 'pendente',
  mesReferencia = mesAtualRef(),
}) {
  return addDoc(collection(db, 'contas'), {
    nome,
    valor,
    categoriaId,
    natureza,
    tipoFrequencia,
    dataVencimento: dataVencimento ? Timestamp.fromDate(dataVencimento) : null,
    status,
    compartilhada,
    mesReferencia,
  });
}

export async function atualizarConta(id, dados) {
  const payload = { ...dados };
  if (payload.dataVencimento) payload.dataVencimento = Timestamp.fromDate(payload.dataVencimento);
  await updateDoc(doc(db, 'contas', id), payload);
}

export async function excluirConta(id) {
  await deleteDoc(doc(db, 'contas', id));
}

export async function atualizarStatusConta(contaId, novoStatus) {
  await updateDoc(doc(db, 'contas', contaId), { status: novoStatus });
}

export async function excluirGastoRapido(id) {
  await deleteDoc(doc(db, 'gastosRapidos', id));
}

export async function duplicarConta(conta, novaDataVencimento) {
  const [ano, mes] = conta.mesReferencia.split('-').map(Number);
  const mesReferenciaProximo = `${mes === 12 ? ano + 1 : ano}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}`;

  return addConta({
    nome: conta.nome,
    valor: conta.valor,
    categoriaId: conta.categoriaId,
    natureza: conta.natureza,
    tipoFrequencia: conta.tipoFrequencia,
    dataVencimento: novaDataVencimento,
    compartilhada: conta.compartilhada,
    status: 'pendente',
    mesReferencia: mesReferenciaProximo,
  });
}

// --- Investimentos ---

export async function listInvestimentos() {
  const snap = await getDocs(collection(db, 'investimentos'));
  const investimentos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // busca os lançamentos de cada investimento em paralelo pra calcular o saldo
  await Promise.all(
    investimentos.map(async (inv) => {
      const lancamentosSnap = await getDocs(collection(db, 'investimentos', inv.id, 'lancamentos'));
      const lancamentos = lancamentosSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const da = a.data?.toDate ? a.data.toDate() : new Date(a.data);
          const db_ = b.data?.toDate ? b.data.toDate() : new Date(b.data);
          return db_ - da;
        });
      inv.lancamentos = lancamentos;
      inv.saldo = lancamentos.reduce((soma, l) => soma + (l.tipo === 'aporte' ? l.valor : -l.valor), 0);
    })
  );

  return investimentos;
}

export async function addInvestimento({ nome, tipo }) {
  return addDoc(collection(db, 'investimentos'), { nome, tipo });
}

export async function addLancamento(investimentoId, { tipo, valor, data = new Date() }) {
  return addDoc(collection(db, 'investimentos', investimentoId, 'lancamentos'), {
    tipo,
    valor,
    data: Timestamp.fromDate(data),
  });
}
