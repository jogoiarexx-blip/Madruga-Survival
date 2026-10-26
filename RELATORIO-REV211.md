# Madruga Survival v2.11 — variantes de aranhas

## Mudanças reais

- Três espécies usando o mesmo GLB rigado de 72 ossos: Sombria, Caçadora e Tecelã.
- Caçadora: menor e rápida, privilegia saltos. Tecelã: grande e resistente, privilegia teias em leque. Sombria mantém regras anteriores.
- Cor e tamanho específicos por espécie, com materiais clonados para evitar alterar as outras aranhas.
- Projéteis ajustados por espécie (dano, velocidade, lentidão e dispersão); corrigido bug da função intermediária que descartava o ângulo da teia em leque.
- Seleção por avanço de dias e ameaça da área, limite de duas aranhas nos spawns ambiente.
- Correção crítica: saves agora aceitam aranhas e preservam a espécie. Saves antigos sem variante são carregados como Sombria.
- Sem mudança no arquivo GLB ou nos clipes de animação; os modelos são reutilizados.

## Escopo de teste

`npm test` + `npm run check`; testes novos para IA, variação, tiros e roundtrip de save. Não substituir teste real no navegador/GPUs móveis.
