# Relatório técnico — Madruga Survival v2.12.0

## Base
- Partida da v2.11.0, preservando GLBs e animações, 3 variantes de aranhas e melhorias anteriores.
- Alterações incrementais na lógica de exploração, crafting, inventário, persistência e UI.

## Mudanças reais
- `src/world/spider-nests.js`: ninhos e ovos procedurais, geometria low poly, busca/interação, timers de eclosão, recarga das teias, serialização.
- `src/main.js`: geração e restauração a partir da mesma seed, eventos de eclosão limitados a no máximo quatro aranhas vivas e no máximo 11 inimigos ativos, coleta com F, dano e receitas, avisos e minimapa.
- `survival.js` e `crafting.js`: recursos `spiderSilk`, `chitin`, `silkDressing`; receitas `silkDressing` e `chitinPadding` (bancada), efeitos aplicados.
- `save-system.js`: aceita saves antigos sem estado dos ninhos e rejeita ids/timers/quantidades inválidos.
- Visual: três grupos com ovos, teias fixas e marcações no minimapa (até 30 metros).

## Testes realmente executados
- `npm test`: 377 linhas de casos `OK` no log, execução concluída sem falhas. Inclui 20 testes novos em `tests/v212-spider-nests.mjs`.
- `npm run check`: checagem de sintaxe concluída sem falhas.
- 256 seeds testadas com layout reproduzível, além de mochila cheia, save adulterado, limite de eclosão, recarga de armadilha, crafting em lote, restauração e cena simulada.

## Pendências
- Não foi realizada jogabilidade WebGL visual em navegador real nem medições de FPS em Android.
- Apoio das teias em terreno extremo e posições junto a objetos devem ser observados em campo.
- Não há novos GLBs: as novidades usam geometria simples para preservar desempenho.
