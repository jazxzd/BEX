"use client";

import { useState, type FormEvent } from "react";

type LoginFormProps = {
  redirectTo: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setErrorMessage("Não foi possível entrar. Verifique suas credenciais.");
        return;
      }

      // A navegação completa permite que o middleware leia os cookies SSR
      // persistidos pelo Route Handler antes de renderizar a área protegida.
      window.location.assign(redirectTo);
    } catch {
      setErrorMessage(
        "Não foi possível conectar ao serviço de autenticação. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label htmlFor="username">Usuário corporativo</label>
      <input
        id="username"
        name="username"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Lola.beta"
        minLength={3}
        maxLength={40}
        required
      />

      <label htmlFor="password">Senha</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Sua senha"
        required
      />

      {errorMessage ? (
        <p className="auth-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
