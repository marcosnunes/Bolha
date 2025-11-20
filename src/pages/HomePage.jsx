import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { rtdb } from '../firebase/config';
import { ref, push, set, serverTimestamp } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Importando os componentes
import CreatePostForm from '../components/CreatePostForm.jsx';
import Feed from '../components/Feed.jsx';
import HiddenUsersManager from '../components/HiddenUsersManager.jsx';

function HomePage() {
    const { currentUser, userProfile, logout, hiddenUsers, showUser } = useAuth();
    const navigate = useNavigate();

    const [showNSFW, setShowNSFW] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [loadingInvite, setLoadingInvite] = useState(false);

    async function handleLogout() {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Falha ao fazer logout", error);
        }
    }

    const generateInviteLink = async () => {
        if (!currentUser) return;
        setLoadingInvite(true);
        try {
            const invitesRef = ref(rtdb, 'invites');
            const newInviteRef = push(invitesRef);
            await set(newInviteRef, {
                invitedBy: currentUser.uid,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            const token = newInviteRef.key;
            const newLink = `${window.location.origin}/convite/${token}`;
            setInviteLink(newLink);
        } catch (error) {
            console.error("Erro ao gerar convite:", error);
            alert("Não foi possível gerar o link. Tente novamente.");
        }
        setLoadingInvite(false);
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("ATENÇÃO: Você tem certeza de que deseja apagar sua conta? Todos os seus posts e dados serão permanentemente removidos. Esta ação não pode ser desfeita.")) {
            try {
                const functions = getFunctions();
                const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
                await deleteUserAccount();
                alert("Sua conta foi apagada com sucesso.");
                // O logout será automático pois o usuário não existirá mais
            } catch (error) {
                console.error("Erro ao apagar a conta:", error);
                alert("Ocorreu um erro ao apagar sua conta. Por favor, tente novamente.");
            }
        }
    };

    return (
        <>
            <nav className="blue darken-4">
                <div className="nav-wrapper container">
                    <a href="#!" className="brand-logo">Bolha</a>
                    <ul id="nav-mobile" className="right hide-on-med-and-down">
                        {currentUser ? (
                            <>
                                <li><span>Olá, {userProfile ? userProfile.nickname : ''}</span></li>
                                <li><a href="#!" onClick={handleLogout}>Sair</a></li>
                            </>
                        ) : (
                            <>
                                <li><Link to="/login">Login</Link></li>
                                <li><Link to="/cadastro">Cadastro</Link></li>
                            </>
                        )}
                    </ul>
                </div>
            </nav>

            <div className="container" style={{ marginTop: '30px' }}>
                <div className="row">
                    <div className="col s12 m10 offset-m1 l8 offset-l2">

                        <div className="card red lighten-4" style={{ marginTop: '2rem' }}>
                            <div className="card-content red-text">
                                <span className="card-title">Zona de Perigo</span>
                                <p>Apagar sua conta é uma ação permanente e removerá todos os seus dados.</p>
                                <button onClick={handleDeleteAccount} className="btn waves-effect waves-light red darken-2" style={{ marginTop: '15px' }}>
                                    Apagar Minha Conta
                                </button>
                            </div>
                        </div>
                        <div className="card" style={{ marginBottom: '2rem' }}>
                            <div className="card-content">
                                <span className="card-title">Convidar para a Bolha</span>
                                <p>Gere um link de convite único e compartilhe com um amigo.</p>
                                <button
                                    onClick={generateInviteLink}
                                    disabled={loadingInvite}
                                    className="btn waves-effect waves-light blue darken-2"
                                    style={{ marginTop: '15px' }}
                                >
                                    {loadingInvite ? 'Gerando...' : 'Gerar Link de Convite'}
                                    <i className="material-icons right">link</i>
                                </button>

                                {inviteLink && (
                                    <div className="input-field" style={{ marginTop: '20px', display: 'flex', alignItems: 'center' }}>
                                        <i className="material-icons prefix">insert_link</i>
                                        <input type="text" value={inviteLink} readOnly id="invite-link" />
                                        <label htmlFor="invite-link" className="active">Seu link de convite</label>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(inviteLink)}
                                            className="btn-floating waves-effect waves-light green tooltipped"
                                            data-position="top"
                                            data-tooltip="Copiar"
                                        >
                                            <i className="material-icons">content_copy</i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <h1 style={{ fontSize: '2.5rem' }}>Bolha Feed</h1>
                        <CreatePostForm />
                        <HiddenUsersManager hiddenUsers={hiddenUsers} onShowUser={showUser} />
                        <div className="divider" style={{ margin: '2rem 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '1.8rem' }}>Posts Recentes</h4>
                            <div className="switch">
                                <label>
                                    Filtrar NSFW
                                    <input type="checkbox" checked={!showNSFW} onChange={() => setShowNSFW(!showNSFW)} />
                                    <span className="lever"></span>
                                </label>
                            </div>
                        </div>
                        <Feed filterNSFW={!showNSFW} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default HomePage;