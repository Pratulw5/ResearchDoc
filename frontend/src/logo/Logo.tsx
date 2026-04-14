export function LogoIcon({ size = 36 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0f6e56" />
                    <stop offset="100%" stopColor="#185fa5" />
                </linearGradient>
            </defs>
            <rect width="36" height="36" rx="9" fill="url(#logoGrad)" />
            {/* Book pages */}
            <rect x="7" y="10" width="10" height="16" rx="1.5" fill="rgba(255,255,255,0.18)" />
            <rect x="9" y="10" width="10" height="16" rx="1.5" fill="rgba(255,255,255,0.28)" />
            {/* R letterform */}
            <path d="M11 13h6a3 3 0 0 1 0 6h-6V13zm0 6h4l3 4h-3l-3-4z" fill="white" />
            {/* Neural node dots (gold) */}
            <circle cx="24" cy="12" r="1.8" fill="#d4950a" />
            <circle cx="29" cy="16" r="1.5" fill="#d4950a" />
            <circle cx="27" cy="22" r="1.8" fill="#d4950a" />
            <circle cx="22" cy="25" r="1.4" fill="#d4950a" />
            {/* Neural connecting lines */}
            <line x1="24" y1="12" x2="29" y2="16" stroke="#d4950a" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="29" y1="16" x2="27" y2="22" stroke="#d4950a" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="27" y1="22" x2="22" y2="25" stroke="#d4950a" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="24" y1="12" x2="27" y2="22" stroke="#d4950a" strokeWidth="0.8" strokeOpacity="0.5" />
        </svg>
    );
}

export function LogoFull({ className = "" }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <LogoIcon size={36} />
            <div>
                <p className="text-white font-semibold text-sm leading-none tracking-tight">
                    <span className="text-teal-400">Research</span><span className="text-sky-400">Doc</span>
                </p>
                <p className="text-slate-500 text-[10px] mt-0.5 tracking-wide uppercase">AI Research Manager</p>
            </div>
        </div>
    );
}