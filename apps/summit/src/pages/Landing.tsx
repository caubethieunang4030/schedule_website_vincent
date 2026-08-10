import { SignInButton, SignUpButton } from "@clerk/react";
import { CalendarDays, CheckSquare, FileText, QrCode, Bell } from "lucide-react";
import rabunGapLogo from "@assets/rabun-gap-logo-clear.png";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      <header className="p-6 flex items-center justify-between border-b">
        <div className="flex items-center gap-3 font-semibold text-lg text-foreground">
          <img src={rabunGapLogo} alt="Rabun Gap-Nacoochee School" className="h-10 w-auto" />
        </div>
        <div className="flex items-center gap-4">
          <SignInButton mode="modal">
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</button>
          </SignInButton>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 px-6 text-center max-w-4xl mx-auto space-y-8">
          <img src={rabunGapLogo} alt="Rabun Gap-Nacoochee School" className="mx-auto h-32 md:h-40 w-auto mb-4" />
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            A purposeful event hub for our learning community.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manage your schedule, track your tasks, and connect with faculty and peers during the summit.
          </p>
          <div className="pt-8">
            <SignUpButton mode="modal">
              <button className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Join the Summit
              </button>
            </SignUpButton>
            <p className="mt-4 text-sm text-muted-foreground">Sign in with your school email (.edu or .org)</p>
          </div>
        </section>

        <section className="py-24 bg-muted/50 border-t">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <CalendarDays className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Schedule & Registration</h3>
                <p className="text-muted-foreground">Browse sessions across tracks, register for events, and manage your personal agenda.</p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <CheckSquare className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Task Tracking</h3>
                <p className="text-muted-foreground">Stay on top of assignments, collaborate with peers, and track progress seamlessly.</p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <FileText className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Custom Forms</h3>
                <p className="text-muted-foreground">Create dynamic forms, gather feedback, and analyze responses directly within the platform.</p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <QrCode className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">QR Check-in</h3>
                <p className="text-muted-foreground">Streamlined attendance tracking. Generate your QR code and check into sessions instantly.</p>
              </div>
              <div className="bg-card p-6 rounded-2xl border shadow-sm">
                <Bell className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Live Notifications</h3>
                <p className="text-muted-foreground">Receive real-time updates, emergency alerts, and important announcements during the event.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="p-6 text-center text-sm text-muted-foreground border-t bg-card space-y-1">
        <div>© {new Date().getFullYear()} Gap Summit. All rights reserved.</div>
        <div>Created by Huynh Duy Anh</div>
      </footer>
    </div>
  );
}