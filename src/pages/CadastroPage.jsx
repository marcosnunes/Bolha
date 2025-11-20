import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, set, update, serverTimestamp } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

function CadastroPage() {
  const { token } = useParams();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (nickname.trim().length < 3) {
      return setError('O apelido deve ter pelo menos 3 caracteres.');
    }

    try {
      setError('');
      setLoading(true);
      const userCredential = await signup(email, password);
      const user = userCredential.user;

      const profileRef = ref(rtdb, `profiles/${user.uid}`);
      await set(profileRef, {
        nickname: nickname,
      });

      if (token) {
        const inviteRef = ref(rtdb, `invites/${token}`);
        await update(inviteRef, {
          status: 'completed',
          usedBy: user.uid,
          usedAt: serverTimestamp(),
        });
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Falha ao criar a conta. O e-mail já pode estar em uso.');
    }
    setLoading(false);
  }

  return (
    <div className="container" style={{ marginTop: '50px' }}>
      <div className="row">
        <div className="col s12 m8 offset-m2 l6 offset-l3"> {/* Ajustado para l6 */}
          <div className="card">
            <div className="card-content">
              <span className="card-title">Crie sua Conta na Bolha</span>
              {error && <p className="red-text">{error}</p>}
              <form onSubmit={handleSubmit}>
                <div className="input-field">
                  <i className="material-icons prefix">account_circle</i>
                  <input id="nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
                  <label htmlFor="nickname">Apelido</label>
                </div>
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
                <div className="card-action" style={{ textAlign: 'right' }}>
                  <button disabled={loading} className="btn waves-effect waves-light blue darken-4" type="submit">
                    {loading ? 'Criando...' : 'Cadastrar'}
                    <i className="material-icons right">person_add</i>
                  </button>
                </div>
                <div className="card-action" style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #ddd' }}>
                  <p className="center-align grey-text">
                    Já tem uma conta? <Link to="/login">Login</Link>
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

export default CadastroPage;