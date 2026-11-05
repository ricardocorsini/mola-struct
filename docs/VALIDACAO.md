# Validação e limites conhecidos

Testes de software, referências analíticas idealizadas e validação geotécnica têm objetivos distintos. A aprovação da integração contínua não representa conformidade normativa nem calibração com provas de carga.

## Testes automatizados

A base 0.1.0 possui 20 testes Vitest e 3 testes Rust. Um dos testes Rust percorre sete casos compartilhados de paridade entre as implementações. O CI executa o TypeScript estrito, os testes, a formatação e o build web.

| Verificação                                         | Referência ou propriedade                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Barra axial com reação de interface e mola de ponta | Solução analítica em solo uniforme                                                              |
| Barra torsional com ponta livre                     | Solução analítica em solo uniforme                                                              |
| Viga lateral longa em Winkler                       | Solução semi-infinita                                                                           |
| Rigidez vertical de sapata                          | Disco circular de mesma área                                                                    |
| Transformação para o bloco                          | Simetria, energia positiva, equilíbrio `K u = F` e soma das reações                             |
| Capacidade                                          | Integração manual Aoki–Velloso, limite φ = 0 e influência do nível d'água em Vésic              |
| Entradas                                            | Rejeição de perfil insuficiente, profundidades repetidas, coeficientes inválidos e sobreposição |
| Condições fora do modelo                            | Sinalização de tração em estacas e perda de contato da sapata                                   |
| Arquivos                                            | JSON versionado, ida/volta SPT, matriz CSV e geometria em SVG/DXF                               |
| Paridade nativa                                     | Matrizes e respostas Rust comparadas ao equivalente TypeScript                                  |

Execute na raiz:

```bash
npm run check
npm run test:core
npm run build
```

Os testes analíticos estão em `tests/engine.test.ts`; os casos compartilhados, em `crates/molas-core/tests/parity.json`. Regenerar casos pela própria implementação serve para regressão e paridade, sem criar uma nova validação independente.

## Interface e exportações

Na verificação inicial foram conferidos navegação, alteração de geometria com recálculo, desfazer, arranjo triangular, matriz completa, sapata, edição SPT/camadas e memória. O ambiente gráfico utilizado não dispunha de WebGL; o renderizador SVG de contingência foi exercitado. O caminho WebGL precisa de conferência em equipamento compatível.

Os PDFs de exemplo foram renderizados e inspecionados quanto a margens, paginação, cabeçalhos e caracteres. A geração do arquivo e do link PDF foi conferida na interface; o evento de download PDF não foi confirmado pela automação do navegador. O download JSON foi confirmado. Resultados inválidos bloqueiam as exportações de cálculo.

## Desktop e validação de engenharia

O núcleo Rust foi compilado e testado separadamente. O aplicativo Tauri completo, seus instaladores e os diálogos nativos de arquivos ainda precisam de verificação nos sistemas de destino. O workflow manual de desktop prepara a construção desses pacotes, sem presumir que já tenham sido validados.

Não há comprovação de equivalência numérica com outro software de fundações, tolerância-alvo definida para essa comparação ou validação por prova de carga. Cada uso deve respeitar as hipóteses em [MOTOR.md](MOTOR.md).

## Próximos passos

- Fixar referências e convenções para Mindlin, Steinbrenner e demais métodos pendentes.
- Selecionar parâmetros e casos com resultados independentes conhecidos.
- Estudar convergência, interação de grupo, rotação e condições de cabeça/ponta.
- Definir eventual correlação SPT → E com referência, unidade e limites explícitos.
- Definir o alcance normativo antes de incorporar verificações de conformidade.

Consulte [ROADMAP.md](ROADMAP.md) para a evolução planejada.
