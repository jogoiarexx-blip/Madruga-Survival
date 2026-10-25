# Madruga Survival v2.6.0 — Artesanato avançado e manutenção

## Base
- Fonte: `Madruga-Survival-v2.5.0-EXPLORACAO-SAQUE-FONTE.zip`, sem publicar nem sobrescrever o repositório GitHub.
- A implementação mantém saves v2, animações REV5, combos, furtividade, baús, agricultura, construções e exploração.

## Alterações realmente feitas
- Dois novos materiais de ruínas: `scrap` (sucata) e `cloth` (tecido), ambos no inventário, armazenamento e persistência.
- Loot determinístico por semente com garantias: posto médico fornece tecido; oficina e depósito fornecem sucata. Mesmo na pior variação as 12 caixas têm pelo menos 12 tecidos e 15 sucatas para os equipamentos iniciais e um kit de manutenção.
- Novos equipamentos únicos da bancada: `reinforcedVest` (20% menos dano dos ataques diretos) e `trailBoots` (consumo da stamina na corrida reduzido de 19 a 15 pontos/s). Os buffs são aplicados de fato ao jogo e preservados nos saves.
- Novos consumíveis fabricáveis por lotes na bancada: `medicalKit` (+65 de vida, remove envenenamento) e `repairKit` (+95 pontos de vida estrutural, limitado ao máximo da estrutura). Consumir kit com vida máxima e sem envenenamento não gasta recurso, assim como reparo de construção íntegra.
- Na mochila foram adicionados botões de kit médico e kit de manutenção. O craft por lote e o uso de recursos em baús próximos continuam disponíveis. Interface indica os equipamentos equipados.
- Cada receita exige bancada e materiais válidos; equipamentos únicos não podem ser fabricados de novo.

## Testes reproduzidos
- `npm test`: **301 verificações OK** (285 anteriores + 16 novas da v2.6).
- `npm run check`: aprovado (sintaxe JS).
- 64 seeds × 12 recipientes examinados em teste determinístico; cada seed forneceu ao menos 12 tecidos e 15 sucatas.
- Testadas: receita inexistente de estação, ausência de bancada, bolso cheio, reserva por baús, kit em estrutura cheia, consumo de loot inválido, migração de save, retenção de equipamento novo e energia da corrida.
- Servidor HTTP local respondeu `200 OK`. Chromium headless não terminou a inicialização e foi interrompido por timeout; **não foi possível certificar jogabilidade visual, WebGL, FPS ou ergonomia da animação**.

## Limitações/pendências
- As roupas alteram a jogabilidade e o HUD, mas ainda não acrescentam modelos 3D de colete/botas à malha REV5.
- Testar in-game o efeito e visibilidade dos kits em PC e dispositivos móveis, além do spawn visual dos recursos nas ruínas.
- Avaliar mais espaços internos, perigos específicos e melhorias visuais das bancadas na v2.7.

**Publicação:** não efetuada nesta revisão. O ZIP é a entrega independente para eventual atualização do GitHub.
