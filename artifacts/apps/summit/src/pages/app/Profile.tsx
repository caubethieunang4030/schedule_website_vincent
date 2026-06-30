import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SignOutButton, useUser } from "@clerk/react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Save, Shield, User as UserIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Role, Track } from "@workspace/api-client-react";

export default function Profile() {
  const { data: me, isLoading } = useGetMe();
  const { user } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const updateMe = useUpdateMe();
  
  const [role, setRole] = useState<Role>("student");
  const [division, setDivision] = useState<Track>("all");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (me) {
      setRole(me.role);
      setDivision(me.division);
    }
  }, [me]);

  const handleSave = async () => {
    try {
      await updateMe.mutateAsync({ data: { role, division } });
      toast({ title: "Profile updated successfully" });
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setIsEditing(false);
    } catch (e: any) {
      toast({ title: "Failed to update profile", description: e.message || "An error occurred", variant: "destructive" });
    }
  };

  if (isLoading || !me || !user) {
    return (
      <div className="space-y-8 max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] md:col-span-2 rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  const initials = `${me.firstName?.[0] || ''}${me.lastName?.[0] || ''}` || me.email[0].toUpperCase();
  const qrData = JSON.stringify({ userId: me.id, name: `${me.firstName} ${me.lastName}` });

  return (
    <div className="space-y-8 pb-10 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-lg">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm bg-card">
            <CardHeader className="border-b bg-muted/20 pb-8">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24 border-4 border-background shadow-md">
                  <AvatarImage src={user.imageUrl} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <CardTitle className="text-3xl">{me.firstName} {me.lastName}</CardTitle>
                  <CardDescription className="text-base">{me.email}</CardDescription>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <Shield className="w-3 h-3 mr-1" />
                      {me.role.charAt(0).toUpperCase() + me.role.slice(1)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      <UserIcon className="w-3 h-3 mr-1" />
                      {me.division.charAt(0).toUpperCase() + me.division.slice(1)} Track
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    {isEditing ? (
                      <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                          <SelectItem value="organizer">Organizer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md border text-foreground">
                        {me.role.charAt(0).toUpperCase() + me.role.slice(1)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="division">Track / Division</Label>
                    {isEditing ? (
                      <Select value={division} onValueChange={(val) => setDivision(val as Track)}>
                        <SelectTrigger id="division">
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lower">Lower</SelectItem>
                          <SelectItem value="middle">Middle</SelectItem>
                          <SelectItem value="upper">Upper</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-md border text-foreground">
                        {me.division.charAt(0).toUpperCase() + me.division.slice(1)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 p-6 flex justify-end gap-3">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setRole(me.role);
                    setDivision(me.division);
                  }}>Cancel</Button>
                  <Button onClick={handleSave} disabled={updateMe.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card className="border-destructive/20 shadow-sm overflow-hidden">
            <div className="bg-destructive/5 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-destructive">Account Actions</h3>
                <p className="text-sm text-destructive/80">Sign out or manage your session.</p>
              </div>
              <SignOutButton>
                <Button variant="destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-sm text-center">
            <CardHeader className="pb-2">
              <CardTitle>Personal QR Code</CardTitle>
              <CardDescription>Present this for quick check-in</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-8 flex flex-col items-center justify-center">
              <div className="bg-white p-6 rounded-2xl shadow-sm border inline-block">
                <QRCodeSVG value={qrData} size={200} level="H" />
              </div>
              <p className="text-sm text-muted-foreground mt-6 max-w-[200px]">
                Faculty and organizers can scan this code to mark your attendance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}