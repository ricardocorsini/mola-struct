# Coeficientes horizontais TQS: comparação antes de adotar um preset

## Conclusão do ensaio

A substituição dos coeficientes horizontais ilustrativos por uma lei SPT/m baseada no documento fornecido aproxima bastante **Kx e Ky** do print. Com interpolação linear, o mesmo caso de duas estacas Ø0,30 m e 16 m resulta em **182,1029 tf/m** para os topos rotulados. Um modelo separado com molas nodais a cada metro dá **174,9642 tf/m**, contra **168,92 tf/m** do programa externo. Os desvios são +7,8042% e +3,5782%, respectivamente.

Essa é uma explicação plausível para boa parte da diferença horizontal, não uma identificação do algoritmo usado no print. As regras entre pontos, a discretização e as associações geotécnicas ainda não foram confirmadas. **Kz=22.736,9272 tf/m e Kθy=4.937,7369 tf·m/rad permanecem iguais** ao se trocar apenas a lei horizontal com topos rotulados; o desvio de +13,2054% de Kθy não é resolvido por essas tabelas.

O resultado reproduzível está em [referencia-16m-crh-tqs.json](../examples/referencia-16m-crh-tqs.json). Este estudo não altera a configuração de cálculo do app nem cria uma aprovação das molas externas.

## O que foi conferido nas fontes

- **Documento fornecido, TQS 3829, quatro páginas:** [CRH – Sapatas e Tubulões](https://docs.tqs.com.br/Docs/Details?id=3829&language=pt-br). Contém as tabelas K, nh e SPT/m e as expressões das molas nodais. Não fornece correlação de E, ν, transferência vertical ou rigidez axial.
- **Fonte complementar específica, TQS 3836:** [CRH – Estacas](https://docs.tqs.com.br/Docs/Details?id=3836&language=pt-br). Também apresenta K/nh e SPT/m. Ressalva a origem do método de Tietz em tubulões de aproximadamente 1 m ou mais e a comprovação das correlações para solos brasileiros. Seu emprego diagnóstico em Ø0,30 m não comprova esse domínio.
- A página 3836 não coincide integralmente com 3829: K provável de argila média é 0,8 MPa, enquanto 8 kgf/cm² do PDF equivalem a 0,784532 MPa. Para silte, os valores de nh também diferem. A coluna de nh aparece rotulada em MPa, mas a expressão K=nh·z requer F/L³ para nh. Essas convenções precisam ficar explícitas em uma configuração.

Não se presume que a calculadora antiga dos prints utilize todos os critérios do SISEs, nem que as duas páginas descrevam exatamente a mesma versão de tabelas e critérios. A tabela SPT/m é apresentada por família de material e contém rótulos de solo misturados no ramo granular; não é justificativa para reclassificar automaticamente um solo.

## Grandezas com letras semelhantes e unidades diferentes

O app recebe **kh em kN/m³**, isto é, pressão horizontal por deslocamento, e monta a reação distribuída sobre a largura da estaca: `Klinha=kh·d`, em kN/m². A rigidez nodal translacional é `Klinha·Δl`, em kN/m.

| Símbolo / origem         | Unidade   | Relação usada no estudo                                         |
| ------------------------ | --------- | --------------------------------------------------------------- |
| kh do MolasStruct        | kN/m³     | `Klinha=kh·d`                                                   |
| K da tabela 6.1 de 3829  | kgf/cm²   | `Klinha=98,0665·K`; equivalente `kh=Klinha/d`                   |
| nh da tabela 6.2 de 3829 | kgf/cm³   | `Klinha(z)=9.806,65·nh·z`; equivalente `kh=Klinha/d`            |
| m das tabelas 6.3/6.4    | tf/m⁴     | `Klinha(z)=9,80665·m·z·d`; equivalente `kh=9,80665·m·z`         |
| K de Aoki–Velloso        | kPa/golpe | Capacidade de carga, com α e F1/F2; independente dos K/nh acima |

O documento usa kh tanto na apresentação de pressão/deslocamento como na expressão de mola nodal. As unidades das equações, do diâmetro e do comprimento de influência evitam a troca dessas grandezas. Copiar o número de uma coluna diretamente para o campo kh atual pode introduzir um fator de diâmetro e conversões incorretos.

## Comparação dos parâmetros por profundidade

O caso-base usa kh constante em cada camada: 18.000 / 40.000 / 55.000 kN/m³. São valores ilustrativos, não derivados do SPT do print. O ramo Mindlin utiliza esse kh apenas no comportamento lateral; E e ν continuam no núcleo vertical.

Exemplo com **interpolação linear de m** e `z` a partir do terreno (D=0):

| z (m) | NSPT | m (tf/m⁴) | kh atual (kN/m³) | kh equivalente SPT/m (kN/m³) |
| ----: | ---: | --------: | ---------------: | ---------------------------: |
|     1 |    6 |       275 |           18.000 |                  2.696,82875 |
|     4 |    5 |       250 |           40.000 |                  9.806,65000 |
|    16 |   35 |       900 |           55.000 |                141.215,76000 |

A lei nova deixa os primeiros metros mais flexíveis, mesmo podendo superar o coeficiente antigo em profundidade. Isso é coerente com a importância dos primeiros metros para a resposta horizontal de uma estaca flexível. Não equivale a multiplicar todos os coeficientes por um único fator.

## Resultados com o mesmo modelo vertical

Foram mantidos geometria, Ec=30 GPa, E/ν, capacidade Aoki–Velloso, transferência e interação vertical. A tabela principal usa topos **rotulados em X/Y**. Kx=Ky por simetria do modelo lateral adotado.

| Hipótese horizontal                                           | Kx=Ky (tf/m) | Diferença para 168,92 tf/m |
| ------------------------------------------------------------- | -----------: | -------------------------: |
| Manual ilustrativo, ligação rotulada                          |     956,0341 |                 +465,9686% |
| SPT/m, degrau inferior, matriz consistente / 64 elementos     |     140,0812 |                  −17,0725% |
| SPT/m, interpolação linear, matriz consistente / 64 elementos |     182,1029 |                   +7,8042% |
| SPT/m, degrau superior, matriz consistente / 64 elementos     |     211,3392 |                  +25,1120% |
| SPT/m, interpolação linear, molas nodais / 1 m                |     174,9642 |                   +3,5782% |

As três regras entre pontos são **hipóteses de sensibilidade**, não regras atribuídas ao TQS. O documento informa as ordenadas da tabela, mas não permite concluir como a calculadora antiga trata todos os valores intermediários. Os pontos exatos coincidem entre as três regras. Acima de N=30, o ramo argiloso usa m=900, conforme a indicação de argila dura em 3836. O estudo bloqueia extrapolação no ramo granular.

Com **ligação rígida**, a troca para SPT/m linear dá Kx=469,3490 tf/m e Kθy=6.998,2075 tf·m/rad: a flexão local continua participando. Portanto, a escolha da ligação precisa ser comparada junto com a correlação horizontal, sem confundir o coeficiente diagonal com uma rigidez efetiva após liberar outras forças.

### Discretização

O motor ativo integra uma matriz consistente de reação por elemento, usando o coeficiente amostrado no ponto médio. O estudo converte a lei variável em um perfil computacional por elemento sem alterar suas propriedades verticais; essa subdivisão é um adaptador numérico, não uma interpretação geológica de novas camadas.

O ensaio nodal monta uma viga separada com molas `k_i=m_i z_i d Δl_i` nos nós. No caso de 1 m, a convenção declarada é peso de 1 m por nó de SPT, inclusive na ponta, e nenhum apoio de solo no nó de cota zero. A ponta fica livre à flexão. O PDF informa Δl=1 m, mas não fecha todas as condições de extremidade; a convenção deste ensaio não é confirmada como a do programa comparado.

| Molas nodais, interpolação linear | Kx rotulado (tf/m) |
| --------------------------------- | -----------------: |
| 1,00 m / 16 elementos             |           174,9642 |
| 0,50 m / 32 elementos             |           181,4422 |
| 0,25 m / 64 elementos             |           182,2197 |
| 0,125 m / 128 elementos           |           181,9833 |

O refinamento não precisa ser monotônico quando há descontinuidades de SPT/camada e associação do valor do nó ao intervalo que termina nele. Estar mais próximo do print com a malha de 1 m não significa ser mais exato fisicamente. No refinamento da matriz consistente, `segments` também modifica a discretização vertical do motor: os pequenos desvios de Kz dessa série devem ser separados da troca isolada de CRH na malha fixa de 64 elementos.

### K/nh por tipo de solo

Foram ensaiadas 48 associações: três classes de areia na camada 0–3 m e quatro consistências de argila pré-adensada em cada uma das duas camadas argilosas. Com o nível d’água a 1 m, nh seco/submerso segue a cota local. Kx rotulado variou de **330,7932 a 1.287,1589 tf/m** nessas associações. Esse conjunto não reproduziu 168,92 tf/m.

O OCR e a consistência dessas argilas não foram informados; as 48 associações não são inferências do SPT nem representam uma calibração. Outros regimes e classificações exigem dados adicionais. A variação por tipo de solo não deve ser trocada automaticamente pela correlação SPT/m.

## Configuração que a evidência permite propor

A configuração horizontal deve ser independente das escolhas de E, ν e transferência vertical:

1. **Manual:** kh editável por camada, como já existe em Sondagem → Camadas de solo → Parâmetros avançados.
2. **K/nh conforme referência TQS identificada:** seleção explícita de consistência, regime e coeficiente de cada camada; valores editáveis; unidades de K e nh distintas. A origem da profundidade z e o nível d’água precisam constar do registro.
3. **SPT/m – Tietz conforme tabelas publicadas pelo TQS:** família do solo, regra entre pontos, faixas, unidades e limites de aplicação visíveis; ordenadas editáveis. Uma indicação genérica “adotar coeficientes TQS” omite decisões que influenciam o resultado.
4. **Discretização:** identificar matriz consistente ou modelo nodal de comparação, passo da malha e pesos de extremidade. Não selecionar automaticamente a alternativa que se aproxima do print.

O caso de 16 m continua com os valores manuais para preservar a referência anterior. A checagem requerida vem antes de ativar um preset no cálculo da obra. A evidência favorece investigar SPT/m para a diferença horizontal; a diferença vertical exige confrontar o modelo axial e seus parâmetros.

## Reproduzir e verificar

```bash
npm run investigate:crh
npx vitest run tests/tqsCrhAudit.test.ts
```

O script registra tabelas, hipóteses, unidades, valores por profundidade, resultados das duas ligações, ensaios por tipo e malhas. Sete testes cobrem unidades, pontos da tabela e regras intermediárias, perfil manual preservado, invariância axial ao variar só CRH, cálculos manuais da lei e o limite analítico Winkler com malha nodal trapezoidal. A malha trapezoidal desse teste inclui meias influências nas extremidades; não é a convenção de nós de SPT usada no ensaio de 1 m.

As saídas geradas pela própria implementação são registros de investigação e regressão. Não são novos alvos externos de validação. Os PDFs e imagens de terceiros não são redistribuídos no repositório.
