# Prova técnica — login corporativo por username

Status: análise técnica da Issue #3. Documento de planejamento; não implementa autenticação e não autoriza SQL, migrations, criação de usuários, alteração do Supabase, deploy ou merge.

## 1. Resultado da inspeção

A implementação atual ainda usa e-mail no login:

- `src/app/login/login-form.tsx` chama `supabase.auth.signInWithPassword({ email, password })` diretamente no navegador.
- O formulário, rótulos, autocomplete e textos da tela solicitam e-mail.
- `src/lib/supabase/client.ts` cria o cliente browser com a publishable key.
- `src/lib/supabase/server.ts` cria cliente SSR com cookies.
- `src/middleware.ts` usa `auth.getUser()` para verificar a sessão e protege rotas; não resolve username nem verifica membership suspensa.
- Os smoke tests atuais usam `AUTH_TEST_ADMIN_EMAIL` e `AUTH_TEST_USER_EMAIL`; precisam ser adaptados para username quando a prova técnica for aprovada.

Dependências instaladas no branch: Next.js 15.5.29, `@supabase/ssr` 0.12.7 e `@supabase/supabase-js` 2.114.0.

## 2. Compatibilidade nativa do Supabase Auth

A documentação oficial atual descreve password sign-in com e-mail ou telefone. O método `signInWithPassword` não documenta username puro como identificador.

Referências:
- Password-based Auth: https://supabase.com/docs/guides/auth/passwords
- `signInWithPassword`: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- SSR / Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Admin `createUser`: https://supabase.com/docs/reference/javascript/auth-admin-createuser

A API administrativa `auth.admin.createUser` deve ser chamada somente no servidor e aceita identidade por e-mail ou telefone. A service-role/secret key nunca pode chegar ao navegador.

## 3. Desenho candidato para a prova técnica

Fluxo candidato:

1. O formulário apresenta somente username corporativo e senha.
2. O navegador envia username e senha por HTTPS para um Route Handler do Next.js.
3. O servidor normaliza o username com a mesma regra case-insensitive usada no cadastro.
4. O servidor consulta um mapeamento privado e controlado de username para a identidade aceita pelo Supabase Auth. Essa consulta não pode ser feita anonimamente nem expor a tabela ao Data API.
5. O servidor executa a autenticação de senha do Supabase Auth usando a identidade interna resolvida.
6. O Route Handler usa o cliente SSR e seu adaptador de cookies para persistir a sessão conforme o fluxo SSR/PKCE da aplicação.
7. A resposta da aplicação não revela se o username existe nem devolve o identificador interno.
8. Em cada requisição protegida, o servidor valida a identidade e o estado da conta/membership antes de liberar o workspace.

Não implementar consulta de identidade por `auth.admin.listUsers()` em cada login: além de ser uma operação administrativa privilegiada, não é um mecanismo apropriado de resolução de identidade em tempo de autenticação.

## 4. Decisão técnica ainda não fechada: identidade interna

O Supabase Auth exige e-mail ou telefone para password sign-in. Para manter username como identificador visível, será necessário escolher e testar uma estratégia de identidade interna.

Opções para avaliação na prova:

### Opção A — alias de e-mail sintético e estável

Cada username é associado a um endereço sintético único em domínio controlado pelo projeto. A TI cria a conta via Admin API no servidor, com confirmação configurada de acordo com a política aprovada. O login resolve o username para esse alias e usa o password sign-in do Auth.

Verificações obrigatórias antes de aprovar:
- domínio e formato aceitos pelo Auth;
- unicidade e normalização;
- configuração de confirmação e ausência de dependência de envio de e-mail;
- recuperação/troca de senha pelo fluxo exclusivo da TI;
- comportamento de alteração de username;
- exposição do alias em respostas de Auth, objeto User, claims do JWT, cookies, logs e ferramentas do navegador.

### Opção B — identidade interna mapeada em armazenamento privado

Manter um mapeamento privado e único entre `username_normalized`, `auth_user_id` e a identidade Auth. O servidor consulta esse mapeamento com credencial privilegiada exclusivamente no servidor e então autentica no Auth.

Verificações obrigatórias:
- tabela/schema não exposto ao Data API;
- privilégios mínimos e consulta parametrizada;
- não permitir enumeração de usernames;
- criação/atualização de Auth user e mapeamento com tratamento de falha parcial e idempotência;
- nenhum uso da service-role no browser.

As opções podem ser combinadas, mas a prova deve selecionar uma única fonte canônica de associação. Não manter duas fontes de verdade para username.

## 5. Atenção: requisito de não exposição do alias

Não basta omitir o alias da resposta do Route Handler. A identidade Auth pode aparecer em objetos de usuário, claims de JWT, cookies de sessão, logs ou tráfego de rede dependendo do fluxo escolhido.

Portanto, a prova deve inspecionar o que efetivamente chega ao navegador. Se o requisito significar que o alias não pode ser tecnicamente acessível ao navegador nem por claims/cookies, o fluxo SSR padrão com sessão utilizável pelo cliente pode não atender sem uma arquitetura adicional server-only para chamadas autenticadas. Isso teria impacto sobre acesso direto do browser ao Supabase e Realtime.

Até essa verificação, tratar o requisito como pendente. Não declarar que o alias está oculto apenas porque o formulário mostra username.

## 6. Controles de segurança necessários

- Service-role/secret key exclusivamente em ambiente server-side; nunca em variável `NEXT_PUBLIC_*`.
- Resposta genérica para username inexistente, senha incorreta, conta suspensa ou conta não provisionada.
- Rate limit e proteção contra tentativas automatizadas no endpoint de login.
- Normalização única e determinística; username único global e case-insensitive.
- Nenhum auto cadastro.
- Provisionamento e redefinição de senha somente por fluxo administrativo da TI.
- Senha nunca armazenada em tabela da aplicação, logs, metadados ou telemetria.
- Não usar `user_metadata` como fonte de autorização.
- Validar usuário e membership ativa no servidor; a existência de sessão Auth, isoladamente, não prova que a conta continua autorizada.
- Não confiar em `getSession()` ou em dados locais de sessão como prova suficiente de identidade; usar validação server-confirmed conforme a documentação SSR.
- Evitar cache de respostas de autenticação/sessão.

## 7. Plano de prova e testes

A prova só pode ser executada depois de autorização específica para criar uma conta técnica de teste no projeto BEX DEV e realizar as configurações mínimas necessárias. Até lá, somente desenho e revisão documental.

Casos positivos:
1. Username exato + senha correta.
2. Mesmo username com maiúsculas/minúsculas diferentes.
3. Sessão persistida após navegação e atualização de página.
4. Conta provisionada pela TI consegue entrar sem usar e-mail no formulário.

Casos negativos:
1. Username inexistente e senha incorreta retornam resposta indistinguível.
2. Conta suspensa ou sem membership ativa não acessa o workspace.
3. Username duplicado em caixa diferente é recusado no provisionamento.
4. Requisição não autenticada não consulta o mapeamento privado.
5. Nenhum segredo ou alias interno aparece em bundle, resposta, logs ou ferramentas do navegador, conforme o limite de exposição aprovado.
6. Tentativas repetidas sofrem rate limit.
7. Falha entre criação do Auth user e gravação do mapeamento não deixa conta órfã sem procedimento de reconciliação.

## 8. Critério de saída da Issue #3

A Issue #3 só deve ser considerada tecnicamente validada quando:
- uma estratégia de identidade interna tiver sido escolhida;
- o fluxo de login server-side tiver sido testado no BEX DEV com usuário técnico autorizado;
- o comportamento de cookies/SSR e exposição de claims tiver sido inspecionado;
- os testes positivos e negativos forem registrados;
- provisionamento, redefinição e suspensão estiverem cobertos;
- a PO aprovar qualquer ajuste ao requisito de não exposição do alias.

Nenhuma alteração de banco, Auth, secrets, Vercel, deploy ou merge é autorizada por este documento.


## 9. Direcionamento da PO — alias técnico para contas Beta (26/11/2026)

A PO aprovou adotar um alias de e-mail técnico como identidade interna candidata para as contas de teste, preservando o username como único identificador solicitado na interface.

Mapeamento de teste proposto:

| Username | Alias técnico candidato |
|---|---|
| `Lola.beta` | `lola.beta@betatest.test` |
| `Zabi.beta` | `zabi.beta@betatest.test` |

Regras:
- O alias é interno e não deve ser solicitado ao colaborador na tela de login.
- O sufixo `.test` é reservado para testes e não deve ser tratado como domínio de e-mail operacional ou de produção.
- A aceitação do endereço pelo validador do Supabase Auth ainda precisa ser comprovada no projeto BEX DEV.
- Como projetos Supabase hospedados exigem confirmação de e-mail por padrão, a prova deve verificar o provisionamento administrativo com confirmação explícita da identidade técnica, sem depender de entrega de e-mail e sem desabilitar globalmente a confirmação como atalho.
- A implementação deve permanecer server-side para evitar expor credenciais privilegiadas; a prova também deve inspecionar claims, cookies, respostas e tráfego para determinar se o alias fica visível ao navegador.
- Não criar essas contas no painel manualmente. O provisionamento deverá ocorrer por fluxo administrativo seguro, idempotente e controlado pela TI, após a POC.
- Não criar tabela, migration, usuário Auth, secret, configuração de projeto ou deploy nesta etapa documental.

Critério adicional da POC:
1. Confirmar se `lola.beta@betatest.test` e `zabi.beta@betatest.test` são aceitos pelo Supabase Auth.
2. Confirmar que a criação administrativa pode marcar a identidade técnica como confirmada sem envio de e-mail.
3. Validar login com username e senha por endpoint server-side e persistência da sessão no fluxo SSR.
4. Confirmar que o navegador não recebe o alias interno em resposta, claims ou dados acessíveis ao cliente, conforme o requisito aprovado.
5. Somente depois dos testes, provisionar as duas contas Beta e testar mensagens entre dois dispositivos.

Este direcionamento seleciona a Opção A como candidata para a POC, mas não declara a estratégia tecnicamente aprovada antes da execução dos testes.
