import { useState, useRef, useEffect } from 'react';
import { Box, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

const REACTIONS = [
  { emoji: '❤️', label: 'Amei', value: 'heart' },
  { emoji: '😂', label: 'Muito engraçado', value: 'laugh' },
  { emoji: '😮', label: 'Impressionado', value: 'wow' },
  { emoji: '😢', label: 'Triste', value: 'sad' },
  { emoji: '🔥', label: 'Demais!', value: 'fire' },
];

export default function ReactionSelector({ currentReaction, onReactionSelect, size = 'small' }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 'auto', left: 'auto' });
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSelectReaction = (reactionValue) => {
    onReactionSelect(reactionValue);
    setShowMenu(false);
  };

  // Calcula posição do menu
  useEffect(() => {
    if (!showMenu || !containerRef.current) return;

    const timer = setTimeout(() => {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 80;
      const menuWidth = isMobile ? 160 : 220;

      // Calcula posição horizontal (centralizado)
      let left = rect.left + rect.width / 2 - menuWidth / 2;
      
      // Evita sair da tela horizontalmente
      if (left < 10) left = 10;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }

      // Calcula posição vertical
      let top;
      if (spaceAbove > menuHeight && spaceAbove > spaceBelow) {
        // Acima
        top = rect.top - menuHeight - 12;
      } else {
        // Abaixo
        top = rect.bottom + 12;
      }

      setMenuPosition({
        top: `${Math.max(10, top)}px`,
        left: `${left}px`,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [showMenu, isMobile]);

  const iconSize = size === 'small' ? 20 : size === 'medium' ? 28 : 32;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        display: 'inline-block',
        zIndex: 10,
      }}
    >
      <Tooltip title="Reagir">
        <Box
          onClick={() => setShowMenu(!showMenu)}
          sx={{
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
              transform: 'scale(1.15)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
        >
          <EmojiEmotionsIcon
            fontSize={size}
            sx={{
              color: currentReaction ? '#FFD700' : '#999',
              transition: 'color 0.2s ease-in-out',
              fontSize: `${iconSize}px`,
            }}
          />
        </Box>
      </Tooltip>

      {showMenu && (
        <Box
          ref={menuRef}
          sx={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: isMobile ? '24px' : '32px',
            padding: isMobile ? '10px 12px' : '12px 16px',
            display: 'flex',
            gap: isMobile ? '6px' : '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            zIndex: 1300,
            animation: 'slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '@keyframes slideUp': {
              from: {
                opacity: 0,
                transform: 'scale(0.8)',
              },
              to: {
                opacity: 1,
                transform: 'scale(1)',
              },
            },
          }}
        >
          {REACTIONS.map((reaction) => (
            <Tooltip 
              key={reaction.value} 
              title={currentReaction === reaction.value ? `Remover ${reaction.label}` : reaction.label} 
              placement="top"
            >
              <Box
                onClick={() => handleSelectReaction(reaction.value)}
                sx={{
                  fontSize: isMobile ? '24px' : size === 'small' ? '28px' : size === 'medium' ? '32px' : '36px',
                  cursor: 'pointer',
                  padding: isMobile ? '4px 8px' : '6px 10px',
                  borderRadius: '20px',
                  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  backgroundColor: currentReaction === reaction.value ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                  border: currentReaction === reaction.value ? '2px solid #FFD700' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: isMobile ? '38px' : '44px',
                  minHeight: isMobile ? '38px' : '44px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 215, 0, 0.2)',
                    transform: 'scale(1.25) rotate(8deg)',
                    border: '2px solid #FFD700',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {reaction.emoji}
              </Box>
            </Tooltip>
          ))}
        </Box>
      )}

      {/* Fecha o menu ao clicar fora */}
      {showMenu && (
        <Box
          onClick={() => setShowMenu(false)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1200,
          }}
        />
      )}
    </Box>
  );
}

export { REACTIONS };
