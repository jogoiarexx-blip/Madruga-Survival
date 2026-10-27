# Amostras opcionais — fontes e licenças

- Criador original: **Kenney**.
- Pacotes: [Impact Sounds](https://kenney.nl/assets/impact-sounds) e [RPG Audio](https://kenney.nl/assets/rpg-audio).
- Licença dos dois pacotes: **Creative Commons Zero (CC0 1.0)**, uso em jogos comerciais permitido sem atribuição obrigatória.
- Cópia pública dos OGGs: https://github.com/GeorgeQLe/assets-sfx-combat, commit `9662dc1bed3b06ae753045915f9accfac044c7ce`.
- Em tempo de execução o jogo consulta jsDelivr e, se necessário, raw.githubusercontent.com. O download é opcional: efeitos antigos ficam como fallback se a conexão falhar.
- O ZIP não incorpora os OGGs. Um jogo totalmente offline ainda usa o áudio procedural. Não são gravações específicas de javalis ou coelhos: as vocalizações permanecem sintetizadas.
- Manifesto exato no código: `src/audio/sample-bank.js`. Os downloads são feitos apenas após a tentativa de ativação do contexto de áudio pelo jogador; não são enviados dados do save para os servidores.
