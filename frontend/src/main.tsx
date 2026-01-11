import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App'
import AboutPage from './pages/AboutPage'
import AdminPage from './pages/AdminPage'
import DecodersPage from './pages/DecodersPage'
import DevicesPage from './pages/DevicesPage'
import FilesPage from './pages/FilesPage'
import IntegrationsPage from './pages/IntegrationsPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import StartPage from './pages/StartPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<StartPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="decoders" element={<DecodersPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
