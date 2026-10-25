# Madruga Survival v2.5.0 — Exploração de ruínas e saque persistente

## Alterações efetivamente aplicadas

- Novo `src/world/exploration.js`: quatro locais independentes no mundo (Cabana do Lenhador, Posto de Primeiros Socorros, Oficina Abandonada e Depósito Esquecido), com parede/entrada transitáveis, telhados incompletos e objetos 3D simples, sem novos assets de rede.
- Doze recipientes únicos e recompensas determinísticas por semente + identificador do móvel, com recursos já disponíveis na mochila/receitas originais.
- Saque único por recipiente. A mochila cheia não consome a recompensa; não há resgate parcial ou duplicação.
- Colisores nas paredes, permitindo entrar pelos vãos das fachadas; limites de interação impedem recolher objetos atravessando a parede dos fundos.
- Distribuição independente da ordem das interações, com afastamento do acampamento, santuário, cemitério e uns dos outros; respeita as árvores e rochas do mundo.
- Descoberta permanente de local, orientação pelo HUD (ponto cardeal, distância e progresso), marcadores no minimapa e pontos de interesse com perigo moderado ou alto.
- Inimigos especiais de área são disparados somente na primeira visita, com limite global de quantidade e distância mínima de aparecimento do personagem.
- Salvamento retrocompatível: `exploration` opcional para partidas v2.4 e validação rígida dos dados novos no save v2.
- UI e título atualizados para a revisão v2.5.0.

## Arquivos principais

- `src/world/exploration.js` — regras puras, desenho de ambientes e estado dos móveis.
- `src/main.js` — criação, interação, HUD, eventos e salvamento.
- `src/ui/minimap.js` — marcadores de locais próximos ou descobertos.
- `src/gameplay/save-system.js` — validação de progresso de exploração.
- `index.html`, `styles/main.css` — pistas e mensagens para PC e celular.
- `tests/v250-exploration.mjs` — regressões da nova funcionalidade.

## Testes reproduzidos

- `npm run check`: aprovado.
- `npm test`: aprovado, 285 verificações com resultado `OK`, incluindo 25 testes novos v2.5.
- Simulação de distribuição (150 seeds x 3 opções gráficas = 450 mundos) reproduzindo amostras de árvores e rochas do gerador da floresta: quatro locais em todos os casos testados.
- Integridade do ZIP e arquivos `.b64` com manifesto reconstruível: verificar na entrega.
- Teste visual Playwright + Chromium: não concluído. O navegador do ambiente bloqueou o acesso HTTP local com `ERR_BLOCKED_BY_ADMINISTRATOR`. Não há alegação de FPS, colisão visual ou partida jogada.

## Pendências e próximos ajustes

- Verificação manual do caminho de entrada e posição exata dos móveis no mundo WebGL.
- Melhorar o sistema de fachada/móveis com LOD ou instanciamento caso se amplie muito a quantidade de locais.
- Adicionar eventos de narrativa, minimissões e componentes raros de fabricação, após validar a experiência de exploração real.
- Dados do novo saque são salva-os na chave já usada `madrugacraft.survival.v2`; nenhuma migração destrutiva.

**Publicação:** esta entrega é uma revisão do código em ZIP; não foi publicada automaticamente no GitHub.
