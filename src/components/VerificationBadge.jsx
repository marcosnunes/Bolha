import { Box } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';

function VerificationBadge({ isVerified, size = 'small' }) {
  if (!isVerified) return null;

  const sizeMap = {
    small: { iconSize: 20, right: 0, bottom: 0 },
    medium: { iconSize: 28, right: 2, bottom: 2 },
    large: { iconSize: 36, right: 4, bottom: 4 },
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
        bgcolor: 'white',
        borderRadius: '50%',
        width: config.iconSize + 4,
        height: config.iconSize + 4,
        padding: '2px',
      }}
    >
      <VerifiedIcon
        sx={{
          fontSize: config.iconSize,
          color: '#1976d2',
        }}
      />
    </Box>
  );
}

export default VerificationBadge;
