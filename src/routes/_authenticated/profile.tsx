import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const profileFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (data?.profile) setUsername(data.profile.username);
    if (data?.email) setEmail(data.email);
  }, [data]);

  const saveUsername = useMutation({
    mutationFn: () => updateFn({ data: { username } }),
    onSuccess: () => { toast.success("Username updated"); queryClient.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) toast.error(error.message);
    else toast.success("Check your inbox to confirm the new email");
  };

  const updatePassword = async () => {
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPassword(""); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><User className="text-primary" /> Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings.</p>
      </div>

      <section className="glass-card p-6">
        <div className="font-semibold mb-3">Username</div>
        <div className="flex gap-3">
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            className="flex-1 rounded-md bg-input border border-border px-3 py-2 text-sm" />
          <button onClick={() => saveUsername.mutate()} disabled={saveUsername.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Save</button>
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="font-semibold mb-3">Email</div>
        <div className="flex gap-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md bg-input border border-border px-3 py-2 text-sm" />
          <button onClick={updateEmail}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Update</button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">You'll receive a confirmation email to complete the change.</p>
      </section>

      <section className="glass-card p-6">
        <div className="font-semibold mb-3">Change password</div>
        <div className="flex gap-3">
          <input type="password" placeholder="New password (min. 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="flex-1 rounded-md bg-input border border-border px-3 py-2 text-sm" />
          <button onClick={updatePassword}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Update</button>
        </div>
      </section>
    </div>
  );
}
