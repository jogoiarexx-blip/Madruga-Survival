# Madruga Survival v2.17.0 — Mochila com pilhas reais

Base: v2.16.0. Alterações limitadas à grade visual, lógica de organização e persistência dos slots; o inventário canônico por recurso, crafting, sobrevivência, baús e hotbar são preservados.

## Mudanças
- Grade de 36 posições no inventário, mantendo slots vazios visíveis.
- Clique/toque numa pilha e depois em outro slot para trocar, mover ou juntar quantidades iguais.
- Alternar **Dividir metade** para separar a metade inteira inferior (ex.: 5 vira 3 + 2) em slot vazio; funciona com toque no celular e arrastar/soltar no PC.
- **Organizar pilhas** combina pilhas iguais e coloca itens na ordem estável das categorias.
- Hotbar de consumíveis 4–9 permanece independente das posições: atribuir um item ao atalho não reduz estoque.
- O layout é salvo em `inventorySlots`; as contagens continuam em `survival.inventory` para evitar impactos na lógica anterior.
- Migração de saves antigos: quando `inventorySlots` não existe, gera-se uma organização inicial sem perda de recursos.
- Cada salvar/abrir mochila reconcilia o layout com os totais oficiais após coleta, consumo, crafting e transferências de baús.
- Validação rejeita saves com pilhas malformadas, contagens inválidas, soma divergente ou recursos inexistentes.

## Escolhas técnicas e limites
- Uma pilha comporta até 999 itens, igual ao limite anterior por tipo de recurso, para preservar saves grandes. Não foi aplicada a pilha de 64 itens do Minecraft.
- As posições organizam itens existentes; o jogo ainda não simula carga/peso, inventário de 27 + 9 slots de armas ou arrastar recursos para baús.
- Os filtros de busca deixam outras posições esmaecidas, mas não removem slots da grade — os índices permanecem estáveis.
- A função de divisão separa metade; não há seletor livre de quantidades nem botão direito para retirar uma unidade nesta revisão.

## Testes
- `npm test`: aprovado, com 10 grupos específicos novos para pilhas, reconciliação, migração e persistência (incluindo 400 movimentações randômicas).
- `npm run check`: aprovado.
- Chromium bloqueou `http://127.0.0.1:8899/` com `ERR_BLOCKED_BY_ADMINISTRATOR`, portanto o teste visual por navegador real **não foi concluído**.
