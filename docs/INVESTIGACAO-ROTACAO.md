# Investigação de Kθy: caso de duas estacas de 16 m

A investigação identifica algebricamente a origem da diferença observada no modelo atual. **O maior componente é a flexão local das estacas, presente também no eixo com binário.** Retirá-la somente da comparação reduz a diferença de Kθy de 79,05% para 13,21%. Isso não identifica por completo o algoritmo do software externo nem valida o modelo geotécnico.

O motor e seus parâmetros foram preservados. A tela **Exemplo 16 m → Comparar print** e a memória PDF apresentam este diagnóstico; `npm run investigate:rotation` reproduz os 30 ensaios numéricos de hipóteses e grava [referencia-16m-investigacao.json](../examples/referencia-16m-investigacao.json).

## 1. Flexão local entra nos dois eixos

| Parcela do modelo atual                  | Kθy (tf·m/rad) | Diferença para o print |
| ---------------------------------------- | -------------: | ---------------------: |
| Print                                    |     4.361,7500 |                      — |
| Apenas contribuição axial, com interação |     4.937,7369 |              +13,2054% |
| Flexão local somada no modelo ativo      |    +2.871,8051 |                      — |
| Modelo ativo completo, ux impedido       |     7.809,5420 |              +79,0461% |

A soma é exata: 4.937,7369 + 2.871,8051 = 7.809,5420. A flexão local responde por **83,294% do excesso** de 3.447,7920 tf·m/rad sobre o print. Esta é uma atribuição algébrica dentro do nosso modelo; kh foi assumido porque não consta no print.

Para duas estacas em X, o braço axial em torno de X é nulo. No modelo ativo, o Kθx=2.871,8051 vem da flexão local. O mesmo componente também entra em Kθy, além do binário axial. Desconsiderar a flexão apenas no eixo sem binário não elimina essa diferença no outro eixo.

A interpretação do usuário para Kθx=0 é coerente com uma idealização que transmite momento por binário e desconsidera a flexão local do topo. Articulações nos topos para transmitir flexões por binários são descritas pelo [TQS em outro exemplo](https://docs.tqs.com.br/Docs/Details?id=3458&language=pt-br). Essa fonte fundamenta a possibilidade da idealização, não comprova as condições internas do print analisado.

## 2. Por que Kz próximo não implica Kθy igualmente próximo?

Para duas estacas idênticas, em posições x=±s/2, a flexibilidade axial do modelo é:

```math
C=\begin{bmatrix}a&b\\b&a\end{bmatrix},\qquad
K_z=\frac{2\eta}{a+b},\qquad
K_{\theta y,axial}=\frac{\eta s^2}{2(a-b)}
```

`a` contém flexibilidade própria do solo e encurtamento elástico; `b` representa a flexibilidade mútua. No caso atual, a=8,666772806×10⁻⁶ m/kN e b=3,029195522×10⁻⁷ m/kN; b/a=3,4951828%.

No recalque uniforme, os deslocamentos e incrementos de força das estacas têm o mesmo sentido: entra **a+b**. Na rotação, os incrementos axiais são opostos: aumenta a compressão em uma estaca e diminui na outra, entrando **a−b**. Isso não significa, por si só, que a carga total de uma estaca tenha passado a ser de tração.

Logo:

```math
\frac{K_{\theta y,axial}}{K_z}
=\frac{s^2}{4}\frac{a+b}{a-b}
```

| Comparação de razões                 |       m² |
| ------------------------------------ | -------: |
| Braço s²/4, com s=0,90 m             | 0,202500 |
| Kθy/Kz do print                      | 0,202509 |
| Kθy,axial/Kz do modelo com interação | 0,217168 |

A interação aumenta a razão modal em **7,24354%** em relação a s²/4. O valor de Kz também está 5,56392% acima do print; os dois efeitos compõem a diferença axial de 13,2054%.

Fixando apenas a referência de Kz para comparar razões, `21.538,54 × 0,21716817 = 4.677,4853 tf·m/rad`. Esta normalização não é um recálculo com Ec ajustado. Ela mostra que, mesmo eliminando a diferença de Kz, ainda restaria o efeito modal da interação.

A dedução de duas estacas apresentada no [TQS](https://docs.tqs.com.br/Docs/Details?id=1523972768&language=pt-BR), na [equação de rotação](https://cdn.tqs.com.br/docs/media/ccb69e01ec1eced97fd29b102255a22a.png), resulta em Kθ=Kz·s²/4 para molas axiais independentes. A página também declara a ausência do efeito de agrupamento nessa formulação simplificada. O print é aproximadamente compatível com essa relação; não se conclui que ele use todo o procedimento dessa página.

Há um pequeno resíduo: `21.538,54 × 0,90²/4 = 4.361,55435`, enquanto o print informa 4.361,75. São **0,19565 tf·m/rad, ou 0,00449%**. O erro máximo atribuível somente ao arredondamento dos dois coeficientes a 0,01 é 0,0060125 tf·m/rad. Portanto, a relação é muito próxima, mas não é exatamente explicada por esse arredondamento; há convenção, constante ou etapa interna ainda não identificada.

## 3. Reconstrução completa da diferença

| Etapa da identidade algébrica                       |        tf·m/rad |
| --------------------------------------------------- | --------------: |
| Valor publicado no print                            |     4.361,75000 |
| Fechamento para Kz,print·s²/4                       |        −0,19565 |
| Efeito do Kz do modelo ser maior, com o mesmo braço |      +242,67342 |
| Efeito modal da interação em relação ao mesmo Kz    |      +333,50911 |
| Flexão local das estacas                            |    +2.871,80510 |
| **Kθy do modelo ativo**                             | **7.809,54197** |

A geometria do projeto não foi alterada. A rotina inclui um termo geométrico separado, inicialmente zero, caso o usuário altere o espaçamento. As linhas são uma identidade, não ajustes para forçar o resultado.

## 4. Condições de cabeça e translação

| Cenário diagnóstico                                    |   Kz (tf/m) | Kθy (tf·m/rad) |
| ------------------------------------------------------ | ----------: | -------------: |
| Modelo ativo, ux impedido                              | 22.736,9272 |     7.809,5420 |
| Modelo ativo, Hx=0 e ux livre                          | 22.736,9272 |     6.375,9910 |
| Apenas axial, com interação; momentos locais liberados | 22.736,9272 |     4.937,7369 |
| Apenas axial, sem interação; momentos locais liberados | 23.531,6244 |     4.765,1539 |

No segundo cenário, a rigidez é o complemento de Schur `Kθθ−Kθx·Kxx⁻¹·Kxθ`, calculado em SI antes da conversão para tf. Os demais graus de liberdade permanecem impedidos. No caso simétrico, coincide com o resultado do momento unitário com os demais esforços externos nulos.

Liberar a translação do bloco é diferente de articular a ligação estaca-bloco. A articulação libera o momento local na estaca; deve-se condensar também o acoplamento lateral correspondente. Nesse diagnóstico, Kx seria **956,0341 tf/m**, ainda distante dos 168,92 tf/m do print. Zerando apenas uma diagonal e preservando seus acoplamentos, obteríamos uma matriz inconsistente.

A distinção entre matriz de rigidez no topo, flexibilidade e condições de deslocamento/rotação consta de Crispin & Mylonakis (2022), [Exact Winkler Solution for Laterally Loaded Piles in Inhomogeneous Soil](<https://doi.org/10.1061/(ASCE)EM.1943-7889.0002125>). Poulos (1974), [Analysis of Pile Groups Subjected to Vertical and Horizontal Loads](https://geomechanics.org.au/admin/wp-content/uploads/2015/02/G4_4.pdf), distingue ligações rígidas, articuladas e interação de grupo. As fórmulas de condensação e a decomposição deste caso foram verificadas independentemente por álgebra matricial.

## 5. Ensaios controlados

- **Refinamento:** ne=16/32/64 e ng=8/16/32, nove combinações. De ne=32, ng=16 para ne=64, ng=32, Kθy muda 0,0240% e Kz muda 0,0336%. Esse refinamento não explica o desvio de 79%.
- **kh:** multiplicadores 0,01/0,1/1/10 alteram a flexão local e Kθy total, preservando Kz e sua contribuição axial. A flexão local assume 1.041,81 / 1.740,58 / 2.871,81 / 5.019,86 tf·m/rad. Essa parcela depende de parâmetros que não vieram no print.
- **Ec:** 26/28/30/32 GPa. Para Ec=28 GPa, Kz=21.674,58 fica mais próximo do print, mas Kθy axial=4.691,15 e total=7.414,22 continuam diferentes. Aproximar Kz por um parâmetro não elimina a diferença de modelagem.
- **Transferência:** βp=0/0,25/0,484087/0,75/1. Muda o encurtamento e a flexibilidade do solo. βp=0,75, por exemplo, reduz Kθy axial para 4.051,91, mas também reduz Kz para 18.687,47. Não foi selecionado um βp apenas para coincidir com Kθy.
- **Unidades de E:** interpretar os números como kgf/cm², mantendo as demais hipóteses, dá Kθy total=4.311,80, aparentemente próximo, mas Kz=5.850,77, incompatível com o alvo 21.538,54. Coincidência isolada de um coeficiente não valida uma hipótese de unidades.
- **Base rígida:** 20/40/100/200 m. A continuação do solo foi explicitamente definida em cada ensaio. Entre 20 e 100 m, Kθy axial passa de 4.939,96 para 4.937,74, enquanto Kz passa de 23.373,79 para 22.736,93. O modo de rotação é pouco sensível a essa mudança neste caso; isso não é garantia para outros perfis.

## 6. O que investigar a seguir

A comparação deve primeiro usar as mesmas condições: participação ou liberação da flexão local, presença de interação e definição do coeficiente com deslocamentos livres/impedidos. Isso explica a maior parte do desvio sem presumir um erro numérico no braço do binário.

Depois, a equivalência vertical exige confirmar Ec, E e ν, lei de transferência, ponto de avaliação e tratamento do solo sob a ponta. Não há motivo para calibrar kh, Ec ou βp antes de fixar essas hipóteses. O pequeno resíduo da relação do print deve continuar registrado.

A versão 0.5.0 acrescenta a escolha de ligação rotulada, com condensação local e tratamento explícito dos mecanismos. O caso-base rígido desta investigação continua numericamente preservado. A comparação implementada e o ensaio de momento unitário estão em [LIGACAO-ESTACA-BLOCO.md](LIGACAO-ESTACA-BLOCO.md).

Oito testes automatizados verificam as identidades modais, reconstrução, duas molas independentes, condensação, influência separada de kh, refinamento, limite do arredondamento e bloqueio fora da geometria admitida. Um teste confirma que a matriz calculada continua exatamente igual à matriz publicada antes desta investigação. A base passa a 80 testes TypeScript; os 26 casos de paridade existentes não foram regenerados para produzir novos alvos externos.
