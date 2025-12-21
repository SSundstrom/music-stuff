export interface AuthSession {
  user?: {
    id: string;
    accessToken?: string;
    name?: string;
  };
}
