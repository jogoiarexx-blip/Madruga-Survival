# 🌲 MadrugaCraft 3D — Sobrevivência v1.4

Um jogo 3D em **Three.js** com floresta, inimigos, coleta, crafting, sobrevivência e construção modular de bases. A v1.4 conserva sobrevivência, defesa, caça, pesca, horta, culinária, construção e mineração e acrescenta progressão independente em oito profissões.

**GitHub Pages:** o projeto usa apenas HTML, CSS e módulos JavaScript. **Não precisa de build, framework nem backend.** Os caminhos de import são relativos ao `index.html` e existe o arquivo `.nojekyll`. O motor Three.js 0.160.0 ainda vem do jsDelivr por import map: é necessária uma conexão com a CDN para iniciar o jogo.

## NOVO na v1.4 — evolução real de habilidades

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

O sistema **só entrega XP por ações bem-sucedidas**. Ex.: tentar pescar sem água ou sem vara não aumenta a perícia; desmontar construções não gera XP, evitando um ciclo gratuito. O XP total é persistido no mesmo save. Se a partida foi criada antes da v1.4, as profissões são adicionadas automaticamente no nível 1, sem apagar progresso da v1.3 ou anteriores.

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

1. Extraia o ZIP da v1.4.
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
src/gameplay/save-system.js    Saves compatíveis com v1.0, v1.1, v1.2, v1.3 e v1.4
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

- Os **90 cenários/conjuntos de teste** (incluindo 13 casos novos na v1.4) passaram em `npm test` no Node; a verificação sintática com `npm run check` também passou.
- A interface responsiva reaproveita a base testada na v1.2 em **1366×768, 390×844, 844×390 e 320×640**; os novos botões v1.3 ainda precisam de verificação visual em navegador com Three.js disponível. Isso não equivale a uma partida 3D validada.
- **Partida completa com WebGL/Three.js não foi validada neste ambiente**, pois as requisições externas à CDN não estavam disponíveis. O funcionamento gráfico final deve ser conferido depois da publicação no GitHub Pages ou num navegador que tenha acesso à CDN.
- A invasão tem perseguição e escolha de alvos próximas ao jogador, mas os inimigos ainda não possuem navegação complexa nem destroem baús; os modelos ainda são low-poly; não há encaixe livre em qualquer ângulo nem edição voxel por bloco. A física das bases é 2D no plano XZ; a IA possui colisão e obstrução de linha de visão, mas não faz planejamento de rotas complexo.
- O progresso é armazenado no `localStorage` da origem/navegador. Não sincroniza entre celulares e computadores.

> **Testes antigos:** `testes.mjs` e `tests/regression.mjs` são vestígios de testes da campanha antiga e não foram adaptados ao modo livre; execute `npm test` para a suíte válida da v1.4.
