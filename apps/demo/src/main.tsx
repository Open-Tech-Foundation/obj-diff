import ReactDOM from "react-dom/client";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import App from "./App.tsx";
import "@fontsource/inter";
import "./index.css";
import { ErrorBoundary } from "react-error-boundary";

function RuntimeError() {
  return (
    <div>
      <p style={{ textAlign: "center" }}>
        ⚠️Something went wrong, please reload the page.
      </p>
      <div style={{ textAlign: "center" }}>
        <a href="https://github.com/Open-Tech-Foundation/obj-diff/issues">
          Please click here to report this issue and help us make a better
          library.
        </a>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <CssVarsProvider defaultMode="light">
      {/* must be used under CssVarsProvider */}
      <CssBaseline />

      {/* The rest of your application */}
      <ErrorBoundary fallback={<RuntimeError />}>
        <App />
      </ErrorBoundary>
    </CssVarsProvider>
  </>
);
