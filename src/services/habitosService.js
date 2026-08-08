import { db } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

// Coleções esperadas no Firestore:
// habitos          { nome, ativo: bool, criadoEm (Timestamp) }
// habitoRegistros  { habitoId, data: 'YYYY-MM-DD', concluido: true }
//   (só existe um documento quando o hábito foi concluído naquele dia)

export function paraChaveData(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function segundaDaSemana(dataRef = new Date()) {
  const d = new Date(dataRef);
  d.setHours(0, 0, 0, 0);
  const diaSemana = d.getDay(); // 0 = domingo
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + deslocamento);
  return d;
}

export async function getHabitosAtivos() {
  const q = query(collection(db, 'habitos'), where('ativo', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addHabito(nome) {
  return addDoc(collection(db, 'habitos'), {
    nome,
    ativo: true,
    criadoEm: Timestamp.fromDate(new Date()),
  });
}

export async function atualizarHabito(id, nome) {
  await updateDoc(doc(db, 'habitos', id), { nome });
}

export async function desativarHabito(habitoId) {
  await updateDoc(doc(db, 'habitos', habitoId), { ativo: false });
}

export async function getRegistros(chavesData) {
  if (chavesData.length === 0) return [];
  const q = query(collection(db, 'habitoRegistros'), where('data', 'in', chavesData));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function marcarConcluido(habitoId, chaveData) {
  return addDoc(collection(db, 'habitoRegistros'), {
    habitoId,
    data: chaveData,
    concluido: true,
  });
}

export async function desmarcarConcluido(registroId) {
  await deleteDoc(doc(db, 'habitoRegistros', registroId));
}

export async function getStreakAtual(habitosAtivos) {
  if (habitosAtivos.length === 0) return 0;

  const hoje = new Date();
  const chavesUltimos60 = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    chavesUltimos60.push(paraChaveData(d));
  }

  // Firestore "in" aceita até 30 valores por consulta, então busca em lotes
  const lotes = [];
  for (let i = 0; i < chavesUltimos60.length; i += 30) {
    lotes.push(chavesUltimos60.slice(i, i + 30));
  }
  const registrosPorLote = await Promise.all(lotes.map((lote) => getRegistros(lote)));
  const registros = registrosPorLote.flat();

  const concluidosPorDia = {};
  registros.forEach((r) => {
    concluidosPorDia[r.data] = concluidosPorDia[r.data] || new Set();
    concluidosPorDia[r.data].add(r.habitoId);
  });

  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const chave = paraChaveData(d);
    const concluidos = concluidosPorDia[chave] || new Set();
    const todosConcluidos = habitosAtivos.every((h) => concluidos.has(h.id));
    if (!todosConcluidos) break;
    streak++;
  }
  return streak;
}
