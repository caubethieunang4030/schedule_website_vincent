import { useEffect, useRef } from "react";
import {
  useClerk,
  useAuth,
  SignIn,
  SignUp,
} from "@clerk/react";
import {
  Switch,
  Route,
  Redirect,
  Router as WouterRouter,
} from "wouter";
import {
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/Landing";
import AppShell from "@/pages/AppShell";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const clerk = useClerk();

  useEffect(() => {
    if (!clerk?.addListener) return;
    const unsubscribe = clerk.addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [clerk, qc]);

  return null;
}

function HomeRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Authenticating session...</p>
        </div>
      </div>
    );
  }
  if (isSignedIn) {
    return <Redirect to="/app" />;
  }
  return <LandingPage />;
}

function AppArea() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading session...</p>
        </div>
      </div>
    );
  }
  if (isSignedIn === false) {
    return <Redirect to="/" />;
  }
  return <AppShell />;
}

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/app/*" component={AppArea} />
          <Route path="/app" component={AppArea} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function ErrorFallback() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center p-6 text-center bg-background">
      <div className="max-w-md space-y-4 bg-card border rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          An unexpected application error occurred. Your session is still active.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <WouterRouter base={basePath}>
        <AppRoutes />
      </WouterRouter>
    </ErrorBoundary>
  );
}

export default App;
