-- Permissões para a API do Supabase (projetos novos não concedem automaticamente).
-- Pode rodar quantas vezes quiser.
grant usage on schema public to anon, authenticated, service_role;

-- Servidor (service_role): acesso total. A segurança fica nas rotas do Next.js.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function public.recompute(uuid, uuid) to service_role;

-- Navegador (anon): só leitura do que é público; as policies de RLS continuam valendo.
grant select on public.planets, public.comets, public.game to anon, authenticated;

-- Tabelas futuras já nascem com a permissão do servidor
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

notify pgrst, 'reload schema';
select 'permissões OK' as status;
