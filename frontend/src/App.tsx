import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Sessions from "./pages/Sessions";
import Users from "./pages/Users";
import Login from "./pages/Login";
import apiClient from "./api/client";

// Lazy-load heavier / less-visited pages
const ServerManagement = lazy(() => import("./pages/ServerManagement"));
const Libraries = lazy(() => import("./pages/Libraries"));
const LibraryDetail = lazy(() => import("./pages/LibraryDetail"));
const UserDetail = lazy(() => import("./pages/UserDetail"));
const Requests = lazy(() => import("./pages/Requests"));
const Graphs = lazy(() => import("./pages/Graphs"));
const Alerts = lazy(() => import("./pages/Alerts"));
const SharingAnalysis = lazy(() => import("./pages/SharingAnalysis"));
const RecentlyAdded = lazy(() => import("./pages/RecentlyAdded"));
const Automation = lazy(() => import("./pages/Automation"));
const GeoMap = lazy(() => import("./pages/GeoMap"));
const Digest = lazy(() => import("./pages/Digest"));
const Insights = lazy(() => import("./pages/Insights"));
const ServerHealth = lazy(() => import("./pages/ServerHealth"));
const Invites = lazy(() => import("./pages/Invites"));
const StripeBilling = lazy(() => import("./pages/StripeBilling"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Settings = lazy(() => import("./pages/Settings"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function BackendWaiting() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white text-2xl font-bold mb-6">
          ML
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">
          MediaLedger
        </h1>
        <p className="text-gray-400 text-lg">
          Waiting for backend to start{dots}
        </p>
        <div className="mt-6 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 text-sm mt-4">
          This usually takes a few seconds on first startup
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      while (!cancelled) {
        try {
          await apiClient.get("/health");
          if (!cancelled) setBackendReady(true);
          return;
        } catch {
          // Backend not ready yet, retry in 2 seconds
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    checkBackend();
    return () => { cancelled = true; };
  }, []);

  if (!backendReady) {
    return <BackendWaiting />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/sessions" element={<ErrorBoundary><Sessions /></ErrorBoundary>} />
        <Route path="/users" element={<ErrorBoundary><Users /></ErrorBoundary>} />
        <Route path="/users/:id" element={<LazyPage><UserDetail /></LazyPage>} />
        <Route path="/graphs" element={<LazyPage><Graphs /></LazyPage>} />
        <Route path="/libraries" element={<LazyPage><Libraries /></LazyPage>} />
        <Route path="/libraries/:id" element={<LazyPage><LibraryDetail /></LazyPage>} />
        <Route path="/requests" element={<LazyPage><Requests /></LazyPage>} />
        <Route path="/alerts" element={<LazyPage><Alerts /></LazyPage>} />
        <Route path="/automation" element={<LazyPage><Automation /></LazyPage>} />
        <Route path="/geo-map" element={<LazyPage><GeoMap /></LazyPage>} />
        <Route path="/sharing" element={<LazyPage><SharingAnalysis /></LazyPage>} />
        <Route path="/recently-added" element={<LazyPage><RecentlyAdded /></LazyPage>} />
        <Route path="/digest" element={<LazyPage><Digest /></LazyPage>} />
        <Route path="/insights" element={<LazyPage><Insights /></LazyPage>} />
        <Route path="/server-health" element={<LazyPage><ServerHealth /></LazyPage>} />
        <Route path="/invites" element={<LazyPage><Invites /></LazyPage>} />
        <Route path="/stripe" element={<LazyPage><StripeBilling /></LazyPage>} />
        <Route path="/audit-log" element={<LazyPage><AuditLog /></LazyPage>} />
        <Route path="/servers" element={<LazyPage><ServerManagement /></LazyPage>} />
        <Route path="/settings" element={<LazyPage><Settings /></LazyPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
