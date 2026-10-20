# MadrugaCraft v1.6 — Crafting e posicionamento

## Fluxo de construção

1. Abra a mochila (`I`) e localize a categoria **Construções**.
2. Escolha uma receita. Um holograma da peça aparece no mundo, **sem gastar recursos**.
3. Posicione: caminhe, olhe, use setas/roda do mouse ou os botões no celular.
4. Gire (G ou **↻ Girar**). **Verde** indica local válido; **vermelho**, local bloqueado.
5. Pressione `F`, `Enter`, clique na cena ou use **Confirmar**. Apenas agora os materiais são debitados.
6. Pressione `Esc` ou **Cancelar** para sair sem gastar.

A prévia não colide, não é persistida e não rende XP. A confirmação verifica novamente colisões e recursos, impedindo que alterações ocorridas durante a escolha deixem uma peça sobreposta. Se criar a malha falhar, os materiais são devolvidos.

### Controles

| Ação | Teclado/mouse | Celular |
| --- | --- | --- |
| Abrir mochila | I | Botão mochila |
| Escolher peça | Clique na receita | Toque na receita |
| Ajustar posição | Mover WASD, girar visão pelo mouse | Direcional e arrastar o cenário |
| Deslocamento lateral | ← / → | ← / → |
| Distância | ↑ / ↓, roda do mouse | − Distância / + Distância |
| Girar 90° | G ou R | ↻ Girar |
| Confirmar | F, Enter ou clique no terreno | ✓ Confirmar |
| Cancelar | Esc ou Backspace | ✕ Cancelar |

A categoria Equipamentos permanece fabricação imediata; Culinária exige fogueira nas receitas adequadas e Reparos exigem bancada. Receitas mostram custo e descrição do resultado.

## Publicação

HTML/CSS/JavaScript modular, sem processo de build. Envie os arquivos da pasta do ZIP para a raiz do GitHub Pages, incluindo `.nojekyll`. A biblioteca Three.js ainda requer acesso à CDN.

## Validação

`npm run check` e `npm test`, incluindo `tests/v16-crafting.mjs`, verificam lógica de prévia, colisões, custos, transação, estilos e integração. É necessária uma partida WebGL em navegador com internet para validação gráfica completa.
