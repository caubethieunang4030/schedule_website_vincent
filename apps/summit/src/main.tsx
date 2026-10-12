import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

const clerkPubKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_bWFnaWNhbC1vcmlvbGUtNS5jbGVyay5hY2NvdW50cy5kZXYk";
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

const clerkAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorScheme: "light",
    colorPrimary: "#1B5E3B",
    colorForeground: "#1A2F23",
    colorBackground: "#FFFFFF",
    colorMutedForeground: "#5C6B63",
    colorInput: "#FFFFFF",
    colorInputForeground: "#1A2F23",
    colorNeutral: "#1A2F23",
    colorDanger: "#B42318",
    borderRadius: "0.75rem",
  },
  elements: {
    cardBox: "bg-white shadow-xl border border-slate-200",
    card: "bg-white text-slate-900",
    headerTitle: "text-slate-900",
    headerSubtitle: "text-slate-600",
    socialButtonsBlockButton:
      "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50",
    formFieldLabel: "text-slate-700",
    formFieldInput: "bg-white text-slate-900 border-slate-300",
    formButtonPrimary: "bg-[#1B5E3B] hover:bg-[#164A30] text-white",
    footer: "bg-white text-slate-600",
    footerActionText: "text-slate-600",
    footerActionLink: "text-[#1B5E3B]",
    identityPreview: "bg-white",
    modalBackdrop: "bg-slate-900/40",
  },
};

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    signInFallbackRedirectUrl={`${basePath}/app`}
    signUpFallbackRedirectUrl={`${basePath}/app`}
    afterSignOutUrl="/"
  >
    <App />
  </ClerkProvider>,
);
