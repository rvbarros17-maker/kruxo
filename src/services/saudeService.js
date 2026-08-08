import { db } from '../firebase.js';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Coleções esperadas:
// consultas    { titulo, data: 'YYYY-MM-DD', local, concluida: bool }
// medicacoes   { nome, dosagem, horario, ativo: bool }

export async function getConsultas() {
  const snap = await getDocs(collection(db, 'consultas'));
  const consultas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return consultas.sort((a, b) => (a.data > b.data ? 1 : -1));
}

export async function addConsulta({ titulo, data, local }) {
  return addDoc(collection(db, 'consultas'), { titulo, data, local: local || '', concluida: false });
}

export async function atualizarConsulta(id, dados) {
  await updateDoc(doc(db, 'consultas', id), dados);
}

export async function alternarConsultaConcluida(id, concluida) {
  await updateDoc(doc(db, 'consultas', id), { concluida });
}

export async function excluirConsulta(id) {
  await deleteDoc(doc(db, 'consultas', id));
}

export async function getMedicacoes() {
  const q = query(collection(db, 'medicacoes'), where('ativo', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addMedicacao({ nome, dosagem, horario }) {
  return addDoc(collection(db, 'medicacoes'), {
    nome,
    dosagem: dosagem || '',
    horario: horario || '',
    ativo: true,
  });
}

export async function atualizarMedicacao(id, dados) {
  await updateDoc(doc(db, 'medicacoes', id), dados);
}

export async function desativarMedicacao(id) {
  await updateDoc(doc(db, 'medicacoes', id), { ativo: false });
}
