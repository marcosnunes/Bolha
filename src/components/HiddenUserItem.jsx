import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

function HiddenUserItem({ userId, onShowUser }) {
  const [nickname, setNickname] = useState(null);

  // Este useEffect é correto, pois sincroniza com um sistema externo (Firebase)
  // para buscar um dado que o componente não possui.
  useEffect(() => {
    const profileRef = ref(rtdb, `profiles/${userId}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.nickname) {
        setNickname(data.nickname);
      }
    });

    return () => unsubscribe(); // Limpa a escuta
  }, [userId]); // Roda novamente se o userId mudar (importante para listas)

  return (
    <li className="collection-item">
      <div>
        {nickname || `Carregando...`}
        <a href="#!" onClick={() => onShowUser(userId)} className="secondary-content">
          <i className="material-icons green-text">visibility</i> {/* Ícone de "mostrar" */}
        </a>
      </div>
    </li>
  );
}

export default HiddenUserItem;