import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta BEX.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; reason?: string }>;
};

function getSafeRedirectDestination(next?: string) {
  if (!next?.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  try {
    const destination = new URL(next, "https://bex.invalid");

    if (destination.origin !== "https://bex.invalid") {
      return "/";
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, reason } = await searchParams;
  const destination = getSafeRedirectDestination(next);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <Link className="auth-brand" href="/">
          BEX
        </Link>
        <p className="auth-eyebrow">SEU ESPAÇO DE TRABALHO</p>
        <h1 id="login-title">Bem-vindo de volta</h1>
        <p className="auth-description">
          Entre com seu usuário corporativo e senha para continuar.
        </p>
        {reason === "session-expired" && (
          <p className="auth-notice" role="status">
            Sua sessão expirou por segurança. Entre novamente para continuar.
          </p>
        )}
        {reason === "auth-required" && (
          <p className="auth-notice" role="status">
            Entre na sua conta para acessar o espaço de trabalho.
          </p>
        )}
        <LoginForm redirectTo={destination} />
        <p className="auth-footer">
          <Link href="/">Voltar para a página inicial</Link>
        </p>
      </section>
    </main>
  );
}
