import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import MonthPage from './pages/MonthPage.jsx';
import MonthsPage from './pages/MonthsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StatsPage from './pages/StatsPage.jsx';
import ForecastPage from './pages/ForecastPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';

const NAV = [
  { to: '/', label: 'Főoldal', icon: '⌂', end: true },
  { to: '/honap', label: 'Hónap', icon: '▤' },
  { to: '/honapok', label: 'Hónapok', icon: '☷' },
  { to: '/kategoriak', label: 'Kategóriák', icon: '◔' },
  { to: '/elorejelzes', label: 'Előrejelzés', icon: '↗' },
  { to: '/statisztika', label: 'Statisztika', icon: '▥' },
  { to: '/beallitasok', label: 'Beállítások', icon: '⚙' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="shell">
        <nav className="nav" aria-label="Fő navigáció">
          <div className="brand">Költségkövető</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <span className="nav-icon" aria-hidden="true">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="page">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/honap" element={<MonthPage />} />
            <Route path="/honap/:year/:month" element={<MonthPage />} />
            <Route path="/honapok" element={<MonthsPage />} />
            <Route path="/kategoriak" element={<CategoriesPage />} />
            <Route path="/elorejelzes" element={<ForecastPage />} />
            <Route path="/statisztika" element={<StatsPage />} />
            <Route path="/beallitasok" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
