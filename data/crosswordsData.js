export const levels = [
  {
    id: 1,
    title: 'Conceitos de Programação',
    rows: 5,
    cols: 5,
    grid: [
      ['G', 'R', 'I', 'D', '.'],
      ['O', '.', '.', '.', '.'],
      ['O', '.', 'F', 'U', 'N'],
      ['P', '.', '.', '.', '.'],
      ['S', '.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Estrutura de linhas e colunas (inglês).' },
      { id: 2, direction: 'VERTICAL', text: 'Repetição de código.' },
      { id: 3, direction: 'HORIZONTAL', text: 'Sinônimo de diversão em inglês, para o que a programação deve ser.' },
      { id: 4, direction: 'VERTICAL', text: 'Programação Orientada a Objetos (sigla).' }
    ]
  },
  {
    id: 2,
    title: 'Frameworks JavaScript',
    rows: 5,
    cols: 5,
    grid: [
      ['R', 'E', 'A', 'C', 'T'],
      ['.', '.', '.', '.', 'U'],
      ['.', 'V', 'U', 'E', '.'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Biblioteca da Meta para interfaces.' },
      { id: 2, direction: 'VERTICAL', text: 'Criado por Evan You, focado em reatividade.' }
    ]
  },
  {
    id: 3,
    title: 'Frutas',
    rows: 5,
    cols: 5,
    grid: [
      ['M', 'A', 'Ç', 'Ã', '.'],
      ['.', '.', '.', '.', 'P'],
      ['.', 'U', 'V', 'A', '.'],
      ['.', '.', '.', '.', 'R'],
      ['.', '.', '.', '.', 'A']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Fruta que pode ser vermelha ou verde.' },
      { id: 2, direction: 'HORIZONTAL', text: 'Fruta pequena em cachos.' },
      { id: 3, direction: 'VERTICAL', text: 'Fruta comum em sobremesas (plural invertido).' }
    ]
  },
  {
    id: 4,
    title: 'Animais',
    rows: 5,
    cols: 6,
    grid: [
      ['G', 'A', 'T', 'O', '.', '.'],
      ['.', '.', '.', '.', 'P', '.'],
      ['C', 'A','V','A','L','O'],
      ['.', '.', '.', '.', 'T', '.'],
      ['.', '.', '.', '.', 'O', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Animal doméstico que mia.' },
      { id: 2, direction: 'VERTICAL', text: 'Ave que faz \"quack\".' },
      { id: 3, direction: 'HORIZONTAL', text: 'Animal de grande porte usado em fazendas.' }
    ]
  },
  {
    id: 5,
    title: 'Cores',
    rows: 6,
    cols: 5,
    grid: [
      ['A', 'Z', 'U', 'L', '.'],
      ['.', '.', '.', '.', 'V'],
      ['R', 'O', 'S', 'A', '.'],
      ['.', '.', '.', '.', 'E'],
      ['.', '.', '.', '.', 'R'],
      ['V','E','R','D','E']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Cor do céu.' },
      { id: 2, direction: 'HORIZONTAL', text: 'Cor associada a flores delicadas.' },
      { id: 3, direction: 'VERTICAL', text: 'Mistura de azul e amarelo.' },
      { id: 4, direction: 'HORIZONTAL', text: 'Cor da esperança.' }
    ]
  }
];
