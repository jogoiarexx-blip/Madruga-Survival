# MADRUGA SURVIVAL — AUDITORIA DE EVOLUÇÃO E CHECKLIST MESTRE

> **Data:** 31/10/2026  
> **Base auditada:** branch main, commit [ac1f26e](https://github.com/jogoiarexx-blip/Madruga-Survival/commit/ac1f26ed84ad0f9b8dc34e2fa27bf7b9e8e6f021), versão 2.52.0 (28/10/2026).  
> **Método:** leitura estática dos fontes, estrutura, relatórios, testes e histórico de GitHub Actions. **Nenhum teste visual, jogada humana, medição nova de FPS ou alteração no gameplay foi realizado nesta auditoria.**  
> **QA existente na base:** [workflow de QA concluído com sucesso](https://github.com/jogoiarexx-blip/Madruga-Survival/actions/runs/40744235062) e [deploy Pages concluído com sucesso](https://github.com/jogoiarexx-blip/Madruga-Survival/actions/runs/40744234226). Isso não equivale a certificar qualidade artística, ergonomia ou funcionamento de todos os caminhos em navegador real.

## Como usar continuamente

- **[x] Existente no código:** funcionalidade localizada e inspecionada; não quer dizer certificada visualmente.
- **[ ] Pendente:** implementação, revisão ou validação ainda necessária.
- **P0:** impedir regressões, salvar progresso e obter evidências de funcionamento; **P1:** salto de qualidade perceptível; **P2:** expansão; **P3:** polimento.
- Não marcar algo como concluído apenas porque um teste estrutural encontrou a função. Exigir teste automatizado apropriado + execução humana/WebGL onde aplicável.
- Antes de qualquer mudança importante registrar: commit base, cenário reproduzido, causa, captura, FPS p50/p95, draw calls, triângulos, memória (se disponível), resultado e commit final. Preservar saves existentes, controles PC/mobile e fallback gráfico.

## 1. Diagnóstico do estado atual — confirmado no código

| Área | Já existe e deve ser preservado | Lacuna observável / risco a validar | Prioridade |
|---|---|---|---|
| Menu principal | Prévia 3D estática do Madruga, preparação de shaders, iniciar/continuar, qualidade baixa/média/alta; menu sem simulação contínua | Falta uma identidade visual mais forte, composição/escala/legibilidade refinada e testes de navegação mobile/teclado; prévia usa WebGL sob demanda | P1 |
| Gráficos/LOD | Distância de visibilidade com histerese; duas representações de copa de árvore; geometrias por qualidade; instancing de mato, flores, arbustos e lagoa; batching de estruturas | LOD desigual entre famílias de objetos; não há orçamento global de triângulos/VRAM registrado por cena | P1 |
| Texturas | Terreno com textura procedural 128x128, cor por vértice, material de água procedural leve; materiais reutilizados em vegetação | Terreno usa anisotropia fixa 16; repetição 32x32 pode evidenciar padrões; caverna usa rochas predominantemente de cor lisa e pouca variação material | P1 |
| Ciclo dia/noite | Relógio de 480 s por dia, posição/intensidade do Sol, ambiente, neblina e fundo mudam durante o jogo | Não há malhas visíveis próprias para disco solar ou Lua; testar sombras/contraste nas transições e custo do mapa de sombras | P1 |
| Caverna | Entrada ligada às Tecelãs, arena circular, pedras, cristais finitos, 2 luzes de ponto, Rainha com fase enfurecida, câmera limitada, progresso salvo | Arena pequena (raio 12,2), com teto central intencionalmente aberto; composição/cobertura, piso, paredes, sinalização e variação visual merecem evolução; entrada/saída reposicionam o jogador | P1 |
| Aranha | GLB animado, ataques, teia, salto físico e correção procedural das oito patas perto do jogador | Relatório da REV290 declara pendência de certificação visual em declives/obstáculos; peso do rig exige orçamento para dispositivos fracos | P1 |
| Madruga | REV5 com animações reais, foot IK, troca de armas, combos com fases de impacto, reações e esquiva | Avaliar foot sliding, blends, cancelamentos de ataque e sincronização do contato com o dano em gameplay real | P1 |
| Chaves | Rig carregado por partes, combate, seguimento, defesa, patrulha, coleta, agricultura, depósito, rota e preferências | Animações são escolhidas por estado simplificado e blend fixo de 0,18s; navegação e trabalho sob estruturas complexas precisam teste de estresse | P1 |
| Craft | Receitas separadas por estação; mochila com busca, filtro, quantidade e “só possíveis”; bancada com tela própria e validação dos materiais | Bancada se concentra em botões/textos; faltam prévia visual consistente do item, receita selecionada, origem dos recursos e progressão clara | P1 |
| Missões | Nove missões opcionais com contadores e persistência; orientação para parte dos objetivos | Progressão principal linear e curta, sem objetivo específico de caverna/Rainha; faltam variedade de encontros, narrativa e consequências no mundo | P1 |
| Performance/QA | Profiler p50/p95/p99, frames lentos, draw calls, frame driver sem RAF permanente no menu, testes Node/CI | Sem FPS de dispositivos reais nesta auditoria; cobertura automatizada não comprova qualidade WebGL, fluidez de animação ou experiência de 20+ minutos | P0 |
| Organização | Código modular por sistemas + muitos testes | src/main.js reúne cerca de 2.174 linhas e várias responsabilidades; index.html concentra marcação longa; risco de regressões ao crescer | P2 |

**Fontes principais:** [main.js](../src/main.js), [quality.js](../src/render/quality.js), [visibility.js](../src/render/visibility.js), [forest.js](../src/world/forest.js), [terrain.js](../src/world/terrain.js), [arachnid-cave.js](../src/world/arachnid-cave.js), [player-rev5.js](../src/characters/player-rev5.js), [villager-guard.js](../src/characters/villager-guard.js), [survival-ui.js](../src/ui/survival-ui.js), [workbench-ui.js](../src/ui/workbench-ui.js), [mission-progress.js](../src/gameplay/mission-progress.js), [RELATORIO-REV290.md](../RELATORIO-REV290.md).

## 2. Checklist priorizado por sistema

### A. Menu principal, pausa, HUD e experiência inicial — P1

- [ ] Criar identidade visual própria: fundo de floresta com ilustração/previsão estática comprimida; sem mundo inteiro ou IA rodando atrás do menu.
- [ ] Reorganizar hierarquia: **Continuar**, **Nova sobrevivência**, **Opções**, **Controles**, **Créditos**; preservar acesso ao save e evitar apagar progresso sem confirmação.
- [ ] Prévia opcional de Madruga com enquadramento, chão, luz de recorte e fallback 2D se o GLB ou WebGL falhar.
- [ ] Ajustar tipografia, alinhamentos, contrastes, foco por teclado e toque; eliminar excesso de emojis na interface final por conjunto coerente de ícones vetoriais.
- [ ] Tela de opções com qualidade, resolução interna/render scale, sombras, sensibilidade, campo de visão, volumes, tela cheia e acessibilidade; persistir ajustes.
- [ ] Unificar estilo da mochila, bancada, fogueira, construção e pausa; garantir que sobreposições não competem por teclado/câmera.
- [ ] Oferecer mapa/objetivo compacto e expandido sem inundar HUD.
- [ ] Testar 360x740, 390x844, 768x1024 e desktop; garantir áreas seguras, botão de retorno e nenhuma rolagem acidental do mundo.

**Aceite:** iniciar/continuar/pausar/retomar sem loops extras; prévia falha de modo seguro; todos os controles acessíveis em PC e touch; save preservado.

### B. Gráficos, texturas, materiais reutilizados e LOD — P1

- [ ] Inventariar texturas, materiais, geometrias e GLBs reais; localizar duplicação por igualdade de conteúdo, não apenas nomes parecidos.
- [ ] Criar catálogo de materiais compartilhados (terra, madeira, pedra, folhas, metal, tecido), evitando Texture/Material novos por objeto idêntico.
- [ ] Melhorar terreno com 2–3 variações de detalhe procedural/atlas para solo, trilhas e bordas, sem textura de alta resolução em toda a superfície.
- [ ] Revisar UV, repetição, sRGB, normal, roughness, transparência, mipmaps e filtros; ajustar anisotropia por perfil em vez de forçar 16 em todos os aparelhos.
- [ ] Variar árvores/rochas visualmente por escala, rotação e tonalidade seeded, sem aumentar draw calls desnecessariamente.
- [ ] Estender LOD com histerese para estruturas decorativas, ruínas, ninhos, cristais, itens distantes e grupos de inimigos; **não** reduzir colisores nem desativar lógica essencial junto da malha visual.
- [ ] Revisar sombras: ativar casts somente em objetos relevantes, limitar distância, reduzir shadow map em low/medium, estabilizar bordas sem cintilação.
- [ ] Usar InstancedMesh para conjuntos realmente repetitivos e Mesh/SkinnedMesh separado para objetos interativos/animados. Não aplicar batching a portas/animados.
- [ ] Na caverna, compartilhar geometria de rochas e cristais semelhantes; hoje parte das paredes/lajes cria geometrias repetidas na geração.
- [ ] Implementar telemetria por setor: draw calls, triângulos, materiais, skinned meshes, texturas carregadas, tempo de CPU por atualização.
- [ ] Limitar qualidade de partículas/vegetação distante pelo perfil; garantir que mudanças de preset não corrompem materiais ou sombras.

**Aceite (metas, NÃO medições atuais):** desktop 1080p/high visando 60 FPS, p95 de frame até 20 ms; celular intermediário/low visando 30 FPS, p95 até 33 ms após aquecimento. Medir e redefinir metas se hardware real exigir.

### C. Caverna da Aranha e Rainha — P1

- [ ] Reprojetar leitura espacial da entrada/saída, corredor de aproximação, arena da Rainha e áreas de cristais. Preservar identificadores e estados salvos.
- [ ] Substituir a sensação de círculo aberto por paredões, arcadas, estalactites e teto parcial que respeitem a câmera; **não fechar o teto** sem validar oclusão/colisão.
- [ ] Adicionar piso rochoso irregular de baixo custo, detalhes de umidade, teias, casulos, ovos, ossos e fungos com material compartilhado.
- [ ] Criar 2 ou 3 variações de rocha (textura atlas/vertex colors) e agrupamento para afastar o aspecto geométrico repetido.
- [ ] Posicionar luzes frias/âmbar pontuais sem sombra dinâmica; usar emissive barato nos cristais e teias para legibilidade.
- [ ] Dar leitura clara ao ataque da Rainha: preparação visual, área de risco, momento de contato, recuperação e transição de fase.
- [ ] Criar pequenas situações antes da Rainha (teias que desaceleram, aranhas menores, coleta para preparar itens), sem spawn infinito.
- [ ] Adicionar áudio ambiente espacial e reverberação simulada leve; atenuar exterior dentro da caverna.
- [ ] Revalidar câmera, limites da arena, portal de saída, entrada/saída após save/load, morte, reinício e cristais não duplicados.
- [ ] Se o teleporte for mantido, introduzir transição curta com fade e reposicionamento seguro; um acesso contínuo exigiria mudança maior na topologia do mundo.

**Aceite:** completar entrada → arena → Rainha → cristal pós-chefe → saída; testar com save novo e antigo, low/medium/high, sem atravessar paredes, sem cristais duplicados, sem câmera dentro de rochas.

### D. Animações de Madruga, combate e fluidez — P1

- [ ] Reproduzir Idle→Walk→Run→Stop→Idle com câmera e velocidade variável; medir deslizamento e contato dos pés.
- [ ] Ajustar blend conforme ação (locomoção, giro, golpe, impacto, salto), sem usar a mesma duração para tudo.
- [ ] Sincronizar evento de dano com janela visual de impacto por arma, mantendo hitboxes e regras atuais.
- [ ] Melhorar leitura de ataque leve, pesado/combo e especial: antecipação curta, arco, impacto, recoil e recuperação.
- [ ] Implementar buffer de comandos responsivo e cancelamentos controlados sem permitir spam, múltiplos danos ou ataques quando bloqueado.
- [ ] Ajustar posição/orientação de vassoura, marreta, lança e versões aprimoradas em toda a sequência, com armas ligadas ao osso da mão.
- [ ] Corrigir IK quando o pé estiver fora de alcance ou em declive; limitar correção para não deformar joelhos.
- [ ] Oferecer reações visuais e sonoras proporcionais para inimigo atingido, bloqueio, morte e golpes no ar.
- [ ] Otimizar mixer/ossos para inimigos distantes sem congelar a pose de modo perceptível.
- [ ] Testar com FPS estável e quedas artificiais para checar eventos de animação, combate e colisão.

**Aceite:** todos os golpes visivelmente conectados ao momento de dano; nenhum dano duplo; foot sliding reduzido em testes comparativos; animação não reinicia sem necessidade.

### E. Chaves: inteligência, animação, combate, coleta e trabalho — P1

- [ ] Mapear os nomes reais de todos os clipes do GLB e documentar sua utilização (idle, walk, run, shoot, hit, death e demais disponíveis).
- [ ] Introduzir estados claros de trabalho: seguir, defender, patrulhar, coletar, regar, colher, depositar, descansar e escapar de bloqueios.
- [ ] Diferenciar animação de coleta/plantio de caminhar/ficar mirando; só usar clipe existente ou animação procedural validada.
- [ ] Suavizar rotação, aceleração e desaceleração; evitar alternância rápida entre caminhar e mirar.
- [ ] Testar pathfinding em bases com cercas, portas abertas/fechadas, plataformas, escadas, lagos e bordas; impedir atravessar estruturas.
- [ ] Medir replanejamento e detecção de preso; recuperação segura antes de considerar teleporte (teleporte nunca silencioso como solução padrão).
- [ ] Tornar confiável a logística de baús: inventário cheio, carga máxima, baú removido, recursos não permitidos, baú fora do alcance.
- [ ] Melhorar painel de ordens com tarefa atual, alvo, itens na cesta, motivo de bloqueio e prioridades por recurso.
- [ ] Melhorar combate a distância: checar linha de visão, orientação, tiro no frame correto, sem acertar através de paredes.
- [ ] Testar sobrevivência após save/load e reanimação, conservando preferências, posicionamento e carga.

**Aceite:** Chaves completa ciclos de coleta/depósito em cinco layouts de base, sem atravessar paredes, sem perder recursos, com animações coerentes.

### F. Craft, bancada, fogueira, mochila e construção — P1

- [ ] Preservar busca/filtros/lotes e a regra de materiais da mochila + baús elegíveis.
- [ ] Criar layout por duas áreas: receitas à esquerda; seleção com imagem/modelo leve, custo disponível/faltante, estação e efeito à direita.
- [ ] Tornar explícitos **Fabricar 1**, **Fabricar 5**, **Fabricar máximo** (somente nas receitas que aceitam lote).
- [ ] Destacar desbloqueios, receitas únicas, melhorias equipadas e requisitos encadeados sem oferecer botões impossíveis.
- [ ] Mensagens informativas de erro: qual recurso falta, qual bancada é necessária, espaço insuficiente, item já criado.
- [ ] Mostrar origem dos materiais (mochila/baú) sem permitir consumir de depósitos fora do alcance.
- [ ] Compartilhar linguagem visual entre bancada, fogueira, construção, reparo e recipientes; não reabrir a mochila atrás de outra UI.
- [ ] Melhorar prévia de construção: encaixe, inclinação, área válida, colisão, direção de abertura de porta e sombra indicativa barata.
- [ ] Garantir transação atômica: falha nunca gasta ingrediente, upgrade único não duplica, save recarrega resultado.

**Aceite:** fabricar, cancelar, repetir lote, consumir de baú, abrir/fechar UI e salvar/restaurar sem duplicação ou perda.

### G. Missões, exploração e progressão — P1/P2

- [ ] Preservar as nove missões atuais para saves antigos; não renumerar seus IDs.
- [ ] Criar quadro de objetivos: principal, secundários, sobrevivência diária e eventos de ameaça; acompanhar a missão ativa sem sobrecarregar HUD.
- [ ] Incorporar linha narrativa da caverna: investigar ninhos → localizar entrada → preparar antídoto/armadura → enfrentar Rainha → obter cristal → fabricar equipamento.
- [ ] Acrescentar missões com Chaves: recrutar, instruir coleta, defender acampamento, recuperar suprimentos e construir abrigo.
- [ ] Integrar lagoa, pescaria, ruínas, cemitério, santuário e agricultura com objetivos e recompensas próprios.
- [ ] Usar marcações por distância/orientação, sem destacar tudo simultaneamente no minimapa.
- [ ] Introduzir eventos variados de exploração com gatilhos por local/tempo/progresso, protegendo saves antigos.
- [ ] Dar feedback ao concluir tarefa (som discreto, atualização de objetivo, recompensa e próximo passo).
- [ ] Testar missões aceitas antes/depois da conclusão de condições, saves legados, recompensas uma única vez e ausência de bloqueio de campanha.

**Aceite:** completar os objetivos iniciais e ao menos um arco de caverna/Chaves sem travar a progressão.

### H. Sol, Lua, céu, sombras e atmosfera LEVES — P1

**Situação observada:** a iluminação e cor do cenário já variam conforme o relógio; falta a representação visual de Sol e Lua. Não substituir o relógio existente.

- [ ] Criar um disco solar simples com MeshBasicMaterial (ou sprite leve) e halo sutil; posicionar pela direção já calculada para a luz solar.
- [ ] Criar Lua como disco/plano texturizado pequeno (ou geometria simples), visível somente na faixa noturna; sem modelo detalhado ou sombras próprias.
- [ ] Manter astros a distância visual fixa/céu, sem colisão e sem render-to-texture, cubemap dinâmico, volumetria ou pós-processamento pesado.
- [ ] Suavizar cores de amanhecer, tarde, pôr do sol e noite com interpolação; reaproveitar fog/background/ambient já existentes.
- [ ] Controlar o custo: no máximo alguns draw calls adicionais, sem alocação de geometria/material por frame; opcional desativar halo em low.
- [ ] Corrigir orientação, clipping, visibilidade durante câmera livre e transições; esconder Sol e Lua dentro da caverna.
- [ ] Testar hora de dormir, retomada de save, mudança de qualidade e ausência de iluminação noturna excessiva.

**Aceite:** ciclo visual contínuo sem picos de FPS; Sol, Lua e luz coerentes em todos os horários.

### I. Mundo, ecossistema, som e gameplay extra — P2/P3

- [ ] Variar árvores, troncos, pedras, trilhas, arbustos, ruínas e decoração com maior intenção artística; evitar saturação de objetos.
- [ ] Aperfeiçoar lagoa preservando shader leve e LOD de peixes/vegetação aquática existentes.
- [ ] Melhorar qualidade de interação de portas, janelas e escadas com animação/sons discretos e testes de colisão.
- [ ] Ajustar animais para reação a visão, ruído e cobertura; sem detectar jogador através de obstáculos.
- [ ] Reavaliar nascimentos e deslocamento de inimigos para evitar aparições visíveis ao lado do jogador.
- [ ] Melhorar ambientação sonora por bioma, caverna e horário, com orçamento de vozes, sem zumbido ou clips contínuos sobrepostos.
- [ ] Garantir partículas de ataque, coleta e fogo leves e objetivas; sem ofuscar telemetria ou câmera.
- [ ] Revisar densidade de HUD e legibilidade em dispositivos menores.

### J. Engenharia, estabilidade e QA — P0/P2

- [ ] Congelar baseline de desempenho com gravação de 3 rotas: acampamento→floresta→ruínas; base construída→Chaves→lagoa; ninho→caverna→Rainha→saída.
- [ ] Registrar FPS/p50/p95/p99, quantidade de draw calls, triângulos, memória estimada, carregamentos, erros de console e interrupções >50ms.
- [ ] Verificar perfil low com modelos opcionais indisponíveis; nenhuma falha de download deve impedir gameplay básico.
- [ ] Validar 30 minutos de jogo por perfil e sessão de 10 minutos após load de save legado.
- [ ] Revalidar integridade do save v2, builds estáticos do Pages, modo offline/cache e migração de novidades.
- [ ] Fazer testes de troca de qualidade em tempo real e de browser tab oculto/retorno.
- [ ] Extrair responsabilidades de src/main.js gradualmente para controladores (clima/céu, cave orchestration, HUD, input), **sem refatoração ampla antes de estabelecer testes de comparação**.
- [ ] Adicionar smoke test visual automatizado de menu, entrada em partida e principais painéis; registrar screenshots e console. Complementar com teste manual em hardware real.
- [ ] Atualizar relatório antes/depois em cada revisão: mudanças reais, arquivos, testes executados, não executados, métricas, riscos e próxima prioridade.

## 3. Ordem de execução recomendada — ciclos de evolução

| Ciclo | Entrega principal | Evidência obrigatória |
|---|---|---|
| REV-A (baseline) | Reproduzir QA, capturar imagens e métricas reais; inventariar materiais e assets | Relatório de estado/commit, saves de teste, screenshots e benchmark |
| REV-B (alto impacto visível) | Menu mais profissional, craft/bancada e Sol/Lua leves | Comparativo de layout PC/mobile, controle por teclado/toque e FPS |
| REV-C (conteúdo forte) | Caverna da Aranha com rochas, composição, leitura da Rainha e iluminação | Partida completa da caverna, save/load, colisão/câmera e custo de render |
| REV-D (personagens) | Blends, foot IK e ataques do Madruga; estados/animações do Chaves | Vídeo/replay de combate e coleta, hit windows e travamentos de navegação |
| REV-E (progressão) | Missões ligadas à caverna, Chaves, ruínas e sobrevivência | Fluxos de missões completos e testes de migração |
| REV-F (consolidação) | LOD expandido, reuso de recursos, correções de regressão e limpeza modular | Antes/depois de draw calls, triângulos, p95 e uso de memória |

**Regra:** problemas reproduzidos de save, colisão impeditiva, erro JavaScript ou bloqueio de missão assumem P0 e passam na frente de qualquer melhoria visual. Sem problema reproduzido, o trabalho é melhoria planejada — não “bug corrigido”.

## 4. Critérios de certificação de cada revisão

1. **Fonte:** commit final e diff identificáveis, sem mistura de trabalho paralelo.
2. **Automação:** executar npm run check e npm test; registrar saídas e total de testes, sem afirmar execução quando ela não ocorreu.
3. **WebGL real:** iniciar do menu, carregar modelo REV5/Chaves/aranha, jogar os fluxos modificados; verificar console e visuais.
4. **Regressões:** saves antigos e novos, inventário, recursos, crafting, construção, missões, Chaves, Rainha e saída da caverna.
5. **Performance:** testar low, medium, high em pelo menos dois perfis de hardware; comparar p50/p95, draw calls e uso de recursos.
6. **Entrega:** atualizar este checklist marcando apenas itens com evidência e publicar relatório curto ANTES/DEPOIS com pendências reais.

## 5. Pendências de comprovação desta auditoria

- [ ] Testes npm e WebGL **não executados por esta auditoria**; o workflow remoto da base foi confirmado como bem-sucedido, mas não reproduzido localmente.
- [ ] Sem screenshots comparativos atuais do menu, craft, caverna, ataques e Chaves.
- [ ] Não há medição nova de FPS, triângulos, VRAM ou fluidez em celular/desktop.
- [ ] Sem conclusão sobre “bug de textura” específico: há oportunidades visuais identificadas em fonte, mas falhas precisam ser reproduzidas visualmente.
- [ ] Não há certificação de missão/caverna jogada manualmente do início ao fim.
- [ ] Todas as propostas acima permanecem **pendentes de implementação e validação**; este commit altera documentação, não executa melhorias do jogo.

## 6. Referências de código e QA

- [Menu/preview](../src/ui/menu-preview.js), [styles](../styles/main.css), [index](../index.html), [startup](../src/render/startup-scheduler.js)
- [Qualidade gráfica](../src/render/quality.js), [LOD/culling](../src/render/visibility.js), [instancing floresta](../src/world/forest.js), [LOD lagoa](../src/world/fishing-lake.js)
- [Cena, render loop e iluminação](../src/main.js), [relógio e missões](../src/gameplay/survival.js), [progresso de missões](../src/gameplay/mission-progress.js)
- [Caverna](../src/world/arachnid-cave.js), [aranha/IK](../src/characters/spider-leg-plant.js), [README de evolução](../RELATORIO-REV290.md)
- [Madruga REV5](../src/characters/player-rev5.js), [animator](../src/characters/wanderer/WandererAnimator.js), [combate](../src/gameplay/combat.js)
- [Chaves](../src/characters/villager-guard.js), [navegação](../src/gameplay/guard-navigation.js), [painel trabalho](../src/ui/guard-work-ui.js)
- [Craft](../src/ui/workbench-ui.js), [mochila](../src/ui/survival-ui.js), [regras](../src/gameplay/crafting.js)
- [CI QA base](https://github.com/jogoiarexx-blip/Madruga-Survival/actions/runs/40744235062), [CI Pages base](https://github.com/jogoiarexx-blip/Madruga-Survival/actions/runs/40744234226)

---
**Checklist vivo.** Atualizar status e evidências a cada revisão. Nunca apagar itens pendentes para aparentar que o jogo está concluído.
