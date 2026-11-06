# Exemplos

Os projetos de demonstração são fictícios. O caso externo `referencia-16m` transcreve os dados fornecidos pelo usuário e identifica separadamente as hipóteses ausentes no print. Nenhum arquivo representa aprovação de uma obra.

| Arquivo                         | Conteúdo                                                          |
| ------------------------------- | ----------------------------------------------------------------- |
| `edificio-horizonte.molas.json` | Projeto editável: F01 (2 estacas), F02 (4 estacas) e S01 (sapata) |
| `SP-01-spt.csv`                 | SPT, com duas colunas separadas por ponto e vírgula               |
| `F01-*`, `F02-*`, `S01-*`       | Planta, corte, matriz CSV, DXF e memória PDF de cada fundação     |
| `resultados-esperados.json`     | Resultados produzidos pelo motor para o projeto                   |

Utilize **Abrir** na aplicação para carregar o JSON. O CSV pode ser importado na aba de sondagem. As memórias descrevem as hipóteses aplicadas.

## Regenerar

Com as dependências instaladas, execute na raiz:

```bash
npm run examples:generate
```

O comando também atualiza `crates/molas-core/tests/parity.json`, usado para conferir TypeScript e Rust. Resultados gerados pela implementação são úteis para regressão e paridade; **não substituem referência independente de engenharia**. Veja os testes analíticos e [VALIDACAO.md](../docs/VALIDACAO.md).

## Caso externo de 16 m

Abra `referencia-16m.molas.json` ou **Início → Exemplo 16 m**. O conjunto inclui `referencia-16m-spt.csv`, `B16-matriz.csv`, desenhos `B16-corte.svg` / `B16-planta.svg`, `B16-memoria.pdf` e `referencia-16m-comparacao.json`.

A capacidade Aoki-Velloso confere na precisão de 0,1 tf; as rigidezes ainda não conferem. A comparação completa, as unidades assumidas e os dados faltantes estão em [REFERENCIA-16M.md](../docs/REFERENCIA-16M.md). Os alvos transcritos do print permanecem separados dos valores gerados pelo motor.

`referencia-16m-investigacao.json` registra a decomposição de Kθy e 30 ensaios de hipóteses. Regenerar: `npm run investigate:rotation`; acrescente `-- --pdf` para atualizar somente `B16-memoria.pdf`. Os ensaios não mudam a fundação ativa ou validam o software externo.
