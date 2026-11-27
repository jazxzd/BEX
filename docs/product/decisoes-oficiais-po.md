# Decisões oficiais da PO — CONNEXA3

Este documento consolida decisões funcionais aprovadas pela Product Owner. Quando houver conflito com documentos técnicos antigos, estas decisões são o direcionamento de produto, sujeitas à decomposição em requisitos e validação técnica.

## Produto e experiência
- Aplicação web corporativa de comunicação interna, com UX 100% mobile-first.
- Referências de experiência: WhatsApp, Discord e Microsoft Teams, sem reprodução literal de produto concorrente.
- Login próprio com usuário e senha; contas cadastradas pela TI.
- Solicitação de redefinição de senha encaminhada à TI responsável, que fornece a nova senha.
- Estrutura de TI com exatamente três administradores chefes principais, com autoridade administrativa equivalente entre si e sem hierarquia de chefe principal/substituto. Os demais integrantes da TI recebem permissões inferiores, limitadas às funções operacionais necessárias; não herdam autoridade de `platform_admin`.


## Direcionamento do Beta — identidade, dispositivos e mensagens (26/11/2026)

A PO definiu que o objetivo principal do Beta é colocar as mensagens em funcionamento real. As definições abaixo orientam a arquitetura e devem ser implementadas incrementalmente, após revisão técnica. Não autorizam execução de SQL ou alterações no Supabase.

### Identidade e regra de usuário
- O login visível será um identificador corporativo (username) e senha, por exemplo `Matheus.Torres`.
- O username será único globalmente no BEX, sem duplicidade entre organizações, e o login será case-insensitive.
- No Beta, cada conta pertence a exatamente uma organização. O vínculo `organization_members.user_id` permanece único globalmente.
- Contas são provisionadas pela TI; não haverá auto cadastro.
- A TI define a senha inicial. Senhas são gerenciadas pelo Supabase Auth e nunca armazenadas em texto puro ou consultáveis por administradores.
- Redefinição de senha permanece sob responsabilidade da TI.
- A compatibilidade técnica entre username corporativo e Supabase Auth precisa de prova técnica server-side antes da implementação.

### Limite de dispositivos por login
- Cada login poderá ter no máximo dois dispositivos cadastrados/ativos no Beta.
- O primeiro dispositivo será registrado no primeiro acesso autorizado.
- A entrada do segundo dispositivo exige solicitação e aprovação explícita da TI.
- Enquanto dois dispositivos estiverem ativos ou reservados por solicitação pendente, um terceiro dispositivo será bloqueado. Para liberar uma vaga, a TI deverá revogar/remover um dos dispositivos existentes.
- Proposta inicial de governança: somente os três administradores chefes equivalentes aprovam, rejeitam ou revogam dispositivos. Integrantes de TI com permissões inferiores não recebem essa capacidade automaticamente.
- A autorização do dispositivo controla o acesso à conta; não concede acesso ao conteúdo privado de conversas nem se confunde com suporte operacional.

### Prioridade funcional
- Prioridade principal do Beta: autenticação, conversas individuais e em grupo, mensagens persistentes, histórico e atualização em tempo real.
- Funcionalidades avançadas de mensagens serão implementadas após a entrega confiável do fluxo básico.
- Chamadas, compartilhamento de tela, suporte operacional da TI, auditoria central abrangente e automação de retenção ficam fora da primeira entrega de mensagens.

### Auditoria e retenção no Beta
- A implementação da auditoria central abrangente está adiada até que o fluxo principal de mensagens esteja estável.
- A implementação de políticas automatizadas de retenção, exclusão e expurgo também está adiada.
- Não criar rotinas de purge ou jobs de exclusão nesta fase.
- As decisões e documentos anteriores sobre auditoria e retenção permanecem preservados para revisão antes de produção. O adiamento não elimina controles básicos de autenticação, RLS, segurança e logs técnicos do provedor.
- O modelo lógico, prioridades e critérios de aceite estão em [beta-messaging-foundation.md](../architecture/beta-messaging-foundation.md).

## Suporte operacional da TI — propostas para arquitetura (26/11/2026)

As escolhas abaixo foram fornecidas pela PO para orientar a arquitetura do BEX. Permanecem como propostas arquiteturais sujeitas à revisão técnica, detalhamento das capacidades e aprovação antes da implementação física.

- Chamados: não será obrigatório abrir ou vincular chamado para conceder suporte operacional.
- Escopo inicial: suporte relacionado a dispositivos (`devices`), incluindo consulta do registro do dispositivo autorizado e revogação/remoção desse dispositivo cadastrado. O integrante `it_support` visualiza somente o dispositivo específico vinculado à autorização ativa; não pode listar, pesquisar ou consultar o inventário completo de dispositivos do colaborador. Não inclui suporte a sessões, gestão geral de contas ou acesso a conteúdo de conversas.
- Granularidade: cada autorização será vinculada a um único dispositivo específico. Para atuar em outro dispositivo, será necessária uma autorização separada.
- Duração: cada autorização de suporte terá validade máxima de 8 horas, com expiração verificada no servidor e possibilidade de revogação antecipada exclusivamente por um dos três administradores chefes de TI, que possuem autoridade equivalente.
- Governança: somente os três administradores chefes de TI, com autoridade equivalente, podem conceder, renovar ou revogar autorizações de suporte. Integrantes de TI com permissões operacionais inferiores (`it_support`) não podem criar, renovar, revogar, suspender, encurtar ou invalidar autorizações. A permissão deve ser validada no servidor e cada operação deve gerar evento de auditoria com administrador responsável, autorização afetada, data/hora e justificativa. Auto concessão/elevação é proibida.
- Acesso por atribuição explícita, com justificativa obrigatória, escopo de organização e usuário-alvo, capacidades permitidas por lista fechada e registro de auditoria.
- A associação à equipe de TI, por si só, não concede `it_support`; sem atribuição ativa, a pessoa mantém permissões comuns de colaborador.
- Mensagens, anexos, chamadas, histórico privado, gestão de papéis e administração global ficam fora desse escopo.

Ainda precisam de revisão técnica: identificação do cadastro canônico de dispositivos, semântica e salvaguardas da consulta e revogação/remoção, e eventos/campos de auditoria. Não criar tabela de chamados nem FK de chamado para esse fluxo.

## Mensagens e colaboração
- Conversas individuais e em grupo.
- Edição de mensagem própria por até 15 minutos após o envio.
- Exclusão de mensagem própria por até 5 minutos após o envio.
- Indicação de mensagem editada e preservação de trilha de auditoria, respeitando regras de privacidade e retenção a definir.
- Reações por emoji.
- Comentários e respostas encadeadas; qualquer participante pode comentar na modalidade aprovada.
- Detalhamento de quem visualizou disponível em grupos; não haverá lista detalhada equivalente em conversas individuais.
- Retenção inicial de seis meses para determinadas categorias de dados; as categorias ainda não foram delimitadas e nenhum tipo específico de dado deve receber esse prazo por inferência. A matriz de reconciliação está em [data-retention-matrix.md](../architecture/data-retention-matrix.md). As categorias expressamente abrangidas pela ADR-001 permanecem sujeitas à retenção ratificada de cinco anos até que haja decisão explícita e validação aplicável para eventual exceção.

## Chamadas de áudio e vídeo
- Chamadas individuais e em grupo no MVP.
- Até 50 participantes por chamada em grupo, sujeito à validação de capacidade, performance e custo.
- Qualquer colaborador com acesso à conversa pode iniciar uma chamada.
- Convites/notificações para chamadas em grupo; ninguém é incluído automaticamente.
- Microfone e câmera desligados por padrão ao entrar.
- Participantes podem entrar e sair livremente enquanto a chamada estiver ativa e dentro do limite.
- Participantes controlam o próprio microfone/câmera, alternam áudio/vídeo quando disponível e visualizam a lista de participantes.
- Organizador pode encerrar para todos, remover participante, silenciar microfone de outro e bloquear temporariamente novas entradas.
- Participante removido não retorna à mesma chamada ativa; a restrição termina quando a chamada termina.
- Histórico para participantes autorizados: iniciador, data/hora, duração, participantes e chamadas perdidas/não atendidas.
- Sem gravação automática; gravação está fora do MVP.
- Criptografia em trânsito, autenticação e validação de acesso à conversa antes da entrada.
- Compartilhamento de tela no MVP: qualquer participante pode compartilhar, com apenas um compartilhamento ativo; organizador pode interromper.
- Ajuste adaptativo de qualidade para priorizar continuidade.
- Em perda de conexão: tentativa automática de reconexão, aviso de instabilidade, possibilidade de reentrada se a chamada continuar ativa e registro no histórico se terminar durante a desconexão.
- Sem duração máxima predefinida; limites operacionais de inatividade, infraestrutura e falhas ainda precisam ser definidos.

## Pendências explícitas
- Detalhar tecnicamente a matriz de capacidades operacionais e o fluxo de concessão/renovação/revogação do suporte a dispositivos, respeitando as autoridades já definidas. As escolhas acima são propostas arquiteturais, não autorização para implementar.
- Delimitar, com decisão explícita da PO, as categorias de dados e exceções sujeitas à retenção de seis meses, reconciliando-as com a [matriz de retenção](../architecture/data-retention-matrix.md), a ADR-001 e a validação jurídica/privacidade aplicável.
- Definir limites de inatividade e encerramento operacional das chamadas.
- Validar tecnicamente chamadas de grupo com até 50 participantes.
- Especificar privacidade, auditoria e acesso ao histórico.
- Validar arquitetura e migrations contra o novo Supabase antes de qualquer execução.
