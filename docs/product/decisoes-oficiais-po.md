# Decisões oficiais da PO — CONNEXA3

Este documento consolida decisões funcionais aprovadas pela Product Owner. Quando houver conflito com documentos técnicos antigos, estas decisões são o direcionamento de produto, sujeitas à decomposição em requisitos e validação técnica.

## Produto e experiência
- Aplicação web corporativa de comunicação interna, com UX 100% mobile-first.
- Referências de experiência: WhatsApp, Discord e Microsoft Teams, sem reprodução literal de produto concorrente.
- Login próprio com usuário e senha; contas cadastradas pela TI.
- Solicitação de redefinição de senha encaminhada à TI responsável, que fornece a nova senha.
- Estrutura de TI com três administradores chefes principais e demais integrantes com permissões inferiores.

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
- Definir matriz completa de permissões da equipe de TI.
- Definir categorias de dados e exceções sujeitas à retenção de seis meses.
- Definir limites de inatividade e encerramento operacional das chamadas.
- Validar tecnicamente chamadas de grupo com até 50 participantes.
- Especificar privacidade, auditoria e acesso ao histórico.
- Validar arquitetura e migrations contra o novo Supabase antes de qualquer execução.
