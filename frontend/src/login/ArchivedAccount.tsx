// ArchivedAccountScreen.tsx
// Drop this alongside LoginPage / App.

const REASON_LABELS: Record<string, string> = {
    subscription_expired: "Subscription Expired",
    subscription_not_renewed: "Subscription Not Renewed",
    subscription_removed: "Subscription Removed",
    security_violation: "Security Violation",
    harmful_content: "Harmful / Abusive Content",
    terms_violation: "Terms of Service Violation",
    fraud: "Fraudulent Activity",
    inactivity: "Extended Inactivity",
    admin_decision: "Administrative Decision",
    other: "Other",
};

export interface ArchiveInfo {
    archive_reason: string;
    archive_message: string;
    archived_at: string | null;
    archived_until: string | null;
}

interface Props {
    info: ArchiveInfo;
    /** Called when the user clicks "Sign out / Try another account" */
    onSignOut: () => void;
}

function fmt(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric", month: "long", day: "numeric",
    });
}

export default function ArchivedAccount({ info, onSignOut }: Props) {
    const reasonLabel = REASON_LABELS[info.archive_reason] ?? info.archive_reason ?? "Administrative Decision";
    const isTemporary = !!info.archived_until;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                    </div>
                </div>

                {/* Heading */}
                <h1 className="text-white text-2xl font-semibold text-center mb-1">
                    Account Suspended
                </h1>
                <p className="text-slate-400 text-sm text-center mb-7">
                    Your access to this workspace has been restricted.
                </p>

                {/* Details card */}
                <div className="bg-slate-900 border border-white/[0.07] rounded-2xl divide-y divide-white/[0.05] mb-5">

                    <Row label="Reason" value={reasonLabel} accent />

                    {info.archive_message ? (
                        <div className="px-5 py-4">
                            <p className="text-xs font-medium text-slate-500 mb-1.5">Message from admin</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{info.archive_message}</p>
                        </div>
                    ) : null}

                    <Row label="Suspended on" value={fmt(info.archived_at)} />

                    {isTemporary ? (
                        <Row
                            label="Access restored"
                            value={fmt(info.archived_until)}
                            note="Your account will be automatically reactivated on this date."
                        />
                    ) : (
                        <Row label="Duration" value="Indefinite" />
                    )}
                </div>

                {/* CTA */}
                <p className="text-slate-500 text-xs text-center mb-5">
                    If you believe this is a mistake, please contact your administrator.
                </p>

                <button
                    onClick={onSignOut}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white text-sm font-medium py-3 rounded-xl transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    Sign out / Try another account
                </button>
            </div>
        </div>
    );
}

function Row({
    label, value, note, accent,
}: {
    label: string; value: string; note?: string; accent?: boolean;
}) {
    return (
        <div className="px-5 py-4 flex items-start justify-between gap-4">
            <p className="text-xs font-medium text-slate-500 flex-shrink-0 mt-0.5">{label}</p>
            <div className="text-right">
                <p className={`text-sm font-medium ${accent ? "text-amber-400" : "text-slate-200"}`}>
                    {value}
                </p>
                {note && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{note}</p>}
            </div>
        </div>
    );
}