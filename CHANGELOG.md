# Histórico de mudanças

Alterações relevantes são registradas aqui. O projeto está em fase experimental; mudanças de hipóteses e do formato de dados devem ser documentadas explicitamente.

## 0.6.0 — 2026-11-06

- Configuração horizontal por fundação: kh manual, K/nh por tipo de solo ou SPT/m (Tietz conforme TQS), independente do núcleo vertical.
- Seleção de tabelas K/nh 3829/3836, associações explícitas por camada, valores personalizados e bloqueio de coeficientes secos/submersos não publicados.
- Tabelas m publicadas ou personalizadas, com regra linear/degrau inferior/degrau superior, família do solo e faixas controladas.
- Origem z terreno/base do bloco; reação consistente ou molas nodais com passo máximo e convenção de extremidade explícita. Mesmos cálculos em TypeScript/Rust.
- Editor de coeficientes na sondagem e registro da configuração na memória/PDF/CSV. JSON v2 para impedir que apps antigos ignorem as opções; leitura v1 mantida.
- 125 testes TypeScript, 8 Rust e 50 casos de paridade. Os 39 casos anteriores conservam exatamente matrizes e deslocamentos. Conferência de interface para seleção, personalização, salvar/reabrir e PDF.

## Investigação de CRH — 2026-11-06

- Estudo do documento TQS 3829 e confronto com o manual específico de estacas 3836, com distinção entre K de reação, kh de pressão/deslocamento e K de Aoki–Velloso.
- Comparações controladas no caso de 16 m: SPT/m com três regras entre pontos; 48 combinações por tipo de solo; discretizações consistente e nodal. Interpolação linear com topos rotulados resulta em Kh=182,10 tf/m; molas nodais de 1 m dão 174,96 tf/m, frente a 168,92 tf/m do print. A hipótese horizontal não explica o desvio axial de Kθy.
- Script `npm run investigate:crh`, resultados JSON e sete testes adicionais, total de 112 testes TypeScript. Nenhum preset foi ativado no motor: o estudo não comprova a associação de solo, os critérios ou o algoritmo interno da calculadora externa.

## 0.5.0 — 2026-11-06

- Opção de ligação estaca–bloco rígida à flexão ou rotulada em X/Y, preservando o bloco rígido e os binários axiais. Projetos antigos mantêm a ligação rígida.
- Condensação estática da rotação local em Winkler/Mindlin; rigidez horizontal, acoplamentos e braço torsional recalculados. No Randolph simplificado, Kh=μh Kz continua independente da ligação e a flexão aproximada é removida na rótula.
- Matrizes sem rigidez em uma direção conservam zeros exatos. Deslocamentos livres aparecem como indeterminados; momentos sem caminho resistente são bloqueados, inclusive no vetor ELU separado.
- Forças axiais e momentos de topo em tela/PDF; ligação e GDL livres registrados no CSV. Exemplo de duas estacas com My=1 tf·m e N=40 tf.
- 105 testes TypeScript, 6 testes Rust e 39 casos compartilhados. Verificações de binário, equilíbrio, ligação, mecanismo e limite analítico de cabeça livre; sem calibração dos parâmetros para coincidir com o print.

## Revisão de confiabilidade — 2026-11-06

- Pesquisa de fontes primárias e plano de validação numérica/geotécnica, com lacunas de transferência de carga, módulos e condições de ligação identificadas.
- Verificação independente das matrizes Winkler 6 × 6 com OpenSees: três casos e refinamento 64/128/256; maior erro normalizado entre 0,01395% e 0,01558% no refinamento final.
- Comparador opcional e referências externas congeladas; três novos testes, totalizando 83 testes TypeScript. Sem alteração do motor ativo ou aprovação automática das molas do print.

## Investigação adicional — 2026-11-06

- Diagnóstico de Kθy em tela/PDF: flexão local, efeito modal da interação, nível de Kz e condições de translação/ligação.
- 30 ensaios reproduzíveis e oito testes adicionais, totalizando 80 testes TypeScript; matriz numérica preservada.
- Relação Kθy≈Kz·s²/4 do print identificada como aproximação, com resíduo que excede o arredondamento a 0,01.

## 0.4.0 — 2026-11-06

- Caso externo de duas estacas Ø30 cm, ponta 16 m e NSPT(11)=17, carregável pela faixa de ferramentas.
- Comparação em tela/PDF e JSON entre alvos do print e valores calculados; capacidades conferidas a 0,1 tf. Molas permanecem não confirmadas, com diferenças e hipóteses explícitas.
- Diagnóstico da contribuição axial com/sem interação e sensibilidade ao Ec, sem alterar a matriz ativa ou ajustar parâmetros para forçar equivalência.
- Correlação opcional E0 de Aoki (1984), fatores 6/4/3, conversão de K_AV e conferência de coerência com a execução. Módulo inicial sem atualização de Es por tensões.
- Bloqueio de extrapolação SPT e aviso de entradas alteradas no benchmark; E manual preservado.
- 11 testes novos, total de 72 testes TypeScript e 4 Rust; 26 casos compartilhados de paridade.

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
