# BEX Beta — plano de implementação de mensagens P0

Status: proposta técnica preparada na branch `feature/beta-messaging-p0`. Não executa SQL, não cria/edita tabelas no Supabase e não autoriza merge ou deploy.

## 1. Diagnóstico confirmado

- A rota principal `src/app/page.tsx` mantém conversas e mensagens em estado React local.
- O envio atual apenas adiciona a mensagem ao estado do navegador e exibe o aviso "Mensagem adicionada apenas ao protótipo. Ela não foi enviada.".
- A criação de conversa também é local e recebe um nome digitado; não consulta um diretório real de usuários.
- A rota `/conversas` redireciona para `/`.
- O projeto Supabase BEX consultado não possui tabelas no schema `public` nem migrations registradas.
- Portanto, a tela atual é um protótipo visual, não um chat conectado ao banco.

## 2. Escopo desta entrega

1. Diretório de colaboradores reais da mesma organização.
2. Criar ou recuperar conversa direta idempotente para o par de usuários.
3. Carregar histórico paginado.
4. Enviar mensagem de texto persistida.
5. Receber mensagens novas em tempo real.
6. Atualizar lista de conversas e preview após persistência.
7. Estados de carregamento, vazio, erro e reconexão.
8. Testes positivos e negativos para isolamento de conversas e organizações.

Edição, exclusão, reações, respostas encadeadas, anexos, recibos detalhados, chamadas e expurgo automatizado ficam fora desta entrega P0, conforme priorização aprovada.

## 3. Modelo de dados proposto para revisão

- `organizations`: tenant/empresa.
- `profiles`: identidade pública mínima do colaborador, vinculada a `auth.users.id`, username normalizado único e nome de exibição.
- `organization_members`: vínculo único do usuário à organização no Beta, com status `active`/`suspended`.
- `conversations`: conversa `direct` ou `group`, sempre vinculada a uma organização; chave canônica para impedir duplicidade de conversa direta.
- `conversation_members`: participantes, papel de participação, entrada/saída e cursor de leitura.
- `messages`: conteúdo textual, conversa, remetente derivado de `auth.uid()`, timestamps e estado de exclusão futura.

A criação/recuperação de conversa direta deve ser transacional e idempotente. A organização e o remetente nunca podem ser confiados ao payload enviado pelo navegador.

## 4. Segurança obrigatória

- RLS habilitada em todas as tabelas expostas.
- Leitura de conversa/mensagem somente para participante ativo da mesma organização.
- Inserção somente quando o usuário autenticado é participante ativo e membro ativo da organização.
- `sender_id` definido no banco a partir de `auth.uid()`; cliente não escolhe remetente ou organização.
- Sem policies genéricas que concedam acesso a qualquer usuário autenticado.
- Sem service-role/secret key no navegador.
- Testes de negação para usuário externo, organização diferente, membro removido e usuário suspenso.
- Realtime só pode entregar eventos aos participantes autorizados; revisar autorização e configuração do canal/publicação antes de habilitar.

## 5. Bloqueios que impedem ativar o chat no Supabase agora

O desenho aprovado do BEX exige limite de dois dispositivos por login e aprovação explícita do segundo. O repositório ainda não demonstra enforcement completo desse vínculo entre sessão Auth, dispositivo autorizado, rotas e operações do banco. Não podemos simplesmente liberar acesso às tabelas de mensagens para qualquer sessão Auth sem contornar uma regra de segurança aprovada.

Também permanece pendente a revisão da sessão de login: o fluxo atual usa o alias técnico `@betatest.test` no Supabase Auth. Embora ele não apareça no formulário nem na resposta HTTP do login, a sessão JWT padrão pode conter o claim de e-mail. A arquitetura precisa decidir como impedir exposição técnica desse alias antes de produção.

## 6. Plano de execução

1. Revisar e aprovar o modelo de dados e as políticas RLS.
2. Definir/implementar enforcement de dispositivo aprovado no servidor e nas operações de dados.
3. Preparar migrations incrementais e testes automatizados; apresentar o SQL para aprovação da PO.
4. Somente após aprovação explícita, aplicar migrations no projeto Supabase BEX DEV.
5. Implementar API/consultas e interface real no Next.js.
6. Habilitar e validar Realtime com duas sessões de teste (Lola.beta e Zabi.beta).
7. Executar CI e validar o Preview Vercel.
8. Não fazer merge nem deploy de produção sem aprovação explícita.

## 7. Critérios de aceite do teste Lola.beta ↔ Zabi.beta

- Lola inicia uma conversa com Zabi e envia texto.
- Zabi recebe a mensagem sem atualizar a página.
- Ambos veem a mesma mensagem após refresh e novo login.
- Falhas de persistência são mostradas como falha, nunca como envio confirmado.
- Um terceiro usuário ou usuário de outra organização não consegue consultar a conversa nem receber seus eventos.
- As mensagens não dependem de estado local do React para persistir.
