# REV218 — Mochila avançada, baús e equipamentos

## Base e escopo
- Base integral: v2.17.0; mantidos mundo 3D, modelos, saves, hotbar e crafting.
- Nova interface de quantidades: selecionar a pilha, ativar **Mover quantidade**, escolher número (inteiro positivo) e selecionar/arrastar para destino. Botões *Metade* e *Tudo*.
- Baú próximo (até 6 metros): painel dentro da mochila para guardar a quantidade escolhida a partir de um slot ou arrastando a pilha, e retirar a quantidade exata do recurso selecionado.
- Validação transacional em `src/gameplay/bag-storage.js`: planos puros garantem limite de 80 itens no baú, limite de 999 por recurso, 36 posições e saldo conservado entre mochila e baú.
- Resumo visual dos equipamentos fabricados no inventário: colete, reforço de quitina e botas. Ainda **não** há sistema de vestir/despir ou representação 3D dessas peças no personagem.

## Verificação
- `npm run check`: aprovado.
- `npm test`: aprovado, incluindo 10 novos grupos e 400 operações pseudoaleatórias sem duplicação/perda.
- Teste de layout offline com Chromium: larguras 1366 e 390 sem extravasamento horizontal; como scripts de jogo não foram executados, isso **não** valida o funcionamento visual da interface dinâmica.
- Teste da página local no Chromium indisponível (`ERR_BLOCKED_BY_ADMINISTRATOR`), impedindo afirmar que a partida visual foi testada.

## Compatibilidade e limitações
- Saves v2.17 e anteriores continuam usando a chave original e a validação `inventorySlots`; nenhuma migração obrigatória de formato.
- Uma transferência rejeitada não altera nenhum dos dois estoques. Não são permitidas retiradas ou depósitos parciais quando a quantidade solicitada excede o espaço disponível.
- A transferência automática foi integrada à mochila para o **baú mais próximo** dentro do alcance de crafting; os comandos antigos do baú continuam disponíveis.
- O estoque autoritativo segue `survival.inventory`; as 36 posições são a organização persistente dos recursos.
- A instalação no GitHub não faz parte deste pacote local.
