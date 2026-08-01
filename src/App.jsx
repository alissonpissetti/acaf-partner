import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PartnerLayout } from './layout/PartnerLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { PlaceholderPage } from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PartnerLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="unit"
            element={
              <PlaceholderPage
                title="Minha unidade"
                description="Perfil público da academia, endereço, modalidades, galeria de fotos e informações exibidas no app."
              />
            }
          />
          <Route
            path="daily-pass"
            element={
              <PlaceholderPage
                title="Diárias"
                description="Preço, modalidades incluídas e regras de venda de diárias pelo ACAF Connect."
              />
            }
          />
          <Route
            path="check-ins"
            element={
              <PlaceholderPage
                title="Check-ins"
                description="Validação de códigos QR, diárias emitidas e presença de membros Connect na unidade."
              />
            }
          />
          <Route
            path="connect"
            element={
              <PlaceholderPage
                title="Planos Connect"
                description="Planos da rede aceitos na unidade, limites de modalidades e adesão corporativa."
              />
            }
          />
          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Configurações"
                description="Usuários da academia, notificações e preferências do portal parceiro."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
