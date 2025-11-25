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
      { id: 2, direction: 'VERTICAL', text: 'Ave que faz "quack".' },
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
  },
  {
    id: 6,
    title: 'Ciência',
    rows: 5,
    cols: 5,
    grid: [
      ['A', 'T', 'O', 'M', 'O'],
      ['.', '.', '.', '.', 'L'],
      ['D', 'N', 'A', '.', '.'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Menor partícula da matéria.' },
      { id: 2, direction: 'VERTICAL', text: 'Elemento químico mais abundante no ar.' }, // Nitrogênio
      { id: 3, direction: 'HORIZONTAL', text: 'Molécula da hereditariedade (sigla).' }
    ]
  },
  {
    id: 7,
    title: 'Cinema',
    rows: 6,
    cols: 6,
    grid: [
      ['F', 'I', 'L', 'M', 'E', '.'],
      ['.', '.', '.', '.', '.', 'P'],
      ['P', 'I', 'P', 'O', 'C', 'A'],
      ['.', '.', '.', '.', '.', 'S'],
      ['.', '.', '.', '.', '.', 'T'],
      ['.', '.', '.', '.', '.', 'E']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Obra cinematográfica.' },
      { id: 2, direction: 'HORIZONTAL', text: 'Lanche clássico de cinema.' },
      { id: 3, direction: 'VERTICAL', text: 'Cartaz de divulgação de um filme.' }
    ]
  },
  {
    id: 8,
    title: 'História',
    rows: 5,
    cols: 5,
    grid: [
      ['R', 'O', 'M', 'A', '.'],
      ['.', '.', '.', '.', 'E'],
      ['E', 'G', 'I', 'T', 'O'],
      ['.', '.', '.', '.', 'S'],
      ['.', '.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Antigo império europeu.' },
      { id: 2, direction: 'HORIZONTAL', text: 'Civilização das pirâmides.' },
      { id: 3, direction: 'VERTICAL', text: 'Período de mil anos.' } // Séculos
    ]
  },
  {
    id: 9,
    title: 'Esportes',
    rows: 4,
    cols: 4,
    grid: [
      ['G', 'O', 'L', '.'],
      ['.', '.', '.', 'B'],
      ['B', 'O', 'L', 'A'],
      ['.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Objetivo máximo no futebol.' },
      { id: 2, direction: 'HORIZONTAL', text: 'Objeto essencial em muitos esportes.' }
    ]
  },
  {
    id: 10,
    title: 'Música',
    rows: 5,
    cols: 5,
    grid: [
      ['N', 'O', 'T', 'A', '.'],
      ['.', '.', '.', '.', 'R'],
      ['R', 'I', 'T', 'M', 'O'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Símbolo musical.' },
      { id: 2, direction: 'HORIZONTAL', text: 'Sucessão de tempos fortes e fracos.' }
    ]
  },
  {
    id: 11,
    title: 'Tecnologia',
    rows: 6,
    cols: 6,
    grid: [
      ['C', 'O', 'D', 'I', 'G', 'O'],
      ['.', '.', '.', '.', '.', 'B'],
      ['B', 'U', 'G', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.'],
      ['R', 'E', 'D', 'E', '.', '.'],
      ['.', '.', '.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Instruções para um computador.' },
      { id: 2, direction: 'HORIZONTAL', text: 'Erro em um programa.' },
      { id: 3, direction: 'HORIZONTAL', text: 'Conjunto de computadores interligados.' }
    ]
  },
  {
    id: 12,
    title: 'Geografia',
    rows: 4,
    cols: 4,
    grid: [
      ['M', 'A', 'P', 'A'],
      ['.', '.', '.', '.'],
      ['R', 'I', 'O', '.'],
      ['.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Representação gráfica de uma área.' },
      { id: 2, direction: 'HORIZONTAL', text: 'Curso de água natural.' }
    ]
  },
  {
    id: 13,
    title: 'Comida',
    rows: 5,
    cols: 5,
    grid: [
      ['P', 'I', 'Z', 'Z', 'A'],
      ['A', '.', '.', '.', '.'],
      ['O', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'HORIZONTAL', text: 'Prato italiano famoso.' },
      { id: 2, direction: 'VERTICAL', text: 'Alimento básico feito de farinha.' }
    ]
  }
];
