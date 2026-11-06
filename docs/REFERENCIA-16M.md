# Comparação externa: bloco com duas estacas de 16 m

O caso fornecido pelo usuário em 06/11/2026 foi transcrito como um projeto editável, com **NSPT(11)=17**. A capacidade Aoki-Velloso reproduz os três resultados do print na precisão apresentada. **As rigidezes ainda não reproduzem o software de referência** e não recebem aprovação automática.

Carregue **Início → Exemplo 16 m** e abra **Resultados → Comparar print**. Também é possível abrir [referencia-16m.molas.json](../examples/referencia-16m.molas.json). A tabela recalcula com as entradas atuais e sinaliza alterações em relação à transcrição. A comparação e as hipóteses acompanham a memória PDF.

![Comparação das capacidades e rigidezes do caso de 16 m](assets/referencia-16m.png)

## Dados transcritos

| Entrada              | Valor do print                              |
| -------------------- | ------------------------------------------- |
| Estacas              | 2, circulares, diâmetro 0,30 m              |
| Cota de assentamento | 16 m, interpretada como ponta; D=0 e L=16 m |
| Espaçamentos X/Y     | 0,90 / 0,90 m; duas estacas alinhadas em X  |
| Concreto             | fck=30 MPa; módulo Ec não informado         |
| Aoki-Velloso         | F1=2; F2=4                                  |
| Carga de topo        | 40 tf no grupo; 20 tf por estaca            |
| Água / indeslocável  | 1 / 100 m                                   |

| Profundidade da camada (m) | Solo   |     α | K (tf/m²/golpe) | E, unidade ausente no print |    ν |
| -------------------------- | ------ | ----: | --------------: | --------------------------: | ---: |
| 0–3                        | Areia  | 0,024 |              70 |                         140 | 0,35 |
| 3–11                       | Argila | 0,040 |              22 |                          88 | 0,35 |
| 11–20                      | Argila | 0,030 |              33 |                         370 | 0,35 |

NSPT de 1 a 20 m, um registro por metro:

```text
6; 3; 4; 5; 6; 6; 8; 9; 12; 14; 17; 15; 12; 12; 22; 35; 35; 36; 38; 40
```

O valor 17 no metro 11 foi informado em texto pelo usuário. Os valores-alvo são transcritos diretamente do print e permanecem separados das saídas geradas pelo motor.

## Resultado com as hipóteses atuais

| Grandeza                          |     Print | MolasStruct | Comparação                                            |
| --------------------------------- | --------: | ----------: | ----------------------------------------------------- |
| Fuste por estaca (tf)             |      43,5 |     43,5048 | Confere ao arredondar para 0,1 tf                     |
| Ponta por estaca (tf)             |      40,8 |     40,8211 | Confere ao arredondar para 0,1 tf                     |
| Última por estaca (tf)            |      84,3 |     84,3258 | Confere ao arredondar para 0,1 tf                     |
| Kx e Ky (tf/m)                    |    168,92 |  1.908,9419 | Não confirmado; kh e modelo lateral não identificados |
| Kz global (tf/m)                  | 21.538,54 | 22.736,9272 | +5,5639%; não confirmado                              |
| Kθx (tf·m/rad)                    |      0,00 |  2.871,8051 | Modelos de rotação diferentes                         |
| Kθy (tf·m/rad)                    |  4.361,75 |  7.809,5420 | +79,0461%; não confirmado                             |
| Recalque implícito sob 40 tf (mm) |  1,857136 |    1,759253 | Valor do print deduzido de 40/Kz, não medido          |

O resultado acima usa Mindlin vertical, transferência proporcional automática, ne=64 e ng=32. A contribuição lateral/flexão/torção permanece Winkler. Kii da matriz é a rigidez com os outros graus de liberdade impedidos; não deve ser confundida com a rigidez efetiva obtida liberando rotações.

A tolerância das resistências é **0,05 tf**, correspondente ao arredondamento do print. Não foi escolhida uma tolerância de engenharia para aprovar molas. A execução dos testes não torna as linhas de rigidez validadas.

### Conferência manual da capacidade

Usando K nas unidades do print, as somas de N ao longo da estaca são 13 em 0–3 m, 77 em 3–11 m e 96 em 11–16 m. Na ponta a 16 m, Np=35:

```text
RL = π × 0,30 / 4 × (0,024 × 70 × 13 + 0,040 × 22 × 77 + 0,030 × 33 × 96)
   = 43,50477507 tf
RP = π × 0,30² / 4 × 33 × 35 / 2 = 40,82106954 tf
Ru = RL + RP = 84,32584461 tf
```

São resistências últimas brutas por estaca. Carga admissível, verificação ELU, processo executivo e capacidade de grupo são verificações distintas.

### Rotação e interação

No print, Kθy/Kz=0,202509 m², próximo de sx²/4=0,2025 m²; Kθx=0. Esta relação é compatível com a idealização de duas molas axiais independentes com braço, mas **não demonstra qual algoritmo foi usado internamente**.

O modelo ativo inclui flexibilidade mútua vertical entre estacas e flexão local Winkler. A contribuição axial isolada é:

| Diagnóstico                     |   Kz (tf/m) | Kθx (tf·m/rad) | Kθy (tf·m/rad) |
| ------------------------------- | ----------: | -------------: | -------------: |
| BᵀC⁻¹B com interação ativa      | 22.736,9272 |              0 |     4.937,7369 |
| Cij=0, i≠j, somente diagnóstico | 23.531,6244 |              0 |     4.765,1539 |

Essas parcelas não substituem a matriz ativa nem removem sua flexão para produzir um zero artificial. O grupo com interação não precisa preservar a relação Kθy/Kz=sx²/4, pois deslocamento uniforme e rotação mobilizam modos diferentes de C.

## Hipóteses que precisam de confirmação

- **Unidades de E:** 140/88/370 foram interpretados como MPa. Esta unidade não está indicada no print.
- **Ec das estacas:** foi adotado 30 GPa explicitamente, sem inferi-lo de fck. Faltam a fórmula e o módulo usado pelo programa de referência.
- **Solo abaixo de 20 m:** a investigação mostrada termina em 20 m e a base está a 100 m. O arquivo acrescenta uma camada identificada como hipótese de 20 a 100 m, repetindo E=370 MPa e ν=0,35. O motor não prolonga camadas silenciosamente.
- **Rigidez horizontal:** kh, kt e kp não estão no print. Foram mantidos valores ilustrativos, visíveis no projeto. É necessário identificar a formulação lateral e as condições de cabeça/ponta do software de referência.
- **Recalque:** faltam a lei de transferência em serviço, a convenção de interação, o ponto de avaliação e a discretização efetivamente usados no cálculo de referência.
- **Bloco:** dimensões 1,50 × 0,60 × 0,65 m foram assumidas para visualização. Não há contato bloco-solo nem acréscimo automático de peso próprio aos 40 tf.

Sensibilidade a valores manuais de Ec, sem calibração para atingir o resultado-alvo:

| Ec assumido (GPa) | Kz global (tf/m) | Recalque (mm) |
| ----------------: | ---------------: | ------------: |
|                26 |      20.565,8325 |      1,944974 |
|                28 |      21.674,5753 |      1,845480 |
|                30 |      22.736,9272 |      1,759253 |
|                32 |      23.755,7401 |      1,683804 |

A proximidade de um resultado nesta tabela não identifica a fórmula correta de Ec nem valida o restante do modelo. A documentação pública TQS fornecida descreve métodos relacionados, mas não determina todas as convenções internas deste print. Uma memória detalhada deste mesmo cálculo permitiria encerrar essas diferenças.

## Correlação E0 da foto

A fotografia apresenta E0=6KN para cravadas, 4KN para hélice contínua e 3KN para escavadas, atribuídos a Aoki (1984). A nova seleção **Propriedades → Métodos → Origem de E → E0 Aoki** implementa esses fatores, com K_AV em kPa/golpe e E0 convertido para MPa. K_AV não é o K_E de Schmertmann.

O módulo é inicial: a atualização de Es pelo estado geostático e pelos acréscimos de tensões não está implementada. A seleção não troca automaticamente o E manual do caso do print. O tipo executivo declarado é confrontado com o fator selecionado; os fatores não são apresentados como prescrições da NBR.

Para a média de N por espessura nas três camadas investigadas:

| Camada  | N médio | E manual assumido (MPa) | E0 cravada (MPa) | E0 CFA (MPa) | E0 escavada (MPa) |
| ------- | ------: | ----------------------: | ---------------: | -----------: | ----------------: |
| 0–3 m   |  4,3333 |                     140 |          17,8481 |      11,8987 |            8,9241 |
| 3–11 m  |  9,6250 |                      88 |          12,4593 |       8,3062 |            6,2297 |
| 11–20 m | 27,2222 |                     370 |          52,8578 |      35,2386 |           26,4289 |

Não há NSPT de 20 a 100 m. Trocar este caso para E0 correlacionado bloqueia o cálculo por cobertura insuficiente, em vez de extrapolar a sondagem. A expressão E0 pode ser testada em perfis com cobertura completa ou comparada na tabela sem alterar o caso.

## Reprodução e arquivos

- [Projeto editável](../examples/referencia-16m.molas.json), [SPT CSV](../examples/referencia-16m-spt.csv), [matriz CSV](../examples/B16-matriz.csv) e [memória PDF](../examples/B16-memoria.pdf).
- [Comparação numérica completa](../examples/referencia-16m-comparacao.json): alvos externos, saídas atuais, hipóteses, contribuição axial, sensibilidade e E0.
- `tests/benchmark16.test.ts`: transcrição, integração manual, classificação honesta das rigidezes, influência de N11/Ec, cobertura de solo/SPT, separação axial, fatores/unidades E0 e compatibilidade de arquivos.
- O caso de 16 m e os três fatores E0 integram os 26 casos de paridade Rust/TypeScript. Paridade verifica consistência de implementações; não comprova equivalência com o software de referência.

Os prints, a foto do livro e os PDFs normativos não são redistribuídos no repositório. O código, as tabelas de comparação e os desenhos foram produzidos independentemente.

## Investigação detalhada da rotação

Veja [INVESTIGACAO-ROTACAO.md](INVESTIGACAO-ROTACAO.md): a flexão local explica 83,3% do excesso de Kθy; removê-la somente do diagnóstico reduz a diferença para 13,21%. Os efeitos do nível de Kz e da interação são separados por uma identidade modal, com testes de condensação e refinamento. As rigidezes continuam não confirmadas contra o software externo.
