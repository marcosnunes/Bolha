function ProfileModal({ userToDisplay, onclose, hiddenUsers, onHideUser, onShowUser }) {
  if (!userToDisplay) return null;

  const isHidden = hiddenUsers.includes(userToDisplay.authorId);

  const handleHideToggle = () => {
    if (isHidden) {
      onShowUser(userToDisplay.authorId);
    } else {
      onHideUser(userToDisplay.authorId);
    }
    onclose();
  };

  return (
    // Vamos manter nossa estrutura, mas aplicar classes do Materialize
    <div className="modal-overlay" onClick={onclose} style={{ zIndex: 1000, display: 'block', opacity: 1 }}>
      <div className="card" style={{ position: 'relative', top: '25%', margin: '0 auto', maxWidth: '400px' }}>
        <div className="card-content">
          <span className="card-title">{userToDisplay.authorNickname}</span>
        </div>
        <div className="card-action">
          <a href="#!" onClick={handleHideToggle} className={isHidden ? 'waves-effect waves-green btn-flat' : 'waves-effect waves-red btn-flat'}>
            {isHidden ? 'Mostrar' : 'Ocultar'}
          </a>
          <a href="#!" onClick={onclose} className="waves-effect btn-flat">Fechar</a>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;