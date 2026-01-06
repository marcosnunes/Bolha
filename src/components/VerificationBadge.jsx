import { Box } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';

function VerificationBadge({ isVerified, size = 'small' }) {
  if (!isVerified) return null;

  const sizeMap = {
    small: { iconSize: 18, right: -6, bottom: -6 },
    medium: { iconSize: 24, right: -8, bottom: -8 },
    large: { iconSize: 32, right: -10, bottom: -10 },
  };

  const config = sizeMap[size] || sizeMap.small;

  return (
    <Box
      sx={{
        position: 'absolute',
        right: config.right,
        bottom: config.bottom,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <VerifiedIcon
        sx={{
          fontSize: config.iconSize,
          color: '#1976d2',
          backgroundColor: 'white',
          borderRadius: '50%',
        }}
      />
    </Box>
  );
}

export default VerificationBadge;
