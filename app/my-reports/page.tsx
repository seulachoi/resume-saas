// app/my-reports/page.tsx
import { supabaseAuthServer, supabaseServer } from "@/lib/supabaseServer";
import MyReportsClient from "./MyReportsClient";

type CheckoutRow = {
  id: string;
  created_at: string;
  ats_before: number | null;
  ats_after: number | null;
  report_title: string | null;
  target_track: string | null;
  target_seniority: string | null;
  resume_text: string | null;
  jd_text: string | null;
  status: string | null;
};

export default async function MyReportsPage() {
  // 1) ✅ Auth (SSR cookie) — identify user securely on server
  const auth = await supabaseAuthServer();
  const { data: uData } = await auth.auth.getUser();
  const user = uData.user ?? null;

  // 2) If not signed in, render a minimal page (client button handles OAuth)
  if (!user) {
    return <MyReportsClient signedIn={false} email={null} credits={0} rows={[]} />;
  }

  // 3) ✅ DB access (service role) — server only
  const db = supabaseServer();

  // credits
  const { data: creditRow } = await db
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  const credits = Number(creditRow?.balance ?? 0);

  // reports (only completed)
  const { data: rowsRaw } = await db
    .from("checkout_sessions")
    .select(
      "id,status,created_at,ats_before,ats_after,report_title,target_track,target_seniority,resume_text,jd_text"
    )
    .eq("user_id", user.id)
    .eq("status", "fulfilled")
    .order("created_at", { ascending: false });

  const rows = (rowsRaw ?? []) as CheckoutRow[];

  return (
    <MyReportsClient
      signedIn={true}
      email={user.email ?? null}
      credits={credits}
      rows={rows}
    />
  );
}