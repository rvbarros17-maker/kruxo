import { db } from '../firebase.js';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { uidAtual, filtroUsuario } from './userScope.js';

// Coleção esperada: atividades { userId, titulo, data: 'YYYY-MM-DD', horario, concluida: bool }

export async function getAtividades() {
  const q = query(collection(db, 'atividades'), filtroUsuario());
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addAtividade({ titulo, data, horario }) {
  return addDoc(collection(db, 'atividades'), {
    userId: uidAtual(),
    titulo,
    data,
    horario: horario || '',
    concluida: false,
  });
}

export async function alternarAtividadeConcluida(id, concluida) {
  await updateDoc(doc(db, 'atividades', id), { concluida });
}

export async function atualizarAtividade(id, dados) {
  await updateDoc(doc(db, 'atividades', id), dados);
}

export async function excluirAtividade(id) {
  await deleteDoc(doc(db, 'atividades', id));
}
