import { Navigate, Route, Routes } from 'react-router-dom';
import { usePortal } from './portalContext';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EstablishmentPage } from './pages/EstablishmentPage';
import { PlansPage } from './pages/PlansPage';
import { DailyPassPage } from './pages/DailyPassPage';
import { StudentsPage } from './pages/StudentsPage';
import { FinancialStatementPage } from './pages/FinancialStatementPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { ReceptionPage } from './pages/ReceptionPage';
import { UnitsPage } from './pages/UnitsPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { state } = usePortal();
  if (!state.loggedIn) return <Navigate to="/login" replace />;
  return children;
}

function LegacyRedirect({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="check-in" element={<ReceptionPage />} />
        <Route path="comercial/planos" element={<PlansPage />} />
        <Route path="comercial/diarias" element={<DailyPassPage />} />
        <Route path="comercial/alunos" element={<StudentsPage />} />
        <Route path="unidades" element={<UnitsPage />} />
        <Route path="dados-cadastrais" element={<EstablishmentPage />} />
        <Route path="financeiro/extrato" element={<FinancialStatementPage />} />
        <Route path="financeiro/saques" element={<WithdrawalsPage />} />
        <Route path="estabelecimento" element={<LegacyRedirect to="/dados-cadastrais" />} />
        <Route path="planos" element={<LegacyRedirect to="/comercial/planos" />} />
        <Route path="diarias" element={<LegacyRedirect to="/comercial/diarias" />} />
        <Route path="alunos" element={<LegacyRedirect to="/comercial/alunos" />} />
        <Route path="recepcao" element={<LegacyRedirect to="/check-in" />} />
        <Route path="repasses" element={<LegacyRedirect to="/financeiro/extrato" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
