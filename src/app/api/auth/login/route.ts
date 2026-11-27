import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,39}$/i;
const INTERNAL_AUTH_DOMAIN = "betatest.test";

function response(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return response("Não foi possível entrar. Verifique suas credenciais.", 400);
  }

  if (!payload || typeof payload !== "object") {
    return response("Não foi possível entrar. Verifique suas credenciais.", 400);
  }

  const { username, password } = payload as {
    username?: unknown;
    password?: unknown;
  };

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 128
  ) {
    return response("Não foi possível entrar. Verifique suas credenciais.", 400);
  }

  const normalizedUsername = username.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return response("Não foi possível entrar. Verifique suas credenciais.", 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return response("Serviço de autenticação indisponível.", 503);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: `${normalizedUsername}@${INTERNAL_AUTH_DOMAIN}`,
    password,
  });

  if (error) {
    return response("Não foi possível entrar. Verifique suas credenciais.", 401);
  }

  return NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
