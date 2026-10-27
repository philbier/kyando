"use server";

// Server Action: this function runs on the server, but the login form can call
// it directly (no API route needed). The password never touches client code.

export type LoginState = {
  failed?: boolean;
  email?: string; // sent back so the field keeps its value after an error
};

// Sign-in isn't connected yet: every attempt fails with a generic error.
// TODO: check the credentials with Supabase Auth and redirect to /heute.
export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  return { failed: true, email };
}
