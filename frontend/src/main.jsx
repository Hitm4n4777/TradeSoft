import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Mount TradeSoft once without React StrictMode's extra development checks.
createRoot(document.getElementById("root")).render(<App />);
