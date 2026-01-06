import { Box } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';

function VerificationBadge({ isVerified, avatarSize = 48 }) {
  if (!isVerified) return null;

  // Calcula o tamanho do ícone baseado no tamanho do avatar
  // Proporção: ícone = avatar * 0.35 a 0.4
  const iconSize = Math.max(16, Math.floor(avatarSize * 0.35));
  
  // Calcula o offset do badge para ficar no canto inferior direito
  // Offset = -(iconSize / 2 + 2px padding)
  const offset = -(Math.floor(iconSize / 2) + 2);

  return (
    <Box
      sx={{
        position: 'absolute',
        right: offset,
        bottom: offset,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
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
