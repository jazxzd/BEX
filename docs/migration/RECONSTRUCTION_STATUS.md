# Status da reconstrução — BEX

Data do snapshot: 26/11/2026
Repositório de destino: jazxzd/BEX
Branch de trabalho: reconstruction/connexa3-baseline
Origem: ymer190/CONNEXA3, branch main, commit fd76de77eb3de50ff5d8c3df95c44dd5cbb5e6b0.

## Estratégia aplicada
A reconstrução está sendo feita em branch isolada, sem alterar o repositório de origem e sem substituir a branch main do BEX.

## Conteúdo importado
- Estrutura Next.js/React/TypeScript e componentes da aplicação.
- Código de autenticação e clientes Supabase.
- Scripts de smoke test.
- Documentação de arquitetura, requisitos, UX, acessibilidade, identidade e contratos.
- Oito migrations SQL e dois testes SQL, copiados sem execução.
- Manifesto de dependências e lockfile.

## Arquivos deliberadamente não copiados
- .github/workflows/generate-lockfile.yml: fluxo auxiliar da origem, não necessário para a base inicial.
- .github/workflows/supabase-dev.yml e .github/workflows/supabase-production.yml: aplicavam migrations a referências de projetos Supabase antigos.
- supabase/config.toml: configuração vinculada ao ambiente antigo.
- Workflows de origem que continham referências e valores de ambiente antigos foram substituídos por um CI neutro, sem deploy nem aplicação de migrations.

## Cuidados
1. As migrations presentes em supabase/migrations são somente arquivos. Não foram aplicadas a banco algum.
2. Os documentos históricos podem mencionar refs e nomes dos projetos antigos. Não copiar esses valores para secrets ou variáveis da nova Vercel.
3. O projeto Supabase novo ainda precisa ser criado/configurado e ter seu schema validado antes de qualquer execução de migration.
4. A Vercel nova ainda precisa ser conectada ao repositório BEX e receber variáveis próprias.
5. Não foram copiados dados operacionais, usuários, credenciais, secrets, histórico de issues/PRs, nem arquivos binários.
6. A branch main do BEX permanece preservada; a reconstrução ainda requer revisão e validação por PR antes de merge.

## Próximas verificações técnicas
- Confirmar inventário final da branch e ausência de segredos.
- Executar CI no GitHub e corrigir eventuais falhas.
- Revisar dependências, scripts e Node 22.
- Auditar os documentos de arquitetura contra as decisões oficiais da PO.
- Revisar migrations em ordem e reconciliar com o schema do Supabase novo.
- Configurar projeto Vercel novo e projeto Supabase novo, sem reutilizar recursos antigos.
- Abrir PR para revisão técnica antes de integrar em main.

## Limitações do escopo
Esta etapa reconstrói a árvore de arquivos selecionada da branch main; não é uma migração integral de Git. Branches, tags, commits históricos, issues, comentários, PRs, Projects, secrets, dados do banco, buckets e configurações da Vercel não foram replicados.
