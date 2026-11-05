# Contribuindo com o MolasStruct

Correções, documentação, referências técnicas e casos independentes de validação ajudam o projeto a evoluir.

## Ambiente

1. Faça um fork, clone o repositório e instale Node.js 22.12+.
2. Execute `npm ci` e `npm run dev`.
3. Para o núcleo, instale Rust estável. Para o desktop, siga também os [pré-requisitos do Tauri](https://v2.tauri.app/start/prerequisites/).
4. Crie uma branch a partir de `master`, como `fix/importacao-spt` ou `feat/perfil-geotecnico`.

## Propor uma mudança

Para mudanças maiores, abra uma issue explicando problema, comportamento desejado e escopo. Correções pequenas podem ser enviadas diretamente em um pull request.

Mantenha cada PR focado em um problema. Descreva o comportamento final, a reprodução e a validação. Em mudanças visuais, inclua uma captura com dados fictícios.

## Alterações de engenharia

- Mantenha equações fora dos componentes da interface.
- Documente unidades, eixos, sinais, origem, condições de contorno e limitações.
- Cite fonte técnica verificável e um resultado independente esperado: solução analítica, cálculo manual ou caso publicado.
- Diferencie capacidade, deformabilidade e verificação normativa.
- Atualize Rust e TypeScript quando a rigidez mudar, preservando os casos de paridade.
- Atualize `docs/MOTOR.md`, memória e testes ao modificar hipóteses ou critérios.
- Métodos incompletos não devem produzir resultados sob o nome de métodos pendentes.

Testes devem conferir comportamento ou referências independentes, sem apenas repetir a implementação.

## Verificação

```bash
npm run check
npm run build
npm run test:core
npm run format:check
```

Formatação Rust:

```bash
cargo fmt --manifest-path crates/molas-core/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml
```

Se alterar dados ou exportações de referência, execute `npm run examples:generate` e confira os arquivos modificados. Esse comando também atualiza casos de paridade; execute novamente os testes Rust quando eles mudarem. `src/pdfFonts.ts` contém uma fonte incorporada gerada; preserve origem e licença.

## Arquivos e comunicação

Use nomes e mensagens descritivos. `fix: rejeita profundidades SPT repetidas` e `docs: esclarece a cota da base` são exemplos, sem exigência de ferramenta adicional.

Não versione dependências, builds, credenciais, configurações locais de hospedagem ou dados de clientes. Utilize dados fictícios ou anonimizados e respeite o [código de conduta](CODE_OF_CONDUCT.md).
