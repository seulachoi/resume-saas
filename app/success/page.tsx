"use client";

import { useEffect, useState } from "react";

const LS_SID_KEY = "resumeup_sid";

export default function SuccessPage() {
  const [sid, setSid] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sidFromQuery = params.get("sid") || "";

    if (sidFromQuery) {
      // ensure sid is stored (in case user opened success page directly)
      localStorage.setItem(LS_SID_KEY, sidFromQuery);
      setSid(sidFromQuery);
    }

    // Redirect back to home with unlocked flag
    // Home page will auto-run FULL and include sid from localStorage
    setTimeout(() => {
      window.location.href = "/?unlocked=1#analyzer";
    }, 700);
  }, []);

  return (
    <main className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Payment received</h1>
      <p className="text-gray-600">
        Thanks! We’re preparing your full resume rewrite now.
      </p>
      <p className="text-sm text-gray-500">
        Session: {sid ? sid : "loading..."}
      </p>
      <p className="text-sm text-gray-500">
        Redirecting you back to results…
      </p>
    </main>
  );
}