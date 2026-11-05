# Histórico de mudanças

Alterações relevantes são registradas aqui. O projeto está em fase experimental; mudanças de hipóteses e do formato de dados devem ser documentadas explicitamente.

## 0.3.0 — 2026-11-05

- Revisão dos critérios pertinentes da ABNT NBR 6122:2022, com matriz de alcance e dados faltantes.
- Conferência parcial por fundação: ELS com limites justificados e ações ELU em vetor independente; valores de cálculo não majorados novamente.
- Fatores da via simples, parcela de ponta conforme processo executivo e recuperação de reações sob momentos pela matriz global.
- Exceção de ponta em rocha do Anexo J.3.3 não liberada pelo modelo SPT atual; CFA não recebe essa exceção.
- Contato parcial, capacidade de grupo, ISE global, atrito negativo e longo prazo identificados como pendentes quando fora do escopo.
- Declarações do usuário separadas dos critérios calculados. Não há aprovação global automática.
- Base rígida de referência distinguida da recusa ao SPT; propriedades de conferência não provocam chamadas desnecessárias ao núcleo Rust.
- Memória em tela/PDF com entradas e resultados normativos parciais; exemplo didático e geração reproduzível dos subconjuntos tipográficos.
- 28 testes novos de conferência, totalizando 61 testes TypeScript e 4 testes Rust, com 22 casos compartilhados de paridade.

## 0.2.0 — 2026-11-05

- Perfis de método por fundação, mantendo Winkler/disco para projetos v1 antigos.
- Mindlin vertical com discretização Aoki–Lopes, Steinbrenner, encurtamento EA e flexibilidade mútua entre 1 a 4 estacas. Mobilização proporcional fixa declarada, não bilinear.
- Integral retangular Mindlin para recalque central de sapata, com quadratura de Duffy.
- Randolph–Wroth simplificado conforme a expressão de fuste do TQS; rotação nos eixos sem braço por 0,5·3EI/L.
- kv informado ou correlação SAFE/Morrison com conversão de unidades e faixa controlada.
- SPT → E opcional por Schmertmann e K_E independente dos coeficientes Aoki–Velloso.
- Memória de cálculo e PDF com fórmulas, parâmetros intermediários e origem das hipóteses; cobertura tipográfica ampliada.
- Exemplo comparativo dos métodos, caso de capacidade do print e documentação técnica das fontes.
- Testes analíticos novos, estudo de convergência e 22 casos de paridade Rust/TypeScript.

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
