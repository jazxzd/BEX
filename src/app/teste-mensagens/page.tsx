import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessagingBetaClient from "./messaging-beta-client";

export const dynamic = "force-dynamic";

export default async function FunctionalMessagesTestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/teste-mensagens");

  return <MessagingBetaClient userId={user.id} />;
}
