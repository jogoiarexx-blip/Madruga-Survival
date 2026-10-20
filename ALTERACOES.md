# v1.9 — Maior detalhamento de polígonos por perfil

- Novo gerenciador `src/render/geometry-detail.js` com níveis Mínimo/Médio/Alto e caixa procedural de cantos suavizados.
- Floresta: troncos 6/10/16 lados, copas 7/11/18, arbustos 8x6/12x9/20x14 e rochas com subdivisão somente em Alto.
- Recursos: cilindros, folhas, frutos, minérios, pedras, borda do poço com facetas por qualidade; geometrias pequenas reaproveitadas em todos os nós.
- Animais, jogador, guarda, monstros não-GLB, túmulos e mobiliário: facetas e silhuetas mais suaves.
- Evita custo em celular: modo Mínimo mantém malhas simples; culling já existente permanece; geração e itens salvos não mudam.
- Incluídos seis novos testes automatizados em `tests/v19-geometry.mjs`. Modelo zumbi REV4 original preservado.

# v1.8 — Zumbi geométrico REV4 integrado

O jogo carrega o modelo original `assets/models/zumbi_geometrico_REV4.glb` com GLTFLoader (Three.js 0.160.0), mantendo os 40 ossos, 29 animações e 2.504 triângulos. O arquivo é baixado só uma vez e o rig é clonado para cada infectado. As variantes normal, corredor, tóxico e gigante usam o mesmo modelo, ajustando escala e paleta, e selecionando clipes de caminhada, ataque e reação ao dano. IA, dano, veneno, invasões, guarda e saves antigos seguem preservados. Sem GLB/CDN, os inimigos permanecem temporariamente no visual low-poly antigo, sem travar o jogo.

A cena 3D completa deve ser testada em navegador com suporte a WebGL e acesso ao jsDelivr. As rotinas de IK e desmembramento adicionais do pacote original não foram ativadas por razões de desempenho e compatibilidade.

# MadrugaCraft v1.7 — Encaixe automático de construções

- Novo `src/world/build-snapping.js`: pontos de encaixe próximos, bordas de pisos, continuação e cantos de paredes, sequência de pisos e telhados.
- `src/gameplay/placement.js`: ímã opcional na prévia, seleção de âncoras livres, confirmação que usa exatamente a mesma posição visualizada; sem gastos por prévia/cancelamento.
- `src/world/building-rules.js` e `src/world/buildings.js`: preservação de posições na metade da grade (1,5m), colisões de paredes e prevenção de sobreposição parcial de pisos/telhados, saves antigos sem alteração.
- Aumento de 100 para 160 construções, com validador de save atualizado.
- `index.html`, `styles/main.css`, `src/main.js`: tecla C ou botão 🧲, status de encaixe com etiqueta, controles para celular.
- `tests/v17-snapping.mjs`: 11 verificações novas de alinhamento, colisão, transação, migração e UI.
- **Resultado:** 123 verificações de `npm test` aprovadas, além de `npm run check`.
- **Limite da validação:** não foi possível testar uma partida WebGL completa por bloqueios no navegador deste ambiente.

# v1.5 — RPG de profissões e progressão funcional

- Oito profissões persistentes (20 níveis cada): pesca, agricultura, caça, construtor, mineração, coleta, artesanato e sobrevivência.
- XP obtido por ações reais: capturar peixes, plantar/regar/colher, caçar, construir/reparar, minerar, coletar e fabricar; passar a noite também recompensa resistência.
- Efeitos na jogabilidade: ganhos de recursos, redução no tempo de pesca, mais colheita, receita com custo menor, preparação dupla de comida e menos desgaste de fome/sede.
- Tela responsiva para visualizar XP, nível e efeitos; botão próprio no desktop, acesso pela mochila em celular e tecla U.
- Alerta próprio de subir de nível, sem interromper combate ou movimentação.
- Migração de saves antigos sob a mesma chave `madrugacraft.survival.v2`, sem perda de progresso.
- 13 novos testes na suíte vigente; 90 verificações passaram em Node, além de checagem sintática. Interface isolada verificada no Chromium a 1366x768, 390x844, 320x640 e 844x390. Partida WebGL não validada por bloqueio de CDN.
- Arquivos: `src/gameplay/skills.js`, `src/ui/skills-ui.js`, `tests/v14-skills.mjs`; modificados os módulos de coleta, agricultura, pesca, sobrevivência, main, UI, CSS, HTML e pacote.

# v1.3 — caça, pesca, agricultura e telhados

- Sistemas e testes novos em `src/gameplay/farming.js`, `src/gameplay/fishing.js`, `src/world/wildlife.js` e `tests/v13-systems.mjs`.
- Coelhos e javalis low-poly caçáveis; pesca perto da água com Y; horta com F para plantar, regar e colher.
- Telhados de 3 m, proteção do frio, comidas novas, botões para celular, salvamento compatível com v1.2.
- A compilação continua dispensável no GitHub Pages: HTML + CSS + JavaScript modular.

# MadrugaCraft — Alterações v1.2

Base aplicada: pacote original da v1.1 com 52 arquivos. Não foi criado projeto paralelo.

## Implementações
- Minério de ferro 3D com 20 pontos distantes e regeneração; não é minerável sem picareta.
- Bancada de madeira/pedra, receitas de mineração, reforço de lança e reparo.
- Durabilidade persistida de picareta, marreta e lança; quebra impede uso e reparos evitam consumo indevido.
- Ataques noturnos à base a partir do segundo dia; invasores atacam estruturas e elas perdem pontos de vida.
- Conserto de estruturas por proximidade; integridade persistida e indicador de dano.
- Salvamento v2 mantido (mesma chave). Leitura migratória dos dados da v1.1 sem perder inventário ou as antigas construções.
- HUD com durabilidade e alerta de invasão; controles de reparo com teclado e celular.
- 10 testes específicos e testes anteriores mantidos. Quatro perfis de tela da mochila validados via Chromium.

## Observações
- Three.js 0.160.0 continua servido pelo jsDelivr conforme arquitetura original: publicação GitHub Pages não exige bundler; é preciso conexão de internet para o motor.
- Sem validação de partida 3D completa por falta de conexão com a CDN neste ambiente.
- Testes da campanha histórica `testes.mjs` e `tests/regression.mjs` estão obsoletos. `npm test` é a suíte vigente.


Novidade v1.5: zumbis low-poly integrados ao ciclo noturno, invasões e salvamento.
