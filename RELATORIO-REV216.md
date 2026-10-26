# Madruga Survival v2.16.0 — Mochila interativa estilo sandbox

## Base e preservação
A partir da v2.15 com a primeira reorganização visual da mochila. Mantidos inventário agregado por recurso, nove consumíveis, seis atalhos (4–9), crafting, construções, modelos GLB, saves e migração dos atalhos antigos. O inventário **não** passou a armazenar stacks por posição física: a grade é uma representação por tipo de recurso. Não há troca de equipamento por arrastar.

## Implementações
- Quatro filtros por categoria, aba Todos, campo de busca por nome; recurso existe em uma única seção.
- Botões de itens responsivos com foco de teclado, rótulos e estado selecionado.
- Clique/toque em consumível, depois clique/toque no slot de configuração desejado. Arrastar e soltar com MIME próprio no desktop.
- Duplo clique no recurso para preencher primeiro slot vazio sem sobrescrever slots ocupados; quando todos estão ocupados, mensagem de orientação.
- Validação dos itens permitidos, rejeitando payload de arrasto inválido e índice fora do intervalo.
- Animação breve de abertura e suporte a preferência de movimento reduzido.
- Versão e cache-busting corrigidos para 2.16.0.

## Testes
- `npm test`: aprovado; testes anteriores e 7 grupos novos v2.16.
- `npm run check`: aprovado.
- HTML: IDs únicos, tamanho abaixo do limite da suíte.
- Teste visual no Chromium: não realizado. O navegador de teste retornou ERR_BLOCKED_BY_ADMINISTRATOR para endereço local. Não tratar como validação gráfica.

## Próxima evolução
Para uma mochila exatamente igual às mecânicas de Minecraft, será necessário migrar o armazenamento para slots físicos com stacks, regras de movimentação/divisão, persistência, transferências para baús e crafter. Esta revisão não altera tal modelo para proteger partidas existentes.
