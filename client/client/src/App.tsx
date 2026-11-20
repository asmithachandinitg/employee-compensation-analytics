
import { useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Compensation from "./pages/Compensation";
import Analytics from "./pages/Analytics";

import GlobalLoadingBar from "./components/GlobalLoadingBar";
import ToastContainer from "./components/ToastContainer";
import { LoadingProvider } from "./context/LoadingContext";
import { ToastProvider } from "./context/ToastContext";

export type Page =
  | "dashboard"
  | "employees"
  | "compensation"
  | "analytics";

function AppContent() {
  const [activePage, setActivePage] = useState<Page>("dashboard");

  return (
    <div className="app">
      <GlobalLoadingBar />
      <ToastContainer />

      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {activePage === "dashboard" && <Dashboard />}
      {activePage === "employees" && <Employees />}
      {activePage === "compensation" && <Compensation />}
      {activePage === "analytics" && <Analytics />}
    </div>
  );
}

function App() {
  return (
    <LoadingProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LoadingProvider>
  );
}

export default App;
