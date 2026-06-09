import { useParams, Link } from "wouter";
import { 
  useGetSession, 
  useRegisterForSession, 
  useUnregisterFromSession, 
  useCheckInToSession,
  useGetMe,
  getListSessionsQueryKey,
  getGetMyRegistrationsQueryKey,
  getGetSessionQueryKey,
  useListSessionFeedback,
  useListSessionAttendance,
  useSubmitFeedback,
  getListSessionFeedbackQueryKey,
  getListSessionAttendanceQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";

import { 
  ArrowLeft, Calendar, Clock, MapPin, Users, CheckCircle, 
  Star, Send, UserCheck, AlertTriangle, ScanLine, Smartphone 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const { data: me } = useGetMe();
  const { data: session, isLoading, error } = useGetSession(id || "", { query: { enabled: !!id, queryKey: getGetSessionQueryKey(id || "") } });
  const { data: feedbackData } = useListSessionFeedback(id || "", { query: { enabled: !!id, queryKey: getListSessionFeedbackQueryKey(id || "") } });
  const { data: attendanceData } = useListSessionAttendance(id || "", { query: { enabled: !!id, queryKey: getListSessionAttendanceQueryKey(id || "") } });
  
  const register = useRegisterForSession();
  const unregister = useUnregisterFromSession();
  const checkIn = useCheckInToSession();
  const submitFeedback = useSubmitFeedback();

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [scanning, setScanning] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleRegister = async () => {
    if (!id) return;
    try {
      await register.mutateAsync({ id });
      toast({ title: "Registered successfully" });
      qc.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMyRegistrationsQueryKey() });
    } catch (e: any) {
      if (e.status === 409) {
        toast({ title: "Session is full", description: "Registration is no longer available.", variant: "destructive" });
      } else {
        toast({ title: "Failed to register", description: e.message, variant: "destructive" });
      }
    }
  };

  const handleUnregister = async () => {
    if (!id) return;
    try {
      await unregister.mutateAsync({ id });
      toast({ title: "Unregistered successfully" });
      qc.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMyRegistrationsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to unregister", description: e.message, variant: "destructive" });
    }
  };

  const handleCheckIn = async () => {
    if (!id) return;
    try {
      await checkIn.mutateAsync({ id, data: { method: "room" } });
      toast({ title: "Checked in successfully" });
      qc.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
    } catch (e: any) {
      toast({ title: "Failed to check in", description: e.message, variant: "destructive" });
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await submitFeedback.mutateAsync({ id, data: { rating, comment } });
      toast({ title: "Feedback submitted. Thank you!" });
      setComment("");
      setRating(5);
      qc.invalidateQueries({ queryKey: getListSessionFeedbackQueryKey(id) });
    } catch (e: any) {
      toast({ title: "Failed to submit feedback", description: e.message, variant: "destructive" });
    }
  };

  const startScanner = async () => {
    try {
      setScanning(true);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          html5QrCode.pause();
          try {
            const data = JSON.parse(decodedText);
            if (data.userId) {
              // Custom fetch to the checkin endpoint
              const res = await fetch(`/api/sessions/${id}/checkin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method: "qr", code: data.userId }),
              });
              if (!res.ok) throw new Error("Check-in failed on server");
              toast({ title: "Attendee checked in via QR!" });
            } else {
              throw new Error("Invalid QR code format");
            }
          } catch (e: any) {
            toast({ title: "Invalid QR code", description: e.message, variant: "destructive" });
          } finally {
            setTimeout(() => html5QrCode.resume(), 2000);
          }
        },
        (errorMessage) => {
          // ignore parse errors
        }
      );
    } catch (err) {
      toast({ title: "Camera error", description: "Could not access camera", variant: "destructive" });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
      setScanning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] md:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive opacity-80" />
        <h2 className="text-2xl font-semibold">Session not found</h2>
        <Button asChild variant="outline"><Link href="/app/schedule">Back to schedule</Link></Button>
      </div>
    );
  }

  const isFull = session.registeredCount >= session.capacity;
  const progress = (session.registeredCount / session.capacity) * 100;
  const canScan = me?.role === "faculty" || me?.role === "organizer" || me?.role === "admin";
  const myQrData = JSON.stringify({ sessionId: session.id, userId: me?.id, ts: Date.now() });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4 mb-4 text-muted-foreground">
          <Link href="/app/schedule">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Schedule
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary border-transparent hover:bg-primary/20">
                {session.track.charAt(0).toUpperCase() + session.track.slice(1)} Track
              </Badge>
              {session.mandatory && <Badge variant="destructive">Mandatory</Badge>}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{session.title}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {format(parseISO(session.startsAt), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {format(parseISO(session.startsAt), "h:mm a")} - {format(parseISO(session.endsAt), "h:mm a")}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {session.room} ({session.location})
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 min-w-[200px]">
            {session.isRegistered ? (
              <Button size="lg" variant="secondary" onClick={handleUnregister} disabled={unregister.isPending} className="w-full">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                Registered (Click to cancel)
              </Button>
            ) : (
              <Button size="lg" onClick={handleRegister} disabled={isFull || register.isPending} className="w-full text-base">
                {isFull ? "Session Full" : "Register Now"}
              </Button>
            )}
            
            <div className="space-y-1.5 mt-2 bg-muted/30 p-3 rounded-lg border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Users className="w-4 h-4"/> Capacity</span>
                <span className="font-medium">{session.registeredCount} / {session.capacity}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t">
        <div className="md:col-span-2 space-y-8">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none p-0 h-auto">
              <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Details</TabsTrigger>
              <TabsTrigger value="feedback" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Feedback</TabsTrigger>
              <TabsTrigger value="attendees" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Attendees</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="pt-6 space-y-8">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed text-muted-foreground">{session.description}</p>
              </div>

              {session.speakers && session.speakers.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Speakers</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {session.speakers.map((s, i) => (
                      <Card key={i} className="border-0 shadow-sm bg-muted/30">
                        <CardContent className="p-4 flex items-start gap-4">
                          <Avatar className="w-12 h-12 border bg-primary/10 text-primary">
                            <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{s.name}</p>
                            {s.title && <p className="text-sm text-muted-foreground">{s.title}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="feedback" className="pt-6 space-y-8">
              <Card className="border-0 shadow-sm bg-muted/20">
                <CardHeader>
                  <CardTitle>Leave Feedback</CardTitle>
                  <CardDescription>Tell us what you thought about this session</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star className={`w-8 h-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                        </button>
                      ))}
                    </div>
                    <Textarea 
                      placeholder="What did you learn? How can we improve?" 
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={4}
                      className="resize-none bg-background"
                    />
                    <Button type="submit" disabled={submitFeedback.isPending}>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Feedback
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {feedbackData?.items && feedbackData.items.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    {(feedbackData.averageRating || 0).toFixed(1)} Average ({feedbackData.count} reviews)
                  </h3>
                  <div className="space-y-4">
                    {feedbackData.items.map(fb => (
                      <div key={fb.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{fb.userName || "Anonymous"}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < fb.rating ? "fill-yellow-400 text-yellow-400" : "text-muted/30"}`} />
                            ))}
                          </div>
                        </div>
                        {fb.comment && <p className="text-muted-foreground text-sm">{fb.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No feedback yet. Be the first!</p>
              )}
            </TabsContent>
            
            <TabsContent value="attendees" className="pt-6 space-y-6">
              {attendanceData && attendanceData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {attendanceData.map(att => (
                    <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{att.user?.firstName?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.user?.firstName} {att.user?.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{att.user?.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
                  <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No one has checked in yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-md bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" /> Self Check-in
              </CardTitle>
              <CardDescription>Confirm your attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleCheckIn} disabled={checkIn.isPending} className="w-full" size="lg">
                Check me in (Room)
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or show QR</span></div>
              </div>
              <div className="flex justify-center p-4 bg-white rounded-xl border">
                <QRCodeSVG value={myQrData} size={150} />
              </div>
            </CardContent>
          </Card>

          {canScan && (
            <Card className="border-primary/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-primary" /> Scan Attendees
                </CardTitle>
                <CardDescription>Faculty & Organizer tool</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                {scanning ? (
                  <div className="space-y-4">
                    <div id="qr-reader" className="overflow-hidden rounded-xl border bg-black" />
                    <Button variant="destructive" onClick={stopScanner} className="w-full">Stop Scanning</Button>
                  </div>
                ) : (
                  <>
                    <div className="p-8 border-2 border-dashed rounded-xl bg-muted/10 flex items-center justify-center">
                      <Smartphone className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                    <Button onClick={startScanner} className="w-full">Start Scanner</Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}