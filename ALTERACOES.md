## v2.11.0 — Variedades de Aranhas

- Sombria (equilibrada), Caçadora (pequena, veloz e saltadora), Tecelã (grande, resistente e disparo em leque).
- Reutilização do GLB da Aranha Sombria, com materiais clonados por inimigo e matizes diferentes.
- Spawn condicionado a dias, noite e risco das ruínas; limite ambiente de duas aranhas mantido.
- Correção importante do save v2: validação e persistência da espécie e da vida das aranhas; partidas antigas sem espécie continuam válidas.
- Projéteis agora recebem os três ângulos do leque corretamente, além de dano, lentidão e velocidade por espécie.
- 19 novos testes, confira `RELATORIO-REV211.md`.

## v2.2.8 — Melhoria das armas, animações REV5 e craft

Veja `RELATORIO-REV228.md` para alterações e testes desta versão.


## v2.2.6 — Oficina, combate e progressão (2026-10-23)
- Aba de fabricação com busca textual, categorias, requisitos visíveis e lotes de 1/5/máximo (até 20).
- Bancada necessária para reparos e melhorias; fogueira necessária para cozinhar.
- Bandagem criada com fibra e água: cura 25 pontos de vida, sem permitir gastar com saúde cheia.
- Marreta de ferro (+2 de dano), lança reforçada (+3 existente) e empunhadura (+50% de duração contra desgaste por acertos).
- As peças de ferro e o trançado são exibidos no modelo, sem duplicar equipamento.
- Animações REV5 alternam clips reais específicos por arma; impacto só depois da janela de ataque.
- Save v2 preservado, com migração de novos campos e receitas; crafting puramente transacional.
- Testes adicionais para estação, lotes, progressão, migração, visuais e 30/60/144 FPS simulados.
- QA automatizado pelo GitHub Actions; não substitui inspeção visual WebGL em navegador.

## v2.2.0 — Player Striped Wanderer REV5

Modelo GLB original carregado com GLTFLoader, bonecos procedurais ocultos ao carregar, ações de jogo ligadas a clipes do rig, armas da campanha anexadas à mão do esqueleto. Preservadas colisões, salvamentos, zumbis REV2, construção e combate. Fallback do jogador em caso de indisponibilidade do GLB.

# v2.1.5 — Correção da passada dos zumbis REV2

- Apoio procedural dos pés por CCD limitado nos ossos originais L_Hip/L_Knee/L_Foot e R_Hip/R_Knee/R_Foot.
- Amostragem da altura do terreno debaixo de cada pé com âncoras de contato e transições suaves.
- Retirado o bob/pulso de escala do rig REV2 para evitar que a sola atravesse o terreno.
- Retiming da locomoção por tipo, mantendo o impacto de mordida/agarrão na mesma posição da animação.
- Otimização: apoio calculado apenas perto do jogador; regressões de escala, IA e combate preservadas.

# v2.1.2 — Orientação REV2 e deslocamento

- O zumbi REV2 tem frente local +Z e já não recebe rotação de 180 graus.
- IA passa a orientar zumbis na direção real do movimento e volta a mirar no alvo durante a mordida ou quando parado.
- Mantidas colisões, combates, salvamentos e demais tipos de inimigo.
- Novo teste de simulação de caminhada e desvio de obstáculo (`tests/v212-zombie-facing.mjs`).

## v2.1.1 — Calibração do zumbi REV2 e impacto de ataques

- Modelo REV2 original (22 ossos, oito animações) mantido, com altura ajustada a aproximadamente **2,48 unidades** para aproximar o personagem jogável de aproximadamente **2,50 unidades**, incluindo o chapéu.
- Orientação ajustada: modelo REV2 olha para +Z e acompanha o mesh.lookAt do inimigo sem girar de costas.
- Mordida aplica dano após **0,56 s**, agarrão tóxico após **0,85 s**, golpes rápidos após **0,44 s**. IA revalida alcance e obstáculos no momento do impacto; esquiva ou morte cancela o dano tardio.
- O agarrão representa a tentativa e o impacto visual; ainda não implementa IK/mãos prendendo fisicamente o jogador.
- Conserva variantes, salvamentos existentes e fallback low-poly. O GLB tem cerca de 10,4 MB e poderá exigir boa GPU se vários inimigos estiverem próximos.

# v2.1 — estabilidade e desempenho (21/10/2026)

- **Estruturas:** agrupamento opcional de peças estáticas de mesmo material por estrutura com `BufferGeometryUtils.mergeGeometries`, sem alterar colisões, coordenadas ou salvamento. No teste mock de 12 peças, redução de 12 para 2 meshes estáticos sem alterar o pivô móvel.
- **Pausa:** no máximo 4 renderizações/segundo quando o jogador não está em controle; o relógio da simulação continua atualizado, e abas ocultas não renderizam.
- **Zumbis REV2:** o rig fica invisível e não atualiza seu esqueleto quando longe do jogador, sem remover o GLB original.
- **Resiliência:** fallback conserva geometrias originais quando a mesclagem não puder ser efetuada.
- **Testes:** 7 novos testes; a suíte completa tem 141 verificações. Testes estáticos e lógicos, sem FPS empírico ou partida completa verificada.
- **Compatibilidade:** mesma chave de save e mesmos arquivos de modelo. GitHub Pages estático sem build.

# v1.9 — Maior detalhamento de polígonos por perfil

- Novo gerenciador `src/render/geometry-detail.js` com níveis Mínimo/Médio/Alto e caixa procedural de cantos suavizados.
- Floresta: troncos 6/10/16 lados, copas 7/11/18, arbustos 8x6/12x9/20x14 e rochas com subdivisão somente em Alto.
- Recursos: cilindros, folhas, frutos, minérios, pedras, borda do poço com facetas por qualidade; geometrias pequenas reaproveitadas em todos os nós.
- Animais, jogador, guarda, monstros não-GLB, túmulos e mobiliário: facetas e silhuetas mais suaves.
- Evita custo em celular: modo Mínimo mantém malhas simples; culling já existente permanece; geração e itens salvos não mudam.
- Incluídos seis novos testes automatizados em `tests/v19-geometry.mjs`. Modelo zumbi REV2 original preservado.

# v2.1 — Zumbi animado REV2 integrado

O jogo carrega o modelo original `assets/models/zumbi_animado_REV2.glb` com GLTFLoader (Three.js 0.160.0), mantendo os 22 ossos, 8 animações e malha texturizada REV2. O arquivo é baixado só uma vez e o rig é clonado para cada infectado. As variantes normal, corredor, tóxico e gigante usam o mesmo modelo, ajustando escala e paleta, e selecionando clipes de caminhada, ataque e reação ao dano. IA, dano, veneno, invasões, guarda e saves antigos seguem preservados. Sem GLB/CDN, os inimigos permanecem temporariamente no visual low-poly antigo, sem travar o jogo.

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
