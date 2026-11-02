import {brand} from "@catch/brand";
import {startErrorReporting} from "@catch/web-config/errorReporting";
import React from "react";
import ReactDOM from "react-dom/client";
import {App} from "./App";
import {installStaleChunkRecovery} from "./app/staleChunkRecovery";
import "./styles.css";

startErrorReporting({
  dsn: "https://c947bf20bcf8ddec0e0ff361c8d6e95a@o4512361461907456.ingest.de.sentry.io/4512361473638480",
  hosts: [new URL(brand.web.adminOrigin).hostname],
});
installStaleChunkRecovery();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
