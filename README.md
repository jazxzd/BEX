# CONNEXA3 — reconstrução no repositório BEX

Este repositório contém a reconstrução controlada da base de código do CONNEXA3, originalmente mantida em ymer190/CONNEXA3.

## Objetivo
Preservar a estrutura de aplicação, código, documentação funcional/técnica, migrations e testes que podem ser reaproveitados, mantendo o BEX independente dos serviços e credenciais da origem.

## Stack identificada na origem
- Next.js 15.5.29
- React 19.1.2
- TypeScript 5.8.3
- Supabase JS 2.114.0 e Supabase SSR 0.12.7
- Node.js 22 (versão recomendada para padronização)

## Desenvolvimento
    npm ci
    npm run lint
    npm run typecheck
    npm run build

Configure as variáveis do novo ambiente a partir de .env.example. Não reutilize valores, tokens ou credenciais do projeto anterior.

## Ambientes
A nova implantação deverá ser conectada a um projeto Vercel e a um projeto Supabase novos. Nenhuma conexão com ambientes antigos é presumida ou configurada neste repositório.

## Segurança da migração
- Workflows antigos que executavam migrations contra refs Supabase anteriores foram deliberadamente omitidos.
- supabase/config.toml da origem foi omitido para evitar vínculo acidental com projeto antigo.
- As migrations SQL foram copiadas apenas como artefatos versionados. Não foram executadas.
- As referências históricas em documentos devem ser tratadas como contexto, não como configuração vigente.
- Segredos nunca devem ser commitados.

Consulte docs/migration/RECONSTRUCTION_STATUS.md e docs/product/decisoes-oficiais-po.md.

Origem: snapshot da branch main do repositório ymer190/CONNEXA3, commit fd76de77eb3de50ff5d8c3df95c44dd5cbb5e6b0 (26/11/2026).
