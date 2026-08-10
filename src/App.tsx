import { Navigate, Route, Routes } from 'react-router-dom';
import { getPartnerToken } from './api/auth';
import { usePortal } from './portalContext';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlansPage } from './pages/PlansPage';
import { DailyPassPage } from './pages/DailyPassPage';
import { StudentsPage } from './pages/StudentsPage';
import { FinancialStatementPage } from './pages/FinancialStatementPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { FinancialForecastPage } from './pages/FinancialForecastPage';
import { PixKeysPage } from './pages/PixKeysPage';
import { ReceptionPage } from './pages/ReceptionPage';
import { ModalitySchedulePage } from './pages/ModalitySchedulePage';
import { UnitsPage } from './pages/UnitsPage';
import { UnitEditPage } from './pages/UnitEditPage';
import { unitEditPath } from './data/unitEditPaths';

function Protected({ children }: { children: React.ReactNode }) {
  const { state, loading } = usePortal();
  if (loading) {
    return (
      <div className="login-shell login-shell-loading">
        <p className="login-loading-text">Carregando portal…</p>
      </div>
    );
  }
  if (!getPartnerToken() || !state.loggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function LegacyRedirect({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

function LegacyUnitCadastroRedirect() {
  const { unit } = usePortal();
  return <Navigate to={unitEditPath(unit.id)} replace />;
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
        <Route path="comercial/agenda" element={<ModalitySchedulePage />} />
        <Route path="comercial/alunos" element={<StudentsPage />} />
        <Route path="unidades" element={<UnitsPage />} />
        <Route path="unidades/:unitId" element={<UnitEditPage />} />
        <Route path="dados-cadastrais" element={<LegacyUnitCadastroRedirect />} />
        <Route path="financeiro/extrato" element={<FinancialStatementPage />} />
        <Route path="financeiro/previsao" element={<FinancialForecastPage />} />
        <Route path="financeiro/chaves-pix" element={<PixKeysPage />} />
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
