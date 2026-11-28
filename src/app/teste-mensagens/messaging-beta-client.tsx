"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import "./messaging-beta.css";

type Profile = { id: string; username: string; display_name: string | null };
type Conversation = { id: string; otherUserId: string; otherName: string; otherUsername: string };
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  client_message_id: string;
};

export default function MessagingBetaClient({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("Conectando ao Supabase…");

  const loadConversations = useCallback(async () => {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .order("username");
    if (profileError) throw profileError;

    const allProfiles = (profileRows ?? []) as Profile[];
    setProfiles(allProfiles);

    const { data: memberships, error: membershipError } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId)
      .is("left_at", null);
    if (membershipError) throw membershipError;

    const ids = [...new Set((memberships ?? []).map((row: { conversation_id: string }) => row.conversation_id))];
    if (ids.length === 0) {
      setConversations([]);
      return;
    }

    const { data: conversationRows, error: conversationError } = await supabase
      .from("conversations")
      .select("id, direct_user_a, direct_user_b")
      .in("id", ids);
    if (conversationError) throw conversationError;

    const profileById = new Map(allProfiles.map((profile) => [profile.id, profile]));
    const mapped = (conversationRows ?? []).flatMap((row: { id: string; direct_user_a: string; direct_user_b: string }) => {
      const otherUserId = row.direct_user_a === userId ? row.direct_user_b : row.direct_user_a;
      const other = profileById.get(otherUserId);
      if (!other) return [];
      return [{
        id: row.id,
        otherUserId,
        otherName: other.display_name || other.username,
        otherUsername: other.username,
      }];
    });
    setConversations(mapped);
    setActiveId((current) => current && mapped.some((item) => item.id === current) ? current : mapped[0]?.id ?? null);
  }, [supabase, userId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadConversations()
      .then(() => { if (!cancelled) setNotice("Conectado ao Supabase. Conversas reais."); })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Não foi possível carregar as conversas.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setMessages([]);
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, client_message_id")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError(queryError.message);
          return;
        }
        setMessages((data ?? []) as Message[]);
      });

    const channel = supabase
      .channel(`bex-messages-${activeId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeId}`,
      }, (payload) => {
        const incoming = payload.new as Message;
        setMessages((current) => current.some((item) => item.id === incoming.id)
          ? current
          : [...current, incoming].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setNotice("Tempo real ativo nesta conversa.");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setNotice("Tempo real indisponível; atualize a página para sincronizar.");
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [activeId, supabase]);

  const activeConversation = conversations.find((item) => item.id === activeId) ?? null;
  const availableColleagues = profiles.filter((profile) => profile.id !== userId);

  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUserId) return;
    setError("");
    const { data, error: rpcError } = await supabase.rpc("create_direct_conversation", {
      p_other_user_id: selectedUserId,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const conversationId = data as string;
    await loadConversations();
    setActiveId(conversationId);
    setNotice("Conversa individual carregada do Supabase.");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeId,
        body,
        client_message_id: crypto.randomUUID(),
      })
      .select("id, conversation_id, sender_id, body, created_at, client_message_id")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      const saved = data as Message;
      setMessages((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]
        .sort((a, b) => a.created_at.localeCompare(b.created_at)));
      setDraft("");
      setNotice("Mensagem gravada no Supabase.");
    }
    setSending(false);
  }

  const formatTime = (value: string) => new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

  return (
    <main className="beta-messages">
      <header className="beta-messages-header">
        <div>
          <p className="beta-eyebrow">BEX · AMBIENTE DE TESTE</p>
          <h1>Mensagens funcionais</h1>
          <p className="beta-subtitle">Conversas individuais conectadas ao Supabase</p>
        </div>
        <span className="beta-connection" aria-live="polite">{notice}</span>
      </header>

      <section className="beta-toolbar">
        <form onSubmit={startConversation} className="beta-new-conversation">
          <label htmlFor="beta-colleague">Iniciar ou abrir conversa com</label>
          <div className="beta-new-row">
            <select id="beta-colleague" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">Selecione um colaborador</option>
              {availableColleagues.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.display_name || profile.username} (@{profile.username})
                </option>
              ))}
            </select>
            <button type="submit" disabled={!selectedUserId}>Abrir conversa</button>
          </div>
        </form>
        <button type="button" className="beta-refresh" onClick={() => {
          setError("");
          void loadConversations().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Falha ao atualizar."));
        }}>Atualizar</button>
      </section>

      {error && <p className="beta-error" role="alert">{error}</p>}

      <div className="beta-messages-layout">
        <aside className="beta-conversation-list" aria-label="Conversas reais">
          <h2>Conversas</h2>
          {loading && <p className="beta-empty">Carregando…</p>}
          {!loading && conversations.length === 0 && <p className="beta-empty">Nenhuma conversa ainda. Selecione um colaborador acima para iniciar.</p>}
          {conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={activeId === conversation.id ? "beta-conversation active" : "beta-conversation"}
              onClick={() => setActiveId(conversation.id)}
            >
              <strong>{conversation.otherName}</strong>
              <span>@{conversation.otherUsername}</span>
            </button>
          ))}
        </aside>

        <section className="beta-chat" aria-label="Mensagens da conversa">
          {activeConversation ? (
            <>
              <header className="beta-chat-header">
                <div><h2>{activeConversation.otherName}</h2><span>@{activeConversation.otherUsername}</span></div>
                <span className="beta-live-dot">Conversa individual</span>
              </header>
              <div className="beta-message-history" aria-live="polite">
                {messages.length === 0 && <p className="beta-empty">Nenhuma mensagem nesta conversa. Envie a primeira!</p>}
                {messages.map((message) => (
                  <article key={message.id} className={message.sender_id === userId ? "beta-message mine" : "beta-message"}>
                    <p>{message.body}</p>
                    <time>{formatTime(message.created_at)}{message.sender_id === userId ? " · você" : ""}</time>
                  </article>
                ))}
              </div>
              <form className="beta-composer" onSubmit={sendMessage}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={2}
                  maxLength={4000}
                  placeholder="Escreva uma mensagem… (Enter para enviar)"
                  aria-label="Escreva uma mensagem"
                />
                <button type="submit" disabled={!draft.trim() || sending}>{sending ? "Enviando…" : "Enviar"}</button>
              </form>
              <p className="beta-hint">Mensagens são persistidas no banco e sincronizadas em tempo real. Não envie dados confidenciais neste teste.</p>
            </>
          ) : (
            <div className="beta-no-chat"><strong>Selecione uma conversa</strong><p>Ou inicie uma nova conversa usando a lista acima.</p></div>
          )}
        </section>
      </div>
    </main>
  );
}
