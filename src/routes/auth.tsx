import { createFileRoute, useNavigate, useRouter, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, ArrowRight } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Sign in · Stockly" }, { name: "description", content: "Sign in or create your Stockly account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect: redirectTo } = Route.useSearch();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: redirectTo ?? "/dashboard" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, store_name: storeName },
          },
        });
        if (error) throw error;
        toast.success("Account created — signing you in");
      }
      router.invalidate();
    } catch (err) {
      toast.error((err as Error).message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex relative bg-gradient-brand text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-gradient-hero" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-background/15 backdrop-blur grid place-items-center"><Boxes className="h-5 w-5" /></div>
          <span className="font-display text-xl font-bold">Stockly</span>
        </Link>
        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-tight">Run a tighter store.</h1>
          <p className="mt-3 text-primary-foreground/90 text-lg">Inventory, sales, damages, credit, reporting — across every branch.</p>
          <ul className="mt-8 space-y-2 text-primary-foreground/90 text-sm">
            <li>✓ Multi-branch inventory & sales</li>
            <li>✓ 10 reporting modules</li>
            <li>✓ One-click CSV & Excel export</li>
            <li>✓ Role-based access control</li>
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/70">© {new Date().getFullYear()} Stockly</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-gradient-brand grid place-items-center"><Boxes className="h-4 w-4 text-primary-foreground" /></div>
            <span className="font-display text-lg font-bold">Stockly</span>
          </Link>
          <h2 className="font-display text-3xl font-bold">{mode === "signin" ? "Welcome back" : "Create your store"}</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            {mode === "signin" ? "Sign in to your Stockly account" : "Your first sign-up creates your store and makes you superadmin."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="fullName">Your name</Label>
                  <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Adesina" />
                </div>
                <div>
                  <Label htmlFor="storeName">Store name</Label>
                  <Input id="storeName" required value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Jane's Mart" />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@store.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                if (res.error) throw res.error;
              } catch (err) {
                toast.error((err as Error).message || "Google sign-in failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 7.1 29.5 5 24 5 16.3 5 9.7 9.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.4-4.6 2.3-7.4 2.3-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C9.5 39.4 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3c-.4.4 6.7-4.9 6.7-15-.1-1.3-.2-2.4-.4-3.5z"/></svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-primary hover:underline">
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
