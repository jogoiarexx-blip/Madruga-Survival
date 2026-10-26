# Madruga Survival v2.23.0 — Goblin com animação esquelética

## Inventário técnico do arquivo enviado

- Entrada: `goblin.glb`, 12.991.712 bytes, GLB 2.0.
- Geometria: 1 malha, 83.046 vértices, 1 skin, **46 ossos** e três texturas JPEG embutidas.
- Animações originais: `Running`, `Walking`, `Arise`, `Dead`, `Triple_Combo_Attack`, `Unsteady_Walk`.
- Sem necessidade de rig automático: o arquivo já contém esqueleto e clipes de movimento.

## Etapa 1 — Melhorar as animações, antes de integrar

- `scripts/upgrade-goblin-glb.py` gerou `assets/models/goblin_animado.glb` preservando os dados originais.
- Nove clipes adicionais criados com reamostragem e interpolação esférica (SLERP) dos quaternions originais:
  `Idle`, `Idle_Alert`, `Attack_Quick`, `Attack_Heavy`, `Attack_Combo`, `Hurt`, `Guard`, `Dodge`, `Death_Quick`.
- 15 animações no total; **as seis originais continuam no arquivo**.
- Duração e instante de contato dos golpes são explicitados nos `extras` dos clipes de ataque.
- Uma página `PREVIEW-GOBLIN.html` permite inspecionar e reproduzir cada clipe de forma independente.

## Etapa 2 — Substituição controlada do Inimigo Comum

- Inimigo interno `normal` agora recebe a malha do goblin pela rotina `createGoblinModelManager`.
- Não houve renomeação do tipo salvo, evitando incompatibilidade nos saves e comportamentos de ondas.
- Modelo carregado sob demanda após iniciar a partida, com compilação de shaders antecipada.
- Se o GLB falhar, há um substituto procedural verde; nenhuma partida deixa de iniciar.
- Movimentação, IA, collider, inventário, drops, aliados e todas as outras espécies permanecem.
- O material e geometria 3D compartilhados não são descartados indevidamente ao eliminar um goblin.
- O cadáver reproduz `Death_Quick` antes da remoção do inimigo.

## Etapa 3 — Combate melhorado

- Golpes alternam rápido, pesado e combo em sequência previsível; o combo duplo tem impactos em 0,68 s e 1,72 s.
- Golpe rápido: 0,43 s; golpe pesado: 0,73 s. Todos os danos são aplicados **no contato animado**, nunca ao iniciar o golpe.
- Hitbox verifica alcance, direção frontal e linha de visão novamente no instante do impacto.
- Receber dano aciona `Hurt` quando não há golpe em curso; ataques não sobrepostos.
- Animações do inimigo não afetam diretamente o collider nem movimentam artificialmente o jogador.

## Testes

- `npm run check` e `npm test`: sucesso no ambiente de desenvolvimento.
- 504 verificações automáticas passaram, incluindo 13 verificações próprias do goblin.
- GLB validado estruturalmente (header, buffers, 15 animações, skeleton, accessor bounds).
- Limite: animação visual em Chromium e sensação do timing **não certificadas**; devem ser confirmadas em uma partida real.
- Pacote completo v2.23 não publicado no GitHub nesta etapa.
