# Madruga Survival — REV219 · Equipamentos reais e grades de baú

Base: v2.18.0 (não publicada no GitHub). Revisão v2.19.0 entregue em fonte ZIP.

## Implementação
- Novo estado validado `survival.equippedGear`: vest, padding, boots; migração de saves anteriores equipados se a peça havia sido fabricada.
- Ações de vestir/retirar na mochila via clique, toque ou teclado; flags fabricadas preservadas.
- Modificadores no dano e consumo de energia aplicados apenas às peças equipadas.
- Novo gerenciador de acessórios 3D leves: acompanha as juntas de coluna e pés do REV5 e os pivôs do personagem reserva.
- Novo painel de baús com duas grades, seleção e arraste, transferências atômicas e quantidade 1 / metade / tudo.
- Mantidos inventário oficial, 36 posições de mochila, hotbar, crafting, esquiva, save e carregador GLB originais.

## Limites de validação
- Testes automatizados da suíte completa e 11 verificações específicas passaram localmente.
- A aparência e o alinhamento dos acessórios 3D com o GLB real não foram validados jogando visualmente.
- O baú mantém agregação por tipo; só a mochila possui posições físicas persistentes.
- Nenhum commit ou implantação GitHub Pages foi realizado nesta revisão.
