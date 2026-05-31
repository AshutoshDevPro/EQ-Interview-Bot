import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import App from "./App";
import "./index.css";

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <Router hook={useHashLocation} base={basePath}>
    <App />
  </Router>,
);
