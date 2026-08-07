import { db, storage } from '../firebase.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// livros { titulo, autor, paginasTotal, paginasLidas, status: 'quero_ler'|'lendo'|'lido',
//          avaliacao: 0-5, dataInicio: 'YYYY-MM-DD', dataFim: 'YYYY-MM-DD', capaUrl, capaPath }

export async function getLivros() {
  const snap = await getDocs(collection(db, 'livros'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addLivro({ titulo, autor, paginasTotal, status, dataInicio, dataFim, avaliacao, capaFile }) {
  const ref_ = await addDoc(collection(db, 'livros'), {
    titulo,
    autor: autor || '',
    paginasTotal: paginasTotal || 0,
    paginasLidas: status === 'lido' ? paginasTotal || 0 : 0,
    status,
    dataInicio: dataInicio || '',
    dataFim: status === 'lido' ? dataFim || '' : '',
    avaliacao: avaliacao || 0,
    capaUrl: '',
    capaPath: '',
  });

  if (capaFile) {
    await enviarCapa(ref_.id, capaFile);
  }

  return ref_;
}

export async function enviarCapa(livroId, arquivo) {
  const caminho = `capas/${livroId}-${arquivo.name}`;
  const storageRef = ref(storage, caminho);
  await uploadBytes(storageRef, arquivo);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, 'livros', livroId), { capaUrl: url, capaPath: caminho });
  return url;
}

export async function removerCapa(livroId, capaPath) {
  if (capaPath) {
    try {
      await deleteObject(ref(storage, capaPath));
    } catch (erro) {
      // se o arquivo já não existir, ignora
    }
  }
  await updateDoc(doc(db, 'livros', livroId), { capaUrl: '', capaPath: '' });
}

export async function atualizarPaginas(id, paginasLidas, paginasTotal) {
  const status = paginasLidas >= paginasTotal && paginasTotal > 0 ? 'lido' : 'lendo';
  await updateDoc(doc(db, 'livros', id), { paginasLidas, status });
}

export async function atualizarStatus(id, status, paginasTotal) {
  const dados = { status };
  if (status === 'lido') dados.paginasLidas = paginasTotal || 0;
  if (status === 'quero_ler') dados.paginasLidas = 0;
  await updateDoc(doc(db, 'livros', id), dados);
}

export async function avaliarLivro(id, avaliacao) {
  await updateDoc(doc(db, 'livros', id), { avaliacao });
}

export async function excluirLivro(id, capaPath) {
  if (capaPath) {
    try {
      await deleteObject(ref(storage, capaPath));
    } catch (erro) {
      // ignora se o arquivo não existir
    }
  }
  await deleteDoc(doc(db, 'livros', id));
}
