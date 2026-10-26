# Madruga Survival v2.24.0 — Goblin IK e publicação

## Modificações executadas
- Personagem goblin normal mantém `type=normal` nos saves e drops antigos; GLB com 46 ossos e 15 animações permanece intacto.
- Pé plantado no terreno por IK leve, com janelas alternadas de contato; limite de rotação e deslocamento, aplicado apenas a inimigos próximos.
- Correção de corrida no lugar quando colisões impedem deslocamento, usando movimento real.
- Transição de estado alerta/parado/corrida/combate; temporização dos golpes usa tabela de eventos centralizada.
- Otimização de carregamento online: GLB original de 13,55 MB publicado como 24 partes gzip+b64 (9,28 MB compactados), manifest com SHA-256; downloads paralelos no máximo 4; reconstrução, descompressão e parsing no navegador.
- Modelo GLB completo preservado no ZIP local, junto com as partes para fallback em navegadores modernos.

## Testes
- `npm test` aprovado, inclusive verificações de compatibilidade das versões anteriores.
- Teste novo `tests/v224-goblin-foot-plant.mjs`: janelas, fallback, integridade do GLB, empacotamento, reconstrução e integração com IA.
- Limitação: encaixe visual em uma sessão real do navegador não foi confirmado. IK limitada e desligada durante ataques, morte, reação a dano e em distância longa.
