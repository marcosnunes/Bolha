import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, Toolbar, IconButton, Typography, Container, Box, Paper, 
  Button, Grid, TextField, Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HelpIcon from '@mui/icons-material/Help';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

import { levels } from '../data/crosswordsData';

function CrosswordsPage() {
  const navigate = useNavigate();
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [userGrid, setUserGrid] = useState([]);
  const [won, setWon] = useState(false);
  const [hintMessage, setHintMessage] = useState('');
  
  const levelData = levels[currentLevelIndex];

  // Inicializa o grid do usuário quando o nível muda
  useEffect(() => {
    resetLevel();
  }, [currentLevelIndex]);

  const resetLevel = () => {
    const initialGrid = Array(levelData.rows).fill(null).map(() => Array(levelData.cols).fill(''));
    setUserGrid(initialGrid);
    setWon(false);
    setHintMessage('');
  };

  const handleInputChange = (row, col, value) => {
    if (won) return;
    
    // Aceita apenas letras
    const char = value.slice(-1).toUpperCase();
    
    const newGrid = [...userGrid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = char;
    setUserGrid(newGrid);

    // Verifica vitória automaticamente
    checkWin(newGrid);
  };

  const checkWin = (currentGrid) => {
    let isFull = true;
    let isCorrect = true;

    for (let r = 0; r < levelData.rows; r++) {
      for (let c = 0; c < levelData.cols; c++) {
        const answerChar = levelData.grid[r][c];
        if (answerChar !== '.') {
          if (!currentGrid[r][c]) isFull = false;
          if (currentGrid[r][c] !== answerChar) isCorrect = false;
        }
      }
    }

    if (isFull && isCorrect) {
      setWon(true);
    }
  };

  const giveHint = () => {
    // Encontra uma célula vazia ou errada e preenche
    for (let r = 0; r < levelData.rows; r++) {
      for (let c = 0; c < levelData.cols; c++) {
        const answerChar = levelData.grid[r][c];
        const userChar = userGrid[r][c];

        if (answerChar !== '.' && userChar !== answerChar) {
          const newGrid = [...userGrid];
          newGrid[r][c] = answerChar;
          setUserGrid(newGrid);
          setHintMessage(`Dica: Letra revelada na linha ${r + 1}, coluna ${c + 1}!`);
          checkWin(newGrid); // Verifica se essa dica completou o jogo
          return;
        }
      }
    }
    setHintMessage("O jogo já está completo!");
  };

  const nextLevel = () => {
    if (currentLevelIndex < levels.length - 1) {
      setCurrentLevelIndex(prev => prev + 1);
    }
  };

  const prevLevel = () => {
    if (currentLevelIndex > 0) {
      setCurrentLevelIndex(prev => prev - 1);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.100', minHeight: '100vh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Palavras Cruzadas
          </Typography>
          <IconButton color="inherit" onClick={giveHint}>
            <HelpIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 4, pb: 4 }}>
        {/* Cabeçalho do Nível */}
        <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton onClick={prevLevel} disabled={currentLevelIndex === 0}>
            <ArrowBackIosIcon />
          </IconButton>
          <Typography variant="h6">{levelData.title}</Typography>
          <IconButton onClick={nextLevel} disabled={currentLevelIndex === levels.length - 1}>
            <ArrowForwardIcon />
          </IconButton>
        </Paper>

        {/* Mensagem de Dica */}
        {hintMessage && (
          <Typography color="primary" align="center" sx={{ mb: 2, fontWeight: 'bold' }}>
            {hintMessage}
          </Typography>
        )}

        {/* O Tabuleiro */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${levelData.cols}, 1fr)`, 
          gap: '4px', 
          maxWidth: '100%',
          aspectRatio: '1/1',
          mb: 4
        }}>
          {userGrid.length > 0 && userGrid.map((row, rowIndex) => (
            row.map((cell, colIndex) => {
              const isBlock = levelData.grid[rowIndex][colIndex] === '.';
              return (
                <Box 
                  key={`${rowIndex}-${colIndex}`}
                  sx={{
                    bgcolor: isBlock ? 'black' : 'white',
                    border: isBlock ? 'none' : '1px solid #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {!isBlock && (
                    <input
                      type="text"
                      value={cell}
                      maxLength={1}
                      onChange={(e) => handleInputChange(rowIndex, colIndex, e.target.value)}
                      disabled={won}
                      style={{
                        width: '100%',
                        height: '100%',
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        border: 'none',
                        outline: 'none',
                        textTransform: 'uppercase',
                        backgroundColor: 'transparent',
                        color: won ? '#2e7d32' : 'inherit'
                      }}
                    />
                  )}
                </Box>
              );
            })
          ))}
        </Box>

        {/* Dicas */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Dicas:</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {levelData.clues.map((clue) => (
                <Typography key={clue.id} variant="body2" sx={{ mb: 1 }}>
                  <strong>{clue.direction}:</strong> {clue.text}
                </Typography>
              ))}
            </Grid>
          </Grid>
        </Paper>
      </Container>

      {/* Modal de Vitória */}
      <Dialog open={won}>
        <DialogTitle sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
          Parabéns!
        </DialogTitle>
        <DialogContent>
          <Typography align="center">Você completou o desafio {levelData.title}!</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button variant="contained" onClick={() => {
             if (currentLevelIndex < levels.length - 1) {
               nextLevel();
             } else {
               setWon(false); // Apenas fecha se for o último
             }
          }}>
            {currentLevelIndex < levels.length - 1 ? 'Próximo Nível' : 'Fechar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CrosswordsPage;
