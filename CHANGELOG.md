# Histórico de mudanças

Alterações relevantes são registradas aqui. O projeto está em fase experimental; mudanças de hipóteses e do formato de dados devem ser documentadas explicitamente.

## 0.1.0 — 2026-11-05

### Adicionado

- Editor de sapatas e blocos sobre 1 a 4 estacas, materiais, ações e cotas.
- Sondagem SPT, camadas, importação CSV/TSV e colagem de planilhas.
- Visualização 3D, planta e corte sincronizados.
- Rigidez por Winkler, semiespaço equivalente e transformação para bloco rígido.
- Capacidade Aoki–Velloso, fatores de Vésic e correlação SPT exploratória.
- Matriz 6 × 6, resposta às ações, comparação e sensibilidade.
- Exportações PDF, CSV, DXF, SVG e JSON versionado.
- Núcleo Rust independente e equivalente web em TypeScript, com casos de paridade.
- Base Tauri, CI e workflow manual para pacotes desktop.
- Documentação de métodos, contribuição, validação e exemplos.

### Limitações conhecidas

- Mindlin, Steinbrenner, Terzaghi e tensão básica NBR 6122:1996 aguardam implementação e validação.
- Sem verificação normativa completa, interação entre estacas ou dimensionamento estrutural do bloco.
- Distribuição desktop e caminho WebGL precisam de verificação nos ambientes de destino.
