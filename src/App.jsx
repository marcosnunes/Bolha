import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import M from '@materializecss/materialize/dist/js/materialize.min.js';
import './App.css';

function App() {
  useEffect(() => {
    M.AutoInit();
  }, []);
  return <Outlet />;
}

export default App;