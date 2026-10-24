# Madruga Survival v2.3.0 — Revisão de IA e furtividade

## Alterações efetivas
1. Percepção: visão por distância, campo de visão, período do dia, furtividade e obstáculos construídos; eventos sonoros com expiração e limite de 24.
2. IA: patrulha em uma área de 5,5 unidades da origem, investigação de ruído, perseguir alvo detectado e buscar último ponto conhecido, retornando a patrulha após expirar memória.
3. Combate: dano recebido alerta o zumbi agressivamente; ataques do Madruga produzem ruído e não mudam golpes nem rig REV5.
4. Furtividade: toggle C (PC) / botão de toque; velocidade ~43% da base e pegadas sonoras mais discretas. C mantém a ação do ímã no modo construção.
5. Balanceamento: surgimento ambiente menos frequente durante o dia (aprox. 20–36s); à noite (aprox. 9–20s) e limites distintos. Invasões planejadas não foram alteradas.
6. Interface: aviso de perseguição/investigação e explicação de controles de furtividade.

## Testes executados
- `npm test`: PASSOU — 248 verificações registradas por linhas OK, sendo 20 novos testes de percepção.
- `npm run check`: PASSOU — sintaxe de módulos críticos e módulo novo.
- Browser/headless Chromium: BLOQUEADO `net::ERR_BLOCKED_BY_ADMINISTRATOR` ao abrir localhost; portanto nenhuma afirmação de renderização, FPS ou gameplay WebGL comprovado.
- Testes de regressão anteriores ajustados somente para aceitar novo identificador de versão, ritmo de passos dependente do estado e parâmetros de spawn atualizados.

## Limitações conhecidas
- O modo furtivo reduz velocidade e audibilidade, mas NÃO inclui animação própria de agachar para o rig REV5. Nada na malha esquelética foi redesenhado.
- O campo visual considera obstáculos de construções, não todas as folhagens da floresta; árvores poderão ser acrescentadas ao sistema de oclusão posteriormente.
- Ruídos são calculados na lógica de jogo (não propagação física de áudio 3D).
- Ainda não há vilas/casas saqueáveis; exploração avançada fica para próxima versão.
- O desempenho real em Android/PC precisa ser validado numa sessão WebGL.

## Compatibilidade
- Save versionado v2 preservado; não adiciona campos obrigatórios ao save. Sons e alertas são transitórios e reiniciam ao carregar.
- Sem dependências npm ou engines novas. Site estático HTML/ESM com Three.js via CDN.
- Novos arquivos: `src/gameplay/zombie-perception.js`, `tests/v230-zombie-perception.mjs`, `RELATORIO-REV230.md`.
