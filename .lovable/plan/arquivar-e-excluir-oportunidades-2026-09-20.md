# Arquivar e excluir oportunidades

## O que será alterado
- Adicionar um campo de arquivamento às oportunidades existentes, sem mudar seus status atuais.
- Incluir na lista um filtro para alternar entre oportunidades ativas e arquivadas.
- Disponibilizar as ações **Arquivar/Desarquivar** e **Excluir** na lista e na ficha da oportunidade.
- Exigir confirmação antes da exclusão definitiva e informar que itens vinculados serão removidos; análises de edital serão apenas desvinculadas, conforme as relações atuais.
- Atualizar a lista imediatamente após cada ação e voltar à lista quando uma oportunidade aberta for excluída.

## Detalhes técnicos
- Nova coluna opcional `archived_at` em `opportunities`, usando as permissões e políticas já existentes.
- A exclusão continuará protegida pelas regras de acesso por usuário do banco.
- Validar compilação e, havendo sessão disponível, conferir os fluxos na tela.
