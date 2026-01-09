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
        boxShadow: isOnline ? '0 0 0 2px white, 0 0 0 3px #4caf50' : 'none',
        verticalAlign: 'middle',
      }}
    />
  );
}

export default OnlineIndicator;
