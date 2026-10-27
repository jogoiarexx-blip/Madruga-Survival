# REV226 — Tela de loading após o menu principal

- Botões **Nova sobrevivência** e **Continuar partida** mostram um loading em tela cheia antes de ativar simulação, áudio e controles; ao concluir, o jogador clica em **Entrar na partida** para liberar áudio e captura do mouse conforme exigência do navegador.
- Progresso calculado por tarefas concluídas (terreno, floresta, pontos, recursos, save, shaders, quatro grupos de modelos e render inicial), sem temporizador artificial.
- Criação do mundo em blocos sequenciais com oportunidade de pintar a interface entre tarefas; preparação de shaders e carregamento GLB sob o mesmo WebGLRenderer.
- O save de uma nova partida só é apagado **depois** da preparação bem-sucedida; ao retomar, restaura-se antes do primeiro quadro.
- Modelos opcionais indisponíveis mantêm fallback, sem impedir a partida; falha crítica não ativa o loop e oferece recarregar.
- Tela adaptável a celular, legível por leitor de tela e sem iniciar jogo ao clicar duas vezes.
- Testes automáticos específicos em `tests/v226-adventure-loading.mjs`.

**Limitação:** geometria procedural de cada bloco ainda pode ocupar a thread principal enquanto é criada; o progresso exibido entre os blocos é real, mas não mede o progresso interno de uma etapa individual.
