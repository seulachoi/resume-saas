"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

export default function ClientActions({
    textToCopy,
    filename = "resumeup-rewritten-resume.txt",
    sid,
    track,
    seniority,
}: {
    textToCopy: string;
    filename?: string;
    sid?: string;
    track?: string;
    seniority?: string;
}) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        trackEvent("view_report", {
            sid: sid ?? null,
            track: track ?? null,
            seniority: seniority ?? null,
        });
    }, [sid, track, seniority]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Fallback for older browsers
            const ta = document.createElement("textarea");
            ta.value = textToCopy;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    const download = () => {
        const blob = new Blob([textToCopy], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <button
                type="button"
                onClick={copy}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
                {copied ? "Copied ✓" : "Copy"}
            </button>

            <button
                type="button"
                onClick={download}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
                Download TXT
            </button>

            <button
                type="button"
                onClick={() => {
                    window.location.href = "/#analyzer";
                }}
                className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/25 hover:brightness-105"
            >
                Analyze again
            </button>
        </div>
    );
}
