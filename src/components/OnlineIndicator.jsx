import { Box } from '@mui/material';

function OnlineIndicator({ isOnline = false, size = 12 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: isOnline ? '#4caf50' : '#bdbdbd',
        display: 'inline-block',
        marginLeft: '6px',
        marginTop: '2px',
        verticalAlign: 'middle',
      }}
    />
  );
}

export default OnlineIndicator;
