# Fundação beta — identidade, dispositivos e mensagens

Status: direcionamento aprovado pela PO para orientar a arquitetura do BEX Beta. Documento de desenho; não autoriza migrations, execução SQL, criação de usuários, mudanças no Supabase, deploy ou merge.

## 1. Objetivo e prioridade

O objetivo principal do Beta é entregar comunicação funcional: usuários autenticados conseguem abrir conversas individuais e em grupo, enviar e receber mensagens persistentes, consultar histórico e receber novas mensagens em tempo real.

Ordem de implementação:
1. Identidade/login e autorização de acesso à conta.
2. Conversas individuais e em grupo, com participantes e regras de organização.
3. Mensagens de texto persistidas e histórico.
4. Atualização em tempo real e contadores básicos de não lidas.
5. Depois da fundação: edição/exclusão, reações, respostas encadeadas, recibos detalhados, anexos e demais módulos.

Chamadas de áudio/vídeo, suporte operacional da TI, auditoria central abrangente e rotinas de retenção/expurgo ficam fora da primeira entrega de mensagens. As decisões funcionais anteriores não são apagadas; apenas ficam fora da prioridade desta fase.

## 2. Identidade e regra de usuário

### 2.1 Identificador de login

- O login visível será um identificador corporativo, por exemplo `Matheus.Torres`, acompanhado de senha.
- O identificador é único globalmente no BEX, sem duplicidade entre organizações.
- Comparação e autenticação são case-insensitive: `Matheus.Torres` e `matheus.torres` identificam a mesma conta.
- Guardar uma forma normalizada em minúsculas para unicidade e uma forma de exibição preservando a grafia escolhida.
- Regra inicial sugerida: 3 a 40 caracteres; começar por letra; permitir letras ASCII, números, ponto, sublinhado e hífen; sem espaços, acentos ou caracteres de controle.
- Nome completo/perfil de exibição é campo separado do identificador de login.
- Não haverá auto cadastro no Beta. Contas são provisionadas pela TI.
- A TI define uma senha inicial; Supabase Auth armazena/verifica o hash. A aplicação nunca armazena senha em tabela própria nem permite que administradores consultem a senha existente.
- Recuperação/redefinição continua sendo solicitada à TI, que define uma nova senha por fluxo administrativo seguro.

### 2.2 Pertencimento organizacional

- No Beta, cada conta pertence a exatamente uma organização.
- O mesmo login não pode ter duas memberships ativas nem pertencer simultaneamente a organizações diferentes.
- `organization_members.user_id` permanece globalmente único, coerente com a migration existente.
- A organização é atribuída pela TI durante o provisionamento; o usuário não escolhe nem altera o próprio `organization_id`.
- Status do vínculo: `active` ou `suspended`. Conta suspensa não acessa conversas nem envia/recebe mensagens.
- Mudança de organização é operação administrativa controlada, não criação de uma segunda conta com o mesmo login.
- Suporte multi-organização para a mesma identidade fica fora do Beta e exigirá revisão explícita do modelo.

## 3. Observação técnica sobre username no Supabase Auth

A autenticação por senha nativa do Supabase usa identificador de e-mail ou telefone; não recebe username puro em `signInWithPassword`. Portanto, o formulário pode e deve mostrar `Matheus.Torres`, mas será necessário um adaptador de login server-side.

Desenho recomendado:
1. O cliente envia username e senha para endpoint server-side do BEX.
2. O servidor normaliza o username e resolve a identidade de forma privada.
3. O servidor converte o identificador corporativo para uma identidade técnica de Auth (alias interno não utilizado como e-mail de contato) e executa o fluxo de senha do Supabase Auth.
4. O servidor estabelece a sessão segura no padrão SSR/PKCE já usado pela aplicação.
5. Respostas de falha são genéricas para não revelar se um username existe.

A forma exata do alias interno e o fluxo de provisionamento devem ser validados em uma prova técnica no projeto BEX DEV antes de implementar. Não usar e-mail fictício arbitrário sem validar aceitação pelo Supabase Auth, política de confirmação, unicidade e ausência de envio de e-mails. Não expor service-role/secret key no navegador. Nenhum segredo deve ser colocado em variável `NEXT_PUBLIC_`.

## 4. Modelo de dispositivos — limite de dois por login

### 4.1 Regra funcional

- Cada login pode ter no máximo dois dispositivos cadastrados/ativos no Beta.
- O primeiro dispositivo é registrado e ativado no primeiro acesso autorizado.
- O segundo dispositivo exige solicitação e aprovação explícita da TI antes de acessar o workspace.
- Se a TI negar, o segundo dispositivo não acessa conversas nem dados.
- Um terceiro dispositivo é bloqueado enquanto os dois slots estiverem ocupados. Para cadastrar outro, um dos dispositivos existentes precisa ser revogado/removido pela TI.
- Uma solicitação pendente reserva o segundo slot; não permitir múltiplas solicitações concorrentes para contornar o limite.
- O dispositivo é uma instalação/perfil de navegador confiável, não uma identificação infalível do hardware. Limpar cookies/dados do navegador ou reinstalar pode fazer o acesso parecer um novo dispositivo e exigir nova aprovação.
- A sessão de autenticação deve ficar vinculada ao dispositivo aprovado. Não basta esconder a tela: rotas server-side, operações de banco e canais Realtime precisam rejeitar sessões sem dispositivo ativo/autorizado.

### 4.2 Quem aprova

Proposta de menor privilégio para o Beta: aprovação, rejeição e revogação de dispositivos ficam restritas aos três administradores chefes de TI, com autoridade equivalente. Integrantes de TI com permissões inferiores não aprovam dispositivos por pertencerem à equipe. Essa fronteira é específica do cadastro de dispositivos e não concede acesso ao conteúdo de conversas.

### 4.3 Modelo lógico

**`user_devices`**
- `id` UUID — identidade interna do dispositivo.
- `user_id` — titular da conta.
- `organization_id` — organização do titular, validada no servidor.
- `display_name` — rótulo amigável (ex.: “Celular pessoal”).
- `platform` / `browser_family` — metadados informativos, nunca prova de identidade.
- `device_token_hash` — hash de token aleatório de alta entropia; token original em cookie seguro, HttpOnly, Secure e SameSite adequado.
- `status` — `pending`, `active`, `rejected` ou `revoked`.
- `requested_at`, `approved_at`, `approved_by`, `rejected_at`, `rejected_by`, `revoked_at`, `revoked_by`, `last_seen_at`.

**`device_sessions`**
- `session_id` — identificador da sessão Auth.
- `device_id`, `user_id`, `created_at`, `last_seen_at`, `revoked_at`.
- Uma sessão só pode operar quando estiver vinculada a dispositivo `active), ao titular correto e à organização correta.

### 4.4 Invariantes obrigatórias

- Máximo de dois dispositivos em estado `pending` ou `active` por usuário; a reserva deve ser atômica no banco para impedir corrida entre dois pedidos.
- Somente chefe de TI autorizado pode aprovar/rejeitar/revogar; o servidor deriva sua identidade e papel da sessão autenticada.
- Não permitir autoaprovação nem aprovação por usuário comum.
- Um dispositivo de outro usuário ou organização não pode ser associado por envio de IDs pelo cliente.
- Negação, revogação, suspensão do usuário e perda de vínculo invalidam imediatamente o acesso às operações protegidas.
- Tokens de dispositivo devem ser armazenados apenas como hash no banco e nunca registrados em logs.
- Não confiar em User-Agent, IP ou fingerprint de navegador como fator de autenticação.
- Se dois dispositivos já ocuparem os slots, um novo pedido é recusado até liberação de um slot.

## 5. Modelo lógico para mensagens

O modelo abaixo é conceitual e deve ser refinado em migrations incrementais depois de revisão técnica.

### 5.1 Entidades

| Entidade | Responsabilidade | Campos/regras principais |
|---|---|---|
| `organizations` | Tenant/empresa | `id`, `name`, status |
| `profiles` | Perfil da pessoa | `id = auth.users.id`, `username`, `username_normalized` único, `full_name`, avatar |
| `organization_members` | Vínculo pessoa-organização | `organization_id`, `user_id` único global, role, status |
| `conversations` | Conversa individual ou grupo | `id`, `organization_id`, `type` (`direct`/`group`), título opcional, criador, datas |
| `conversation_members` | Participantes e estado de participação | `conversation_id`, `user_id`, papel de participação, `joined_at`, `left_at`, `last_read_at` |
| `messages` | Mensagens persistentes | `id`, `conversation_id`, `sender_id`, `body`, `created_at`, `updated_at`, `deleted_at` |

### 5.2 Regras relacionais

- Toda conversa pertence a exatamente uma organização.
- Todos os participantes devem ser membros ativos da mesma organização da conversa.
- Uma conversa direta tem exatamente dois participantes ativos e não deve gerar duplicatas para o mesmo par de usuários.
- Uma conversa em grupo tem dois ou mais participantes e pode ter título.
- Só participantes ativos consultam o histórico e recebem eventos Realtime daquela conversa.
- Só participante ativo pode enviar mensagem; `sender_id` é derivado de `auth.uid()`, nunca confiado ao cliente.
- Mensagem sempre pertence a uma conversa; remetente precisa ser participante ativo da mesma conversa e organização.
- Corpo de texto não pode ser vazio após trim.
- Exclusão/saída de participante não deve permitir que IDs manipulados revelem conversas de outro tenant.
- A criação de conversa direta deve ser idempotente para o par de usuários, evitando conversas duplicadas.

### 5.3 Unicidade de conversa direta

A tabela `conversations` pode conter, apenas para `type = 'direct'`, dois campos canônicos de participante (`direct_user_low_id` e `direct_user_high_id`), sempre ordenados, com índice único parcial por organização e par. Os mesmos participantes também constam em `conversation_members`. RPC transacional valida os dois membros ativos e cria/recupera a conversa sem duplicidade.

Alternativamente, uma tabela de chaves de conversas diretas pode garantir a unicidade. A implementação deve escolher uma única estratégia, não manter duas fontes de verdade.

### 5.4 Segurança e RLS

- RLS habilitada em todas as tabelas expostas.
- Leitura de conversas e mensagens somente para membros ativos da conversa e da organização.
- Inserção de mensagem exige usuário autenticado, membership ativa, dispositivo/sessão autorizados e remetente igual a `auth.uid()`.
- Alteração/exclusão só pela regra de propriedade e janela temporal aprovada; implementar os limites de 15 minutos para edição e 5 minutos para exclusão depois da primeira entrega de mensagens.
- Cliente não pode definir organização, remetente, papel ou permissões livremente.
- Operações complexas de criar conversa, adicionar membros e enviar mensagem devem usar transações/RPCs estreitas, com autorização explícita e testes de negação.
- Não usar `user_metadata` como fonte de autorização. Não expor service-role/secret key.
- Verificar exposição da Data API: a partir da mudança efetivada em 30/10/2026, tabelas novas não são automaticamente expostas; conceder somente o acesso necessário e manter RLS. Preferir operações server-side quando o acesso direto não for necessário.

## 6. Mensagens em tempo real

- Persistir a mensagem no Postgres antes de apresentá-la como enviada.
- Após confirmação do insert, atualizar a conversa e distribuir evento aos participantes autorizados.
- Usar Supabase Realtime Postgres Changes inicialmente para novos registros de `messages`, com filtro por conversa e autorização RLS.
- A assinatura deve ser encerrada ao sair da conversa; eventos não podem ser entregues a usuário que não seja membro ativo.
- Ao abrir conversa, carregar histórico paginado do banco; Realtime entrega apenas alterações posteriores.
- Reconexão deve recarregar mensagens desde o último cursor/data confirmada para evitar lacunas.
- Não tratar estado local do React como persistência ou confirmação de envio.
- Indicadores de digitação/presença e recibos detalhados podem ser adicionados depois da entrega confiável do fluxo básico.

## 7. Escopo de entrega

**Primeira entrega funcional (P0)**
- Provisionamento administrativo de conta e login por username + senha.
- Vínculo a uma organização.
- Registro do primeiro dispositivo e aprovação do segundo.
- Criar/abrir conversa direta sem duplicidade.
- Criar grupo e gerir participantes autorizados.
- Enviar/receber mensagem de texto persistida.
- Histórico paginado.
- Atualização Realtime.
- Isolamento entre organizações e conversas por RLS.

**Depois de P0 (P1/P2)**
- Edição em até 15 minutos e exclusão em até 5 minutos.
- Reações emoji.
- Respostas/comentários encadeados.
- Lista detalhada de visualização em grupos.
- Anexos e arquivos.
- Busca, notificações e presença/indicadores de digitação.

**Fora da prioridade desta fase**
- Chamadas de áudio/vídeo e compartilhamento de tela.
- Suporte operacional de TI por atribuições temporárias.
- Auditoria central abrangente.
- Política automatizada de retenção, expurgo e janela de backups.

## 8. Auditoria e retenção durante o Beta

- A implementação da auditoria central abrangente fica adiada até que o fluxo principal de mensagens esteja estável.
- A implementação de política automatizada de retenção, exclusão e expurgo também fica adiada.
- Não criar jobs de exclusão, rotinas de purge ou janelas de retenção nesta fase.
- Não apagar nem reescrever decisões e documentos anteriores sobre auditoria/retenção; mantê-los como histórico e requisitos a revisitar antes de produção.
- Adiar não significa desabilitar controles básicos de segurança, autenticação, RLS, logs técnicos do provedor ou proteção contra acesso indevido.
- Antes de produção, reabrir os temas e definir o conjunto mínimo de auditoria, categorias, prazos, início da contagem e requisitos legais/privacidade.

## 9. Critérios de aceite do P0

1. TI cria uma conta com username único e senha inicial; auto cadastro não existe.
2. Login funciona com username em qualquer combinação de maiúsculas/minúsculas.
3. Username duplicado é recusado globalmente, inclusive entre organizações.
4. Usuário pertence a uma única organização no Beta; usuário suspenso não acessa mensagens.
5. Primeiro dispositivo é registrado no primeiro acesso; segundo fica bloqueado até decisão da TI.
6. Terceiro dispositivo é bloqueado enquanto dois slots estiverem reservados/ativos.
7. Usuário A cria ou abre uma conversa direta com B e não são criadas duas conversas para o mesmo par.
8. Membro autorizado cria grupo e inclui apenas usuários da mesma organização.
9. Mensagem enviada é persistida e aparece após atualizar/reabrir a aplicação.
10. Mensagem nova aparece em tempo real para participantes conectados.
11. Usuário fora da conversa não consegue consultar histórico nem receber eventos.
12. Usuário de outra organização não consegue enumerar ou acessar conversas, membros ou mensagens.
13. Cliente não consegue falsificar `sender_id`, `organization_id` ou membership.
14. Testes negativos cobrem sessão sem dispositivo aprovado, dispositivo revogado, usuário suspenso, membro removido e acesso cross-tenant.

## 10. Gates antes da implementação física

1. Fazer prova técnica do login username + Supabase Auth, sem expor alias interno e sem expor service-role.
2. Revisar o vínculo entre sessão Auth e dispositivo autorizado; não confiar somente em cookie/estado visual.
3. Validar atomicidade do limite de dois dispositivos e concorrência de pedidos.
4. Revisar o modelo de conversa direta e a estratégia anti-duplicidade.
5. Desenhar RLS e testes de isolamento antes de habilitar Data API.
6. Confirmar a configuração de Realtime e publicação para `messages`.
7. Só então preparar migrations incrementais e testes no BEX DEV. Nenhuma migration ou SQL está autorizado por este documento.
