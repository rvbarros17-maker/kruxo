import { db } from '../firebase.js';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { uidAtual, filtroUsuario } from './userScope.js';

// Coleção esperada: metas { userId, titulo, descricao, prazo (Timestamp|null), progresso: 0-100, concluida: bool, criadoEm }

export async function getMetas() {
  const q = query(collection(db, 'metas'), filtroUsuario());
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addMeta({ titulo, descricao, prazo }) {
  return addDoc(collection(db, 'metas'), {
    userId: uidAtual(),
    titulo,
    descricao: descricao || '',
    prazo: prazo ? Timestamp.fromDate(prazo) : null,
    progresso: 0,
    concluida: false,
    criadoEm: Timestamp.fromDate(new Date()),
  });
}

export async function atualizarMeta(id, dados) {
  await updateDoc(doc(db, 'metas', id), dados);
}

export async function atualizarProgresso(id, progresso) {
  const concluida = progresso >= 100;
  await updateDoc(doc(db, 'metas', id), { progresso, concluida });
}

export async function alternarConcluida(id, concluida) {
  await updateDoc(doc(db, 'metas', id), { concluida, progresso: concluida ? 100 : 0 });
}

export async function excluirMeta(id) {
  await deleteDoc(doc(db, 'metas', id));
}
