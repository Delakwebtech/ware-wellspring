import { createFileRoute, useNavigate, useRouter, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, ArrowRight } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
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
