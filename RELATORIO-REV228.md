# Madruga Survival — revisão v2.2.8 (armas, animações e craft)

**Base:** `Madruga-Survival-main.zip` (v2.2.7). Foi feita uma revisão incremental do código-fonte; saves v2 e modelos GLB anteriores foram preservados.

## Armas e visuais

- Cabo de vassoura ganhou cerdas, peça de fixação e quatro braçadeiras de ferro opcionais.
- Marreta ganhou rebites e novos cravos laterais (ativados exclusivamente após o craft).
- Lança recebeu dois dentes de ponta temperada (ativados exclusivamente após o craft).
- Novas melhorias: `armoredBroom` (+1 de dano), `spikedHammer` (+2, depende de `ironHammer`) e `hardenedSpear` (+2, depende de `ironSpear`).
- Todas as melhorias têm requisitos de bancada, materiais e validação na gravação/carregamento do save. Os upgrades não criam armas duplicadas.

## Animações REV5

- Continua utilizando o GLB original REV5 (45 ossos, 17 clipes), anexado ao osso original `mixamorigLeftHand`, pois a espada que veio no arquivo foi exportada na mão esquerda.
- Acrescentado movimento aditivo de recuo/avanço e balanço no objeto da arma, sem alterar ossos, física ou coordenadas do personagem.
- Janela de encadeamento de golpes reiniciada após intervalo de 0,76 segundo.
- Momento do dano passa a usar os marcadores reais dos clipes quando o REV5 está ativo. O avatar de reserva conserva a janela própria.
- Poses antigas e lógica de impacto de zumbis mantidas.

## Crafting

- Prévia de quantidades para lote (`craftBatchPreview`) calcula custo total, estoque mochila + baús próximos, materiais em falta, produção final e limite de pilha.
- Interface mostra `disponível/necessário`, filtro **Só possíveis**, lotes de 1, 5, 10 ou máximo e informação da estação exigida.
- Custos inválidos são rejeitados, evitando gasto parcial; reserva e reembolso de materiais mantidos. Baú que referencia o mesmo inventário não é contado duas vezes.
- Preservadas todas as receitas anteriores, inclusive culinária, bandagem, reparos e construção com prévia.

## Testes

- `npm run check` — sintaxe dos módulos.
- `npm test` — suíte original e `tests/v228-weapons-crafting.mjs`, que cobre progressão, migração de save, limite de inventário, caixa de materiais, visual de upgrades, movimento aditivo e vínculos de UI.
- **228 verificações automatizadas** passaram na revisão (227 existentes e 1 adicional ao teste novo após a primeira rodada). Os testes não são equivalentes a jogar uma sessão completa.
- Tentativa de abertura no Chromium neste ambiente foi bloqueada por `ERR_BLOCKED_BY_ADMINISTRATOR` antes da renderização. **Não foi possível comprovar jogabilidade WebGL nesta execução**.

## Execução e publicação

1. Abra o projeto usando servidor HTTP (`npm run dev` no diretório do projeto, Node.js 18+). Não abra diretamente por `file://`.
2. Acesse `http://127.0.0.1:8765/` e confirme o carregamento do personagem. Requer acesso ao CDN do Three.js.
3. Para publicar no GitHub Pages, substitua o conteúdo da raiz do repositório pelos arquivos do pacote. O pacote mantém os modelos grandes divididos em partes, como no projeto enviado.
4. `npm test` remonta os GLBs a partir dos fragmentos e valida SHA-256. Os modelos reconstruídos são arquivos de teste locais, não necessários no commit.

Não foi enviado commit ou publicação remota. Esta entrega é o projeto fonte atualizado para baixar/testar/publicar.
