# MadrugaCraft Sobrevivência v1.4 — profissões

Cada ação bem-sucedida rende XP de habilidade. As profissões são separadas do nível geral de combate. Todas alcançam até nível 20.

- **Pesca:** pescar perto de fonte de água com vara. A cada nível espera menos entre capturas; a partir do nível 6, ganha +1 peixe por captura, chegando até 4.
- **Agricultura:** plante uma semente, regue com água e colha no canteiro. XP diferente por ação. A partir do nível 5, a colheita aumenta; a água dura mais conforme a perícia.
- **Caça:** derrote coelhos e javalis, com bônus de XP maior para javalis. A partir do nível 5, cada animal fornece carne adicional.
- **Construtor:** construa pisos, telhados, paredes, portas, camas, baús, fogueiras, abrigos e canteiros; repare construções danificadas. Nível 6 e 11 dão descontos em receitas que exigem 3 ou mais unidades de cada material.
- **Mineração:** colete pedra e ferro com F (ferro exige picareta). A partir do nível 6, recursos extras; a durabilidade da picareta desgasta mais devagar nos níveis altos.
- **Coleta:** recolha madeira, água, fibras ou frutos para aprimorar a quantidade obtida por interação.
- **Artesanato:** fabrique ferramentas, equipamentos e comidas. Economize materiais com habilidade; nível 6 produz dois pratos por receita culinária.
- **Sobrevivência:** sobreviva ao nascer de um dia ou descanse até amanhecer com segurança. Quanto maior seu nível, mais lentamente fome e sede diminuem, com limite de 25% menos desgaste.

## Como consultar

- Computador: tecla **U**, botão **⭐ Habilidades** no topo ou o botão na mochila.
- Celular: botão de mochila **🧱** e opção **⭐ Ver evolução das habilidades**.
- Feche usando **✕**, ou tecla U/Esc no teclado. Níveis e bônus são aplicados imediatamente e salvos junto com a partida.

## Como publicar

Copie o conteúdo extraído da pasta `MadrugaCraft-Sobrevivencia/` para a raiz do repositório GitHub Pages, incluindo `.nojekyll`. Não exige compilação. A biblioteca Three.js v0.160.0 é importada da CDN jsDelivr, portanto o usuário ainda precisa de rede e WebGL.

## Testes

- `npm run check`: análise sintática.
- `npm test`: 90 verificações (13 novas, 77 anteriores).
- Layout do painel testado isoladamente em quatro resoluções no Chromium sem transbordamento horizontal.
- Não foi possível completar partida WebGL neste ambiente devido ao bloqueio das requisições externas à CDN.
