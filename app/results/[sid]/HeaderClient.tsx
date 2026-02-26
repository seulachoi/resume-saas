"use client";

import { useEffect, useState } from "react";

type AuthMeResponse = {
  user: { id: string; email: string | null } | null;
};
type CreditsResponse = {
  balance: number;
};

export default function HeaderClient({
  initialSignedIn,
  initialBalance,
}: {
  initialSignedIn: boolean;
  initialBalance: number | null;
}) {
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [balance, setBalance] = useState<number | null>(initialBalance);

  useEffect(() => {
    setSignedIn(initialSignedIn);
    setBalance(initialBalance);
  }, [initialSignedIn, initialBalance]);

  useEffect(() => {
    const sync = async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const me: AuthMeResponse = await meRes.json();
        if (!meRes.ok || !me.user?.id) {
          setSignedIn(false);
          setBalance(null);
          return;
        }
        setSignedIn(true);
        const crRes = await fetch("/api/auth/credits", { cache: "no-store" });
        const cr: CreditsResponse = await crRes.json();
        if (crRes.ok) setBalance(Number(cr.balance ?? 0));
      } catch { }
    };
    sync();
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href="/my-reports"
        className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
      >
        My Reports
      </a>

      {signedIn ? (
        <>
          {balance !== null && (
            <a
              href="/my-reports"
              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold border bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
            >
              Credits
              <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-white px-2 text-slate-900 border border-slate-200">
                {balance}
              </span>
              <span className="text-xs underline underline-offset-2">Top up</span>
            </a>
          )}
          <a
            href="/auth/logout?next=/"
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            Sign out
          </a>
        </>
      ) : (
        <a
          href="/"
          className="text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
        >
          Sign in
        </a>
      )}
    </div>
  );
}
