alter table public.profiles
  add column if not exists avatar_path text;

grant select (avatar_path) on public.profiles to authenticated;
grant update (avatar_path) on public.profiles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own_avatar'
  ) then
    create policy profiles_update_own_avatar
      on public.profiles
      for update
      to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_read_same_org'
  ) then
    create policy profile_avatars_read_same_org
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] in (
          select om.user_id::text
          from public.organization_members om
          where om.organization_id = (select bex_private.current_organization_id())
            and om.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_upload_own'
  ) then
    create policy profile_avatars_upload_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
          select 1 from public.organization_members om
          where om.user_id = (select auth.uid())
            and om.organization_id = (select bex_private.current_organization_id())
            and om.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_delete_own'
  ) then
    create policy profile_avatars_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'profile-avatars'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end
$$;
