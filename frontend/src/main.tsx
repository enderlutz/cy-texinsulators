import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import "./index.css";
import App from "./App";
import JobsPage from "./pages/JobsPage";
import PipelinePage from "./pages/PipelinePage";
import ApplicantPage from "./pages/ApplicantPage";
import ApplyPage from "./pages/ApplyPage";

const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/apply/:id" element={<ApplyPage />} />
          <Route element={<App />}>
            <Route index element={<Navigate to="/pipeline" replace />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/applicants/:id" element={<ApplicantPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
