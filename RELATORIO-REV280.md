# Madruga Survival v2.8.0 — Auditoria de animações da Aranha Sombria

## Problemas confirmados no código anterior
1. A ação `Jump` alterava apenas o eixo Y da malha visual, e não a posição física da aranha. Resultado: ataque de salto sem avanço real e possível diferença entre collider e modelo.
2. O sistema atualizava o mixer com `min(0.065, dt)` mesmo que a simulação avançasse mais rapidamente: a animação ficava para trás em FPS baixo.
3. O projétil aplicava lentidão mesmo quando o dano era bloqueado pelo tempo de invulnerabilidade/esquiva.
4. O loader fazia 26 requisições base64 em série, atrasando a primeira aparição do GLB no GitHub Pages.
5. O visual ignorava inclinação local do terreno; o corpo parecia plano em ladeiras.

## Correções aplicadas
- `src/gameplay/spider-ai.js`: salto com trajetória fixada no lançamento, deslocamento com `resolveCollision`, arco temporal de altura, dano de aterrissagem único, orientação travada no salto, amostragem de inclinação ~5,5 vezes/s, limite de tilt de 0,23 radiano.
- `src/characters/spider-model.js`: separação entre salto físico e altura visual, blend de inclinações, preservação da duração dos clipes e atualização acumulada do mixer em distância (em vez de câmera lenta). Loader agora executa no máximo cinco downloads simultâneos mantendo ordem/validação SHA-256.
- `src/gameplay/projectiles.js`: subpassos de 0,24m para detectar barreiras e apenas aplica teia se `damagePlayer` retornar sucesso.
- `src/main.js`, `index.html`: versões de cache para os módulos alterados, preservando os demais sistemas.
- `tests/v280-spider-physics.mjs`: dez casos novos — trajetória, aterrissagem, parede, evento de dano único, inclinação, invulnerabilidade, projéteis e carregamento paralelo.

## Verificação
- `npm run check`: **aprovado**.
- `npm test`: **aprovado** (suíte anterior e testes v2.8).
- Modelo GLB: **preservado**, não houve reescrita do esqueleto nem das cinco animações.
- Visual real no navegador: **não validado**; Chromium deste ambiente retornou `ERR_BLOCKED_BY_ADMINISTRATOR` para `http://127.0.0.1:8765`.

## Pendências
- Validar de forma jogável em PC e celular o apoio individual das oito patas e a escala visual contra o Madruga.
- Avaliar visualmente animações e efeitos de teia ao redor de construções e em declives extremos.
- A inclinação é do corpo, não há IK independente para as oito patas, e a geometria de 117.961 vértices ainda é pesada para celulares de entrada.
