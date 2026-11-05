<div align="center">

<img src="public/molas.svg" alt="Ícone do MolasStruct" width="64" />

# MolasStruct

**Da sondagem ao apoio elástico.**

Estimativa de rigidez de fundações com visualização 3D, perfil SPT e memória de cálculo.

[![CI](https://github.com/ricardocorsini/mola-struct/actions/workflows/check.yml/badge.svg)](https://github.com/ricardocorsini/mola-struct/actions/workflows/check.yml)
[![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-3448D1)](LICENSE)
[![Versão 0.2.0](https://img.shields.io/badge/vers%C3%A3o-0.2.0-3448D1)](CHANGELOG.md)
[![Experimental](https://img.shields.io/badge/status-experimental-D49A40)](#estado-do-projeto)

Parte do ecossistema **OpenStruct** · Engenharia estrutural aberta

[Começar](#começar) · [Métodos](#métodos-de-cálculo) · [Documentação](#documentação) · [Contribuir](CONTRIBUTING.md)

</div>

![Interface com bloco sobre quatro estacas, perfil de solo e coeficientes de mola](docs/assets/interface-3d.jpg)

## Sobre

O MolasStruct auxilia o estudo da rigidez do conjunto **fundação + solo** e sua representação por apoios elásticos em modelos estruturais. Permite definir geometria, materiais, ações, sondagem SPT e camadas para comparar estimativas de translação e rotação de **sapatas retangulares** e **blocos sobre 1 a 4 estacas**.

A aplicação funciona no navegador e possui uma base desktop com Tauri. O cálculo é local: não depende de uma API de engenharia nem envia o perfil de solo a um servidor. A interface segue a organização do ConsoloStruct, com faixa de ferramentas, árvore de projeto, vistas sincronizadas, propriedades e resultados.

## Estado do projeto

**v0.2.0 — experimental.** Há cálculos implementados e testes com referências analíticas idealizadas. A validação geotécnica com provas de carga e a verificação de conformidade normativa ainda não estão concluídas. As hipóteses estão na memória e em [MOTOR.md](docs/MOTOR.md).

Os exemplos são fictícios. Os parâmetros de deformabilidade e reação precisam de justificativa para o solo, a fundação e o nível de deformação em análise. O bloco é considerado rígido; seu dimensionamento estrutural não faz parte desta versão.

## Funcionalidades

- **Fundações:** sapatas e blocos sobre 1 a 4 estacas; dimensões, espaçamentos, cotas, concreto e ações editáveis.
- **Investigação:** SPT, camadas, importação CSV/TSV, colagem de planilhas e nível d'água.
- **Visualização:** modelo 3D com órbita, zoom, pan e vistas predefinidas; solo em corte, água, cotas e molas esquemáticas; planta e corte vetoriais.
- **Análise:** seis coeficientes, matriz **6 × 6** com acoplamentos, deslocamentos, rotações, capacidade estimada, comparação e sensibilidade.
- **Documentação:** memória na interface e PDF; matriz e SPT em CSV, geometria DXF, desenhos SVG e projeto JSON versionado.
- **Projeto:** múltiplas fundações, duplicação, desfazer/refazer, rascunho local e temas claro/escuro.

## Começar

### Versão web

Requisitos: [Node.js](https://nodejs.org/) **22.12+**, npm e navegador moderno. WebGL é recomendado; há um renderizador vetorial de contingência.

```bash
git clone https://github.com/ricardocorsini/mola-struct.git
cd mola-struct
npm ci
npm run dev
```

Abra **http://127.0.0.1:1420**. O exemplo inicial contém uma sondagem fictícia, dois blocos e uma sapata.

### Compilação local

```bash
npm run build
npm run serve
```

O servidor usa o mesmo endereço. Depois do build, `INICIAR_WEB.sh` (Linux/macOS) e `INICIAR_WEB.bat` (Windows) também iniciam a aplicação. **`dist/` é gerada localmente e não é versionada**; não abra seu `index.html` diretamente pelo sistema de arquivos.

As fontes e bibliotecas ficam no pacote compilado. Após instalar e compilar, é possível executar a versão local sem internet. O rascunho pertence ao navegador/origem atual; use **Salvar JSON** para transportar e manter uma cópia do projeto.

### Desktop com Tauri

Além de Node.js, instale **Rust estável** e os [pré-requisitos do Tauri](https://v2.tauri.app/start/prerequisites/) para seu sistema.

```bash
npm ci
npm run desktop:dev
```

Para gerar os pacotes no sistema atual:

```bash
npm run desktop:build
```

Os artefatos ficam em `src-tauri/target/release/bundle/`. O workflow manual [Desktop](.github/workflows/desktop.yml) configura builds para Windows, Linux e macOS e disponibiliza os artefatos no GitHub Actions, sem publicar releases automaticamente. **Não há instalador desktop validado nesta versão**; os testes do núcleo Rust são independentes da interface nativa.

## Métodos de cálculo

| Recurso                                | Implementação atual                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Rigidez das estacas                    | Viga de Euler–Bernoulli e barras axial/torsional em Winkler; reação distribuída e condensação no topo    |
| Bloco sobre estacas                    | Bloco rígido com molas independentes ou flexibilidade vertical mútua no perfil Mindlin; redutor manual η |
| Capacidade de estaca isolada           | Aoki–Velloso por intervalos SPT e camadas, com F₁/F₂, α e K informados                                   |
| Translações da sapata                  | Semiespaço elástico com disco de mesma área e homogeneização explícita de E e ν                          |
| Rotações da sapata                     | Winkler distribuído sobre o retângulo                                                                    |
| Tensão última da sapata                | Fatores de Vésic e de forma, para carga vertical centrada; demais fatores unitários                      |
| Correlação SPT                         | Referência exploratória `qSPT = C × N`, com C informado e sem atribuição normativa                       |
| Mindlin / Aoki–Lopes / Steinbrenner    | Recalque vertical por superposição, camada finita, encurtamento EA e interação vertical no grupo         |
| Randolph–Wroth simplificado (TQS)      | Parcela de fuste publicada pelo TQS; Kh proporcional e rotação sem braço por 0,5·3EI/L                   |
| Sapatas por kv / SAFE-Morrison         | kv informado ou correlação com σadm; unidades originais e domínio controlados                            |
| SPT → E                                | Opcional: Schmertmann conforme TQS, E = 3 K_E N̄ por camada                                               |
| Terzaghi e tensão básica NBR 6122:1996 | **Pendentes**; não geram resultados                                                                      |

A capacidade é calculada separadamente da rigidez. Em Mindlin, as resistências Aoki–Velloso podem definir a **proporção fixa** de carga transferida ao fuste/ponta; isso não constitui mobilização não linear. E pode ser informado ou estimado pela correlação SPT selecionada; ν e os coeficientes Winkler são informados.

Em **Início → Exemplo métodos**, carregue uma comparação com a mesma geometria por família. Em **Propriedades → Métodos**, escolha o modelo. O exemplo também está em [comparacao-metodologias.molas.json](examples/comparacao-metodologias.molas.json). Projetos v1 antigos continuam com Winkler/disco equivalente até uma escolha explícita.

![Seleção de métodos, resultados e parâmetros intermediários](docs/assets/metodos.png)

A revisão dos materiais e o caso do print estão em [METODOLOGIAS.md](docs/METODOLOGIAS.md). Mindlin é vertical: lateral e torção das estacas usam Winkler. A sapata Mindlin usa recalque no **centro sob pressão uniforme**, com rotações aproximadas por kv I; não resolve o contato de um punção rígido. Não há comprovação de equivalência completa com o TQS ou com a calculadora do print.

### Unidades e convenções

- Unidades internas: **kN, m e rad**. E do solo em MPa; Ec do concreto em GPa.
- X e Y no plano; Z para cima. Profundidades positivas para baixo.
- N positivo em compressão entra no vetor de ações como `Fz = −N`.
- A diagonal `Kii` considera os demais graus de liberdade impedidos. Em blocos sobre estacas, preserve a **matriz completa** para representar os acoplamentos.

Consulte equações, condições de contorno e limites em [MOTOR.md](docs/MOTOR.md).

## Desenvolvimento e testes

| Comando                                 | Finalidade                                |
| --------------------------------------- | ----------------------------------------- |
| `npm run dev`                           | Desenvolvimento com Vite                  |
| `npm run check`                         | TypeScript estrito e testes Vitest        |
| `npm run test:core`                     | Testes Rust; requer Cargo                 |
| `npm run build`                         | Compilação web de produção                |
| `npm run serve`                         | Servir a pasta `dist/` localmente         |
| `npm run examples:generate`             | Regenerar exemplos e casos de paridade    |
| `npm run format` / `format:check`       | Formatar / conferir formatação            |
| `npm run desktop:dev` / `desktop:build` | Desenvolver / compilar o aplicativo Tauri |

Os testes cobrem referências analíticas, equilíbrio, simetria, conservação das reações, entradas inválidas, arquivos e paridade entre motores. Veja [VALIDACAO.md](docs/VALIDACAO.md) para distinguir testes de software, validação de engenharia e distribuição desktop.

## Stack e arquitetura

**React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Three.js · Tauri 2 · Rust**

| Caminho              | Responsabilidade                                            |
| -------------------- | ----------------------------------------------------------- |
| `src/domain/`        | Modelo validado, unidades, solver web e adaptador nativo    |
| `src/components/`    | Interface, propriedades, vistas e resultados                |
| `src/files.ts`       | Importação e exportações                                    |
| `crates/molas-core/` | Núcleo Rust independente do Tauri                           |
| `src-tauri/`         | Janela desktop, permissões e comando `foundation_stiffness` |
| `tests/`             | Testes TypeScript e referências de comportamento            |
| `examples/`          | Dados fictícios, resultados e exportações reproduzíveis     |
| `docs/`              | Métodos, validação, roadmap e recursos de documentação      |
| `.github/`           | CI, build desktop e modelos de colaboração                  |

Na web, a rigidez é calculada em TypeScript. No desktop, a matriz vem do Rust e é comparada à implementação web; divergências bloqueiam resultados nativos. Capacidade geotécnica e exportações permanecem no módulo TypeScript.

## Documentação

- [Métodos, equações e hipóteses](docs/MOTOR.md)
- [Funcionalidades](docs/FUNCIONALIDADES.md)
- [Validação e limites conhecidos](docs/VALIDACAO.md)
- [Exemplos](examples/README.md)
- [Roadmap](docs/ROADMAP.md)
- [Histórico de mudanças](CHANGELOG.md)

## Contribuir

Contribuições de código, documentação, referências e casos de validação são bem-vindas. Leia [CONTRIBUTING.md](CONTRIBUTING.md) e o [código de conduta](CODE_OF_CONDUCT.md). Use as [issues](https://github.com/ricardocorsini/mola-struct/issues/new/choose) para relatar problemas e propor melhorias.

Em alterações de engenharia, inclua hipóteses, unidades, referência e resultado independente esperado. Utilize dados fictícios ou anonimizados nos exemplos públicos. Para questões de segurança, consulte [SECURITY.md](SECURITY.md).

## Licença e créditos

[Licença MIT](LICENSE). Desenvolvido por **Ricardo Corsini e colaboradores**, no ecossistema OpenStruct. A estrutura inicial compartilha decisões e componentes do ConsoloStruct/LumeConsolo; seus avisos de autoria foram preservados.

Bibliotecas e fontes mantêm suas licenças: [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md). Para citar o software em trabalhos, utilize [CITATION.cff](CITATION.cff).
