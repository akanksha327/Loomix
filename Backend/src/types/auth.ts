export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN";
};

export type JwtPayload = {
  sub: string;
  sid?: string;
  role: "USER" | "ADMIN";
};
