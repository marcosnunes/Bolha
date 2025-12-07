import { useUpload } from '../contexts/UploadContext';
import { Box, Paper, LinearProgress, Typography, IconButton, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

function UploadNotifications() {
  const { uploads, removeUpload } = useUpload();

  console.log('UploadNotifications - uploads:', uploads.length);

  if (uploads.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 80, sm: 16 },
        right: { xs: 8, sm: 16 },
        left: { xs: 8, sm: 'auto' },
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: { xs: '100%', sm: 400 }
      }}
    >
      {uploads.map((upload) => (
        <Collapse key={upload.id} in={true}>
          <Paper
            elevation={8}
            sx={{
              p: 2,
              backgroundColor: 'background.paper',
              borderLeft: `4px solid ${
                upload.status === 'completed' ? 'success.main' : 
                upload.status === 'error' ? 'error.main' : 
                'primary.main'
              }`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {upload.status === 'completed' && <CheckCircleIcon color="success" />}
                  {upload.status === 'error' && <ErrorIcon color="error" />}
                  {(upload.status === 'processing' || upload.status === 'uploading' || upload.status === 'saving') && 
                    <CloudUploadIcon color="primary" />
                  }
                  
                  <Typography variant="body2" fontWeight="bold">
                    {upload.status === 'processing' && 'Comprimindo vídeo...'}
                    {upload.status === 'uploading' && 'Enviando arquivo...'}
                    {upload.status === 'saving' && 'Salvando post...'}
                    {upload.status === 'completed' && 'Post publicado!'}
                    {upload.status === 'error' && 'Erro no upload'}
                  </Typography>
                </Box>

                {upload.fileName && (
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {upload.fileName}
                  </Typography>
                )}

                {upload.status === 'error' && upload.error && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                    {upload.error}
                  </Typography>
                )}

                {(upload.status === 'processing' || upload.status === 'uploading') && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress variant="determinate" value={upload.progress} />
                    <Typography variant="caption" color="text.secondary" align="center" display="block">
                      {upload.progress}%
                    </Typography>
                  </Box>
                )}
              </Box>

              <IconButton 
                size="small" 
                onClick={() => removeUpload(upload.id)}
                disabled={upload.status === 'uploading' || upload.status === 'saving'}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        </Collapse>
      ))}
    </Box>
  );
}

export default UploadNotifications;
