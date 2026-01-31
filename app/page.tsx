import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-4xl font-bold">
        Welcome, {profile?.full_name || user.email}
      </h1>
      <pre className="bg-gray-100 p-4 rounded max-w-lg overflow-auto">
        {JSON.stringify(profile, null, 2)}
      </pre>
      <SignOutButton />
    </div>
  );
}
