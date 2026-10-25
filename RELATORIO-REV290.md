# Madruga Survival v2.9.0 — Apoio das oito patas da Aranha Sombria

Base: revisão v2.8.0 (GitHub, commit 830d4e5). Foco: movimento procedural das patas, sem alterar os 72 ossos e os cinco clipes do GLB original.

## Mudanças reais

- Criado `src/characters/spider-leg-plant.js`: mapeia as oito cadeias reais do rig (vistas no GLB), aplica CCD angular limitado de quadril e joelho depois da animação do mixer, mantém contato temporário com o chão e intercala os grupos de quatro patas no Walk.
- Cada alvo respeita a elevação medida no terreno e limites máximos de correção, de modo que a aranha não estique exageradamente os membros em desníveis grandes.
- Amostragem do terreno em até 30 Hz, correção de pose em cada frame animado; o CCD só é aplicado a aranhas próximas (até 24 unidades) e enquanto Idle/Walk. Salto, ataque, teia, morte e aranhas distantes não recebem modificações no rig.
- `spider-model.js` e `spider-ai.js` conectam o sistema ao runtime. `src/main.js` injeta `getGroundHeight` e versões de import usam `2.9.0-spider` para evitar arquivos antigos no cache.
- `package.json` com versão atualizada; testes existentes atualizados apenas para aceitar o build novo; 12 testes novos de mapeamento, fases, limites numéricos e integração.

## Testes e limitações

- `npm test`: aprovado na máquina de testes, incluindo 12 testes novos.
- `npm run check`: aprovado na máquina de testes.
- A integridade do modelo original e as cinco animações foram verificadas via GLB. O modelo não foi reexportado, portanto nenhuma textura ou animação existente foi descartada.
- Ainda é necessária **verificação visual/manual de WebGL** em navegador real, especialmente para detectar penetração em superfícies muito inclinadas, travessia de obstáculos e a qualidade visual das correções em todas as direções. O controle de oito patas é CCD parcial, não IK físico completo com colisões de cada ponta e não garante contato perfeito em todo relevo.

## Próximas melhorias possíveis

Aperfeiçoar testes de jogabilidade em navegação real, introduzir limites de alcance por perna calibrados pelos segmentos do rig e adicionar decalques/som de patas ao pisar em terrenos diferentes sem perder FPS.
