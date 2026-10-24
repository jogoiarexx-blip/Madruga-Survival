# Madruga Survival v2.4.0 — combate contextual

## Base
Fonte v2.3.0, mantendo os sistemas de furtividade, IA, REV5, saves, armas reforçadas e crafting.

## Alterações efetivas
- Sequência de 3 ataques por arma: golpes 1 e 2 normais e finalizador com +1 dano; o finalizador tem maior impulso/alcance, mas recuperação levemente maior.
- Buffer único de entrada somente nos 160 ms finais da recuperação; não armazena ataques quando se muda de arma nem quando se interrompe a animação.
- Dano no instante de contato do clipe REV5 (um único golpe por ataque), com fallback procedural na ausência do modelo.
- Clipes reais de ataque selecionados por arma e etapa; não reproduz clip de três acertos com um único teste de colisão.
- Movimento secundário das armas por etapa, pequeno impulso de câmera ao acertar e stagger curto sem cancelar as regras de ataque dos chefes.
- Indicador de combos no HUD. Nova versão de cache para GitHub Pages.

## Testes e limitações
Use `npm test` para regressões e testes de combos, `npm run check` para sintaxe. Teste manual no navegador ainda é necessário para validar feeling, alinhamento exato da arma e desempenho WebGL. Nenhum teste automatizado substitui jogar a fase.

## Publicação
ZIP fonte separado do GitHub: esta revisão não foi publicada automaticamente.

## Validação realizada nesta entrega
- `npm test`: **260 testes aprovados**, incluindo **12 novos testes específicos de combos**.
- `npm run check`: **aprovado**.
- Servidor local: `index.html`, módulo de combos e manifesto REV5 retornaram HTTP 200.
- Tentativa de abrir o servidor no Chromium: bloqueada por política do ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR`); **não houve validação visual do gameplay**.
- `npm run test:legacy`: **não passou** por referência `buildings is not defined` no antigo `tests/regression.mjs`; repetição na base v2.3.0 gerou o mesmo erro, comprovando que já era uma falha herdada. A suíte oficial `npm test` não inclui essa rotina legada.

## Distribuição de assets
O pacote segue o mesmo padrão da v2.3: inclui os arquivos particionados `.b64` e manifestos REV5/REV2; os dois arquivos `.glb` reconstruídos durante `npm test` não são duplicados no ZIP, pois `scripts/prepare-test-assets.mjs` os gera novamente para QA, e o jogo dispõe dos loaders particionados como fallback de distribuição.
