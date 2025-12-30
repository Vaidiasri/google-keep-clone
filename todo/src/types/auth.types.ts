export interface User {
    id: number;
    name: string;
    email: string;
    token: string;
    role?: "USER" | "ADMIN";
    mfa_enabled?: boolean;
}
