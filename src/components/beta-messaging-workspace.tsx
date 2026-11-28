"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FormEvent, KeyboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Collaborator = { id: string; display_name: string | null; username: string };
type ConversationRow = {
  id: string;
  direct_user_a: string;
  direct_user_b: string;
  created_at: string;
};
type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  client_message_id: string;
};
type InboxItem = {
  id: string;
  peerId: string;
  name: string;
  username: string;
  preview: string;
  updatedAt: string;
};
type ViewMessage = MessageRow & { mine: boolean };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function formatDay(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}
function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toLocaleUpperCase("pt-BR") || "?";
}

export function BetaMessagingWorkspace() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [myName, setMyName] = useState("Minha conta");
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<ViewMessage[]>([]);
  const [directory, setDirectory] = useState<Collaborator[]>([]);
  const [directorySearch, setDirectorySearch] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [mobileChat, setMobileChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef("");

  const active = inbox.find((item) => item.id === activeId) ?? null;
  const filteredInbox = inbox.filter((item) =>
    (item.name + " " + item.username + " " + item.preview).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))
  );
  const filteredDirectory = directory.filter((person) =>
    (person.display_name ?? person.username).toLocaleLowerCase("pt-BR").includes(directorySearch.toLocaleLowerCase("pt-BR"))
  );

  const loadInbox = useCallback(async (uid: string) => {
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id,direct_user_a,direct_user_b,created_at")
      .or("direct_user_a.eq." + uid + ",direct_user_b.eq." + uid)
      .order("created_at", { ascending: false });

    if (conversationsError) throw conversationsError;
    const rows = (conversations ?? []) as ConversationRow[];
    if (rows.length === 0) {
      setInbox([]);
      return;
    }

    const peerIds = [...new Set(rows.map((row) => row.direct_user_a === uid ? row.direct_user_b : row.direct_user_a))];
    const conversationIds = rows.map((row) => row.id);
    const [profilesResult, messagesResult] = await Promise.all([
      supabase.from("profiles").select("id,display_name,username").in("id", peerIds),
      supabase.from("messages").select("id,conversation_id,sender_id,body,created_at,client_message_id")
        .in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(200),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (messagesResult.error) throw messagesResult.error;

    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const latest = new Map<string, MessageRow>();
    for (const message of (messagesResult.data ?? []) as MessageRow[]) {
      if (!latest.has(message.conversation_id)) latest.set(message.conversation_id, message);
    }
    const items = rows.map((row) => {
      const peerId = row.direct_user_a === uid ? row.direct_user_b : row.direct_user_a;
      const profile = profiles.get(peerId);
      const lastMessage = latest.get(row.id);
      return {
        id: row.id,
        peerId,
        name: profile?.display_name || profile?.username || "Colaborador",
        username: profile?.username || "",
        preview: lastMessage?.body || "Conversa iniciada. Envie a primeira mensagem.",
        updatedAt: lastMessage?.created_at || row.created_at,
      };
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setInbox(items);
  }, [supabase]);

  const loadMessages = useCallback(async (conversationId: string, uid: string) => {
    setMessagesLoading(true);
    const { data, error: queryError } = await supabase.from("messages")
      .select("id,conversation_id,sender_id,body,created_at,client_message_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50);
    setMessagesLoading(false);
    if (queryError) throw queryError;
    const rows = ((data ?? []) as MessageRow[]).reverse();
    setMessages(rows.map((row) => ({ ...row, mine: row.sender_id === uid })));
    setHasOlder(rows.length === 50);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      setLoading(true);
      setError("");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([
        supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle(),
        supabase.from("organization_members").select("organization_id,status").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (profileError || membershipError || !membership || membership.status !== "active") {
        setError("Sua conta não possui vínculo organizacional ativo. Procure a equipe de TI.");
        setLoading(false);
        return;
      }
      setMyName(profile?.display_name || profile?.username || "Minha conta");
      try {
        await loadInbox(user.id);
      } catch {
        if (!cancelled) setError("Não foi possível carregar suas conversas. Verifique sua conexão e tente novamente.");
      }
      if (!cancelled) setLoading(false);
    }
    void initialize();
    return () => { cancelled = true; };
  }, [loadInbox, router, supabase]);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    if (!activeId || !userId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    void loadMessages(activeId, userId).catch(() => {
      if (!cancelled) setError("Não foi possível carregar o histórico desta conversa.");
    });
    return () => { cancelled = true; };
  }, [activeId, loadMessages, userId]);

  useEffect(() => {
    if (!activeId || !userId) return;
    const channel = supabase.channel("messages:" + activeId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "conversation_id=eq." + activeId,
      }, (payload) => {
        const row = payload.new as MessageRow;
        if (row.conversation_id !== activeIdRef.current) return;
        setMessages((current) => current.some((item) => item.id === row.id)
          ? current
          : [...current, { ...row, mine: row.sender_id === userId }]);
        setInbox((current) => current.map((item) => item.id === row.conversation_id
          ? { ...item, preview: row.body, updatedAt: row.created_at }
          : item).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
      })
      .subscribe((status) => {
        setRealtimeStatus(status === "SUBSCRIBED" ? "connected" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "disconnected" : "connecting");
      });

    const recover = () => {
      if (navigator.onLine) {
        void loadMessages(activeId, userId).catch(() => setError("A reconexão ocorreu, mas não foi possível atualizar o histórico."));
        void loadInbox(userId).catch(() => setError("Não foi possível atualizar a lista de conversas."));
      }
    };
    window.addEventListener("online", recover);
    return () => {
      window.removeEventListener("online", recover);
      void supabase.removeChannel(channel);
    };
  }, [activeId, loadInbox, loadMessages, supabase, userId]);

  useEffect(() => {
    if (!modalOpen || !userId) return;
    let cancelled = false;
    async function loadDirectory() {
      setDirectoryLoading(true);
      const { data, error: directoryError } = await supabase.from("profiles")
        .select("id,display_name,username").neq("id", userId).order("display_name", { ascending: true });
      if (cancelled) return;
      if (directoryError) setNotice("Não foi possível carregar o diretório de colaboradores.");
      else setDirectory((data ?? []) as Collaborator[]);
      setDirectoryLoading(false);
    }
    void loadDirectory();
    return () => { cancelled = true; };
  }, [modalOpen, supabase, userId]);

  async function startConversation(person: Collaborator) {
    setError("");
    setNotice("");
    const { data, error: rpcError } = await supabase.rpc("create_direct_conversation", { p_other_user_id: person.id });
    if (rpcError || !data) {
      setNotice("Não foi possível iniciar a conversa. Confirme se os dois colaboradores estão ativos na mesma organização.");
      return;
    }
    const conversationId = data as string;
    await loadInbox(userId);
    setActiveId(conversationId);
    setMobileChat(true);
    setModalOpen(false);
    setDirectorySearch("");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    if (body.length > 4000) {
      setNotice("A mensagem deve ter no máximo 4.000 caracteres.");
      return;
    }
    setSending(true);
    setNotice("");
    const clientMessageId = crypto.randomUUID();
    const { data, error: insertError } = await supabase.from("messages")
      .insert({ conversation_id: activeId, client_message_id: clientMessageId, body })
      .select("id,conversation_id,sender_id,body,created_at,client_message_id")
      .single();
    setSending(false);
    if (insertError || !data) {
      setNotice("Mensagem não enviada. Verifique sua conexão e suas permissões e tente novamente.");
      return;
    }
    const row = data as MessageRow;
    setMessages((current) => current.some((item) => item.id === row.id)
      ? current
      : [...current, { ...row, mine: true }]);
    setInbox((current) => current.map((item) => item.id === activeId
      ? { ...item, preview: row.body, updatedAt: row.created_at }
      : item).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setDraft("");
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || !activeId || olderLoading) return;
    setOlderLoading(true);
    const { data, error: olderError } = await supabase.from("messages")
      .select("id,conversation_id,sender_id,body,created_at,client_message_id")
      .eq("conversation_id", activeId).lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false }).limit(50);
    setOlderLoading(false);
    if (olderError) {
      setNotice("Não foi possível carregar mensagens anteriores.");
      return;
    }
    const rows = ((data ?? []) as MessageRow[]).reverse();
    setMessages((current) => [...rows.map((row) => ({ ...row, mine: row.sender_id === userId })), ...current]);
    setHasOlder(rows.length === 50);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <main className="beta-messaging">
      <aside className="beta-app-nav" aria-label="Navegação principal">
        <Link href="/" className="beta-app-logo" aria-label="BEX, início">B</Link>
        <nav>
          <Link href="/" className="is-current" aria-current="page" title="Conversas"><span>▤</span><small>Conversas</small></Link>
          <Link href="/grupos" title="Grupos"><span>♧</span><small>Grupos</small></Link>
          <Link href="/colaboradores" title="Colaboradores"><span>♙</span><small>Equipe</small></Link>
          <Link href="/departamentos" title="Departamentos"><span>▦</span><small>Setores</small></Link>
          <Link href="/arquivos" title="Arquivos"><span>▥</span><small>Arquivos</small></Link>
        </nav>
        <div className="beta-app-nav-foot"><span className="beta-nav-status" />BETA</div>
      </aside>
      <aside className="beta-sidebar">
        <div className="beta-brand"><span className="beta-brand-mark">B</span><div><strong>BEX</strong><small>Comunicação interna</small></div></div>
        <div className="beta-sidebar-heading"><span>CONVERSAS</span><button type="button" onClick={() => { setModalOpen(true); setNotice(""); }}>＋</button></div>
        <label className="beta-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conversas" /></label>
        <div className="beta-inbox-list">
          {loading && <p className="beta-muted">Carregando suas conversas…</p>}
          {!loading && filteredInbox.length === 0 && <div className="beta-empty-small"><strong>Nenhuma conversa ainda</strong><span>Inicie uma conversa com alguém da organização.</span><button type="button" onClick={() => setModalOpen(true)}>Nova conversa</button></div>}
          {filteredInbox.map((item) => (
            <button type="button" key={item.id} className={"beta-inbox-item" + (activeId === item.id ? " is-active" : "")} onClick={() => { setActiveId(item.id); setMobileChat(true); }}>
              <span className="beta-avatar">{initials(item.name)}</span>
              <span className="beta-inbox-copy"><strong>{item.name}</strong><small>{item.preview}</small></span>
              <time>{formatTime(item.updatedAt)}</time>
            </button>
          ))}
        </div>
        <div className="beta-account"><span className="beta-avatar beta-avatar-self">{initials(myName)}</span><span><strong>{myName}</strong><small>Conta conectada</small></span><button type="button" onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}>Sair</button></div>
      </aside>

      <section className={"beta-chat" + (mobileChat ? " mobile-visible" : "")}>
        {active ? <>
          <header className="beta-chat-header">
            <button type="button" className="beta-back" onClick={() => setMobileChat(false)} aria-label="Voltar para conversas">←</button>
            <span className="beta-avatar">{initials(active.name)}</span>
            <div><strong>{active.name}</strong><small>@{active.username || "colaborador"}</small></div>
            <span className={"beta-live-indicator " + realtimeStatus}>{realtimeStatus === "connected" ? "Conectado" : realtimeStatus === "disconnected" ? "Reconectando…" : "Conectando…"}</span>
          </header>
          <div className="beta-message-area">
            {messagesLoading && <p className="beta-muted beta-center">Carregando histórico…</p>}
            {!messagesLoading && hasOlder && <button type="button" className="beta-load-older" onClick={() => void loadOlder()} disabled={olderLoading}>{olderLoading ? "Carregando…" : "Carregar mensagens anteriores"}</button>}
            {!messagesLoading && messages.length === 0 && <div className="beta-empty-chat"><span>✦</span><h2>Comece a conversa</h2><p>Envie uma mensagem para {active.name}. Ela ficará disponível no histórico desta conversa.</p></div>}
            {messages.map((item, index) => {
              const previous = messages[index - 1];
              const showDay = !previous || new Date(previous.created_at).toDateString() !== new Date(item.created_at).toDateString();
              return <div key={item.id}>{showDay && <div className="beta-day-divider"><span>{formatDay(item.created_at)}</span></div>}<div className={"beta-message-row" + (item.mine ? " mine" : "")}><div className="beta-bubble"><p>{item.body}</p><time>{formatTime(item.created_at)}{item.mine ? " · Enviada" : ""}</time></div></div></div>;
            })}
            <div ref={bottomRef} />
          </div>
          <form className="beta-composer" onSubmit={sendMessage}>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} rows={1} maxLength={4000} placeholder="Escreva uma mensagem… (Enter para enviar)" aria-label="Escreva uma mensagem" />
            <button type="submit" disabled={!draft.trim() || sending}>{sending ? "Enviando…" : "Enviar"}</button>
          </form>
          <p className="beta-composer-hint">Mensagens persistidas · Shift + Enter para quebrar linha</p>
        </> : <div className="beta-welcome"><span>✦</span><h1>Suas conversas, em um só lugar.</h1><p>Selecione uma conversa ou inicie uma nova com alguém da sua organização.</p><button type="button" onClick={() => setModalOpen(true)}>Iniciar conversa</button></div>}
      </section>

      <nav className="beta-mobile-nav" aria-label="Navegação principal">
        <Link href="/" className="is-current" aria-current="page"><span>▤</span><small>Conversas</small></Link>
        <Link href="/grupos"><span>♧</span><small>Grupos</small></Link>
        <Link href="/colaboradores"><span>♙</span><small>Equipe</small></Link>
        <Link href="/departamentos"><span>▦</span><small>Setores</small></Link>
        <Link href="/arquivos"><span>▥</span><small>Arquivos</small></Link>
      </nav>
      {modalOpen && <div className="beta-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <section className="beta-modal" role="dialog" aria-modal="true" aria-labelledby="beta-modal-title">
          <header><div><span>NOVA CONVERSA</span><h2 id="beta-modal-title">Quem você quer chamar?</h2></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Fechar">×</button></header>
          <label className="beta-search"><span>⌕</span><input autoFocus value={directorySearch} onChange={(event) => setDirectorySearch(event.target.value)} placeholder="Buscar colaborador" /></label>
          <div className="beta-directory-list">
            {directoryLoading && <p className="beta-muted">Carregando colaboradores…</p>}
            {!directoryLoading && filteredDirectory.length === 0 && <p className="beta-muted">Nenhum colaborador encontrado.</p>}
            {filteredDirectory.map((person) => <button type="button" key={person.id} onClick={() => void startConversation(person)}><span className="beta-avatar">{initials(person.display_name || person.username)}</span><span><strong>{person.display_name || person.username}</strong><small>@{person.username}</small></span><b>Iniciar →</b></button>)}
          </div>
        </section>
      </div>}
      {(notice || error) && <div className={"beta-notice" + (error ? " is-error" : "")} role="status">{error || notice}<button type="button" onClick={() => { setNotice(""); setError(""); }}>×</button></div>}
    </main>
  );
}
