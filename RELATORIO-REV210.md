# Madruga Survival v2.10.0 — Aranha Sombria: combate e áudio

**Base auditada:** v2.9.0, branch `main`, commit `2490507227b791b3cc1eebd17e9bf0e08d3c24b8`.

## Mudanças implementadas

1. **Variedade de ataques.** A aranha mantém mordida, salto e teia comum e ganha um disparo em leque de três projéteis. O leque reutiliza a animação original `WebShot`, com evento único após 0,49 s e intervalo maior entre usos. O leque só é escolhido quando o jogador está à vista e a média distância. Os projéteis continuam obedecendo a obstáculos e invulnerabilidade da esquiva.
2. **Reações aos golpes.** Toda arma produz um deslocamento visual breve do corpo, sem deslocar collider nem trocar materiais compartilhados. Combos fortes podem interromper somente a preparação de golpes da aranha; ataques que já impactaram continuam ininterruptos, evitando duplicar ou apagar dano.
3. **Sons procedurais.** Novos efeitos de passos, mordida, preparação, teia, salto, ferimento e morte usando Web Audio. Intensidade cai com o quadrado da distância, e passos têm limitador de 0,48 s. Os sons só funcionam após uma interação que ativa o áudio; não exigem novos arquivos para baixar.
4. **Compatibilidade.** Mantidos o GLB com 72 ossos, cinco clipes, o sistema de oito patas e todos os mecanismos de crafting, exploração e saves. Cache busting atualizado nos módulos alterados.

## Testes

- `npm run check`: aprovado.
- `npm test`: aprovado, inclusive 15 testes novos de seleção de ataque, teia em leque, interrupção, limites de áudio, e integração.
- Integridade e animações do GLB novamente verificadas pelos testes da v2.7/v2.9.
- **Pendente:** validação visual em jogo real. Chromium bloqueou `http://127.0.0.1:8765` com `ERR_BLOCKED_BY_ADMINISTRATOR`, portanto o carregamento local WebGL não pôde ser concluído. Não há evidência de que o jogo foi jogado manualmente.

## Próximos pontos para QA manual

- Verificar volume, passo por passo, equilíbrio de combate com múltiplas aranhas.
- Testar teia em leque em terreno com paredes, no PC e no celular; confirmar que a janela de esquiva protege da lentidão.
- Observar se o recuo visual da aranha durante uma animação forte fica natural, sem atraves­sar o solo.
