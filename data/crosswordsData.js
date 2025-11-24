export const levels = [
  {
    id: 1,
    title: "Nível 1: O Básico da Web",
    rows: 6,
    cols: 6,
    // Mapa do Grid: '.' é espaço vazio (preto), letras são a resposta
    grid: [
      ['R', 'E', 'A', 'C', 'T', '.'],
      ['.', '.', 'P', '.', '.', '.'],
      ['.', 'W', 'E', 'B', '.', '.'],
      ['.', '.', '.', 'O', '.', '.'],
      ['H', 'T', 'M', 'L', '.', '.'],
      ['.', '.', '.', 'H', 'U', 'B']
    ],
    clues: [
      { id: 1, direction: 'Horizontal', text: 'Biblioteca JS usada neste app' },
      { id: 2, direction: 'Horizontal', text: 'Rede mundial de computadores' },
      { id: 3, direction: 'Horizontal', text: 'Linguagem de marcação' },
      { id: 4, direction: 'Horizontal', text: 'Final do nome do repositório Git...' },
      { id: 5, direction: 'Vertical', text: 'Interface de Programação de Aplicações (sigla)' },
      { id: 6, direction: 'Vertical', text: 'A Bolha é uma rede...' }
    ]
  },
  {
    id: 2,
    title: "Nível 2: Cultura Pop",
    rows: 8,
    cols: 8,
    grid: [
      ['B', 'R', 'A', 'S', 'I', 'L', '.', '.'],
      ['.', 'O', '.', '.', '.', '.', '.', '.'],
      ['.', 'C', 'A', 'F', 'E', '.', '.', '.'],
      ['.', 'K', '.', '.', '.', 'S', '.', '.'],
      ['.', '.', '.', 'N', 'E', 'O', '.', '.'],
      ['.', '.', 'M', '.', '.', 'M', '.', '.'],
      ['.', 'G', 'A', 'T', 'O', '.', '.', '.'],
      ['.', '.', 'R', '.', '.', '.', '.', '.']
    ],
    clues: [
      { id: 1, direction: 'Horizontal', text: 'Nosso país' },
      { id: 2, direction: 'Horizontal', text: 'Bebida amada pelos programadores' },
      { id: 3, direction: 'Horizontal', text: 'Protagonista de Matrix' },
      { id: 4, direction: 'Horizontal', text: 'Animal de estimação' },
      { id: 5, direction: 'Vertical', text: 'Gênero musical (e dança)' },
      { id: 6, direction: 'Vertical', text: 'Planeta vermelho' },
      { id: 7, direction: 'Vertical', text: 'O que ouvimos no app (abreviado)' }
    ]
  }
];
