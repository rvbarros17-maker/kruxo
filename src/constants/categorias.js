export const CATEGORIAS_DESPESA = [
  { id: 'moradia', nome: 'Moradia' },
  { id: 'mercado', nome: 'Mercado' },
  { id: 'contascasa', nome: 'Contas da casa' },
  { id: 'transporte', nome: 'Transporte' },
  { id: 'saude', nome: 'Saúde' },
  { id: 'educacao', nome: 'Educação' },
  { id: 'lazer', nome: 'Lazer' },
  { id: 'assinaturas', nome: 'Assinaturas' },
  { id: 'outros', nome: 'Outros' },
];

export const CATEGORIAS_RECEITA = [
  { id: 'salario', nome: 'Salário' },
  { id: 'freelance', nome: 'Freelance' },
  { id: 'outros', nome: 'Outros' },
];

export function nomeCategoria(id, natureza = 'despesa') {
  const lista = natureza === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  return lista.find((c) => c.id === id)?.nome || 'Outros';
}
