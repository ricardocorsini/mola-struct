# Escolha da correlação e dos coeficientes horizontais

Disponível no código a partir da **0.6.0**. A escolha é por fundação e aplica-se a **Winkler** e ao comportamento lateral do **Mindlin**. Randolph simplificado continua com Kh=μh Kz; sapatas usam o modelo horizontal do seu método de base.

## Selecionar

Em **Propriedades → Métodos → Reação horizontal do solo**, escolha:

| Opção                     | Dados usados                                               | Onde editar                  |
| ------------------------- | ---------------------------------------------------------- | ---------------------------- |
| Manual · kh por camada    | Pressão/deslocamento, kh em kN/m³                          | Sondagem → Reação horizontal |
| K/nh · tipo de solo / TQS | Associação geotécnica explícita; K em kN/m² ou nh em kN/m³ | Sondagem → Reação horizontal |
| SPT/m · Tietz / TQS       | NSPT por intervalo e família argilosa/granular; m em tf/m⁴ | Sondagem → Reação horizontal |

O botão **Editar coeficientes horizontais** abre diretamente esse painel da sondagem. As associações do solo são compartilhadas pelo projeto, mas cada fundação escolhe sua correlação, versão da tabela e discretização. E, ν e a transferência vertical permanecem independentes dessa seleção.

## Versões K/nh

O campo **Versão da tabela K/nh** permite escolher:

- **TQS 3829 · sapatas/tubulões:** dados do PDF fornecido, convertidos de kgf/cm² e kgf/cm³.
- **TQS 3836 · estacas:** valores prováveis publicados na página específica de estacas. K em MPa é convertido para kN/m². nh é interpretado em kN/m³ pela compatibilidade dimensional K=nh·z, pois o cabeçalho original mostra MPa.

As versões não são numericamente idênticas. Por exemplo, argila pré-adensada média resulta em K=784,532 kN/m² na 3829 e K=800 kN/m² na 3836. A escolha da consistência e do regime é explícita: o programa não infere pré-adensamento a partir do NSPT.

Valores secos não publicados na 3836 permanecem ausentes. Se a análise os consumir, o cálculo é bloqueado com explicação. Não se substitui automaticamente por um valor submerso. **Copiar para personalizar** conserva o coeficiente resolvido em campos editáveis de K ou nh seco/submerso; a associação passa a personalizada e a troca da tabela não altera esses números manuais.

## Tabela SPT/m

As ordenadas m das referências 3829 e 3836 coincidem. Escolha **Fonte da tabela m → Publicada** ou **Personalizada**. A personalizada tem uma cópia editável por fundação, com inserção/remoção de pontos e restauração. A cópia inicial explicita em N=100 o patamar m=900 da argila dura, evitando uma extrapolação silenciosa.

Escolha também **Regra entre pontos de NSPT**: interpolação linear, degrau inferior ou degrau superior. São hipóteses selecionadas para valores intermediários; não se atribui uma delas automaticamente ao programa externo.

O tipo declarado areia/argila pode definir a família correspondente. Para silte/aterro é necessário escolher a família explicitamente. Nas tabelas personalizadas, fora da faixa de pontos o cálculo é bloqueado; NSPT deve ser estritamente crescente e m positivo. Na publicada, o ramo argiloso mantém m=900 para N>30, conforme a indicação de argila dura. Não há extrapolação no ramo granular.

O método de Tietz tem origem em tubulões de aproximadamente 1 m ou mais. A documentação TQS 3836 também registra a necessidade de comprovação das correlações para solos brasileiros. Sua seleção não declara validação para o diâmetro, solo ou obra nem calibra o resultado para o print.

## Profundidade, água e malha

- **Origem da profundidade z:** terreno ou face inferior do bloco. A escolha afeta as leis nh·z e m·z·d. A profundidade absoluta continua localizando o solo, o SPT e o nível d’água.
- **Reação consistente por elemento:** preserva a matriz consistente e a amostragem no ponto médio usadas antes da 0.6.0. Emprega `segments` elementos.
- **Molas nodais · comparação:** `n=max(2,ceil(L/passo_máximo))`, até 128 trechos; passo efetivo L/n. Molas nos nós abaixo do topo, com peso Δl integral inclusive na ponta; sem mola no nó de topo. A viga mantém a ponta livre à flexão. É uma convenção explicitamente selecionada e não uma reprodução confirmada do esquema interno do TQS.

Na correlação por nh, seco/submerso segue a cota absoluta e o nível d’água. A escolha da origem z não muda a posição do nível d’água. As leis são convertidas para o módulo de linha: manual `kh·d`, tipo de solo `K` ou `nh·z`, SPT/m `9,80665·m·z·d`, em kN/m². K de Aoki–Velloso continua separado.

A ligação rígida/rotulada é uma configuração adicional e independente. Na rótula, os acoplamentos locais são condensados após calcular a cabeça da estaca com a correlação e a malha selecionadas.

## Arquivo e memória

O app lê projetos v1 e v2. Projetos antigos sem CRH explícito mantêm o modo manual consistente e suas matrizes. Salvar/exportar e o rascunho usam **JSON v2**, para que um aplicativo antigo rejeite o arquivo em vez de ignorar as novas opções e recalcular com kh manual. A matriz CSV registra a seleção; a memória em tela/PDF inclui os coeficientes e as tabelas efetivamente usados, além dos avisos.

## Reproduzir o caso de 16 m

1. Carregue **Exemplo 16 m**.
2. Em Métodos, selecione **Ligação estaca–bloco → Rotulada em X e Y** e **Correlação horizontal → SPT/m**.
3. Use **tabela publicada**, **interpolação linear** e z a partir do terreno.
4. Com reação consistente / 64 elementos: Kx=Ky=182,1029 tf/m. Com molas nodais / passo máximo 1 m: Kx=Ky=174,9642 tf/m.

Nos dois casos Kz=22.736,9272 tf/m e Kθy=4.937,7369 tf·m/rad, mantendo o modelo vertical e seus parâmetros. A opção horizontal não elimina o desvio axial para o print.

Exemplos completos: [SPT/m nodal](../examples/CRH-tietz.molas.json) e [K/nh 3829](../examples/CRH-terzaghi.molas.json). O segundo contém associações geotécnicas escolhidas apenas para demonstração, não fornecidas pelo print. Veja [a investigação](COEFICIENTES-TQS.md) para hipóteses e diferenças. Capturas: [Configuração](assets/configuracao-crh.png) e [Coeficientes](assets/coeficientes-crh.png).
