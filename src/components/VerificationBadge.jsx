import { Box } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';

function VerificationBadge({ isVerified, size = 'small' }) {
  if (!isVerified) return null;

  const sizeMap = {
    small: { size: 24, position: 'absolute', right: -8, bottom: -8 },
    medium: { size: 32, position: 'absolute', right: -12, bottom: -12 },
    large: { size: 40, position: 'absolute', right: -16, bottom: -16 },
  };

  const config = sizeMap[size] || sizeMap.small;

  return (
    <Box
      sx={{
        position: config.position,
        [size === 'small' ? 'right' : 'right']: config.right,
        [size === 'small' ? 'bottom' : 'bottom']: config.bottom,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <VerifiedIcon
        sx={{
          fontSize: config.size,
          color: '#1976d2',
          backgroundColor: 'white',
          borderRadius: '50%',
        }}
      />
    </Box>
  );
}

export default VerificationBadge;
