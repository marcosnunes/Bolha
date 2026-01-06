import { Box } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';

function VerificationBadge({ isVerified, avatarSize = 48, customSx = {} }) {
  if (!isVerified) return null;

  // Calcula o tamanho do ícone baseado no tamanho do avatar
  // Proporção: ícone = avatar * 0.35 a 0.4
  const iconSize = Math.max(16, Math.floor(avatarSize * 0.35));
  
  // Posiciona o badge no canto inferior direito, DENTRO do avatar
  // Usa valores positivos pequenos para ficar dentro da borda
  const offset = -Math.floor(iconSize / 3);

  // Verifica se customSx define propriedades de posição (top/bottom/left/right)
  const hasCustomPosition = Object.keys(customSx).some(key => 
    ['top', 'bottom', 'left', 'right'].includes(key)
  );

  // Se customSx define posição, não usar os padrões de offset
  // Senão, usa o offset calculado
  const sx = hasCustomPosition
    ? {
        position: 'absolute',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...customSx,
      }
    : {
        position: 'absolute',
        right: offset,
        bottom: offset,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...customSx,
      };

  return (
    <Box sx={sx}>
      <VerifiedIcon
        sx={{
          fontSize: iconSize,
          color: '#1976d2',
          backgroundColor: 'white',
          borderRadius: '50%',
        }}
      />
    </Box>
  );
}

export default VerificationBadge;
