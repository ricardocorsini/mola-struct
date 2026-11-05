# Roadmap

A disponibilidade de referências e resultados independentes condiciona a ordem de implementação. Não há datas de lançamento fixadas.

## Base disponível na 0.2.0

- [x] Editor de fundações, SPT e camadas.
- [x] Vistas 3D e vetoriais sincronizadas.
- [x] Winkler nas estacas e semiespaço equivalente nas sapatas.
- [x] Matriz 6 × 6, ações, comparação e sensibilidade.
- [x] Capacidade Aoki–Velloso e fatores de Vésic.
- [x] Memória, arquivos e exportações.
- [x] Núcleo Rust com casos de paridade em TypeScript.

## Consistência e validação

- [ ] Conferir instaladores e operações de arquivo nos sistemas de destino.
- [ ] Ampliar verificação WebGL, acessibilidade e comportamento em diferentes janelas.
- [ ] Validar exportações em leitores PDF e programas CAD de destino.
- [ ] Ampliar referências analíticas, estudos de convergência e casos publicados.
- [ ] Estabelecer uma matriz de validação geotécnica com dados independentes.

## Evolução do motor

- [x] Mindlin vertical, Aoki–Lopes e Steinbrenner com referências, convenções e testes analíticos.
- [x] Randolph–Wroth simplificado e SAFE/Morrison conforme TQS.
- [ ] Terzaghi e documentação do alcance das comparações de capacidade.
- [x] Interação vertical entre estacas no perfil Mindlin.
- [ ] Interação lateral, contato bloco–solo e transferência não linear de fuste/ponta.
- [ ] Contato unilateral e perda de contato das sapatas.
- [x] Correlação opcional SPT → E de Schmertmann conforme TQS, com unidade explícita.
- [ ] Calibração regional de E e coeficientes de reação.
- [ ] Definição de escopo e versões normativas antes de oferecer conformidade.

Novas propostas podem ser discutidas em [issues](https://github.com/ricardocorsini/mola-struct/issues/new/choose).
