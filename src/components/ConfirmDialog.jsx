import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

/**
 * Um diálogo de confirmação reutilizável.
 *
 * @param {object} props
 * @param {boolean} props.open - Se o diálogo está aberto ou não.
 * @param {function} props.onClose - Função para chamar quando o diálogo é fechado.
 * @param {function} props.onConfirm - Função para chamar quando a ação é confirmada.
 * @param {string} props.title - O título do diálogo.
 * @param {string} props.message - A mensagem ou pergunta a ser exibida no diálogo.
 * @param {string} [props.confirmText="Confirmar"] - O texto para o botão de confirmação.
 * @param {string} [props.cancelText="Cancelar"] - O texto para o botão de cancelamento.
 */
const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar' }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {cancelText}
        </Button>
        <Button onClick={() => { onConfirm(); onClose(); }} color="secondary" autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
