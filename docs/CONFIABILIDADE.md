# Confiabilidade do motor: referências e plano de validação

Revisão de 06/11/2026. A teoria usada pelo MolasStruct tem respaldo na literatura. A aplicação combina soluções e aproximações; a confiabilidade de cada resultado depende dessa combinação, dos parâmetros e do domínio de uso. As rigidezes do caso do print continuam **não validadas para representar uma obra real**.

Conferir a função de Mindlin, montar corretamente a matriz do bloco e acertar resistências últimas são verificações necessárias. Elas não demonstram, sozinhas, que a lei de transferência ou o módulo de deformabilidade adotados representam o terreno.

## Referências prioritárias

| Material primário                                                                                                                                                                                                                                                                                                                                             | Como ajuda                                                                                    | Aplicação e limite                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Santana, Lopes e Danziger — Extensão do método Aoki-Lopes à hipótese de bloco de coroamento rígido](https://spgeotecnia.pt/wp-content/uploads/2023/05/EXTENSO-DO-MeTODO-AOKI-LOPES-%E2%88%91-HIP%E2%80%A1TESE-DE-BLOCO-DE-COROAMENTO-R%C3%B7GIDO_1.pdf)                                                                                                      | Grupo rígido, redistribuição de forças, comparação com Piglet/Defpig e experimentos           | Principal candidato a benchmark publicado do procedimento axial. O PDF consultado não identifica claramente o ano; o ano do diretório do site não foi tratado como ano da publicação.                                |
| [NIST GCR 12-917-21 — Soil-Structure Interaction for Building Structures, 2012](https://www.nist.gov/publications/soil-structure-interaction-building-structures) · [PDF dos autores](https://nehrp-consultants.org/publications/download/nistgcr12-917-21REV1.pdf)                                                                                           | Rigidez, impedância, modos de grupo, condições de cabeça e módulos compatíveis com deformação | Seções 2.2 e 2.3; tabelas 2-2 e 2-4; figura 2-11. Separar parcelas estáticas dos modificadores dinâmicos; não importar amortecimento ou fatores sísmicos para o cálculo estático.                                    |
| [Randolph e Wroth, 1978 — Analysis of Deformation of Vertically Loaded Piles](https://doi.org/10.1061/AJGEB6.0000729)                                                                                                                                                                                                                                         | Parcela de fuste, base e compressibilidade da estaca                                          | O resumo do artigo foi consultado; o texto integral na editora não ficou acessível. O seletor atual do aplicativo é a expressão simplificada de fuste publicada pelo TQS, não a implementação integral desse artigo. |
| [Bateman, Crispin, Vardanega e Mylonakis, 2022 — Theoretical t-z Curves for Axially Loaded Piles](https://eprints.soton.ac.uk/495835/) · [PDF aberto](https://eprints.soton.ac.uk/495835/1/Bateman_Crispin_Vardanega_Mylonakis_2022_Theoretical_t-z_curves_for_axially_loaded_piles.pdf)                                                                      | Mobilização, não linearidade e relação tensão-deformação para transferência axial             | Base para uma futura solução de equilíbrio e compatibilidade com curvas t-z/q-z. Não fornece parâmetros universais para qualquer solo.                                                                               |
| [Crispin e Mylonakis, 2022 — Exact Winkler Solution for Laterally Loaded Piles in Inhomogeneous Soil](https://research-information.bris.ac.uk/en/publications/exact-winkler-solution-for-laterally-loaded-piles-in-inhomogeneou/) · [PDF](https://research-information.bris.ac.uk/ws/portalfiles/portal/334500308/Full_text_PDF_final_published_version_.pdf) | Matriz lateral/rotação, perfil variável e condições no topo                                   | Referência para verificar e refinar a componente lateral. Escolher um kh apropriado é distinto de resolver corretamente a viga com aquele kh.                                                                        |
| [TQS — Transferência Axial, doc. 3833](https://docs.tqs.com.br/Docs/Details?id=3833&language=pt-br) · [Recalques, doc. 3834](https://docs.tqs.com.br/Docs/Details?id=3834&language=pt-br) · [CRV, doc. 3835](https://docs.tqs.com.br/Docs/Details?id=3835&language=pt-br)                                                                                     | Modelos A/B, transferência dependente da carga, parâmetros e limites da superposição          | Documentação do SISEs. Não se conclui que a calculadora do print use exatamente essas mesmas opções.                                                                                                                 |
| [Prununciati, Garcia e Rodriguez — Recalques em fundações profundas: análise em estacas hélice contínua](https://doi.org/10.5216/reec.v14i1.47915)                                                                                                                                                                                                            | Estudo com três estacas instrumentadas e comparação com previsões                             | Evidência experimental para selecionar casos de calibração e validação. O desempenho observado nesse estudo não é uma margem de erro garantida para o aplicativo.                                                    |
| [FHWA GEC 12, 2016](https://www.fhwa.dot.gov/engineering/geotech/pubs/gec12/)                                                                                                                                                                                                                                                                                 | Caracterização, ensaios e provas de carga                                                     | Volume II e exemplos para avaliação de desempenho; documento dirigido a estacas cravadas. Não substitui a norma brasileira nem se transfere automaticamente a outra execução.                                        |
| [Koizumi e Ito, 1967 — Field Tests with Regard to Pile Driving and Bearing Capacity of Piled Foundations](https://www.jstage.jst.go.jp/article/sandf1960/7/3/7_3_30/_article)                                                                                                                                                                                 | Ensaio original de estaca isolada e grupo, com instrumentação                                 | Fonte experimental original usada na reanálise de Santana et al.; o grupo tem nove estacas, fora do limite atual de quatro do aplicativo.                                                                            |

## Auditoria das escolhas atuais

| Parte do cálculo           | O que já foi verificado                                                     | O que permanece aberto                                                                  |
| -------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Aoki-Velloso               | Fórmulas, integração e dois exemplos do print                               | Variabilidade regional, execução, resistência real e capacidade de grupo                |
| Núcleo vertical de Mindlin | Limite de Boussinesq, reciprocidade no meio homogêneo e escalonamento com E | Adequação do meio elástico e das fontes de carga à obra                                 |
| Camadas e base rígida      | Convergência e propriedades idealizadas do artifício de Steinbrenner        | Comparação independente com uma solução multicamadas; não é solução exata de interfaces |
| Bloco rígido               | Transformação cinemática, equilíbrio e modos a+b/a−b                        | Parâmetros físicos da flexibilidade e condições reais de ligação                        |
| Flexão/torção Winkler      | Soluções analíticas idealizadas e testes de montagem                        | Origem de kh/kt/kp, contato e interação lateral de grupo                                |
| Recalque axial Mindlin     | Superposição com fontes de fuste/ponta e encurtamento EA                    | Lei de transferência em serviço e sua validação experimental                            |
| Sapata Mindlin             | Recalque central sob pressão uniforme                                       | Diferença para contato de base rígida; rotação por kv·I é aproximação adicional         |
| E por correlação           | Fórmulas, unidades e preservação do E manual                                | Calibração, nível de deformação, drenagem e representatividade espacial                 |

### Transferência é a primeira prioridade de refinamento

No modo automático atual, `βp = RP/(RL+RP)` define uma proporção fixa para toda a resposta linear. Para o caso de 16 m, resulta em βp=0,484087 e aproximadamente 9,68 tf na ponta sob uma carga de serviço de 20 tf por estaca. Esse quociente vem de **resistências últimas**, não de uma curva medida de mobilização.

A documentação TQS 3833 descreve hipóteses diferentes, incluindo os modelos A/B com fuste mobilizado antes da ponta. Curvas t-z/q-z permitem outra representação, na qual a transferência decorre dos deslocamentos relativos e dos parâmetros constitutivos. São modelos distintos; não se deve trocar automaticamente um pelo outro para coincidir com o print. No modelo A/B documentado, 20 tf é menor que os 43,50 tf de fuste e a ponta não recebe carga. Em modelos elásticos ou em outras leis constitutivas, a ponta pode participar antes disso.

A melhoria recomendada é resolver equilíbrio e compatibilidade ao longo da estaca, com leis de fuste/base explícitas e calibráveis, mantendo o procedimento proporcional como alternativa identificada. Não se deduz uma rigidez exclusivamente de uma resistência última sem informar uma escala de deslocamento ou módulo.

### E, kh e ligação no topo são entradas físicas

E do solo, E0 de uma correlação, módulo máximo a pequenas deformações, módulo secante e tangente não são automaticamente intercambiáveis. A origem, unidades e faixa de deformação precisam acompanhar cada valor. O NIST discute a adequação do módulo à deformação; seus parâmetros de impedância dinâmica exigem interpretação antes de serem usados no estudo estático.

kh/kt/kp do exemplo de 16 m foram assumidos e continuam sem calibração. Uma confirmação do algoritmo lateral com esses valores não confirma os próprios valores. A hipótese de cabeça articulada ou rígida deve corresponder à ligação detalhada, e não ser escolhida apenas para reduzir uma diferença numérica.

### Rigidez secante, tangente e matriz global

Em um caso centrado sem acoplamento vertical, uma mola secante pode ser descrita por `Ksec=N/s`. A rigidez tangente é `Kt=dN/ds` no estado analisado. Em seis graus de liberdade, a tangente é a Jacobiana `Kij=∂Fi/∂uj`; dividir cada ação por seu deslocamento não recupera, em geral, os acoplamentos da matriz.

No motor linear atual, secante e tangente coincidem para um mesmo conjunto de parâmetros. Quando forem introduzidas mobilização, contato unilateral ou degradação, a matriz dependerá do estado de carga. Prova de carga axial isolada fornece evidência para a resposta axial; não valida, por si só, as rigidezes horizontais ou a rotação do grupo.

## Protocolo de validação

1. **Congelar os casos.** Registrar fonte, geometria, execução, unidades, E/ν/Ec, nível d'água, estratigrafia/base, transferência, ligação, cargas e referência geométrica. Identificar dados ausentes; não completá-los silenciosamente.
2. **Verificar o código por componentes.** Referências analíticas, seis ações unitárias, equilíbrio, reciprocidade onde aplicável, energia, sinais, unidades e convergência. Uma matriz bem montada pode representar um modelo físico inadequado.
3. **Confrontar outro motor com a mesma hipótese.** Verificação independente Winkler por OpenSees, usando vigas e molas nodais próprias daquele motor. Para essa conferência numérica, definiu-se previamente erro máximo normalizado de 0,5% e melhoria com refinamento. Esse limite é de desenvolvimento, não uma tolerância normativa/geotécnica.
4. **Reproduzir exemplos publicados.** Conferir entradas completas antes de aceitar uma comparação. Um gráfico digitalizado exige incerteza de leitura; hipóteses diferentes devem ser registradas, não absorvidas por ajuste de E.
5. **Validar com dados medidos separados da calibração.** Ajustar parâmetros em um ensaio e confrontar outro caso ou faixa de carga não usada no ajuste. Conferir curva carga-recalque e, quando disponível, distribuição instrumentada fuste/ponta.
6. **Avaliar grupo e rotação.** Além do caso axial centrado, confrontar momento, rotações, esforços por estaca e condições de cabeça com referência independente. Uma carga axial isolada não substitui esse passo.
7. **Publicar domínio e incerteza.** Trabalhar com cenários inferior/central/superior justificados por investigação e ensaios, sem apresentá-los como intervalo estatístico de confiança quando não houver base para isso. Identificar quais componentes foram verificadas e quais foram validadas fisicamente.

## Casos publicados selecionados, ainda não aprovados como benchmarks do aplicativo

- **Cooke et al. (1980), reanálise em Santana et al.:** três estacas tubulares em linha, incluindo dados de redistribuição e recalque. O aplicativo atual usa seção maciça circular e arranjo triangular para três estacas; substituir automaticamente a seção por Ec equivalente preservaria EA, mas alteraria EI e GJ. É necessário representar a geometria correta ou limitar expressamente a comparação à componente axial com entradas equivalentes completas.
- **Koizumi e Ito (1967):** nove estacas; requer ampliação do arranjo e investigação original. A igualdade de diâmetro/espaçamento com o print não o torna o mesmo problema.
- **REEC, DOI 10.5216/reec.v14i1.47915:** três provas de carga em hélice contínua, candidatas à validação axial. A transcrição completa de perfis, parâmetros e passos de carga é necessária antes de emitir um resultado de conferência.
- **Crispin e Mylonakis (2022):** casos laterais idealizados com rigidez variando com a profundidade, para ampliar a verificação além do solo uniforme.
- **NIST, tabelas 2-2/2-4:** referências para sapatas rígidas e estacas isoladas no domínio indicado. O recalque central de base flexível do seletor Mindlin não deve receber aprovação por comparação direta com uma sapata perfeitamente rígida.

## Evidência adicional produzida nesta revisão

A verificação independente foi **executada e aprovada** com OpenSees 3.7.1, distribuição OpenSeesPy/openseespylinux 3.7.1.2, NumPy 2.3.5 e Python 3.12.16, no [workflow de referência](https://github.com/ricardocorsini/mola-struct/actions/runs/42238968590). Os dados externos estão congelados em [tests/fixtures/opensees-winkler.json](../tests/fixtures/opensees-winkler.json), com a origem e o commit do gerador.

O outro motor usa `elasticBeamColumn` 3D, molas nodais `zeroLength` com material `Elastic`, vínculo rígido do bloco e seis cargas unitárias. Ele não importa a montagem ou o solver do MolasStruct. Foram comparadas as 36 entradas de cada matriz. O MolasStruct usa reação consistente distribuída; o comparador usa molas nodais concentradas, com refinamentos de 64/128/256 elementos por estaca.

A métrica é `max |Kij,OpenSees−Kij,MolasStruct| / sqrt(Kii,MolasStruct Kjj,MolasStruct)`. Assim, coeficientes nulos não provocam uma divisão relativa por zero; sinais e acoplamentos também entram na conferência. O limite de desenvolvimento foi definido em 0,5% antes da execução.

| Caso numérico                      | Maior erro normalizado, 64 elementos externos |      128 |          256 |
| ---------------------------------- | --------------------------------------------: | -------: | -----------: |
| Uma estaca, solo uniforme          |                                      0,24831% | 0,06206% | **0,01558%** |
| Duas estacas, solo uniforme        |                                      0,24831% | 0,06206% | **0,01558%** |
| Duas estacas, perfil estratificado |                                      0,22231% | 0,05555% | **0,01395%** |

Essa evidência confirma concordância numérica da **formulação Winkler linear nos três casos especificados**. Não confirma a realidade dos coeficientes kh/kt/kp, a transferência proporcional do método Mindlin, a aproximação multicamadas, a capacidade de carga ou os valores de uma obra. O perfil estratificado usa a geometria do exemplo de 16 m com o seletor **Winkler**, não a matriz vertical Mindlin do print.

A infraestrutura está em `scripts/verification/` e no workflow `Independent Winkler verification`. É opcional e separada da aplicação. OpenSeesPy é instalado apenas no ambiente de pesquisa/verificação, sem incorporar seus binários ao aplicativo. Em máquinas compatíveis:

```bash
python3 -m venv .venv-verification
.venv-verification/bin/python -m pip install -r scripts/verification/requirements.txt
npx vite-node scripts/verification/export-winkler.ts
.venv-verification/bin/python scripts/verification/opensees-winkler.py
npx vite-node scripts/verification/check-winkler.ts
```

No Linux, o OpenSees também requer BLAS/LAPACK e os runtimes indicados no workflow. O ambiente local restrito desta revisão não permitiu inicializar MPI; por isso a execução independente foi realizada no runner Linux do GitHub. Não se tratou uma instalação local malsucedida como resultado aprovado.

Os três casos externos são comparados novamente ao motor TypeScript em `tests/opensees.test.ts`, elevando a base a 83 testes. As referências OpenSees não são regeneradas pelo comando normal de exemplos. O método ativo e os resultados anteriores foram preservados.

Os PDFs e páginas de terceiros não são redistribuídos no repositório. As referências remetem aos autores, instituições, periódicos ou documentação oficial. As novas comparações numéricas não reclassificam automaticamente as molas do print como validadas.
