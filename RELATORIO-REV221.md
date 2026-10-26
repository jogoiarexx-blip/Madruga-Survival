# v2.21 — Inicialização e menu otimizado

- Menu principal não agenda RAF nem atualiza física, IA, inimigos ou minimapa.
- Modelos 3D (REV5, zumbi REV2, aranha) não são baixados no menu; carregamento serial progressivo ao iniciar.
- Rigs dos inimigos permanecem com fallback enquanto os assets são baixados, sem remover inimigos.
- Pausa renderiza no máximo quatro quadros por segundo com agendamento temporizado, sem polling a 60/144 Hz; aba oculta não agenda quadros.
- WebGL e terreno procedural são criados sob demanda somente na seleção Iniciar/Retomar; não se consome contexto GPU no menu.
- A renderização começa na seleção Iniciar/Retomar, sem antecipar geração de floresta.
- Interface inicial reformulada com hierarquia visual e status de assets, preservando controles, qualidade e save.
- Testes adicionais de scheduler e pipeline.
