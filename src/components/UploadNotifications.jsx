import { useUpload } from '../contexts/UploadContext';
import { Box, LinearProgress, Typography, Alert, IconButton, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function UploadNotifications() {
  const { uploads, removeUpload } = useUpload();

  if (uploads.length === 0) return null;

  // Pegar o upload mais recente em andamento
  const activeUpload = uploads.find(u => u.status !== 'completed' && u.status !== 'error') || uploads[0];

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'background.paper',
        boxShadow: 3,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Collapse in={true}>
        <Alert 
          severity={
            activeUpload.status === 'completed' ? 'success' : 
            activeUpload.status === 'error' ? 'error' : 
            'info'
          }
          icon={activeUpload.status === 'completed' ? <CheckCircleIcon /> : undefined}
          action={
            activeUpload.status === 'completed' || activeUpload.status === 'error' ? (
              <IconButton
                size="small"
                onClick={() => removeUpload(activeUpload.id)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            ) : null
          }
          sx={{ borderRadius: 0, mb: 0 }}
        >
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            {activeUpload.status === 'processing' && '🎬 Comprimindo vídeo...'}
            {activeUpload.status === 'uploading' && '📤 Enviando arquivo...'}
            {activeUpload.status === 'saving' && '💾 Salvando post...'}
            {activeUpload.status === 'completed' && '✅ Post publicado com sucesso!'}
            {activeUpload.status === 'error' && '❌ Erro no upload'}
          </Typography>

          {activeUpload.fileName && (
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              {activeUpload.fileName}
            </Typography>
          )}

          {(activeUpload.status === 'processing' || activeUpload.status === 'uploading') && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={activeUpload.progress} 
                sx={{ mb: 0.5 }}
              />
              <Typography variant="caption">
                {activeUpload.progress}% - Você pode continuar navegando
              </Typography>
            </Box>
          )}

          {activeUpload.status === 'error' && activeUpload.error && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {activeUpload.error}
            </Typography>
          )}
        </Alert>
      </Collapse>
    </Box>
  );
}

export default UploadNotifications;
