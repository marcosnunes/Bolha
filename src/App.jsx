import { Outlet } from 'react-router-dom';
import { useEffect } from 'react'; // Adicione useEffect
import M from 'materialize-css/dist/js/materialize.min.js'; // Adicione M
import './App.css';

function App() {
  useEffect(() => {
    M.AutoInit();
  }, []);
  return <Outlet />;
}

export default App;