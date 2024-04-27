import ReactDOM from "react-dom/client";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import App from "./App.tsx";
import "@fontsource/inter";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <CssVarsProvider defaultMode="light">
      {/* must be used under CssVarsProvider */}
      <CssBaseline />

      {/* The rest of your application */}
      <App />
    </CssVarsProvider>
  </>
);
