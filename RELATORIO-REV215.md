# Madruga Survival v2.15.0 — Barra rápida de consumíveis

## Problema e solução
- Antes: frutas, água e carne possuíam comandos rígidos 4/5/6; outros consumíveis exigiam abrir a mochila, inclusive curativos durante combates.
- Depois: seis slots (teclas 4–9) configuráveis dentro da mochila e acessíveis por toque na parte inferior da tela. 1/2/3 continuam exclusivos das armas.
- Os nove consumíveis suportados são: frutas, água, carne assada, legumes, peixe assado, ensopado, bandagem, kit médico, curativo de seda. Nenhuma receita/arma foi removida.

## Comportamento
- Quantidades são derivadas do inventário real (sem duplicar estoque ou criar contadores paralelos).
- Slots sem item ou com quantidade zero ficam desativados. Teclas e botões chamam o mesmo `consume`, preservando as validações de vida máxima/veneno/teia, áudio, HUD e salvamento.
- Atalhos só funcionam com o jogo ativo, desbloqueado do modo construção e menus, e sem pausa. A configuração é alterável com a mochila aberta.
- O save v2 usa o campo `hotbar`; partidas antigas ganham padrão (4 frutas, 5 água, 6 carne, 7 bandagem, 8 kit médico, 9 curativo de seda). Um campo adulterado é rejeitado pela validação do save.

## Desempenho e compatibilidade
- Sem novas bibliotecas, modelos 3D ou efeitos de GPU. Atualização dos seis botões usa o ritmo já existente do HUD; conteúdo DOM só muda quando necessário.
- CSS responsivo reserva a faixa inferior da tela; no celular a barra fica acima dos controles virtuais para manter movimentação e combate acessíveis.
- `npm test` e `npm run check` aprovados, incluindo 14 testes novos de regras, migração e uma simulação da UI sem navegador.
- Ainda requer teste manual visual com WebGL no celular e PC, especialmente telas pequenas no modo paisagem.
