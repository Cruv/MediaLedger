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
import SharingAnalysis from "./pages/SharingAnalysis";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/libraries" element={<Libraries />} />
        <Route path="/libraries/:id" element={<LibraryDetail />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/sharing" element={<SharingAnalysis />} />
        <Route path="/servers" element={<ServerManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
