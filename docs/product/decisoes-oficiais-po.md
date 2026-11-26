# Decisões oficiais da PO — CONNEXA3

Este documento consolida decisões funcionais aprovadas pela Product Owner. Quando houver conflito com documentos técnicos antigos, estas decisões são o direcionamento de produto, sujeitas à decomposição em requisitos e validação técnica.

## Produto e experiência
- Aplicação web corporativa de comunicação interna, com UX 100% mobile-first.
- Referências de experiência: WhatsApp, Discord e Microsoft Teams, sem reprodução literal de produto concorrente.
- Login próprio com usuário e senha; contas cadastradas pela TI.
- Solicitação de redefinição de senha encaminhada à TI responsável, que fornece a nova senha.
- Estrutura de TI com exatamente três administradores chefes principais, com autoridade administrativa equivalente entre si e sem hierarquia de chefe principal/substituto. Os demais integrantes da TI recebem permissões inferiores, limitadas às funções operacionais necessárias; não herdam autoridade de `platform_admin`.

## Suporte operacional da TI — propostas para arquitetura (26/11/2026)

As escolhas abaixo foram fornecidas pela PO para orientar a arquitetura do BEX. Permanecem como propostas arquiteturais sujeitas à revisão técnica, detalhamento das capacidades e aprovação antes da implementação física.

- Chamados: não será obrigatório abrir ou vincular chamado para conceder suporte operacional.
- Escopo inicial: suporte relacionado a dispositivos (`devices`). Não inclui automaticamente suporte a sessões, gestão geral de contas ou acesso a conteúdo de conversas.
- Duração: cada autorização de suporte terá validade máxima de 8 horas, com expiração verificada no servidor e possibilidade de revogação antecipada exclusivamente por um dos três administradores chefes de TI, que possuem autoridade equivalente.
- Revogação: integrantes de TI com permissões operacionais inferiores (`it_support`) não podem revogar, suspender, encurtar ou invalidar autorizações de suporte. A permissão deve ser validada no servidor e cada revogação deve gerar evento de auditoria com administrador responsável, autorização afetada, data/hora e justificativa.
- Acesso por atribuição explícita, com justificativa obrigatória, escopo de organização e usuário-alvo, capacidades permitidas por lista fechada e registro de auditoria.
- A associação à equipe de TI, por si só, não concede `it_support`; sem atribuição ativa, a pessoa mantém permissões comuns de colaborador.
- Mensagens, anexos, chamadas, histórico privado, gestão de papéis e administração global ficam fora desse escopo.

Ainda precisam de revisão: operações exatas sobre dispositivos, identificação do cadastro canônico de dispositivos, se a atribuição cobre um ou vários dispositivos, quem concede/revoga/renova a autorização e os eventos/campos de auditoria. Não criar tabela de chamados nem FK de chamado para esse fluxo.

## Mensagens e colaboração
- Conversas individuais e em grupo.
- Edição de mensagem própria por até 15 minutos após o envio.
- Exclusão de mensagem própria por até 5 minutos após o envio.
- Indicação de mensagem editada e preservação de trilha de auditoria, respeitando regras de privacidade e retenção a definir.
- Reações por emoji.
- Comentários e respostas encadeadas; qualquer participante pode comentar na modalidade aprovada.
- Detalhamento de quem visualizou disponível em grupos; não haverá lista detalhada equivalente em conversas individuais.
- Retenção inicial de seis meses para determinadas categorias de dados; categorias, exceções e descarte seguro ainda precisam de especificação.

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
- Detalhar a matriz de capacidades operacionais e o fluxo de concessão/renovação do suporte a dispositivos; a revogação foi definida como exclusiva dos três administradores chefes. As escolhas acima são propostas arquiteturais, não autorização para implementar.
- Definir categorias de dados e exceções sujeitas à retenção de seis meses.
- Definir limites de inatividade e encerramento operacional das chamadas.
- Validar tecnicamente chamadas de grupo com até 50 participantes.
- Especificar privacidade, auditoria e acesso ao histórico.
- Validar arquitetura e migrations contra o novo Supabase antes de qualquer execução.
