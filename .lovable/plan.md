# Fornecedores por nicho e classificação de oportunidades

## Objetivo
Organizar fornecedores por nicho, subnicho e micro-nicho, medir cobertura mínima de três fornecedores e classificar cada oportunidade em uma única hierarquia, sem alterar os demais módulos além das referências necessárias a fornecedores.

## Situação encontrada
- Fornecedores, produtos e oportunidades usam hoje categorias fixas em texto, sem tabelas de nichos nem hierarquia.
- Fornecedores têm apenas cadastro em janela e alteração rápida do nível de confiança; não existe edição completa nem ficha individual.
- Produtos já se relacionam com fornecedores por meio das cotações cadastradas.
- O catálogo novo começará vazio. Nenhum nicho, fornecedor, preço ou registro de exemplo será criado.

## Alterações no banco de dados
- Criar tabelas próprias e vinculadas ao usuário para `nichos`, `subnichos` e `micro_nichos`, com nomes únicos dentro de cada nível e exclusão em cascata da árvore.
- Criar `fornecedores_nichos` com fornecedor, nicho, subnicho opcional, micro-nicho opcional e data de criação; incluir índices por fornecedor e nicho, unicidade dos vínculos e exclusão em cascata ao remover o fornecedor.
- Adicionar às oportunidades uma única referência opcional para nicho, subnicho e micro-nicho.
- Completar fornecedores com UF, cidade, telefone, vendedor, condições de pagamento, garantia, venda sob demanda (`sim`, `nao`, `parcialmente`), quantidade mínima, frete até Belo Horizonte e data da última cotação. Os campos atuais serão preservados; “prazo médio de entrega” continuará sendo usado como prazo de envio.
- Aplicar permissões e políticas por usuário em todas as tabelas novas, além de validações de coerência da hierarquia para impedir vínculos cruzados.
- Manter as categorias antigas para compatibilidade, sem convertê-las automaticamente nem apagá-las.

## Tela de fornecedores
- Reorganizar o formulário existente e permitir tanto cadastro quanto edição completa.
- Adicionar “Nichos atendidos” com multisseleção em cascata: nichos obrigatórios, subnichos filtrados e micro-nichos opcionais.
- Disponibilizar “Criar novo” dentro do fluxo, respeitando o nível e o item pai selecionado.
- Validar formato de CNPJ e e-mail antes de salvar, com mensagens em português.
- Incluir todos os novos campos, com controle SIM/NÃO/PARCIALMENTE e destaque visual para SIM.
- Atualizar a lista com selos compactos dos nichos (três visíveis e “+N”), coluna de venda sob demanda e filtros por hierarquia, UF, cidade, venda sob demanda e nome/CNPJ.
- Adicionar opção para agrupar os resultados por nicho; fornecedores de vários nichos poderão aparecer no respectivo grupo, sem duplicação na visão normal.
- Preservar avaliações, confiança, indicadores e ações existentes.

## Cobertura por nicho
- Incluir na área de Fornecedores uma visão alternável “Cobertura de fornecedores por nicho”.
- Mostrar nichos e subnichos com total de fornecedores únicos e total que vende sob demanda.
- Usar verde para 3 ou mais, amarelo para 2 e vermelho para 1 ou nenhum.
- Para totais abaixo de 3, mostrar exatamente: “Quantidade insuficiente de fornecedores cadastrados.”
- Ao clicar em um nicho ou subnicho, voltar à lista já filtrada.

## Ficha do fornecedor
- Criar uma ficha individual, acessível pela lista, com edição completa.
- Exibir a árvore de nichos atendidos agrupada por nicho, subnicho e micro-nicho.
- Exibir os produtos já vinculados ao fornecedor por cotações, incluindo os dados reais disponíveis, sem criar registros.

## Oportunidades
- Trocar a classificação fixa do cadastro e da edição por uma seleção em cascata de uma única hierarquia: nicho, subnicho e micro-nicho opcional.
- Permitir criar novos níveis no mesmo padrão do cadastro de fornecedor.
- Mostrar a classificação na lista e nos dados da oportunidade.
- Manter a categoria antiga nos registros existentes até que cada oportunidade seja classificada no novo catálogo.

## Componentes reaproveitados e novos
- Reaproveitar botões, campos, seletores, janelas, selos, tabelas, painéis e tokens visuais atuais.
- Criar um seletor de hierarquia reutilizável para fornecedores e oportunidades, com modo simples e multisseleção.
- Criar utilitários compartilhados para CNPJ, e-mail e apresentação da hierarquia.

## Verificação
- Validar criação e edição de fornecedor, criação de novos níveis, filtros, agrupamento, cobertura e ficha.
- Validar cadastro e edição de oportunidade com uma única hierarquia.
- Confirmar que seleção de fornecedor em produtos e itens de oportunidades continua funcionando.
- Conferir visualmente em telas estreitas e largas, além de verificar compilação, erros de execução e regras de acesso.
