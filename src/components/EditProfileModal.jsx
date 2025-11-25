import { useState, useRef } from 'react';
import { updatePassword } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Avatar, Typography, Alert, CircularProgress
} from '@mui/material';

function EditProfileModal({ open, onClose, currentNickname, currentPhotoURL }) {
  const { currentUser } = useAuth();
  const [nickname, setNickname] = useState(currentNickname || '');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentPhotoURL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let newPhotoURL = currentPhotoURL;

      // 1. Upload da nova foto (se houver)
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Falha no upload da imagem.');
        const data = await response.json();
        newPhotoURL = data.secure_url;
      }

      // 2. Atualizar Perfil no Realtime Database (Apelido e Foto)
      if (nickname !== currentNickname || newPhotoURL !== currentPhotoURL) {
        const profileRef = ref(rtdb, `profiles/${currentUser.uid}`);
        await update(profileRef, {
          nickname: nickname,
          photoURL: newPhotoURL
        });
      }

      // 3. Atualizar Senha (se fornecida)
      if (password) {
        if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
        await updatePassword(currentUser, password);
      }

      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => {
        onClose();
        setSuccess('');
        setPassword(''); // Limpa o campo de senha
      }, 1500);

    } catch (err) {
      console.error(err);
      // Trata erro de "reautenticação necessária" do Firebase
      if (err.code === 'auth/requires-recent-login') {
        setError('Para mudar a senha, faça logout e login novamente por segurança.');
      } else {
        setError(err.message || 'Erro ao atualizar perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Editar Perfil</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, alignItems: 'center' }}>
          
          {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ width: '100%' }}>{success}</Alert>}

          <Box sx={{ position: 'relative' }}>
            <Avatar 
              src={preview} 
              sx={{ width: 100, height: 100, cursor: 'pointer', border: '2px solid #1976d2' }}
              onClick={() => fileInputRef.current.click()}
            />
          </Box>
          <Button size="small" onClick={() => fileInputRef.current.click()}>Alterar Foto</Button>
          <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />

          <TextField
            label="Apelido"
            fullWidth
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <TextField
            label="Nova Senha (opcional)"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Deixe em branco para manter a atual"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditProfileModal;
