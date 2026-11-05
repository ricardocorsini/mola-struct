# Validação e limites conhecidos

Testes de software, referências analíticas idealizadas e validação geotécnica têm objetivos distintos. A aprovação da integração contínua não representa conformidade normativa nem calibração com provas de carga.

## Testes automatizados

A base 0.3.0 possui 61 testes Vitest e 4 testes Rust. Um dos testes Rust percorre 22 casos compartilhados de paridade entre as implementações. O CI executa o TypeScript estrito, os testes, a formatação e o build web.

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

Os testes analíticos estão em `tests/engine.test.ts`, `tests/methods.test.ts` e `tests/nbr6122.test.ts`; os casos compartilhados, em `crates/molas-core/tests/parity.json`. Regenerar casos pela própria implementação serve para regressão e paridade, sem criar uma nova validação independente.

## Interface e exportações

Na verificação inicial foram conferidos navegação, alteração de geometria com recálculo, desfazer, arranjo triangular, matriz completa, sapata, edição SPT/camadas e memória. O ambiente gráfico utilizado não dispunha de WebGL; o renderizador SVG de contingência foi exercitado. O caminho WebGL precisa de conferência em equipamento compatível.

Os PDFs de exemplo foram renderizados e inspecionados quanto a margens, paginação, cabeçalhos e caracteres. Na revisão 0.2.0, a seleção de métodos com recálculo, a origem SPT de E, o bloqueio de σadm fora da faixa SAFE, a geração **e o download PDF** foram confirmados em Chromium headless, sem erros JavaScript. O download JSON já havia sido confirmado na revisão inicial. Resultados inválidos bloqueiam as exportações de cálculo. A captura atual está em [Seleção de métodos](assets/metodos.png).

## Desktop e validação de engenharia

O núcleo Rust foi compilado e testado separadamente. O aplicativo Tauri completo, seus instaladores e os diálogos nativos de arquivos ainda precisam de verificação nos sistemas de destino. O workflow manual de desktop prepara a construção desses pacotes, sem presumir que já tenham sido validados.

Não há comprovação de equivalência numérica com outro software de fundações, tolerância-alvo definida para essa comparação ou validação por prova de carga. Cada uso deve respeitar as hipóteses em [MOTOR.md](MOTOR.md).

## Próximos passos

- Conferir resultados completos de recalques contra casos publicados e software independente, com convenções e transferência equivalentes.
- Selecionar parâmetros e casos com resultados independentes conhecidos.
- Estudar convergência, interação de grupo, rotação e condições de cabeça/ponta.
- Calibrar a correlação SPT → E implementada com dados geotécnicos regionais.
- Definir o alcance normativo antes de incorporar verificações de conformidade.

Consulte [ROADMAP.md](ROADMAP.md) para a evolução planejada.

## Verificações acrescentadas na 0.2.0

- Mindlin → Boussinesq em superfície e profundidade, reciprocidade e proporcionalidade inversa a E; rejeição de singularidade pontual.
- Integral da sapata superficial retangular contra a expressão analítica de Boussinesq no centro.
- Telescopagem de Steinbrenner em camadas idênticas e redução do recalque com base rígida mais rasa.
- Encurtamento L/EA exato quando βp = 1; equilíbrio matricial e soma de reações em grupos de 1–4 estacas; flexibilidade mútua positiva.
- Refinamento ng 8/16/32 e ne 32/64 no exemplo demonstra variação de Kz inferior a 2% e 0,5%, respectivamente nos pares comparados. Não constitui limite garantido para qualquer perfil.
- Reprodução de RL/RP/Ru do print para diâmetro 25 cm, ponta 5 m, F1=4,2, F2=3,9 e unidades tf. Somente a capacidade foi comparada; as rigidezes do print não foram tomadas como referência validada.
- Randolph simplificado contra a expressão publicada e rotação por braço no grupo de 2 estacas.
- SAFE com conversões e bloqueio de extrapolação; SPT → E com média ponderada e K_E independente do K de capacidade.
- Migração implícita dos novos campos de JSON v1, mantendo resultados legados.

Os 22 casos de paridade cobrem todos os perfis, estacas com 1/2/3/4 posições, E manual/SPT e transferência manual/automática. Estes casos confirmam consistência entre os motores; não substituem as referências independentes dos testes analíticos.

## Revisão com a NBR 6122:2022 — versão 0.3.0

A revisão dos itens pertinentes e das condições do Anexo J está em [NBR6122-2022.md](NBR6122-2022.md). São 28 testes novos de conferência parcial: ausência de limite universal, diferenciação de declarações, independência ELU/ELS, fatores da via simples, recuperação de reações por matriz sob momentos, ponta conforme execução, coerência de transferência, contato integral/parcial, dimensão mínima e preservação de arquivos antigos.

A exceção de ponta sem limitação do Anexo J.3.3 não foi liberada pelo modelo atual de solo/SPT. A presença de interação vertical Mindlin não é uma verificação da capacidade de grupo de 8.3. Não se deduziu área comprimida real cortando as tensões negativas do modelo bilateral.

A leitura da norma estabelece critérios e permite detectar incompatibilidades. Não equivale a validação geotécnica por ensaio ou benchmark externo, nem a aprovação global de projeto. Os valores dos dez casos de exemplo numérico da 0.2.0 foram comparados antes/depois, com a mesma geometria e os mesmos parâmetros; a camada de conferência preserva a matriz e a resposta.

A regeneração das fontes PDF é uma tarefa opcional de desenvolvimento: `python scripts/build-pdf-fonts.py [diretório-DejaVu]`, com FontTools disponível. Não é requisito de execução do aplicativo.

Na revisão 0.3.0 foram conferidos na interface: restauração do JSON da conferência, separação ELU/ELS, detecção de ponta ignorada com transferência positiva, regime de cálculo sem dupla majoração, limite ELS excedido e geração/download do PDF. Não foram observados erros JavaScript nesse percurso. Captura: [Conferência NBR 6122](assets/nbr6122-conferencia.png).
