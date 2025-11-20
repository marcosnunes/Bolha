import HiddenUserItem from './HiddenUserItem.jsx';

function HiddenUsersManager({ hiddenUsers, onShowUser }) {
  if (hiddenUsers.length === 0) {
    return null;
  }

  return (
    // Envolvemos tudo em um card do Materialize
    <div className="card grey lighten-4" style={{ marginTop: '20px' }}>
      <div className="card-content">
        <span className="card-title" style={{fontSize: '1.2rem'}}>Usuários Ocultos</span>
        <p className="grey-text" style={{marginBottom: '15px'}}>Clique em "Mostrar" para voltar a ver os posts de um usuário.</p>
        <ul className="collection"> {/* Usamos o componente 'collection' do Materialize */}
          {hiddenUsers.map(userId => (
            <HiddenUserItem 
              key={userId} 
              userId={userId} 
              onShowUser={onShowUser} 
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default HiddenUsersManager;