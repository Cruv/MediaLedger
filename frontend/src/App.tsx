import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Sessions from "./pages/Sessions";
import ServerManagement from "./pages/ServerManagement";
import Libraries from "./pages/Libraries";
import LibraryDetail from "./pages/LibraryDetail";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import Requests from "./pages/Requests";
import Graphs from "./pages/Graphs";
import Alerts from "./pages/Alerts";
import SharingAnalysis from "./pages/SharingAnalysis";
import RecentlyAdded from "./pages/RecentlyAdded";
import Automation from "./pages/Automation";
import GeoMap from "./pages/GeoMap";
import Digest from "./pages/Digest";
import Insights from "./pages/Insights";
import ServerHealth from "./pages/ServerHealth";
import Invites from "./pages/Invites";
import StripeBilling from "./pages/StripeBilling";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import apiClient from "./api/client";

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
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/graphs" element={<Graphs />} />
        <Route path="/libraries" element={<Libraries />} />
        <Route path="/libraries/:id" element={<LibraryDetail />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/geo-map" element={<GeoMap />} />
        <Route path="/sharing" element={<SharingAnalysis />} />
        <Route path="/recently-added" element={<RecentlyAdded />} />
        <Route path="/digest" element={<Digest />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/server-health" element={<ServerHealth />} />
        <Route path="/invites" element={<Invites />} />
        <Route path="/stripe" element={<StripeBilling />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/servers" element={<ServerManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
