import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // Hook para redirecionamento
import { Link } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, currentUser } = useAuth(); // Puxamos a função de login
  const navigate = useNavigate(); // Inicializamos o hook de navegação

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/'); // Redireciona para a página principal após o login
    } catch (err) {
      console.error(err);
      setError('Falha ao entrar. Verifique seu e-mail e senha.');
    }

    setLoading(false);
  }

  // Mostra o email do usuário se ele já estiver logado
  if (currentUser) {
    return (
      <div>
        <h1>Você já está logado!</h1>
        <p>Email: {currentUser.email}</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ marginTop: '50px' }}>
      <div className="row">
        <div className="col s12 m8 offset-m2">
          <div className="card">
            <div className="card-content">
              <span className="card-title">Login na Bolha</span>
              {error && <p className="red-text">{error}</p>}
              <form onSubmit={handleSubmit}>
                <div className="input-field">
                  <i className="material-icons prefix">email</i>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <label htmlFor="email">Email</label>
                </div>
                <div className="input-field">
                  <i className="material-icons prefix">lock</i>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <label htmlFor="password">Senha</label>
                </div>
                <div className="card-action">
                  <button disabled={loading} className="btn waves-effect waves-light blue darken-4" type="submit">
                    {loading ? 'Entrando...' : 'Entrar'}
                    <i className="material-icons right">send</i>
                  </button>
                </div>
                <div className="card-action" style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #ddd' }}>
                  <p className="center-align grey-text">
                    Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;