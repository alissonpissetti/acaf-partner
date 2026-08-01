import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PortalProvider } from './portalContext';
import './styles/global.css';
import './components/extras.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PortalProvider>
        <App />
      </PortalProvider>
    </BrowserRouter>
  </StrictMode>,
);
