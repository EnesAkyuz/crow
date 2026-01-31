"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Github, Sparkles } from "lucide-react";

export default function LoginPage() {
  const handleGithubLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-sm border border-border/50 bg-card shadow-2xl p-10 space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="aspect-square size-12 bg-black text-white flex items-center justify-center mb-4">
            <Sparkles className="size-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter uppercase">
            Crow Control
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] text-center">
            Multi-tenant Data Ingestion Console
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button
            onClick={handleGithubLogin}
            className="w-full h-12 rounded-none bg-black text-white hover:bg-black/90 space-x-3 uppercase tracking-widest text-[10px] font-bold"
          >
            <Github className="h-4 w-4" />
            <span>Sign In with GitHub</span>
          </Button>

          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-12 rounded-none border-border/50 hover:bg-muted space-x-3 uppercase tracking-widest text-[10px] font-bold"
          >
            <svg
              className="h-4 w-4"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
            <span>Sign In with Google</span>
          </Button>
        </div>

        <div className="pt-8 text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-loose max-w-[200px] mx-auto opacity-50">
            Authorized use only. Session monitoring active.
          </p>
        </div>
      </div>
    </div>
  );
}
