export type AuthFormState = {
  error: string | null;
  message: string | null;
};

export const INITIAL_AUTH_STATE: AuthFormState = {
  error: null,
  message: null,
};
