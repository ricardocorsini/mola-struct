# Revisão dos materiais e do software de referência

Esta revisão fundamenta a versão 0.2.0. As equações, unidades, escolhas de modelagem e domínios estão em [MOTOR.md](MOTOR.md). Resultados de desenvolvimento são experimentais; não há certificação de equivalência com o TQS nem verificação normativa completa.

## Alcance de cada fonte

| Fonte                                                            | O que sustenta                                                                                                      | Aplicação no MolasStruct                                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| TQS, Coeficiente de mola — Uma estaca, id 3288                   | Discussão conceitual sobre vínculo elástico, rotação e modelagem                                                    | Não usar os valores de exemplo como constantes universais; escolher rigidez e conservar os acoplamentos coerentes com o modelo    |
| TQS, Estimativa de Vínculos Elásticos de Fundação, id 1523972768 | kv/SAFE e Kh = μh Kz em sapatas; expressão simplificada de Randolph–Wroth, braços de estacas e rotação 50% de 3EI/L | Perfis selecionáveis; médias, domínio da correlação e extensões torsionais explicitados                                           |
| Silva, 2017, dissertação UFRN fornecida como Mindlin.pdf         | Equação vertical, cargas elementares Aoki–Lopes, artifício de Steinbrenner, encurtamento e mobilização bilinear     | Núcleo vertical e superposição; transferência linear proporcional fixa nesta versão, sem alegar reproduzir a mobilização bilinear |
| Olavo, 2023, artigo IDD fornecido                                | Equação vertical, discussão e implementação de referência                                                           | Conferência de transcrição; implementação própria das equações em Rust e TypeScript                                               |
| Print da calculadora simples                                     | Entradas, geometria, SPT, resistências e saídas de rigidez                                                          | Regressão da capacidade Aoki–Velloso e convenções explícitas; insuficiente para validar sozinho o motor de rigidez                |

Os PDFs e as imagens das publicações não são redistribuídos no repositório. As referências são bibliográficas, com links quando fornecidos. O código das publicações não foi incorporado.

## Conferência do print de duas estacas

No desenho, as estacas partem do terreno e têm ponta a 5 m. Para representar essa geometria aqui, use **D = 0 m e L = 5 m**. Neste programa, D é a face inferior do bloco e L é o trecho de estaca abaixo dela; não interpretar automaticamente “cota de assentamento” do outro programa como D.

| Parâmetro             | Dado transcrito / conversão                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| Quantidade / diâmetro | 2 / 0,25 m                                                                       |
| Espaçamento X e Y     | 1,20 m                                                                           |
| F1 / F2               | 4,2 / 3,9                                                                        |
| SPT nos primeiros 5 m | 4, 6, 10, 12, 20                                                                 |
| Camada 0–5 m          | α = 0,014; K = 100 tf/m² por golpe = 980,665 kPa/golpe                           |
| Camada 5–10 m         | α = 0,010; mesmo K; usada abaixo da ponta, sem acrescentar fuste à estaca de 5 m |
| SPT em 6–10 m         | 39, 38, 38, 38, 38                                                               |

A unidade de K não aparece no cabeçalho do print. A conversão para 100 tf/m² é uma **inferência verificada pelos resultados**:

```text
RL = π × 0,25 × 0,014 × 980,665 × (4+6+10+12+20) / 3,9
RP = (π × 0,25²/4) × 980,665 × 20 / 4,2
```

Convertendo kN para tf por 9,80665, os resultados arredondados são **RL = 14,7 tf; RP = 23,4 tf; Ru = 38,0 tf por estaca**, como no print. A ponta na fronteira usa a camada que termina em 5 m. O teste correspondente está em `tests/methods.test.ts`.

O print não fixa E, ν, kh, kt, kp nem a distribuição de carga de serviço. Portanto, não permite reproduzir de forma fundamentada todas as rigidezes. Há também uma diferença de convenção a esclarecer: no print, `Kθy/Kz = 6145,25/8535,27 ≈ 0,72 m²`. Na dedução publicada pelo TQS para duas estacas, considerando Kz como a rigidez **total do bloco**, a razão é `sx²/4 = 0,36 m²`. O valor do print seria compatível com apresentar Kz por estaca e usar o braço das duas estacas na rotação, mas isso é apenas uma hipótese de leitura; o material disponível não confirma essa convenção.

O MolasStruct exporta sempre a matriz **global do bloco**. Não se presumiu equivalência entre a convenção do print e a da documentação TQS, nem se ajustou fator para forçar coincidência das molas. A regressão numérica do print abrange somente RL, RP e Ru.

## Divergência na expressão de Mindlin

A equação 7 impressa na página 3 do artigo de Olavo mostra o termo `8(1+ν)²`. O código vertical na página 5 do mesmo artigo e a equação 2.20 de Silva (p. 36) usam `8(1−ν)²`. O motor utiliza o segundo, conferido pelo limite de Boussinesq `w/P = (1−ν²)/(πEr)` em c = z = 0. Não copiar a expressão impressa sem essa conferência.

## Escolhas que ainda dependem de calibração

- Mobilização fuste/ponta: hoje fixa, proporcional a RL/RP ou fração de ponta informada. Fuste-primeiro, leis t-z/q-z e iteração por reação ficam para revisão futura.
- Interação de estacas: vertical no modo Mindlin; lateral por Winkler independente. Bloco rígido sem contato com o solo.
- Sapata Mindlin: recalque central sob pressão uniforme; a adoção de kv I nas rotações é uma aproximação separada.
- Randolph: expressão simplificada de fuste do documento TQS. A solução completa com termo de base não foi atribuída ao algoritmo reduzido.
- SPT → E e coeficientes de reação: exigem julgamento geotécnico e, quando possível, calibração por ensaios.
- NBR 6122:1996 é apenas a referência histórica mostrada no software antigo. Nenhum resultado de tensão básica foi inventado. Terzaghi permanece pendente; Vésic tem alcance explicitado.

## Fontes

- <https://docs.tqs.com.br/Docs/Details?id=3288&language=pt-BR>
- <https://docs.tqs.com.br/Docs/Details?id=1523972768&language=pt-BR>
- Mindlin, R. D. (1936). Force at a Point in the Interior of a Semi-Infinite Solid. Physics 7, pp. 195–202. <https://doi.org/10.1063/1.1745385>.
- Silva, Pedro Lima e (2017). Desenvolvimento de programa computacional para estimativa de recalque elástico de estacas. UFRN, Natal. Orientador: Yuri Daniel Jatobá Costa. Material fornecido pelo usuário.
- Olavo, Luiz Henrique Felipe (2023). Código-fonte para cálculo de recalques de fundações: biblioteca de vínculo dinâmico com equações de Mindlin. Revista On-line IDD 3, 3º quadrimestre. Material fornecido pelo usuário.
