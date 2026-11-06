import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import MonthPage from './pages/MonthPage.jsx';
import MonthsPage from './pages/MonthsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import Placeholder from './pages/Placeholder.jsx';

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
            <Route path="/" element={<Placeholder title="Főoldal" note="A dashboard a következő fázisokban készül." />} />
            <Route path="/honap" element={<MonthPage />} />
            <Route path="/honap/:year/:month" element={<MonthPage />} />
            <Route path="/honapok" element={<MonthsPage />} />
            <Route path="/kategoriak" element={<CategoriesPage />} />
            <Route path="/elorejelzes" element={<Placeholder title="Előrejelzés" note="Fázis 5." />} />
            <Route path="/statisztika" element={<Placeholder title="Statisztika" note="Fázis 4." />} />
            <Route path="/beallitasok" element={<Placeholder title="Beállítások" note="Fázis 6." />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
