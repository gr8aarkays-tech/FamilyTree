import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { TreeProvider } from './contexts/TreeContext';
import { AppLayout } from './components/AppLayout';
import { InstallBanner } from './components/InstallBanner';

const HomePage       = lazy(() => import('./pages/HomePage'));
const TreesListPage  = lazy(() => import('./pages/TreesListPage'));
const TreeFormPage   = lazy(() => import('./pages/TreeFormPage'));
const TreeViewPage   = lazy(() => import('./pages/TreeViewPage'));
const RemindersPage  = lazy(() => import('./pages/RemindersPage'));
const SettingsPage   = lazy(() => import('./pages/SettingsPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

function AppRoutes() {
  const { settings } = useSettings();

  if (!settings.onboardingComplete) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <OnboardingPage />
      </Suspense>
    );
  }

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/"              element={<HomePage />} />
            <Route path="/trees"         element={<TreesListPage />} />
            <Route path="/trees/new"     element={<TreeFormPage />} />
            <Route path="/trees/:treeId" element={<TreeViewPage />} />
            <Route path="/trees/:treeId/edit" element={<TreeFormPage />} />
            <Route path="/reminders"     element={<RemindersPage />} />
            <Route path="/settings"      element={<SettingsPage />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
      <InstallBanner />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <SettingsProvider>
        <TreeProvider>
          <AppRoutes />
        </TreeProvider>
      </SettingsProvider>
    </HashRouter>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-pulse">🌳</div>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Loading…</p>
      </div>
    </div>
  );
}
