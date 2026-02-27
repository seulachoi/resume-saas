import { supabaseAuthServer } from "@/lib/supabaseServer";

function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    String(raw || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function getAdminUser() {
  const auth = await supabaseAuthServer();
  const { data } = await auth.auth.getUser();
  const user = data.user ?? null;
  const email = String(user?.email || "").toLowerCase();
  const admins = parseAdminEmails(process.env.ADMIN_EMAILS);
  const isAdmin = !!email && admins.has(email);
  return { user, isAdmin };
}

