# REV213 – Caverna das Aranhas, Rainha e cristais

## Implementação
- Entrada perto da Colônia das Tecelãs; câmera em terceira pessoa preservada com topo da caverna aberto.
- Câmara rochosa instanciada na extremidade do mapa, com teleport de entrada/saída via F e minimapa.
- Rainha (variante matriarch) do mesmo GLB de 72 ossos e cinco clipes; 48 PV, fase furiosa abaixo de 50% e duas caçadoras convocadas apenas uma vez.
- Três jazidas de cristal e uma reserva especial de dois cristais liberada após derrotar a rainha.
- Nova melhoria Ponta de Cristal da Caverna (+3 dano à lança) exige bancada, lança temperada, cristal, quitina e ferro.
- Save guarda estado da caverna, rainha derrotada e jazidas colhidas; validação rejeita valores adulterados e migra saves antigos.

## Limitações conhecidas
- Câmara subterrânea é uma área instanciada com portal (não há escavação volumétrica do terreno).
- A abertura central do teto preserva a câmera do jogador, sacrificando uma caverna 100% fechada.
- Colisão externa e obstáculos no setor da câmara ainda exigem validação visual no navegador.
- O GLB não foi modificado; o chefão reutiliza o esqueleto já existente com escala e tonalidade próprias.
