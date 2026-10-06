import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registrarServiceWorker } from "@/lib/pwa";
import { SessaoProvider } from "@/lib/sessao";
import App from "./App";
import "./styles/globals.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("elemento #root nao encontrado no index.html");
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <SessaoProvider>
        <App />
      </SessaoProvider>
    </BrowserRouter>
  </StrictMode>,
);

registrarServiceWorker();
