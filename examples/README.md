# Exemplos

Dados fictícios para explorar a interface e reproduzir saídas do motor. Não representam investigação ou projeto de obra real.

| Arquivo | Conteúdo |
| --- | --- |
| `edificio-horizonte.molas.json` | Projeto editável: F01 (2 estacas), F02 (4 estacas) e S01 (sapata) |
| `SP-01-spt.csv` | SPT, com duas colunas separadas por ponto e vírgula |
| `F01-*`, `F02-*`, `S01-*` | Planta, corte, matriz CSV, DXF e memória PDF de cada fundação |
| `resultados-esperados.json` | Resultados produzidos pelo motor para o projeto |

Utilize **Abrir** na aplicação para carregar o JSON. O CSV pode ser importado na aba de sondagem. As memórias descrevem as hipóteses aplicadas.

## Regenerar

Com as dependências instaladas, execute na raiz:

```bash
npm run examples:generate
```

O comando também atualiza `crates/molas-core/tests/parity.json`, usado para conferir TypeScript e Rust. Resultados gerados pela implementação são úteis para regressão e paridade; **não substituem referência independente de engenharia**. Veja os testes analíticos e [VALIDACAO.md](../docs/VALIDACAO.md).
