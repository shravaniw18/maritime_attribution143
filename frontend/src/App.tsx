import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { LiveMonitor } from './pages/LiveMonitor';
import { Cases } from './pages/Cases';
import { SarLibrary } from './pages/SarLibrary';
import { SimulationStudio } from './pages/SimulationStudio';
import { Analytics } from './pages/Analytics';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/investigations" element={<Navigate to="/workspace" replace />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/library" element={<SarLibrary />} />
          <Route path="/simulation" element={<SimulationStudio />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
