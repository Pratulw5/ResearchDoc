export const PROVIDERS = {
    google: {
        label: "Google",
        authUrl: (clientId: string, redirectUri: string) =>
            `https://accounts.google.com/o/oauth2/v2/auth?` +
            new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: "code",
                scope: "openid email profile",
                access_type: "online",
            }),
    },
    github: {
        label: "GitHub",
        authUrl: (clientId: string, redirectUri: string) =>
            `https://github.com/login/oauth/authorize?` +
            new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                scope: "user:email",
            }),
    },
} as const;

export type Provider = keyof typeof PROVIDERS;

export function redirectToProvider(provider: Provider) {
    const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
    const clientId = provider === "google"
        ? import.meta.env.VITE_GOOGLE_CLIENT_ID
        : import.meta.env.VITE_GITHUB_CLIENT_ID;
    window.location.href = PROVIDERS[provider].authUrl(clientId, redirectUri);
}