import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, Toolbar, IconButton, Typography, Container, Box, Paper, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HelpIcon from '@mui/icons-material/Help';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

import { levels } from '/data/crosswordsData.js';

function CrosswordsPage() {
  const navigate = useNavigate();
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [userGrid, setUserGrid] = useState([]);
  const [won, setWon] = useState(false);
  const [hintMessage, setHintMessage] = useState('');
  
  const levelData = levels[currentLevelIndex];

  // Efeito para inicializar ou resetar a grade quando o nível muda
  useEffect(() => {
    if (levelData) {
      const initialGrid = Array(levelData.rows).fill(null).map(() => Array(levelData.cols).fill(''));
      setUserGrid(initialGrid);
      setWon(false);
      setHintMessage('');
    }
  }, [currentLevelIndex, levelData]);

  const handleInputChange = (row, col, value) => {
    if (won) return;
    const char = value.slice(-1).toUpperCase().replace(/[^A-Z]/g, '');
    
    const newGrid = userGrid.map((r, rIndex) => 
      rIndex === row ? r.map((c, cIndex) => cIndex === col ? char : c) : r
    );
    setUserGrid(newGrid);
    checkWin(newGrid);
  };

  const checkWin = (currentGrid) => {
    if (!levelData || !levelData.grid || currentGrid.length !== levelData.rows) return;

    for (let r = 0; r < levelData.rows; r++) {
      for (let c = 0; c < levelData.cols; c++) {
        if (levelData.grid[r][c] !== '.' && currentGrid[r][c] !== levelData.grid[r][c]) {
          return;
        }
      }
    }
    setWon(true);
  };

  const giveHint = () => {
    for (let r = 0; r < levelData.rows; r++) {
      for (let c = 0; c < levelData.cols; c++) {
        const answerChar = levelData.grid[r][c];
        if (answerChar !== '.' && userGrid[r][c] !== answerChar) {
          handleInputChange(r, c, answerChar);
          setHintMessage(`Dica revelada!`);
          return;
        }
      }
    }
    setHintMessage("O jogo já está completo!");
  };

  const nextLevel = () => {
    if (currentLevelIndex < levels.length - 1) {
      setCurrentLevelIndex(prev => prev + 1);
    } else {
      alert("Você completou todos os níveis!");
    }
  };

  const prevLevel = () => {
    if (currentLevelIndex > 0) {
      setCurrentLevelIndex(prev => prev - 1);
    }
  };
  
  if (!levelData || !levelData.grid || !userGrid.length || userGrid.length !== levelData.rows) {
     return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
     );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.100', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ pt: { xs: 'env(safe-area-inset-top)', sm: 0 } }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Palavras Cruzadas
          </Typography>
          <Tooltip title="Pedir uma dica (revela uma letra)">
            <IconButton color="inherit" onClick={giveHint}>
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 4, pb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton onClick={prevLevel} disabled={currentLevelIndex === 0}><ArrowBackIosIcon /></IconButton>
          <Typography variant="h6" align="center">{levelData.title}</Typography>
          <IconButton onClick={nextLevel} disabled={currentLevelIndex >= levels.length - 1}><ArrowForwardIcon /></IconButton>
        </Paper>

        {hintMessage && <Typography color="primary" align="center" sx={{ mb: 2, fontWeight: 'bold' }}>{hintMessage}</Typography>}

        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${levelData.cols}, 1fr)`, gap: '4px', maxWidth: '100%', aspectRatio: '1/1', mb: 4, border: '2px solid #0d47a1', p: '4px', bgcolor: '#0d47a1' }}>
          {userGrid.map((row, rowIndex) => (
            row.map((cell, colIndex) => {
              const isBlock = levelData.grid[rowIndex][colIndex] === '.';
              return (
                <Box key={`${rowIndex}-${colIndex}`} sx={{ bgcolor: isBlock ? '#0d47a1' : 'white', display: 'flex' }}>
                  {!isBlock && (
                    <input
                      type="text" value={cell} maxLength={1}
                      onChange={(e) => handleInputChange(rowIndex, colIndex, e.target.value)}
                      disabled={won}
                      style={{
                        width: '100%', height: '100%', textAlign: 'center', fontSize: '1.5rem',
                        fontWeight: 'bold', border: 'none', outline: 'none',
                        textTransform: 'uppercase', backgroundColor: 'transparent',
                        color: won ? 'green' : 'black'
                      }}
                    />
                  )}
                </Box>
              );
            })
          ))}
        </Box>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Dicas:</Typography>
            {levelData.clues.map((clue) => (
              <Typography key={clue.id} variant="body2" sx={{ mb: 1 }}>
                <strong>{clue.direction}:</strong> {clue.text}
              </Typography>
            ))}
        </Paper>
      </Container>

      <Dialog open={won} onClose={() => setWon(false)}>
        <DialogTitle sx={{ textAlign: 'center' }}><CheckCircleIcon color="success" sx={{ fontSize: 60 }} /></DialogTitle>
        <DialogContent><Typography align="center">Parabéns! Você completou o desafio!</Typography></DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button variant="contained" onClick={() => { setWon(false); nextLevel(); }}>
            {currentLevelIndex < levels.length - 1 ? 'Próximo Nível' : 'Finalizar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CrosswordsPage;
