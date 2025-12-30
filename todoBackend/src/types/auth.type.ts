// Register (Sign up) ka data
export type RegisterRequest = {
    name: string;
    email: string;
    password: string;
}

// Login ka data
export type LoginRequest= {
    email: string;
    password: string;
}
