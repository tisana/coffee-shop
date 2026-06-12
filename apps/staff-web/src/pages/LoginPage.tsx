import { type FormEvent, useState } from "react";

import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { ApiClientError } from "../services/apiClient";
import { getCurrentSession, login } from "../services/authApi";

interface LoginPageProps {
  onSessionStarted: (staff: StaffUser) => void;
}

export function LoginPage({ onSessionStarted }: LoginPageProps) {
  const [username, setUsername] = useState("barista");
  const [password, setPassword] = useState("barista-pass");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ username, password });
      onSessionStarted(await getCurrentSession());
    } catch (caught) {
      setError(
        caught instanceof ApiClientError || caught instanceof Error
          ? caught.message
          : "Unable to start staff session."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-layout">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Authorized Staff</p>
          <h1>Sign in for service</h1>
        </div>

        <label>
          Username
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label>
          Password
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
