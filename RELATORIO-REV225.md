# Madruga Survival v2.25 — Menu e HUD

- Menu redesenhado com título, nova partida, retomar, configurações e guia acessível.
- Prévia estática do personagem REV5 em cena dedicada com o **mesmo WebGLRenderer** da partida, após `requestIdleCallback` e sem loop de animação.
- Aquecimento de shaders e texturas do personagem no menu, usando o contexto real; floresta, IA e física continuam sem rodar.
- Menu usa ocioso para evitar atrasar a primeira interação; shader e upload são feitos de forma progressiva.
- HUD inicia compacta: detalhes das missões e estatísticas extras atrás de toggles com `aria-expanded`.
- Bloco enorme de comandos deixa de cobrir o centro inferior. Guia completo abre com F1, Ajuda ou botão no menu.
- HUD original e saves/crafting/hotbar/goblins foram preservados.
- Prévia única sem loop, mas há alocação WebGL e download REV5 no menu, deliberadamente para executar pré-shaders.
- Necessário conferir encaixe e screenshot visual em navegador real: suíte de testes não mede FPS.
