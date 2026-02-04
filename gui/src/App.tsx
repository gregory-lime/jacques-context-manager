import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Archive } from './pages/Archive';
import { Context } from './pages/Context';
import { Settings } from './pages/Settings';
import { Sources } from './pages/Sources';
import { GoogleDocsConnect } from './pages/GoogleDocsConnect';
import { NotionConnect } from './pages/NotionConnect';
import { ProjectScopeProvider } from './hooks/useProjectScope.js';
import { OpenSessionsProvider } from './hooks/useOpenSessions';

export function App() {
  return (
    <ProjectScopeProvider>
      <OpenSessionsProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="archive" element={<Archive />} />
            <Route path="context" element={<Context />} />
            <Route path="settings" element={<Settings />} />
            <Route path="sources" element={<Sources />} />
            <Route path="sources/google" element={<GoogleDocsConnect />} />
            <Route path="sources/notion" element={<NotionConnect />} />
            {/* OAuth callbacks (same components handle the callback) */}
            <Route path="oauth/google/callback" element={<GoogleDocsConnect />} />
            <Route path="oauth/notion/callback" element={<NotionConnect />} />
          </Route>
        </Routes>
      </OpenSessionsProvider>
    </ProjectScopeProvider>
  );
}
