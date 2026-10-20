# v1.4 — RPG de profissões e progressão funcional

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
