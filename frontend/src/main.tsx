import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import "./index.css";
import App from "./App";
import JobsPage from "./pages/JobsPage";
import PipelinePage from "./pages/PipelinePage";
import ApplicantPage from "./pages/ApplicantPage";
import ApplyPage from "./pages/ApplyPage";
import SettingsPage from "./pages/SettingsPage";
import FbSetupPage from "./pages/FbSetupPage";

const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <Routes>
          <Route path="/apply/:id" element={<ApplyPage />} />
          <Route element={<App />}>
            <Route index element={<Navigate to="/pipeline" replace />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/applicants/:id" element={<ApplicantPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/setup/facebook" element={<FbSetupPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
