# Madruga Survival 2.7 — Aranha Sombria

## Origem / preservação
- Original `Aranha_sombria_animada.glb` retirado do pacote enviado pelo usuário, com skin de 72 ossos, 3 texturas e clipes `Idle` (3,0s), `Walk` (1,2s), `Jump` (1,6s), `Attack` (1,12s), `WebShot` (1,45s).
- GLB para web otimizado: JPEG 1024² e compressão normativa de atributos (KHR_mesh_quantization), sem alterar topologia, ossos, nomes, índices ou duração dos clipes.
- Transferência GitHub Pages: GLB otimizado comprimido gzip, dividido em 26 partes base64 com validação SHA-256; no ZIP, o GLB direto também está disponível.

## Animações e gameplay implementados
- Transição suave Idle/Walk (blend 0,17s) e Attack/WebShot/Jump (blend 0,11–0,12s), clips de ação sem loop e sem dano instantâneo.
- Ataque sincronizado ao contato aproximado de 0,48 s; teia no tempo 0,49 s. Um impacto ou teia no máximo por ação.
- Ajuste da posição vertical ao solo, inclinação para a morte, recoil visual no dano e salto visual temporário sem deslocamento do collider.
- Projétil de teia com colisão, leve dano e efeito de lentidão 2,7 s no Madruga; HUD mostra tempo restante.
- IA própria: aproximação, mordida, salto ocasional e teia a distância com cooldown; visão de construções.
- Inimigos aranha em partida nova, exploração de ruínas perigosas e baixa chance em spawns após o segundo dia, no máximo duas aranhas ambiente.
- Números antigos de inimigos, arquivos de save e progressão de crafting permanecem compatíveis.

## Testes
- `npm test`: aprova toda a suíte normal anterior + verificações especializadas de aranha.
- `npm run check`: aprova checagem sintática de todos os sistemas.
- O teste visual final no navegador usando WebGL e malha deformada precisa ser feito em hardware local; os testes estruturais não substituem jogabilidade real.

## Ponto de atenção
- Se o browser não suportar `DecompressionStream` para gzip no GitHub Pages, o loader tenta GLB direto. O ZIP local contém GLB direto.
- O modelo original possui 117.961 vértices: por desempenho móvel, mantenha limite baixo de aranhas simultâneas.
