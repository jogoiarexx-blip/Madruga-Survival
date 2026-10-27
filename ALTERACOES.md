## v2.29.1 — Goblin REV2 encontrável, identificado e restaurado com segurança

- Verificamos o GLB original (15 animações) e suas 24 partes compactadas: reconstrução bit a bit idêntica.
- O goblin inicial aparece num local livre à frente do jogador a 14–23 metros; mantém outro goblin patrulhando.
- Saves existentes recebem um encontro próximo apenas quando não houver goblin a menos de 42 metros, mantendo todos os inimigos salvos nas posições originais. Não gera novos encontros na caverna ou acima do limite de 12 inimigos.
- Goblins no minimapa têm pontos verdes, e o HUD mostra a distância do mais próximo dentro de 65 metros.
- Diagnóstico em `window.madrugaGoblinStatus` apresenta quantidade viva, modelo pronto, falhas, montagens animadas e distância.
- Corrige vazamento de referências de modelos ao restaurar saves: descarta visual dos inimigos antigos antes de remover suas malhas.
- 8 testes de regressão novos. Sem alterar o rig, as animações ou reduzir a geometria.

## v2.29.0 — Inimigos: geometria compartilhada e percepção por frame

- Geometrias dos inimigos procedurais agora usam um pool local por tipo, dimensão e perfil de qualidade, reduzindo reconstruções quando surgem criaturas iguais.
- Ossos, animações, transformações e materiais de cada inimigo continuam independentes (nenhuma redução de polígonos ou de efeitos gráficos).
- Geometrias compartilhadas não são destruídas ao derrotar uma única criatura: evita bugs de desaparecimento de outros inimigos que usam o mesmo buffer.
- IA de zumbis calcula o estado de percepção do jogador no máximo uma vez por quadro, preservando os estados de consciência por inimigo e a atualização de ataque e colisão a cada quadro.
- Contador de reutilização de geometria na opção de FPS para facilitar comparação durante combate.
- Testes novos: compartilhamento de buffers, material independente, descarte, qualidade e percepção em grupo.
- Limite: ganho depende da quantidade e dos tipos de criaturas; não há redução automática do número de draw calls nem benchmark de FPS em dispositivo real.

## v2.28.0 — Cache real para modelos 3D no GitHub Pages

- Guarda os bytes reconstruídos do REV5, zumbi, goblin e aranha em CacheStorage, identificados por SHA-256.
- Em aberturas seguintes, consulta o manifesto pequeno e lê o modelo localmente; não precisa baixar todas as partes quando houver cache válido.
- Valida tamanho, assinatura GLB/gzip e SHA-256 antes de reutilizar; cache inválido é descartado.
- Limpeza de versões antigas do mesmo personagem para liberar espaço.
- Navegação privada, falta de quota ou indisponibilidade da API não impedem o jogo de iniciar: usa downloads normais.
- Mantém GLTFLoader, rigs, animações, qualidade gráfica, save e sistema de loading existentes.
- Não prometemos aceleração no primeiro acesso: cache só beneficia acessos seguintes.
- Nova regressão unitária para integridade, cache hit, invalidação, fallback e sem efeitos no menu.

## v2.27.0 — Recuperação de partida e proteção de saves

- O scheduler interrompe o RAF após uma exceção de execução (não entra em um ciclo de erros ou congela sem aviso).
- Uma tela de recuperação informa que a partida foi interrompida, sem sobrescrever um checkpoint potencialmente válido.
- `Novo Jogo` não apaga o save antigo ao atingir 100% do loading: ele é substituído apenas no primeiro `saveProgress()` válido da nova partida.
- Mensagens de download do Striped Wanderer REV5 aparecem na tela de loading com o avanço real das 17 partes, sem criar percentuais fictícios.
- Mensagens de download antigas não continuam na fase seguinte do carregamento.
- Cache de HTML, CSS e entrypoint JavaScript atualizado para 2.27.0.
- Testes de regressão do RAF, save e loading incluídos; logs de modelos e qualidade visual permanecem inalterados.

## v2.26.1 — Correção crítica do HUD ao interagir com construções

- Corrige `TypeError: Cannot read properties of null (reading 'planted')` após o REV5 terminar o carregamento.
- A escolha da ação `[F]` avalia apenas o tipo de construção realmente próximo; portas, camas, baús e bancadas não acessam dados de plantação.
- Canteiros com dados incompletos mostram mensagem segura, sem interromper a renderização.
- Testes de regressão dos diferentes tipos de construções e carregamento de um save inválido.
- O aviso `GLTFLoader: Missing min/max properties` é um aviso não fatal do GLB, separado desta correção.

## REV226 (v2.26.0) — tela de loading entre menu e partida

- Loading responsivo com barra, percentual e tarefas reais concluídas para **Novo jogo** e **Continuar**.
- Renderizador, cenário e GLBs preparados antes de iniciar o loop de física/IA.
- Botão final **Entrar na partida** após 100% para liberação de Pointer Lock/áudio dentro de um clique real.
- Sem limpar o save anterior até o novo mundo estar pronto; retomada preserva dia, nível e itens.
- Erros críticos exibem opção de recarregar; modelos opcionais usam fallback.
- 7 novos cenários de teste (`tests/v226-adventure-loading.mjs`).

## v2.25.0 — Menu renovado, HUD compacta e REV5 pré-shader

# Madruga Survival v2.25 — Menu e HUD

- Menu redesenhado com título, nova partida, retomar, configurações e guia acessível.
- Prévia estática do personagem REV5 em cena dedicada com o **mesmo WebGLRenderer** da partida, após `requestIdleCallback` e sem loop de animação.
- Aquecimento de shaders e texturas do personagem no menu, usando o contexto real; floresta, IA e física continuam sem rodar.
- Menu usa ocioso para evitar atrasar a primeira interação; shader e upload são feitos de forma progressiva.
- HUD inicia compacta: detalhes das missões e estatísticas extras atrás de toggles com `aria-expanded`.
- Bloco enorme de comandos deixa de cobrir o centro inferior. Guia completo abre com F1, Ajuda ou botão no menu.
- HUD original e saves/crafting/hotbar/goblins foram preservados.
- Prévia única sem loop, mas há alocação WebGL e download REV5 no menu, deliberadamente para executar pré-shaders.
- Necessário conferir encaixe e screenshot visual em navegador real: suíte de testes não mede FPS.

## v2.22.0 — Preparação GPU e shaders

- Compilação antecipada assíncrona de materiais, texturas progressivas após iniciar, preparação dos GLBs antes de aparecer.
- Menu inicial continua sem renderização, downloads ou WebGL.

## v2.21.0 — Menu sem loop e assets sob demanda

- Renderização, downloads GLB, GPU e terreno 3D adiados até início da partida.
- Novos drivers com pausa de 4 FPS e suspensão na aba oculta.
- Carregamento sequencial prioriza REV5, depois zumbi REV2 e aranha, com fallback seguro.
- UI inicial modernizada sem remover conteúdo nem opções.
- Suíte de regressão integral aprovada; teste real no Chromium ainda pendente.

## v2.20.0 — Roda de Construção

- Botão dedicado para PC e celular; teclado Z e acesso no menu de pausa.
- Seletor radial de 10 estruturas com custo real do inventário e dos baús próximos.
- Seleção integrada à prévia holográfica existente; sem custos antes de confirmar.
- 12 novos testes de interface, inventário e navegação; regressão completa aprovada.
- A verificação visual em Chromium não concluiu neste ambiente.

## v2.17.0 — Mochila e pilhas persistentes

- 36 posições reorganizáveis (arrastar/soltar ou toque), dividir metade e reunir pilhas iguais.
- Persistência de posições com migração dos saves legados, sem transferir propriedade dos recursos do inventário antigo.
- Regressão completa e dez grupos novos aprovados; teste visual Chromium bloqueado pelo ambiente.

## v2.15.0 — Consumíveis acessíveis na tela
- Nova hotbar de 6 slots na parte inferior, com teclado 4–9 e uso por toque.
- Itens reconfiguráveis na mochila; exibe ícone e estoque da mochila, desativa slots vazios e sem recursos.
- Integração transacional ao consumo existente e persistência em save v2; migração de saves anteriores.
- Novos módulos `src/gameplay/consumable-hotbar.js`, `src/ui/consumable-hotbar-ui.js` e 14 testes dedicados.
- Validações: `npm test` e `npm run check` aprovados; WebGL real requer teste manual.

## v2.14.0 — Caverna e Rainha
- Câmera restrita à arena com raycast de paredes, iluminação e decoração rochosa, barra de chefe e telegraph de fase 2.
- Melhoria visual sem substituir nenhum GLB. Ver relatório técnico da revisão.

## v2.12.0 — Ninhos e exploração de aranhas
- Ninhos determinísticos; ovos coletáveis e eclosões finitas; teias no chão e minimapa.
- Novo loot de seda e quitina, curativo de seda e proteção de quitina na bancada.
- Estado de ninhos validado no save v2 e migrado de checkpoints antigos.
- 20 testes adicionais, 377 verificações no `npm test`, `npm run check` aprovado.

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

## v2.23.0 — Goblin animado substitui o Inimigo Comum

- `goblin.glb` analisado e rigado: 46 ossos, 6 animações originais; 9 movimentos gerados com SLERP (15 no total).
- Prévia interativa separada, modelo animado, golpes sincronizados, hitboxes frontais e compatibilidade dos saves.
- Asset de 13,5 MB carrega depois de iniciar o jogo, com fallback se estiver indisponível.
- Novo adaptador 3D, combate do goblin, testes regressivos, gerador de animação e relatório.
