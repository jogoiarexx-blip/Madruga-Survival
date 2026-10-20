# Guia do jogador — MadrugaCraft Sobrevivência v1.2

## Evolução sugerida

1. Durante o primeiro dia, procure o poço, colha frutas e pegue madeira e pedra (F). Junte materiais suficientes para uma fogueira (4 madeiras + 4 pedras).
2. Crie abrigo e cama. A fogueira aquece durante a noite; a cama permite descansar em segurança quando não há inimigos próximos.
3. Construa paredes, uma porta e um baú para armazenar o excesso de materiais. As paredes bloqueiam criaturas e golpes comuns.
4. Faça uma bancada (8 madeiras + 5 pedras), aproxime-se dela e use **F** ou **I** para fabricar a picareta de pedra (3 madeiras + 5 pedras).
5. Explore além do acampamento e procure rochas escuras com veios brilhantes. Com a picareta funcionando, pressione **F** para minerar ferro. Cada coleta fornece 2 minérios e gasta 4 pontos de durabilidade.
6. Use ferro na bancada para reforçar a lança (+3 de dano). Repare equipamentos quebrados na própria bancada com os ingredientes mostrados na mochila.
7. A partir da **segunda noite** (quando já existe alguma estrutura), podem ocorrer invasões. Inimigos marcados como invasores buscam paredes, portas, fogueiras, abrigos e bancadas. Acerte-os antes que destruam sua defesa.
8. Se uma parede ou outra estrutura ficar danificada, aproxime-se e use **T** ou o botão **Reparar peça próxima** na mochila; o custo é 1 madeira ou 1 pedra, dependendo da peça. Um reparo restaura 45 pontos de integridade, limitado ao máximo.

## Controles principais

- **WASD / setas:** andar; **Shift:** correr; **Espaço:** pular.
- **Mouse:** olhar; **Clique / J:** atacar; **E:** golpe especial; **Q:** esquivar.
- **F:** coletar, minerar e interagir; **I:** abrir a mochila e o crafting.
- **G:** girar a próxima peça; **X:** desmontar; **T:** reparar a estrutura danificada mais próxima.
- **1/2/3:** mudar arma; **P:** salvar manualmente.

Em celular, use os botões virtuais, toque em **Mochila** e utilize as receitas e os botões de girar/desmontar/reparar sem teclado.

## Proteção da partida

O progresso é salvo no `localStorage` do navegador no mesmo endereço de hospedagem. Os arquivos ZIP não guardam seus saves. Evite limpar os dados do navegador ou mudar o endereço do GitHub Pages antes de copiar o progresso.

Saves da v1.1 são lidos automaticamente. A versão antiga não reconhece as bancadas, o ferro e as invasões da v1.2; não faça downgrade com o mesmo save.

## Publicação no GitHub Pages

Descompacte e envie os arquivos de dentro da pasta `MadrugaCraft-Sobrevivencia` à raiz do repositório. Em **Settings → Pages**, selecione **Deploy from a branch → main → /(root)**. O HTML usa JavaScript ES Modules, e não precisa de `npm build` para publicação. A biblioteca Three.js 0.160.0 é carregada pelo navegador a partir do jsDelivr; ela não está embutida no ZIP, e requer acesso à rede.
