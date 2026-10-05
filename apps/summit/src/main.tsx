import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import App from "./App";
import "./index.css";

const clerkPubKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_bWFnaWNhbC1vcmlvbGUtNS5jbGVyay5hY2NvdW50cy5kZXYk";
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "hsl(221 83% 53%)",
    borderRadius: "0.75rem",
  },
};

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    afterSignOutUrl="/"
  >
    <App />
  </ClerkProvider>,
);
