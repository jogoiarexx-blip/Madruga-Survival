# REV222 — Pré-aquecimento GPU e assets

- Usa `WebGLRenderer.compileAsync` do Three.js r160 para pré-compilar os materiais do mundo depois do início da partida, nunca no menu.
- Prepara REV5, REV2 e Aranha Sombria **antes da montagem dos GLBs**, preservando visuais provisórios e os cinco clipes do GLB da aranha.
- Texturas são inicializadas gradualmente, até uma textura inédita por quadro, com deduplicação.
- Se uma compilação falhar, o jogo continua usando o modelo e a animação; não executa compilação síncrona como fallback.
- Mantém jogo inerte no menu, spawn, audio, salvar e restaurar, hotbar, roda de construção e modelos originais.
- A preparação pode ter custo inicial e não substitui medições reais de frames em diferentes GPUs.
