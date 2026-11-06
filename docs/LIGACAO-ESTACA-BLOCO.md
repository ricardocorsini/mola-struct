# Ligação estaca–bloco e ensaio do binário

Na aba **Métodos**, a seleção **Ligação estaca–bloco** oferece **Rígida à flexão** e **Rotulada em X e Y**. O bloco permanece rígido nas duas opções. A rótula está na interface com as estacas: ela libera Mx e My de topo, conserva a transferência axial e lateral e mantém a torção em Z vinculada. Não representa um bloco flexível nem afirma que o detalhamento real constitua uma articulação.

## Equilíbrio do exemplo enviado

Para duas estacas em x=±s/2, sem momentos locais de topo, um momento My é resistido pelos incrementos axiais opostos:

```math
\Delta N=\frac{M_y}{s},\qquad
N_1=\frac{N}{2}-\frac{M_y}{s},\quad
N_2=\frac{N}{2}+\frac{M_y}{s}.
```

Com My=1 tf·m e s=0,90 m, ΔN=1,111111 tf. Com N=40 tf, as reações são 18,888889 e 21,111111 tf. A escolha de qual estaca recebe o acréscimo depende dos eixos e do sinal do momento. O resultado é independente da rigidez axial para esse sistema simétrico, bilateral e de duas estacas: as forças são determinadas pelo equilíbrio; a rigidez determina a rotação.

Na ligação rígida, `My = Σ(xi Ni + My,topo,i)`: parte do momento pode ir à flexão local, reduzindo o binário. Os esquemas fornecidos ilustram essa divisão. Os números aproximados nos rótulos dos esquemas não permitem reproduzir todos os seus parâmetros internos.

## Matriz consistente com a rótula

A cabeça da viga Winkler tem matriz lateral acoplada. A liberação é feita antes da montagem do bloco:

```math
\begin{bmatrix}H\\M\end{bmatrix}
=\begin{bmatrix}a&b\\c&d\end{bmatrix}
\begin{bmatrix}u\\\theta\end{bmatrix},\quad
M=0\Rightarrow\theta=-\frac{c}{d}u,\quad
k_{h,rotulado}=a-\frac{bc}{d}.
```

A rigidez lateral diminui; os termos de flexão e os respectivos acoplamentos ficam nulos. A montagem recalcula também a parcela torsional que vem dos braços das forças horizontais. Não basta zerar uma diagonal do bloco. A liberação de translação global Hx=0 também é uma condição diferente da rótula local.

Em Winkler e no lateral do Mindlin, o app aplica essa condensação. No Randolph simplificado publicado pelo TQS, Kh=μh Kz é uma hipótese independente e não possui um acoplamento lateral para condensar; ela é preservada, e a rotação local aproximada dos eixos sem braço é removida quando a ligação é rotulada.

## Resultado do caso de 16 m

Mesma geometria, Ec=30 GPa e parâmetros de solo usados na investigação anterior, sem ajuste para coincidir com o print:

| Grandeza                  | Rígida à flexão | Rotulada em X/Y | Unidade  |
| ------------------------- | --------------: | --------------: | -------- |
| Kx = Ky                   |      1.908,9419 |        956,0341 | tf/m     |
| Kz                        |     22.736,9272 |     22.736,9272 | tf/m     |
| Kθx                       |      2.871,8051 |               0 | tf·m/rad |
| Kθy, demais GDL impedidos |      7.809,5420 |      4.937,7369 | tf·m/rad |

O print informa Kθy=4.361,75 tf·m/rad. Após a liberação, a diferença é +13,2054%, ante +79,0461% da ligação rígida. A rótula elimina a flexão local, mas não transforma a flexibilidade axial Mindlin em molas independentes. Permanecem a interação e as hipóteses sobre Ec, E, transferência e camadas. Não há calibração automática desses parâmetros.

Para C=[[a,b],[b,a]], `Kz=2η/(a+b)` e `Kθy=ηs²/[2(a−b)]`. Portanto, Kθy/Kz=s²/4 somente quando b=0. A reação ±My/s continua válida com interação; o que muda é a rotação necessária para produzi-la. A análise completa está em [INVESTIGACAO-ROTACAO.md](INVESTIGACAO-ROTACAO.md).

## Rotações sem travamento

Uma estaca rotulada tem θx e θy livres. Duas estacas em X têm θx livre. A matriz isolada pode ser singular e ainda representar corretamente as molas a serem incorporadas à estrutura global. O programa conserva linha/coluna nulas, resolve os demais GDL se não houver momento no mecanismo e mostra **Livre/indeterminado**, sem inventar uma rigidez pequena. Um momento aplicado nesse mecanismo bloqueia a resposta isolada e exige que o modelo inclua seu caminho resistente, como travamento por baldrame/superestrutura quando pertinente.

O ELS não aprova a rotação indeterminada. Um vetor ELU separado com momento no mecanismo é rejeitado sem interromper a interface. A escolha de ligação e os GDL livres constam no JSON/CSV/memória. JSON antigos carregam como rígidos, preservando as matrizes anteriores.

## Reproduzir

1. Carregue **Exemplo 16 m** e selecione **Métodos → Ligação estaca–bloco → Rotulada em X e Y**.
2. Em **Ações**, mantenha N=392,266 kN e informe My=9,80665 kN·m. As ações usam kN e m.
3. Em **Resultados → Rigidezes**, selecione tf e confira as forças e os momentos de topo. Mx=0, My,topo=0 e N=18,8889/21,1111 tf.
4. Aplique Mx não nulo: o app deve identificar ausência de rigidez em θx. Reponha Mx=0 para calcular o caso compatível.

O arquivo [referencia-16m-rotulada.molas.json](../examples/referencia-16m-rotulada.molas.json) já contém o ensaio com N=40 tf e My=1 tf·m. [referencia-16m-ligacoes.json](../examples/referencia-16m-ligacoes.json) registra as duas opções; [B16-rotulada-memoria.pdf](../examples/B16-rotulada-memoria.pdf) documenta entradas e saídas. `npm run examples:generate` reproduz os arquivos.

## Fontes e alcance das verificações

- TQS, [SISEs – Parte 10](https://docs.tqs.com.br/Docs/Details?id=3458&language=pt-br): exemplo de articulações na interface estaca–bloco para transmitir momentos por binários, com possibilidade de momentos intermediários no fuste.
- Crispin & Mylonakis (2022), [Exact Winkler Solution for Laterally Loaded Piles in Inhomogeneous Soil](<https://doi.org/10.1061/(ASCE)EM.1943-7889.0002125>): matriz de cabeça e distinção entre condições de força/momento e deslocamento/rotação.
- Testes: equilíbrio do momento unitário e das seis ações para 1–4 estacas nos três métodos; limite analítico semi-infinito de cabeça livre `Kh=2EIβ³`; liberação sem regularização; compatibilidade ELS/ELU; regressão de JSON e CSV; paridade TypeScript/Rust. Os testes confirmam essas propriedades do modelo, sem validar parâmetros geotécnicos para uma obra.
