"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthTestPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();

    // 현재 세션 확인
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError(error.message);
      }
      setSession(data.session);
      setLoading(false);
    });

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);
      console.log("Session:", session);
      setSession(session);
      setError(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const supabase = supabaseBrowser();
      const redirectUrl = `${window.location.origin}/auth/callback?next=/auth-test`;

      console.log("Redirect URL:", redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setError(error.message);
        console.error("OAuth error:", error);
      } else {
        console.log("OAuth initiated:", data);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 space-y-6">
        <h1 className="text-2xl font-bold">Authentication Test</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {session ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              <strong>✅ Logged In!</strong>
            </div>

            <div className="space-y-2">
              <h2 className="font-semibold">Session Info:</h2>
              <div className="bg-gray-50 p-4 rounded border overflow-auto">
                <pre className="text-xs">
                  {JSON.stringify(
                    {
                      user_id: session.user?.id,
                      email: session.user?.email,
                      provider: session.user?.app_metadata?.provider,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <strong>⚠️ Not logged in</strong>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Sign in with Google
            </button>
          </div>
        )}

        <div className="mt-8 pt-4 border-t">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <div className="text-sm space-y-1 text-gray-600">
            <p>• Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            <p>
              • Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...
            </p>
            <p>• Current URL: {typeof window !== "undefined" ? window.location.href : "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
