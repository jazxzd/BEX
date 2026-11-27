# BEX Beta — proposta de schema e segurança para mensagens P0

**Status: proposta para revisão da PO. NÃO EXECUTAR.**  
Projeto Supabase alvo: BEX (`nqmwjlulujwwbpnruwyd`).  
Branch de documentação/código: `feature/beta-messaging-p0`.

Este documento propõe o primeiro modelo funcional de conversa direta entre Lola.beta e Zabi.beta. Não altera o banco. A execução depende de aprovação explícita da PO após revisão.

## 1. Estado verificado

- Schema `public`: nenhuma tabela encontrada.
- Histórico de migrations: vazio.
- Publicação `supabase_realtime`: nenhuma tabela do schema `public` está publicada.
- As duas contas Beta esperadas existem no Supabase Auth. Os identificadores internos foram verificados e serão referenciados por lookup de e-mail técnico no seed, sem fixar UUIDs no SQL.
- A tela principal ainda usa conversas/mensagens fictícias em estado React local.
- A rota `/conversas` redireciona para a home.

## 2. Decisões de escopo refletidas

- P0 entrega primeiro **conversa direta** entre colaboradores da mesma organização.
- Mensagens de texto persistidas, histórico paginado e recebimento em tempo real.
- Contas Beta autorizadas podem usar mais de um dispositivo no Preview sem aprovação manual de TI. Essa exceção não elimina autenticação, RLS, autorização de participação ou isolamento organizacional.
- O limite definitivo de dois dispositivos e aprovação pela TI fica para etapa posterior e deve estar concluído antes da produção.
- Grupos, anexos, reações, edição/exclusão, comentários, recibos detalhados e chamadas não entram nesta entrega P0.

## 3. Tabelas propostas

| Tabela | Finalidade |
|---|---|
| `organizations` | Empresa/tenant BEX. |
| `profiles` | Identidade mínima do colaborador: Auth UUID, username e nome de exibição. Não expõe o e-mail técnico do Auth. |
| `organization_members` | Vínculo do usuário à organização e estado active/suspended. Um usuário pertence a uma organização no modelo Beta inicial. |
| `conversations` | Conversa direta e par canônico de usuários para impedir duplicidade. |
| `conversation_members` | Participantes e estado de participação. |
| `messages` | Texto persistente, remetente derivado da sessão e chave de idempotência do cliente. |

## 4. SQL proposto — apenas para revisão

O bloco abaixo é um rascunho de migration. Ainda precisa ser revisado e testado; não deve ser colado/executado no SQL Editor neste momento.

```sql
begin;

create schema if not exists bex_private;
revoke all on schema bex_private from public, anon, authenticated;
grant usage on schema bex_private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username)),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  unique (user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kind text not null default 'direct' check (kind = 'direct'),
  direct_user_a uuid not null references public.profiles(id) on delete restrict,
  direct_user_b uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint conversations_distinct_users check (direct_user_a < direct_user_b),
  constraint conversations_direct_pair_unique unique
    (organization_id, direct_user_a, direct_user_b)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  client_message_id uuid not null,
  body text not null check (
    char_length(body) between 1 and 4000
    and char_length(btrim(body)) > 0
  ),
  created_at timestamptz not null default now(),
  unique (conversation_id, sender_id, client_message_id)
);

create index organization_members_user_status_idx
  on public.organization_members (user_id, status);
create index conversation_members_user_active_idx
  on public.conversation_members (user_id, conversation_id)
  where left_at is null;
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- Helpers privados: SECURITY DEFINER é necessário para consultar memberships
-- sem recursão de RLS. search_path vazio e nomes totalmente qualificados.
create or replace function bex_private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = (select auth.uid())
    and om.status = 'active'
  limit 1
$$;

create or replace function bex_private.is_active_conversation_member(
  p_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.conversation_members cm
      join public.conversations c on c.id = cm.conversation_id
      join public.organization_members om
        on om.organization_id = c.organization_id
       and om.user_id = cm.user_id
       and om.status = 'active'
      where cm.conversation_id = p_conversation_id
        and cm.user_id = (select auth.uid())
        and cm.left_at is null
    )
$$;

revoke all on function bex_private.current_organization_id() from public, anon;
revoke all on function bex_private.is_active_conversation_member(uuid) from public, anon;
grant execute on function bex_private.current_organization_id() to authenticated;
grant execute on function bex_private.is_active_conversation_member(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy organizations_read_own
on public.organizations for select to authenticated
using (id = (select bex_private.current_organization_id()));

create policy profiles_read_same_org
on public.profiles for select to authenticated
using (
  id in (
    select om.user_id
    from public.organization_members om
    where om.organization_id = (select bex_private.current_organization_id())
      and om.status = 'active'
  )
);

create policy organization_members_read_same_org
on public.organization_members for select to authenticated
using (organization_id = (select bex_private.current_organization_id()));

create policy conversations_read_participant
on public.conversations for select to authenticated
using (
  organization_id = (select bex_private.current_organization_id())
  and (select bex_private.is_active_conversation_member(id))
);

create policy conversation_members_read_participant
on public.conversation_members for select to authenticated
using ((select bex_private.is_active_conversation_member(conversation_id)));

create policy messages_read_participant
on public.messages for select to authenticated
using ((select bex_private.is_active_conversation_member(conversation_id)));

create policy messages_insert_as_self
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and (select bex_private.is_active_conversation_member(conversation_id))
);

-- Menor privilégio: sem UPDATE/DELETE de mensagens no P0.
revoke all on public.organizations, public.profiles,
  public.organization_members, public.conversations,
  public.conversation_members, public.messages
from anon, authenticated;

grant select on public.organizations, public.profiles,
  public.organization_members, public.conversations,
  public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;

-- Criação idempotente e validada da conversa direta.
create or replace function public.create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
begin
  if v_user_id is null or p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception 'Invalid conversation participants' using errcode = '42501';
  end if;

  select om.organization_id into v_org_id
  from public.organization_members om
  where om.user_id = v_user_id and om.status = 'active';

  if v_org_id is null then
    raise exception 'Active organization membership required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    join public.profiles p on p.id = om.user_id
    where om.organization_id = v_org_id
      and om.user_id = p_other_user_id
      and om.status = 'active'
  ) then
    raise exception 'Target user is not an active colleague' using errcode = '42501';
  end if;

  v_user_a := least(v_user_id, p_other_user_id);
  v_user_b := greatest(v_user_id, p_other_user_id);

  insert into public.conversations (
    organization_id, kind, direct_user_a, direct_user_b, created_by
  )
  values (v_org_id, 'direct', v_user_a, v_user_b, v_user_id)
  on conflict (organization_id, direct_user_a, direct_user_b) do nothing;

  select c.id into v_conversation_id
  from public.conversations c
  where c.organization_id = v_org_id
    and c.direct_user_a = v_user_a
    and c.direct_user_b = v_user_b;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_user_a), (v_conversation_id, v_user_b)
  on conflict (conversation_id, user_id) do nothing;

  return v_conversation_id;
end;
$$;

revoke all on function public.create_direct_conversation(uuid) from public, anon;
grant execute on function public.create_direct_conversation(uuid) to authenticated;

-- O Realtime só publica mensagens; a leitura continua protegida por RLS.
alter publication supabase_realtime add table public.messages;

commit;
```

## 5. Seed inicial das contas Beta

Após criar as tabelas, o seed deverá:

1. Criar/recuperar a organização `bex-beta`.
2. Localizar as duas contas existentes em `auth.users` pelos e-mails técnicos Beta.
3. Criar os perfis públicos `lola.beta` / `Lola.beta` e `zabi.beta` / `Zabi.beta`.
4. Vincular ambas à mesma organização com status `active`.
5. Interromper com erro claro se uma das duas contas não existir ou já estiver vinculada a outra organização.

Os e-mails técnicos não serão gravados em `profiles` nem exibidos no diretório. Nenhuma senha será lida, copiada ou armazenada pelo BEX.

### SQL de seed Beta proposto — também não executar antes da aprovação

```sql
do $
declare
  v_org_id uuid;
  v_auth_user_count integer;
begin
  select count(*) into v_auth_user_count
  from auth.users
  where lower(email) in (
    'lola.beta@betatest.test',
    'zabi.beta@betatest.test'
  );

  if v_auth_user_count <> 2 then
    raise exception 'Expected exactly two existing Beta Auth users; found %', v_auth_user_count;
  end if;

  insert into public.organizations (slug, name)
  values ('bex-beta', 'BEX Beta')
  on conflict (slug) do nothing;

  select id into v_org_id
  from public.organizations
  where slug = 'bex-beta';

  if exists (
    select 1
    from auth.users u
    join public.organization_members om on om.user_id = u.id
    where lower(u.email) in (
      'lola.beta@betatest.test',
      'zabi.beta@betatest.test'
    )
      and om.organization_id <> v_org_id
  ) then
    raise exception 'A Beta user is already assigned to a different organization';
  end if;

  insert into public.profiles (id, username, display_name)
  select u.id, seed.username, seed.display_name
  from (
    values
      ('lola.beta@betatest.test', 'lola.beta', 'Lola.beta'),
      ('zabi.beta@betatest.test', 'zabi.beta', 'Zabi.beta')
  ) as seed(email, username, display_name)
  join auth.users u on lower(u.email) = seed.email
  on conflict (id) do nothing;

  insert into public.organization_members (organization_id, user_id, status)
  select v_org_id, u.id, 'active'
  from auth.users u
  where lower(u.email) in (
    'lola.beta@betatest.test',
    'zabi.beta@betatest.test'
  )
  on conflict (user_id) do nothing;

  if (
    select count(*)
    from public.organization_members om
    join auth.users u on u.id = om.user_id
    where om.organization_id = v_org_id
      and om.status = 'active'
      and lower(u.email) in (
        'lola.beta@betatest.test',
        'zabi.beta@betatest.test'
      )
  ) <> 2 then
    raise exception 'Could not activate both Beta users in BEX Beta organization';
  end if;
end;
$;
```

## 6. Configuração obrigatória do Data API

Além de RLS e GRANTs, será necessário conferir no painel Supabase se o schema `public` está habilitado em **API Settings → Exposed schemas**. Desde 30/10/2026, novas tabelas em `public` não são automaticamente expostas à Data API. Não presumir que a existência da tabela já a torna acessível pelo client.

## 7. Realtime

- Publicar somente `public.messages` na publicação `supabase_realtime`.
- Assinar eventos INSERT filtrados pela conversa aberta.
- RLS da tabela `messages` limita a entrega a participantes ativos.
- Ao abrir uma conversa, carregar histórico persistido; depois assinar Realtime e reconciliar por `id`/timestamp para não duplicar eventos.
- Ao sair da conversa, remover a assinatura.
- Mensagem só aparece como enviada após confirmação do INSERT; erro deve permanecer explícito.

## 8. Pontos de atenção antes de executar

1. Revisar o SQL em ambiente de revisão e conferir ownership das funções SECURITY DEFINER.
2. Confirmar que a política de username único global permanece válida.
3. Confirmar que os dois usuários Beta não estão vinculados a outra organização.
4. Validar Data API exposure e GRANTs explícitos.
5. Rodar Supabase Security Advisors após a migration.
6. Testar leitura, escrita, criação idempotente e tentativas negadas com duas contas.
7. Só então integrar a interface Next.js e abrir a PR de implementação.

## 9. Limitações conhecidas do login atual

O login usa alias técnico `@betatest.test` no Supabase Auth. O JWT padrão pode conter o claim de e-mail técnico, apesar de a UI não o mostrar. Isso precisa de revisão antes da produção; não será resolvido por esta migration.

**Nenhuma alteração no banco foi feita.** Este documento é uma proposta para a PO revisar e aprovar antes da execução.
