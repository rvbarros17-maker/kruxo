import { db } from '../firebase.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Coleção esperada: atividades { titulo, data: 'YYYY-MM-DD', horario, concluida: bool }

export async function getAtividades() {
  const snap = await getDocs(collection(db, 'atividades'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addAtividade({ titulo, data, horario }) {
  return addDoc(collection(db, 'atividades'), {
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
