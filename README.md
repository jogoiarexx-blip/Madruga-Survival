## v2.2.8 — Melhoria das armas, animações REV5 e craft

Veja `RELATORIO-REV228.md` para alterações e testes desta versão.

## v2.2.4 — Correção de osso da mão do Striped Wanderer REV5

- Corrigido o erro `Rig REV5 sem mixamorig:LeftHand` indicado no console.
- `GLTFLoader` do Three.js r160 remove o caractere `:` do nome do osso, expondo `mixamorigLeftHand`.
- Busca robusta por osso com nome normalizado, sem confundir dedos com a mão.
- Arma do jogo é ligada à mão real; caso a mão esteja ausente, o REV5 ainda substitui o jogador e usa um encaixe visual de reserva.
- Novo teste `tests/v224-rev5-hand.mjs` com o GLB real remontado das 17 partes e simulação de três variantes do nome.
- Mantida a correção de material `KHR_materials_unlit` da v2.2.3 e o sistema de salvamento existente.
- Testes locais e verificação de sintaxe aprovados; visualização WebGL real ainda depende da validação no navegador.

## v2.2.3 — Corrigido GLB REV5 que falhava no navegador

- O erro real foi `Cannot read properties of undefined (reading 'getMaterialType')` após baixar 17/17 partes.
- Causa: material de magia `Magic_Cyan` utiliza `KHR_materials_unlit`, mas o GLB exportado omitiu `extensionsUsed`.
- Novo `src/characters/rev5-glb-compat.js` declara a extensão antes do GLTFLoader interpretar o modelo.
- O reparo acontece depois da conferência SHA-256 e preserva geometria binária, 45 ossos e 17 animações.
- Regressão com o GLB real e recomposto pelas 17 partes: `tests/v223-rev5-materials.mjs`.
- Pacote local contém GLB otimizado com metadados corrigidos; arquivo original fica preservado.
- A validação visual da partida pública ainda depende do navegador do usuário.

## v2.2.2 — Correção do carregamento do jogador REV5

- Durante o download o corpo procedural antigo fica oculto; só retorna com mensagem de erro se todas as fontes falharem.
- O site tenta carregar as partes do REV5 pelo GitHub Pages, pelo GitHub Raw e pelo jsDelivr.
- A distribuição ZIP local contém o GLB REV5 otimizado, preservando 45 ossos, 17 animações e as três malhas do original; o original também está incluído.
- Verificação no console: `window.madrugaRev5Status` retorna `loaded`, `failed`, `oldVisualVisible` e `modelVisible`.
- Testes automatizados cobrem carregamento de reserva e a substituição visível, porém o jogo WebGL público requer verificação real no navegador.

## v2.2.1 — Correção do carregamento do jogador REV5 no GitHub Pages

- O GLB REV5 não está hospedado diretamente como arquivo binário no repositório; a versão pública usa 17 partes.
- Novo carregador com até seis downloads simultâneos, repetição em caso de falhas e verificação de integridade.
- Exibição de progresso e botão para repetir o carregamento se o modelo falhar.
- O corpo antigo só é mostrado como fallback quando houver erro; a causa aparece na tela.
- Preservados os 45 ossos, as 17 animações, as armas, os zumbis e os saves.
- A aparência final ainda precisa ser conferida em uma partida real no GitHub Pages.

## v2.2.0 — Personagem Striped Wanderer REV5 integrado

O protagonista procedural foi substituído visualmente pelo **Striped Wanderer REV5 original**, sem sobrepor dois corpos. O GLB inclui 45 ossos, 17 animações e acessórios. O objeto `player` permanece o mesmo para colisões, câmera, coordenadas e saves; se o GLB falhar, o avatar antigo reaparece como fallback. O modelo de 1,70 unidade foi dimensionado para aproximadamente 2,48 unidades, orientado para o eixo de ataque -Z. Armas do inventário são anexadas ao osso da mão esquerda e a espada extra do GLB permanece oculta para não duplicar armas. A magia do GLB só aparece no especial.

Movimentos implementados: Idle, Walking, Running, Jump, SwordAttack_REV3, CastMagic, HitReact e Death. Outras animações seguem incorporadas ao GLB para evoluções futuras. O dano continua sendo calculado pelo combate do jogo, não pelo marcador demonstrativo do visualizador do modelo. O IK do REV5 está incluído, mas desligado neste primeiro port por trabalhar com solo plano e poder deformar o pé no terreno irregular do MadrugaCraft.

Para validar: `npm test`, `npm run check`; abra o jogo por servidor HTTP (não `file://`). Não há comprovação de execução gráfica WebGL nesta revisão.

## v2.1.5 — Apoio dos pés REV2 e redução de deslizamento

- Adicionado controle de apoio de pé por ossos (`src/characters/zombie-foot-plant.js`), usando o quadril, joelho e pé esquerdo/direito originais do GLB REV2.
- Durante a passada, os pés tentam manter um ponto de apoio no terreno. A posição da sola é consultada na altura real do terreno (inclusive encostas), e duas iterações pequenas de IK corrigem a perna sem alterar a hitbox/collider.
- Contato alternado e transições suaves entre as pernas; desabilitado durante mordida, agarrão, dano ou morte.
- Cadência do clipe de andar/correr aumentada para ficar mais coerente com a velocidade do zumbi no mundo.
- Removida a oscilação vertical, pulso de escala e inclinação procedural nos zumbis com GLB: o rig original já anima o corpo.
- Ajustes de IK restritos aos zumbis a menos de 16 unidades do jogador; fallback seguro se o GLB não expuser os ossos esperados.
- Mantida a altura de **2,58 unidades** do zumbi normal e o GLB texturizado original, sem reprocessar a malha.
- Testes automatizados ampliados em `tests/v215-foot-plant.mjs`. A animação ainda precisa de validação visual em um navegador WebGL real.

## v2.1.4 — Zumbi REV2 maior e com menos deslizamento

- Altura base do zumbi normal aumentada para 2,58 unidades.
- Animação de caminhada/corrida agora acompanha melhor o deslocamento real no solo.
- Quando a colisão reduz a passada, o clipe locomotor também desacelera, diminuindo o deslizamento dos pés.

## v2.1.3 — Zumbis REV2: movimento e combate sincronizados

- Movimento reproduz animação de caminhada apenas quando o inimigo realmente avança, incluindo ao desviar de obstáculos.
- Durante mordidas, agarrões e golpes, a orientação fica travada até o fim da animação, evitando giro brusco para acertar o jogador por trás.
- Dano só ocorre no instante de contato e se o alvo permanecer à frente, próximo e sem obstáculos.
- Zumbi tóxico respeita os 1,85 s do agarrão antes de repetir; demais tipos aguardam suas animações.
- O fallback low-poly continua funcional se o REV2 não carregar.
- Verificações novas em `tests/v213-zombie-combat.mjs`. Sem sessão jogada WebGL validada neste ambiente.

## Publicação GitHub Pages do modelo REV2

O modelo original de 10,4 MB também está disponível em `assets/models/rev2-parts/` como 17 arquivos base64. No GitHub Pages o carregador remonta os bytes originais, confere o SHA-256 e passa-os ao GLTFLoader; em desenvolvimento local carrega o `.glb` diretamente. Isto contorna os limites de envio sem modificar a malha, as texturas ou o rig.

## v2.1.1 — Calibração do zumbi REV2 e impacto de ataques

- Modelo REV2 original (22 ossos, oito animações) mantido, com altura ajustada a aproximadamente **2,48 unidades** para aproximar o personagem jogável de aproximadamente **2,50 unidades**, incluindo o chapéu.
- Orientação ajustada: modelo REV2 olha para +Z e acompanha o mesh.lookAt do inimigo sem girar de costas.
- Mordida aplica dano após **0,56 s**, agarrão tóxico após **0,85 s**, golpes rápidos após **0,44 s**. IA revalida alcance e obstáculos no momento do impacto; esquiva ou morte cancela o dano tardio.
- O agarrão representa a tentativa e o impacto visual; ainda não implementa IK/mãos prendendo fisicamente o jogador.
- Conserva variantes, salvamentos existentes e fallback low-poly. O GLB tem cerca de 10,4 MB e poderá exigir boa GPU se vários inimigos estiverem próximos.

# v2.1 — Geometria aprimorada por qualidade

- **Mínimo/Médio/Alto:** geometrias de árvores, folhas, rochas, arbustos e coleta usam orçamentos de polígonos específicos em `src/render/geometry-detail.js`.
- **Personagens:** cabeça/rosto e chapéu mais suaves; braços, pernas e roupas com cantos realmente arredondados por deformação das malhas e normais recalculadas. Aldeão guarda e inimigos procedurais seguem o mesmo padrão.
- **Animais:** coelhos e javalis usam malhas esféricas mais densas no modo Alto, compartilhadas entre todos os indivíduos.
- **Objetos:** minério, madeira, fibras, água, frutos, fogueiras, camas, baús e lápides receberam facetas mais detalhadas conforme o perfil gráfico; geometrias repetidas continuam em cache.
- **Otimização:** `Mínimo` mantém contagem baixa; buffers das árvores e dos recursos só são preparados na geração do mapa; culling e salvamentos mantidos.
- **Zumbis REV2:** o GLB original articulado (22 ossos, 8 animações e malha texturizada REV2) não foi reprocessado. A versão 1.9 melhora o restante do mundo, mantendo o original do zumbi intacto.
- **Validação:** `npm test` + `npm run check`, incluindo seis testes novos de nível de detalhe, normais, geometrias compartilhadas e geração determinística. A execução visual WebGL ainda requer teste no navegador.

# v2.1 — Zumbi animado REV2 integrado

O jogo carrega o modelo original `assets/models/zumbi_animado_REV2.glb` com GLTFLoader (Three.js 0.160.0), mantendo os 22 ossos, 8 animações e malha texturizada REV2. O arquivo é baixado só uma vez e o rig é clonado para cada infectado. As variantes normal, corredor, tóxico e gigante usam o mesmo modelo, ajustando escala e paleta, e selecionando clipes de caminhada, ataque e reação ao dano. IA, dano, veneno, invasões, guarda e saves antigos seguem preservados. Sem GLB/CDN, os inimigos permanecem temporariamente no visual low-poly antigo, sem travar o jogo.

A cena 3D completa deve ser testada em navegador com suporte a WebGL e acesso ao jsDelivr. As rotinas de IK e desmembramento adicionais do pacote original não foram ativadas por razões de desempenho e compatibilidade.

# 🌲 MadrugaCraft 3D — Sobrevivência v1.7

Um jogo 3D em **Three.js** com floresta, inimigos, coleta, crafting, sobrevivência e construção modular de bases. A v1.7 conserva sobrevivência, defesa, caça, pesca, horta, culinária, mineração e oito profissões, além de zumbis variados, cemitério, aldeão guarda, prévia de construção e agora encaixe magnético entre módulos.

**GitHub Pages:** o projeto usa apenas HTML, CSS e módulos JavaScript. **Não precisa de build, framework nem backend.** Os caminhos de import são relativos ao `index.html` e existe o arquivo `.nojekyll`. O motor Three.js 0.160.0 ainda vem do jsDelivr por import map: é necessária uma conexão com a CDN para iniciar o jogo.

## NOVO v1.7 — Encaixe magnético para casas e bases

O modo de construção agora possui **Ímã ligado** por padrão. A prévia busca pontos úteis perto da posição que o jogador escolheu:

- **Paredes e portas** encaixam nas **bordas externas** de pisos de 3 × 3 metros, em vez de passarem pelo centro do cômodo.
- **Paredes e portas** também completam segmentos em linha e formam **cantos em L**, de acordo com a rotação escolhida.
- **Pisos** se alinham ao lado de outros pisos ou perto de paredes; **telhados** se alinham ao centro dos pisos ou ao lado de outros telhados.
- O ímã procura locais **livres**. Posições ocupadas continuam vermelhas/bloqueadas e não consomem recursos.
- Toque no botão **🧲 Ímã** na interface ou pressione **C** no PC para alternar entre encaixe automático e a grade tradicional de 3 metros.
- No PC use **G** ou no celular **↻ Girar** para escolher a orientação; **F/Enter/Confirmar** conclui, **Esc/Cancelar** desiste.
- Aumentei o limite para **160 estruturas** para permitir casas e bases maiores. A prévia segue sem colisão e **sem entrar no salvamento**; os materiais só são gastos após a confirmação.

**Compatibilidade:** o salvamento permanece `madrugacraft.survival.v2`. Casas antigas construídas na grade de 3 m conservam suas coordenadas. Novas peças em bordas de 1,5 m também são restauradas exatamente. Evite voltar para a v1.6 depois de construir novas bordas, pois a versão antiga não entende a precisão extra.

**Validação:** `npm test` executa 123 verificações da suíte atual, incluindo 11 testes novos em `tests/v17-snapping.mjs`. `npm run check` verifica a sintaxe. O jogo completo com WebGL ainda não foi testado no navegador neste ambiente (bloqueios ao abrir página local/CDN).

## NOVO v1.6 — Construir escolhendo o local antes de gastar

Agora, as **receitas de estruturas** não colocam mais a peça instantaneamente. Ao escolher fogueira, abrigo, piso, parede, porta, telhado, cama, baú, bancada ou canteiro, o jogo abre uma **prévia 3D sem colisão e sem gasto**. A forma do holograma é idêntica à da peça real: **verde** significa que está livre; **vermelho** significa que há obstáculo, sobreposição, limite do mapa ou falta de material. O sistema só debita os recursos **ao confirmar uma posição válida**. Cancelar mantém a mochila intacta. A prévia nunca entra no save.

**PC:** abra a mochila (I), clique em uma receita do grupo Construções; ande com WASD, olhe com mouse para ajustar a direção, use **←/→** para deslocar lateralmente, **↑/↓** ou roda do mouse para aumentar/reduzir a distância, **G** para girar 90°, **F / Enter / clique na cena** para confirmar, **Esc** para cancelar. Os atalhos B, H, V, M, N, K e L agora abrem a prévia diretamente, não constroem na hora.

**Celular:** selecione uma construção na mochila e ajuste usando os botões **←, →, ± distância, girar, confirmar e cancelar** que aparecem durante o posicionamento; o direcional continua funcionando para andar. O menu separa Construções, Equipamentos, Culinária e Reparos com custos claros. Ferramentas e comidas continuam sendo fabricadas imediatamente, usando o requisito da fogueira ou bancada quando necessário.

Ao construir, ganha XP de Construtor uma única vez. Não existe XP por prévia nem por cancelamento. O modo é descartado ao morrer ou abrir outro painel. A chave `madrugacraft.survival.v2` não foi alterada: saves anteriores continuam compatíveis.

## NOVO v1.6 — Mundo mais perigoso

- **Zumbis:** padrão, corredor (rápido), tóxico (envenena ao acertar) e gigante (mais resistente e perigoso).
- **Cemitério low-poly:** lápides, cripta, atmosfera sombria e inimigos adicionais quando se aproxima da área.
- **Aldeão guarda:** personagem recrutável com vida própria, patrulha e combate contra ameaças nas proximidades da base. Não concede recompensas ou XP de jogador pelos inimigos que ele derrota sozinho.

## Evolução de habilidades (desde v1.4)

Pressione **U** durante a partida para abrir o painel de profissões. No celular, toque na mochila e em **⭐ Ver evolução das habilidades**. O painel apresenta nível, barra de XP, benefício atual e atividade que aumenta a experiência. As oito profissões têm 20 níveis cada, independentes do nível geral de combate. O jogador não escolhe pontos manualmente: evolui ao executar ações que realmente funcionam.

| Profissão | Como ganhar XP | Benefício na jogabilidade |
|---|---|---|
| 🎣 Pesca | Capturar peixes na água | Menos tempo entre capturas a cada nível; mais peixes por captura a partir do nível 6 |
| 🌾 Agricultura | Plantar, regar e colher | Mais legumes por colheita a partir do nível 5; a irrigação dura mais |
| 🏹 Caça | Abater coelhos e javalis | Carne extra por animal a partir do nível 5 |
| 🏠 Construtor | Construir peças e reparar estruturas | Economia de materiais nas receitas de construção a partir do nível 6 |
| ⛏️ Mineração | Extrair pedras e ferro | Mais minério/pedra a partir do nível 6; a picareta gasta menos nos níveis altos |
| 🌿 Coleta | Recolher água, madeira, fibras e frutas | Mais recursos por coleta a partir do nível 6 |
| 🛠️ Artesanato | Fabricar equipamentos, ferramentas e cozinhar | Receitas mais econômicas e duas porções ao cozinhar a partir do nível 6 |
| 🔥 Sobrevivência | Passar para um novo dia ou dormir com segurança | Fome e sede diminuem mais devagar conforme o nível |

O sistema **só entrega XP por ações bem-sucedidas**. Ex.: tentar pescar sem água ou sem vara não aumenta a perícia; desmontar construções não gera XP, evitando um ciclo gratuito. O XP total é persistido no mesmo save. Se a partida foi criada antes da v1.5, as profissões são adicionadas automaticamente no nível 1, sem apagar progresso da v1.3 ou anteriores.

Os novos arquivos ficam em `src/gameplay/skills.js`, `src/ui/skills-ui.js` e `tests/v14-skills.mjs`. Também foram integrados `src/main.js`, as regras de pesca, agricultura, sobrevivência, mochila, HTML e CSS. **O projeto continua estático, sem build e publicável no GitHub Pages**.

## Novidades v1.3 — fauna, alimentação e casas cobertas

- **Animais selvagens:** 7 coelhos e 3 javalis no início da floresta (geração pela semente do mapa). Os animais andam e fogem ao perceber o jogador. Javalis causam dano se você encostar neles. Cace com cliques/J (golpes normais) ou golpe especial E: coelho fornece 1 carne; javali fornece 3. Novos animais podem surgir após algum tempo se forem caçados.
- **Vara de pesca:** fabrique com 3 madeiras, 5 fibras e 1 pedra, na mochila. Fique próximo à fonte de água e use **Y** ou o botão **🎣 Pescar**. Captura garantida de um peixe cru por ação, com intervalo de 28 segundos.
- **Canteiros de plantio:** construa com 3 madeiras, 2 pedras e 2 fibras. Colete arbustos de frutas com **F** para obter uma semente extra. Chegue ao canteiro e use **F** para plantar 1 semente, depois **F** para regar gastando 1 água. Crescimento continua durante a partida, acelerado quando regado. Ao amadurecer, use **F** para colher 3 legumes e recuperar 2 sementes.
- **Telhados modulares:** fabricados com 7 madeiras e 4 fibras; grade de 3 × 3 m com suporte a rotação. Um teto sobre a posição do jogador conta como abrigo contra o frio da noite. O telhado não impede a circulação por baixo.
- **Culinária:** asse o peixe cru com lenha na fogueira; cozinhe ensopado de legumes com 2 legumes e 1 água junto à fogueira. Consuma legumes, peixe assado ou ensopado na mochila. Carne crua e peixe cru não são consumíveis.
- **Salvamento compatível:** animais vivos, canteiros plantados, ingredientes e o tempo de espera da pesca são gravados no mesmo save `madrugacraft.survival.v2`. Saves anteriores da v1.0/v1.1/v1.2 migram com os recursos novos inicialmente zerados. **Evite abrir um save da v1.3 usando uma versão antiga**, porque os novos dados poderão não ser compreendidos.
- **Celular:** botão 🎣 na área de ações e botões de consumo e fabricação na mochila, sem instalar aplicativos externos.

## Recursos anteriores — v1.2 mineração e defesa da base

- **20 jazidas de ferro** distribuídas em áreas mais afastadas: use F perto de uma delas **com uma picareta inteira** para coletar 2 minérios. Cada mineração custa 4 pontos de durabilidade; jazidas regeneram após algum tempo.
- **Bancada de trabalho:** monte com 8 madeiras e 5 pedras. Aproxime-se (F abre a mochila) para fabricar uma picareta, melhorar a lança com ferro ou reparar equipamentos.
- **Ferramentas com desgaste:** picareta 80/80, marreta 100/100 e lança 90/90. Armas se desgastam quando acertam criaturas; a picareta se desgasta ao extrair minério. Ferramentas quebradas precisam de reparo.
- **Lança reforçada:** 6 ferros e 2 madeiras na bancada, soma +3 ao dano dos ataques normais com lança.
- **Invasões noturnas:** começam na **noite do segundo dia** quando há pelo menos uma construção. Invasores aparecem próximos ao acampamento e podem danificar paredes, portas, abrigos e bancada. Não miram baús nem camas; o conteúdo dos baús permanece protegido da destruição automática.
- **Integridade da base:** estruturas têm resistência própria, visual de dano e podem ser reparadas com **T** ou pelo botão da mochila, gastando 1 madeira ou 1 pedra. Vida e registro das invasões são salvos.
- **Migração automática:** partidas válidas da v1.0 e v1.1 são lidas com a mesma chave `madrugacraft.survival.v2`, sem apagar os recursos ou construções anteriores. As ferramentas antigas começam restauradas.

## Construções v1.1 preservadas

- **Pisos:** encaixam em uma grade de 3 × 3 metros; podem receber estruturas por cima.
- **Paredes:** impedem a passagem do jogador e dos monstros e bloqueiam ataques inimigos pela parede.
- **Portas:** podem ser abertas e fechadas com **F**. Fechadas impedem passagem; abertas liberam o acesso.
- **Cama:** funciona à noite. Aperte **F** perto dela para descansar até a manhã; consome fome e sede, restaura energia, aquece e recupera um pouco da vida. Não é possível dormir com criaturas próximas.
- **Baú:** use **F** perto dele. Guarda até **80 unidades** entre os tipos de materiais, com botões de guardar e retirar 1 ou 5. O baú não pode ser desmontado sem ser esvaziado.
- **Desmontagem:** aproxime-se de uma estrutura, use **X** ou o botão da mochila para recuperar parte dos ingredientes.
- **Rotação:** **G** ou o botão dentro da mochila gira em mais 90° a próxima peça. Peças modulares são orientadas de acordo com o personagem + rotação extra.
- **Compatibilidade:** saves v1.0 e v1.1 no `madrugacraft.survival.v2` continuam carregáveis sem conversão manual. O novo formato persiste portas abertas, orientação de móveis e materiais guardados nos baús. Não tente voltar para a v1.0 com um save que contém peças novas.

## Sobrevivência preservada

A floresta inclui recursos reaparecíveis (madeira, pedras, fibras, frutas e água), inimigos com diferentes ataques, coleta com F, sistema de níveis e XP, fogueiras que aquecem e permitem cozinhar, abrigos, corrida, esquiva, armas e HUD de fome, sede, energia, calor e dia/noite. **O modo é livre, sem missão linear obrigatória.**

### Receitas de construção

| Construção | Ingredientes | Uso |
|---|---|---|
| Piso de madeira | 3 madeiras | Base modular |
| Parede | 5 madeiras + 1 fibra | Defesa |
| Porta | 4 madeiras + 1 pedra | Entrada interativa |
| Cama | 5 madeiras + 4 fibras | Dormir durante a noite |
| Baú | 6 madeiras + 2 pedras | Guardar até 80 unidades |
| Bancada | 8 madeiras + 5 pedras | Ferramentas e reparos |

As receitas anteriores foram mantidas (fogueira, abrigo, marreta, lança e carne assada). Todos os materiais são coletados no cenário, e os pontos de coleta reaparecem com o tempo.

**Ferramentas e melhorias na bancada:** picareta (3 madeiras + 5 pedras), reforço de ferro para a lança (6 ferros + 2 madeiras), reparo de picareta (1 madeira + 2 pedras), reparo de marreta (2 pedras + 1 madeira), reparo de lança (2 madeiras + 1 ferro). Apenas equipamentos fabricados e danificados podem ser reparados.

### Teclado e mouse

| Comando | Ação |
|---|---|
| WASD/setas | Mover |
| Mouse | Olhar / câmera |
| F | Coletar/minerar, abrir/fechar porta, usar cama/baú e bancada próximos |
| I | Mochila, receitas, girar e desmontar peças |
| U | Abrir / fechar painel de habilidades (atalho ⭐ na mochila para celular) |
| B / H | Construir fogueira / abrigo |
| V / M / N | Piso / parede / porta |
| K / L | Cama / baú |
| G / X | Girar próxima peça / desmontar peça próxima |
| T | Reparar a construção danificada mais próxima (1 recurso) |
| 4 / 5 / 6 | Comer frutas / beber água / comer carne assada |
| R | Assar carne perto da fogueira |
| Clique/J | Ataque |
| E / Q | Especial / esquiva |
| Shift / Espaço | Correr / pular |
| 1 / 2 / 3 | Equipar armas fabricadas |
| P | Salvar imediatamente |
| Esc | Pausar / sair da mochila ou baú |
| F3 | FPS e draw calls |

**Celular:** há direcional, câmera por arrasto e botões para interação, ataque, especial, corrida, mochila/construção e pausa. Na mochila, toque na receita para construir, nos botões para girar, desmontar ou reparar estruturas. Em telas baixas, os painéis rolam verticalmente. Recomenda-se jogar na horizontal.

### Como posicionar

Fique em uma clareira, olhe para onde deseja construir e abra a mochila. Os módulos se encaixam em uma grade de 3 metros à frente do personagem e verificam obstáculos e peças existentes. O botão de rotação muda a orientação em 90° por vez; o giro adicional vale para as próximas peças. Para formar uma casa, coloque pisos próximos, crie uma sequência de paredes, reserve um módulo para uma porta e adicione baú e cama por dentro.

## Publicar no GitHub Pages

1. Extraia o ZIP da v1.5.
2. Entre na pasta `MadrugaCraft-Sobrevivencia` e envie **o conteúdo dela** para a raiz de seu repositório GitHub, incluindo arquivos ocultos como `.nojekyll` e as pastas `src/` e `styles/`.
3. Abra **Settings → Pages → Build and deployment → Deploy from a branch**, escolha `main` e `/ (root)`.
4. Abra `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/` após a publicação. A primeira conexão com a CDN deve estar liberada no navegador.

Não envie somente o ZIP como arquivo do repositório: os arquivos de `index.html`, `src` e `styles` precisam estar descompactados na raiz. Não há necessidade de publicar `node_modules`.

## Rodar e testar localmente

- Windows: execute `INICIAR-JOGO.bat` para iniciar o servidor local.
- Alternativa (Node 18+): `npm run dev`, abra `http://127.0.0.1:8765/`.
- `npm run check`: análise sintática de módulos principais.
- `npm test`: testes automatizados de estrutura, colisões, combate, sobrevivência, construções, baús, descanso e salvamento.
- **Não abra o HTML por `file://`**: os módulos JavaScript precisam de um servidor HTTP.

### Organização

```text
index.html                     Site, menus e painéis
styles/main.css                Estilos responsivos
src/main.js                    Loop e integração
src/gameplay/survival.js       Vida útil e receitas
src/gameplay/storage.js        Regras do baú e descanso em cama
src/gameplay/save-system.js    Saves compatíveis com v1.0, v1.1, v1.2, v1.3 e v1.5
src/world/buildings.js         Malhas e interação com estruturas (expandido)
src/world/building-rules.js    Grade, colisões e visibilidade de paredes
src/ui/survival-ui.js          Mochila e controles de construção
src/ui/storage-ui.js           Tela de armazenamento
src/ui/skills-ui.js            Painel de evolução de habilidades
src/input/touch-controls.js    Controles de toque
src/characters/                Avatares e animações
src/gameplay/tools.js          Uso e reparo de ferramentas
src/gameplay/farming.js        Plantio, crescimento, rega e colheita
src/gameplay/fishing.js        Vara, captura e intervalo de pesca
src/gameplay/skills.js         8 profissões, XP, níveis e bônus
src/world/wildlife.js          Fauna low-poly, caça, fuga e reaparição
src/gameplay/raids.js          Agendamento e histórico de invasões
src/gameplay/base-defense.js   Vida/reparo/alvos de estruturas
src/gameplay/                  IA, combate e projéteis
src/render/                    Câmera e opções gráficas
src/world/                     Floresta, terreno, coleta e colisões
scripts/                       Servidor de desenvolvimento
tests/                         Testes, incluindo base-building.mjs e storage.mjs
.nojekyll                      GitHub Pages sem Jekyll
```

## Limitações e validação

- Os **90 cenários/conjuntos de teste** (incluindo 13 casos novos na v1.5) passaram em `npm test` no Node; a verificação sintática com `npm run check` também passou.
- A interface responsiva reaproveita a base testada na v1.2 em **1366×768, 390×844, 844×390 e 320×640**; os novos botões v1.3 ainda precisam de verificação visual em navegador com Three.js disponível. Isso não equivale a uma partida 3D validada.
- **Partida completa com WebGL/Three.js não foi validada neste ambiente**, pois as requisições externas à CDN não estavam disponíveis. O funcionamento gráfico final deve ser conferido depois da publicação no GitHub Pages ou num navegador que tenha acesso à CDN.
- A invasão tem perseguição e escolha de alvos próximas ao jogador, mas os inimigos ainda não possuem navegação complexa nem destroem baús; os modelos ainda são low-poly; não há encaixe livre em qualquer ângulo nem edição voxel por bloco. A física das bases é 2D no plano XZ; a IA possui colisão e obstrução de linha de visão, mas não faz planejamento de rotas complexo.
- O progresso é armazenado no `localStorage` da origem/navegador. Não sincroniza entre celulares e computadores.

> **Testes antigos:** `testes.mjs` e `tests/regression.mjs` são vestígios de testes da campanha antiga e não foram adaptados ao modo livre; execute `npm test` para a suíte válida da v1.5.


Novidade v1.5: zumbis low-poly integrados ao ciclo noturno, invasões e salvamento.


## v2.1 — Desempenho estrutural

- Batching das peças rígidas (por material, usando BufferGeometryUtils) ao criar estruturas. Pivôs de portas/tampas, cultivos e chama continuam independentes. Há fallback se geometrias forem incompatíveis.
- Redução da taxa de desenho do cenário para até 4 FPS durante menus e pausas, sem alterar os tempos da física nem comprometer a interface HTML.
- Culling de modelos REV2 longe do jogador para evitar skinning e desenho desnecessários.
- Testes em `tests/v20-performance.mjs`. Para medição real, use F3 e compare draw calls com 100 paredes/pisos nas mesmas condições gráficas.

**Limitação:** não há benchmark WebGL real neste ambiente; FPS efetivo no hardware deve ser medido separadamente.
