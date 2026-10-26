# v2.14.0 — Caverna, câmera e chefe (fonte)

## Implementação
- Geometria determinística adicional: 34 estalagmites simples, fungos luminescentes, círculo de alerta no chão e duas fontes de luz pulsante.
- Ambiente interno com sol atenuado, neblina lilás e fundo escuro. A floresta mantém iluminação original ao sair.
- Câmara orbital: interseção exata com limite circular da caverna, teste de raycast contra paredes, menor distância dentro da arena, ajuste instantâneo após teleporte/restauração.
- Rainha: barra de vida integrada ao HUD, indicação explícita da fase 2, sinalização púrpura/rosa no piso, materiais únicos piscam e executam animação de WebShot ao entrar na fase 2; cooldowns levemente reduzidos. Saves antigos continuam válidos.
- Sem modelos externos adicionais; as animações continuam Idle, Walk, Jump, Attack e WebShot.

## Testes
Executar `npm run check` e `npm test`, incluindo `tests/v214-cave-boss-camera.mjs`. Estes são testes de código/integração simulada; teste visual WebGL e partida completa requerem validação no navegador.

## Riscos conhecidos
- O sistema de caverna é uma arena no mundo, não um interior com oclusão de geometria distante nem túneis navegáveis.
- Como os controles de câmera dependem do mouse, é necessário confirmar visualmente o enquadramento de perto nas bordas.
