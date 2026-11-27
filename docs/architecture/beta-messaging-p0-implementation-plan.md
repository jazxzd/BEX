# BEX Beta — plano de implementação de mensagens P0

Status: plano atualizado na branch `feature/beta-messaging-p0`. A regra de dispositivos foi formalmente adiada para uma etapa posterior do Beta/produção. A proposta de schema e RLS está em `docs/architecture/beta-messaging-p0-schema-review.md` e aguarda aprovação da PO. Este documento não executa SQL, não altera o Supabase e não autoriza merge ou deploy.

## 1. Diagnóstico confirmado

- A rota principal `src/app/page.tsx` mantém conversas e mensagens em estado React local.
- O envio atual apenas adiciona a mensagem ao estado do navegador e exibe o aviso "Mensagem adicionada apenas ao protótipo. Ela não foi enviada.".
- A criação de conversa também é local e recebe um nome digitado; não consulta um diretório real de usuários.
- A rota `/conversas` redireciona para `/`.
- O projeto Supabase BEX consultado não possui tabelas no schema `public` nem migrations registradas.
- Portanto, a tela atual é um protótipo visual, não um chat conectado ao banco.

## 2. Decisão de escopo Beta — dispositivos

A PO aprovou adiar temporariamente a implementação do fluxo de aprovação de dispositivos para priorizar a entrega do chat funcional.

- Durante o Beta, as contas de teste autorizadas (inicialmente Lola.beta e Zabi.beta) poderão acessar o Preview em mais de um dispositivo sem aguardar aprovação manual da TI.
- Esta exceção é restrita ao ambiente Beta/Preview e às contas explicitamente autorizadas para teste; não representa liberação geral para usuários reais nem deve ser levada à produção.
- O controle definitivo permanece como requisito: máximo de dois dispositivos por login; primeiro dispositivo registrado no primeiro acesso; segundo sujeito à aprovação explícita da TI; revogação pela equipe autorizada para liberar vaga.
- A governança de aprovação/revogação pela TI será definida e implementada em etapa própria, antes da produção.
- A exceção Beta não elimina autenticação, autorização por organização, participação em conversa, RLS, proteção de sessão ou isolamento entre usuários/tenants.

## 3. Escopo desta entrega P0

1. Diretório de colaboradores reais da mesma organização.
2. Criar ou recuperar conversa direta idempotente para o par de usuários.
3. Carregar histórico paginado.
4. Enviar mensagem de texto persistida.
5. Receber mensagens novas em tempo real.
6. Atualizar lista de conversas e preview após persistência.
7. Estados de carregamento, vazio, erro e reconexão.
8. Testes positivos e negativos para isolamento de conversas e organizações.
9. Teste cruzado com Lola.beta e Zabi.beta em dois dispositivos/sessões.

Edição, exclusão, reações, respostas encadeadas, anexos, recibos detalhados, chamadas e expurgo automatizado ficam fora desta entrega P0, conforme priorização aprovada.

## 4. Modelo de dados proposto para revisão

- `organizations`: tenant/empresa.
- `profiles`: identidade pública mínima do colaborador, vinculada a `auth.users.id`, username normalizado único e nome de exibição.
- `organization_members`: vínculo único do usuário à organização no Beta, com status `active`/`suspended`.
- `conversations`: conversa `direct` ou `group`, sempre vinculada a uma organização; chave canônica para impedir duplicidade de conversa direta.
- `conversation_members`: participantes, papel de participação, entrada/saída e cursor de leitura.
- `messages`: conteúdo textual, conversa, remetente derivado de `auth.uid()`, timestamps e estado de exclusão futura.

A criação/recuperação de conversa direta deve ser transacional e idempotente. A organização e o remetente nunca podem ser confiados ao payload enviado pelo navegador.

## 5. Segurança obrigatória

- RLS habilitada em todas as tabelas expostas.
- Leitura de conversa/mensagem somente para participante ativo da mesma organização.
- Inserção somente quando o usuário autenticado é participante ativo e membro ativo da organização.
- `sender_id` definido no banco a partir de `auth.uid()`; cliente não escolhe remetente ou organização.
- Sem policies genéricas que concedam acesso a qualquer usuário autenticado.
- Sem service-role/secret key no navegador.
- Testes de negação para usuário externo, organização diferente, membro removido e usuário suspenso.
- Realtime só pode entregar eventos aos participantes autorizados; revisar autorização e configuração do canal/publicação antes de habilitar.
- O fluxo de dispositivos não será pré-requisito para os testes Beta, mas sua ausência deve ser tratada como exceção temporária e não como controle de segurança substituído.

## 6. Pendência de sessão/autenticação

O fluxo atual usa o alias técnico `@betatest.test` no Supabase Auth. Embora ele não apareça no formulário nem na resposta HTTP do login, a sessão JWT padrão pode conter o claim de e-mail. A arquitetura precisa revisar como impedir exposição técnica desse alias antes de produção. Essa pendência não autoriza expor secrets nem enfraquecer as políticas de acesso do banco.

## 7. Plano de execução

1. Revisar o modelo de dados e as políticas RLS para o escopo Beta.
2. Preparar migrations incrementais e testes automatizados; apresentar o SQL para aprovação da PO.
3. Somente após aprovação explícita, aplicar migrations no projeto Supabase BEX.
4. Implementar API/consultas e interface real no Next.js.
5. Habilitar e validar Realtime com duas sessões de teste (Lola.beta e Zabi.beta), incluindo dispositivos diferentes.
6. Executar CI e validar o Preview Vercel.
7. Em etapa posterior, implementar o fluxo definitivo de dispositivos (limite de dois, aprovação e revogação pela TI) e revisar sessão/autenticação para produção.
8. Não fazer merge nem deploy de produção sem aprovação explícita.

## 8. Critérios de aceite do teste Lola.beta ↔ Zabi.beta

- Lola inicia uma conversa com Zabi e envia texto.
- Zabi recebe a mensagem sem atualizar a página, inclusive em outro dispositivo.
- Ambos veem a mesma mensagem após refresh e novo login.
- Falhas de persistência são mostradas como falha, nunca como envio confirmado.
- Um terceiro usuário ou usuário de outra organização não consegue consultar a conversa nem receber seus eventos.
- As mensagens não dependem de estado local do React para persistir.
- O teste Beta em múltiplos dispositivos não é confundido com aprovação do requisito definitivo de dispositivos.
