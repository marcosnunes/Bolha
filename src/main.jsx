import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import SettingsPage from './pages/SettingsPage.jsx';
import VerificacaoPage from './pages/VerificacaoPage.jsx';

import './index.css';

// Importando nossas páginas
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import CadastroPage from './pages/CadastroPage.jsx';
import PagamentoPage from './pages/PagamentoPage.jsx';
import ConvitePage from './pages/ConvitePage.jsx';
import EmailVerificationRequiredPage from './pages/EmailVerificationRequiredPage.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { UploadProvider } from './contexts/UploadContext.jsx';
import { SoundProvider } from './contexts/SoundContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import UploadNotifications from './components/UploadNotifications.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import ReportAbusePage from './pages/ReportAbusePage.jsx';

// Criando o roteador
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/configuracoes',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/verificacao-email',
    element: (
      <ProtectedRoute allowUnverified>
        <EmailVerificationRequiredPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/cadastro',
    element: <CadastroPage />,
  },
  {
    path: '/pagamento',
    element: <PagamentoPage />,
  },
  {
    path: '/convite/:token',
    element: <ConvitePage />,
  },
  {
    path: '/politica-de-privacidade',
    element: <PrivacyPolicyPage />,
  },
  {
    path: '/denuncia',
    element: <ReportAbusePage />,
  },
  {
    path: '/verificacao/:uid/:token',
    element: <VerificacaoPage />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CssBaseline />
    <AuthProvider>
      <UploadProvider>
        <SoundProvider>
          <RouterProvider router={router} />
          <UploadNotifications />
        </SoundProvider>
      </UploadProvider>
    </AuthProvider>
  </React.StrictMode>
);
