# Funcionalidades

| Recurso da referência                 | Implementação nesta versão                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| Alternar Estaca / Sapata              | Propriedades → Geometria, com vistas e resultados sincronizados                        |
| Título e observações                  | Dados do projeto, clicando no título superior                                          |
| fck, F1 e F2                          | Propriedades → Materiais; Ec e νc acrescentados                                        |
| 1, 2, 3 ou 4 estacas                  | Arranjos em Geometria; centroide triangular calculado                                  |
| Diâmetro, distância X/Y, assentamento | Geometria; D define a base e L define o trecho de estaca abaixo dela                   |
| Cota impenetrável e nível d'água      | Solo / Sondagem; base rígida consumida por Steinbrenner nos modos Mindlin              |
| Sapata: comprimento, largura e altura | Geometria em metros, com desenho cotado                                                |
| Tabela SPT                            | Sondagem, importação CSV/TSV e colagem de planilha                                     |
| Camadas: cota, tipo, α e K            | Editor de camadas; E, ν e parâmetros de reação acrescentados                           |
| Resistência lateral, ponta e total    | Análise → Capacidade, pelo método Aoki–Velloso                                         |
| Kx, Ky, Kz, Rotx, Roty                | Painel inferior e análise; Kθz e matriz acoplada acrescentados                         |
| Recalque por elasticidade             | Disco equivalente ou integral Mindlin–Steinbrenner, com hipóteses na memória           |
| Tensão Terzaghi & Vésic               | Fatores de Vésic implementados; Terzaghi explicitamente pendente                       |
| Tensão NBR 6122:1996                  | Referência histórica pendente, sem valor inventado                                     |
| Correlação por SPT                    | qref = C N, exploratória, com fator informado e sem atribuição normativa               |
| Desenho da fundação e sondagem        | Corte geotécnico e planta vetoriais, mais vista 3D orbital                             |
| Calcular molas                        | Resultados atualizados automaticamente ao confirmar campos; botão evidencia validações |

## Acréscimos

Modelo 3D com camadas em corte, água, molas esquemáticas, cotas, zoom, pan, órbita e vistas de topo/frente/lado. O modelo é ilustrativo; a deformada não é desenhada e não se apresenta um campo de tensões fictício.

Múltiplas fundações no mesmo projeto, duplicação, remoção recuperável por desfazer, comparação, sensibilidade, temas claro e escuro, matriz de seis graus de liberdade, memória rastreável e exportações.

O MolasStruct integra o ecossistema OpenStruct. Vistas, memória e exportações compartilham os dados do projeto; os exemplos fornecidos são fictícios.

## Métodos acrescentados na 0.2.0

Seleção por fundação, com conservação do método legado em arquivos antigos. Perfis Mindlin vertical/Aoki–Lopes/Steinbrenner, Randolph–Wroth simplificado conforme TQS, sapata por kv informado ou SAFE/Morrison. Correlação Schmertmann SPT → E opcional e K_E editável por camada. Valores intermediários, proporção de transferência e limitações na tela e no PDF. Exemplo comparativo em Início → Exemplo métodos. [Análise das referências](METODOLOGIAS.md).
