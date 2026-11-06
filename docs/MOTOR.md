# Motor 0.5.0 — hipóteses, equações e unidades

## Convenções

Unidades internas: kN, m, rad. E do solo é informado em MPa e convertido para kN/m². Ec das estacas é informado em GPa e convertido para kN/m². Coeficientes kh, kt e kp são kN/m³. K de Aoki–Velloso é informado em kPa por golpe, α é decimal (0,014 = 1,4%). Não confundir K de capacidade com os coeficientes de reação.

Eixos X e Y no plano; Z para cima. Cotas de profundidade são positivas para baixo, a partir do terreno. D é a profundidade da face inferior do bloco ou da sapata. Ponta da estaca em D + L. Ações no centro da base: `[Hx, Hy, -N, Mx, My, Mz]`, N positivo em compressão. Não há transferência automática de ações do topo do pilar à base.

O peso próprio não é acrescido automaticamente a N. O usuário deve informar as ações de serviço que deseja representar. Não há combinações de ações ou coeficientes parciais automáticos.

## Estacas em Winkler

Estacas circulares: `A = πd²/4`, `I = πd⁴/64`, `J = πd⁴/32`. Ec e νc são informados; fck é apenas registrado, sem derivação automática de Ec nem dimensionamento resistente.

Viga lateral de Euler–Bernoulli:

`EI w'''' + kh(z) d w = 0`

Matriz de flexão usual de dois nós, com deslocamento e inclinação em cada nó, somada à matriz consistente de reação `kh d ∫NᵀN dz`. A reação lateral usa a área projetada d × dz, não o perímetro do fuste. Kh é amostrado no ponto médio de cada elemento. A ponta é livre lateralmente. Condensação por inversão da flexibilidade 2 × 2 do topo. A conexão rígida do topo preserva os acoplamentos deslocamento–rotação.

Barra axial:

`EA u'' - kt(z) U u = 0`, com U = πd.

Reação consistente distribuída do fuste e mola axial de ponta `kp Ap`. A rigidez é obtida aplicando uma força unitária no topo e invertendo o deslocamento. Torção com GJ, `G = Ec/[2(1+νc)]`, reação distribuída `kt U r²` e sem mola torsional de ponta. O reaproveitamento de kt no modelo torsional é uma hipótese simplificadora explícita.

Para cada estaca de coordenadas (x, y):

```
ux_i = ux - y theta_z
uy_i = uy + x theta_z
uz_i = uz + y theta_x - x theta_y
K_bloco = eta SUM(T_i^T K_estaca T_i)
```

Bloco perfeitamente rígido, estacas verticais idênticas, terreno horizontal, sem contato bloco–solo e sem interação entre estacas. η reduz todas as componentes da rigidez; não é calculado por um método de interação. O arranjo triangular tem centroide na origem. Variações locais bruscas exigem estudo de refinamento da malha; 24 elementos é um valor inicial, não uma demonstração automática de convergência.

### Ligação estaca–bloco

`headConnection="fixed"` é a ligação rígida à flexão, padrão preservado para JSON antigos: a rotação local acompanha o bloco. `headConnection="pinned"` libera os momentos de topo Mx/My. O bloco continua rígido; as translações dos topos respeitam os braços geométricos. A torção em Z permanece vinculada, pois essa opção representa a liberação à flexão.

Para cada plano lateral, antes de montar o grupo, a matriz de cabeça `[[a,b],[c,d]]` é condensada impondo `M=0`: `θ=-c u/d` e `kh,pinned=a-bc/d`. A matriz local passa a `[[kh,pinned,0],[0,0]]`. As parcelas de flexão e seus acoplamentos desaparecem, e a parcela de torção de grupo devida ao braço horizontal muda junto com Kh. A flexão ao longo do fuste sob força lateral continua possível.

O bloco axial é preservado. Em duas estacas alinhadas em X, a ligação rotulada produz Kθx=0 e mantém Kθy pelo binário. No Mindlin, Kθy não é necessariamente Kz·s²/4, porque a matriz de flexibilidade vertical inclui interação. No Randolph simplificado, Kh=μh Kz não vem de uma viga lateral acoplada; conserva-se essa aproximação e elimina-se a flexão local aproximada dos eixos sem braço. Consulte [LIGACAO-ESTACA-BLOCO.md](LIGACAO-ESTACA-BLOCO.md).

### Capacidade Aoki–Velloso

`RL = U SUM(alpha K N DeltaL / F2)`

`RP = Ap K Np / F1`

`Ru = RL + RP`

Integração dividida nos limites de SPT, nas transições de solo e na geometria da estaca. N representa o intervalo entre o registro anterior e a profundidade indicada. Np corresponde ao intervalo que contém a ponta; se a ponta coincide com uma fronteira, usa o intervalo que termina nela. Não há média na ponta ou truncamento automático de N. F1/F2 são editáveis e não são inferidos pelo tipo executivo. Resistências últimas por estaca isolada, sem verificação de grupo, arraste negativo, fator de segurança ou limites normativos. No modo Winkler, a capacidade não altera a rigidez linear. Em Mindlin, a razão RP/(RL+RP) pode definir a transferência proporcional de carga.

## Sapata por disco equivalente (opção legada)

B = menor dimensão e L = maior dimensão em planta; A = Lx Ly. Integra-se a faixa D a D + 2B para obter E equivalente harmônico `Eeq = 2B / SUM(dz/E)` e ν médio por espessura. Esta homogeneização é uma escolha da implementação, não o método de Steinbrenner.

Translações por disco de mesma área em semiespaço homogêneo:

`r = sqrt(A/pi)`

`G = Eeq/[2(1+nu)]`

`Kz = 4Gr/(1-nu)`

`Kx = Ky = 8Gr/(2-nu)`

Rotações por molas uniformes distribuídas sobre o retângulo:

`kv = Kz/A`

`Ix = Lx Ly³/12`, `Iy = Ly Lx³/12`

`KthetaX = kv Ix`, `KthetaY = kv Iy`

`KthetaZ = (Kx/A)(Ix+Iy)`

As rotações não são as soluções exatas de disco rígido. Kx = Ky perde a anisotropia geométrica em translação da base retangular. Sem correção de embutimento, contato unilateral, camada rígida ou interação entre sapatas. A cota impenetrável limita a geometria e gera observação quando entra na faixa de influência; não modifica as rigidezes de semiespaço.

### Tensão última com fatores de Vésic

`qult = c Nc sc + q Nq sq + 0.5 gamma_eff B Ngamma sg`

`Nq = exp(pi tan(phi)) tan(pi/4 + phi/2)^2`

`Nc = (Nq-1)/tan(phi)`, limite `pi+2` em phi=0.

`Ngamma = 2(Nq+1)tan(phi)`

`sc = 1 + (Nq/Nc)(B/L)`; `sq = 1 + (B/L)tan(phi)`; `sg = 1 - 0.4(B/L)`.

Fatores de profundidade, inclinação, compressibilidade, excentricidade, base e terreno unitários. Coesão e atrito são os da camada que contém a base. A pressão efetiva q integra o perfil até D. O peso efetivo abaixo da base é a média na faixa B, com γ acima do NA e γsat−9,81 abaixo. O mecanismo de ruptura em solo estratificado não é verificado; usar a camada de apoio para c e φ é uma simplificação.

`qref = qult/FS` é apenas referência com divisor informado. A correlação `qSPT = C Nmedio(2B)` é exploratória e não representa tensão de ruptura. Nenhuma das duas recebe um selo de aprovação normativa.

Pressões de contato `qmin/qmax = N/A ± |Mx| Ly/(2Ix) ± |My| Lx/(2Iy)`, sob distribuição linear bilateral. Pressão negativa gera observação de perda de contato; não há redistribuição. Forças horizontais e momentos geram observação de que o valor qult centrado não verifica a combinação aplicada.

## Matriz e resposta

Ordem `[ux,uy,uz,thetaX,thetaY,thetaZ]`. Kii é a rigidez com os outros GDL impedidos, distinta da rigidez efetiva com rotações livres. Bloco TT em kN/m, TR e RT em kN e RR em kN·m/rad. A resposta é resolvida com pivotamento parcial, sem regularização artificial de matrizes singulares.

Linhas e colunas exatamente nulas identificam GDL livres; não há corte por magnitude para transformar molas fracas em mecanismos. Se a ação conjugada for zero, resolve-se apenas o subconjunto sustentado e o zero armazenado no GDL livre é uma referência numérica, não uma rotação determinada. Ações não nulas nessas direções são rejeitadas. Outras singularidades continuam bloqueadas pelo solver. Em ELS, rotação indeterminada não recebe aprovação; no ELU, o vetor separado precisa ser compatível com o apoio.

Exportações mantêm kN, m e rad. A opção tf na tela divide rigidezes por 9,80665. Não há matriz em unidades mistas sem indicação de linha/coluna.

## Referências

- NIST GCR 12-917-21 (2012), Soil-Structure Interaction for Building Structures: <https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=915495>.
- Gazetas (1991), Formulas and Charts for Impedances of Surface and Embedded Foundations: <https://doi.org/10.1061/(ASCE)0733-9410(1991)117:9(1363)>.
- Cruz Junior et al. (2025), Analysis of a database of instrumented static load tests on continuous flight auger piles in tropical soils: <https://doi.org/10.1590/0370-44672023780128>.
- Vesić (1973), Analysis of Ultimate Loads of Shallow Foundations: <https://doi.org/10.1061/JSFEAQ.0001846>.
- USACE EM 1110-1-1905, edição histórica de 30/10/1992, fatores de capacidade: <https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-1-1905.pdf>.

Não há reivindicação de conformidade integral com a NBR 6122. A conferência parcial da edição 2022 está documentada em [NBR6122-2022.md](NBR6122-2022.md). A edição 1996 é referência histórica do print, sem uma nova rotina de tensão básica. Terzaghi permanece pendente. Os métodos estão descritos abaixo e em [METODOLOGIAS.md](METODOLOGIAS.md).

## Mindlin / Aoki–Lopes / Steinbrenner

Núcleo vertical, `w/P` em m/kN, E em kPa, fonte a c, ponto de avaliação a z e distância horizontal r:

```text
R1² = r² + (z-c)²; R2² = r² + (z+c)²; a = 3-4ν
w/P = (1+ν)/[8πE(1-ν)] × {
  a/R1 + [8(1-ν)²-a]/R2 + (z-c)²/R1³
  + [a(z+c)²-2cz]/R2³ + 6cz(z+c)²/R2⁵
}
```

O termo `8(1-ν)²` é conferido pelo limite de Boussinesq em c = 0; há uma divergência na equação impressa do artigo de Olavo, enquanto o código mostrado no próprio artigo e a dissertação de Silva usam o sinal acima. Implementação independente das equações, sem incorporar código das referências.

Para meio finito estratificado, soma-se `w(topoi,Ei,νi) - w(basei,Ei,νi)` das camadas abaixo do ponto de avaliação até a base indeslocável. É o artifício aproximado de Steinbrenner, não uma solução exata de elasticidade multicamadas. Razões de módulo entre camadas ≥ 10 geram observação (Silva, 2017, p. 38).

### Estacas

- Fontes no fuste: círculos de raio d/2, divididos em 2ng ângulos. Trechos verticais respeitam os limites de camadas, registros SPT e ne segmentos de malha; carga de cada trecho aplicada no ponto médio. A intensidade de transferência é proporcional a α K N/F2 dentro de cada trecho.
- Ponta: disco com pressão uniforme, ng pontos de Gauss radiais e 2ng divisões angulares. Pesos radiais `2u du`, sem aproximar o disco por uma carga singular central.
- Fração de ponta βp: informada entre 0 e 1 ou igual a RP/(RL+RP). A parcela restante é distribuída pelo fuste. Esta mobilização **proporcional fixa** é uma hipótese linear explícita, distinta da sequência fuste-primeiro e da curva bilinear apresentadas no ALPI. Resistência de fuste nula exige βp = 1; resistência total nula impede a opção automática.
- Deslocamento avaliado no centro da ponta de cada estaca. Fontes próprias e de outras estacas entram na flexibilidade `Cij`. Soma-se na diagonal o encurtamento elástico `∫N(z)/(Ep Ap) dz`, integrado exatamente para a transferência constante em cada trecho.
- `B_i = [1, yi, -xi]` para os GDL `[uz, θx, θy]`; `Kvertical = η Bᵀ C⁻¹ B`. As reações verticais são recuperadas de `η C⁻¹ B u`, e não de molas independentes quando há interação.
- A matriz de flexibilidade deve ser positiva definida; o motor bloqueia a solução em caso contrário. Nenhuma mola de regularização é inserida.
- As parcelas lateral/flexão local/torção permanecem Winkler; não há interação lateral entre estacas. Sem contato bloco–solo, estacas inclinadas, fluência, adensamento, arraste negativo ou redistribuição não linear de transferência.

### Sapatas

Pressão uniforme sobre retângulo em D; deslocamento avaliado no centro da base. Quadratura Gauss–Legendre com transformação de Duffy em dois triângulos por quadrante, tratando a singularidade integrável de 1/r sem raio mínimo artificial. Aplica-se Steinbrenner das camadas sob a base ao indeslocável.

`Kz = P/wcentro`, `kv = Kz/A`. É um recalque central de base flexível sob pressão uniforme; **não** é o recalque médio nem a solução do contato de uma sapata perfeitamente rígida. Rotações são aproximadas por `kv I`. `Kh = μh Kz` e `Kθz = (Kh/A)(Ix+Iy)` são hipóteses adicionais, não resultados de uma solução Mindlin completa para seis GDL.

### Discretização e cobertura

ng = 8…32, ne = 8…64. Compare ne e ng antes de adotar um resultado. Camadas devem cobrir todo o trecho até o indeslocável; não se prolonga silenciosamente a última camada. SPT manual deve cobrir a ponta (estaca) ou a faixa 2B usada na capacidade (sapata). Com correlação SPT → E, investigue até o fim da última camada consumida pelo modelo.

## Randolph–Wroth simplificado conforme a documentação TQS

A formulação implementada é a expressão de **fuste** efetivamente publicada no link fornecido, não a solução completa de Randolph & Wroth (1978):

```text
Eeq = Σ(Ei Δz)/L; νeq = Σ(νi Δz)/L; G = Eeq/[2(1+νeq)]
r0 = d/2; rm = 2,5 L ρ (1-νeq); ζ = ln(rm/r0)
μRW = sqrt[2G/(ζ Ep)]/r0
kz_estaca = (2π L G ρ / ζ) tanh(μRW L)/(μRW L)
```

ρ = G(L/2)/G(L) informado, padrão 1 para o fuste equivalente homogêneo; domínio adotado 0 < ρ ≤ 1. rm deve superar r0. Ep é o Ec informado pelo usuário, preservando a possibilidade de editar o concreto. E e ν são médias aritméticas ponderadas por espessura ao longo do fuste: escolha explícita da implementação para a camada equivalente mencionada pelo TQS. Não se atribui contribuição de base ausente na equação publicada.

Grupo rígido soma as molas verticais e braços, sem interação. Para 2 estacas em X: `Kz=2k`, `Kθy=k sx²/2=Kz sx²/4`. Nos eixos sem braço, soma-se `0,5×3EpI/L` por estaca. `Kh=μh Kz` com μh informado e 0 < μh ≤ 1. A torção, não definida na dedução TQS, usa a barra GJ/interface Winkler mais os braços das novas molas horizontais. Não há acoplamento lateral–rotação neste perfil simplificado.

## Sapatas por kv e SAFE/Morrison

kv informado diretamente ou estimado pela expressão do TQS:

`kv = -0,0257 σadm⁴ + 0,2294 σadm³ - 0,6517 σadm² + 2,5467 σadm + 0,1083`

Na expressão original σadm está em **kgf/cm²** e kv em **kgf/cm³**. Entrada da aplicação em kPa; conversões `1 kgf/cm² = 98,0665 kPa` e `1 kgf/cm³ = 9.806,65 kN/m³`. Domínio da tabela: 0,25 ≤ σadm ≤ 4 kgf/cm² (24,516625…392,266 kPa). Usa-se o polinômio publicado, sem extrapolação nem reprodução exata dos valores tabulados.

`Kz = kv A`; `Kh = μh Kz`; `Kθx=kv Ix`; `Kθy=kv Iy`. A extensão `Kθz=(Kh/A)(Ix+Iy)` é uma hipótese do MolasStruct. A tensão admissível é entrada independente, não inferida de `qult/FS`. kv também é dependente do modelo/dimensão de referência; não constitui propriedade universal do solo.

## Correlação opcional SPT → E

Schmertmann conforme a documentação TQS: `E = 3 K_E N̄` em MPa. N̄ é a média dos registros por espessura em cada camada investigada. ν permanece informado. A correlação pode ser selecionada por fundação e não altera os dados E manuais salvos.

| Solo                  | K_E (MPa) |
| --------------------- | --------: |
| Areia com pedregulhos |      1,10 |
| Areia                 |      0,90 |
| Areia siltosa         |      0,70 |
| Areia argilosa        |      0,55 |
| Silte arenoso         |      0,45 |
| Silte                 |      0,35 |
| Argila arenosa        |      0,30 |
| Silte argiloso        |      0,25 |
| Argila siltosa        |      0,20 |

K_E é editável por camada e **não é** o K (kPa/golpe) de Aoki–Velloso. E positivo é obrigatório; N̄ nulo bloqueia a correlação, sem piso artificial. Em Winkler para estacas, os coeficientes kh, kt e kp são entradas independentes: trocar E não os recalibra.

### Referências acrescentadas

- TQS, Estimativa de Vínculos Elásticos de Fundação: <https://docs.tqs.com.br/Docs/Details?id=1523972768&language=pt-BR>.
- TQS, Coeficiente de mola — Uma estaca: <https://docs.tqs.com.br/Docs/Details?id=3288&language=pt-BR>.
- Mindlin, R. D. (1936), Force at a Point in the Interior of a Semi-Infinite Solid, Physics 7, 195–202: <https://doi.org/10.1063/1.1745385>.
- Silva, Pedro Lima e (2017), Desenvolvimento de programa computacional para estimativa de recalque elástico de estacas, UFRN, pp. 36–42 e 59–61. Dissertação fornecida pelo usuário sob o nome Mindlin.pdf.
- Olavo, Luiz Henrique Felipe (2023), Código-fonte para cálculo de recalques de fundações, Revista On-line IDD 3, pp. 2–3 e 5. Artigo fornecido pelo usuário. Código da função vertical concorda com Silva; equação impressa tem divergência de sinal no termo quadrático em ν.

## Conferência normativa separada — versão 0.3.0

A camada `src/domain/nbr6122.ts` usa a matriz numérica já calculada. Não altera rigidez, não acrescenta ações automaticamente e não converte uma limitação de resistência ELU em lei de transferência de serviço. O núcleo Rust continua responsável pela rigidez; a conferência, como as capacidades já existentes, é compartilhada pela aplicação web/desktop em TypeScript.

- Vetor principal: serviço, após declaração explícita de origem característica. Vetor ELU: independente, com regime característico/global ou já de cálculo.
- Serviço: `max |uz + yθx − xθy|` nos topos de estacas ou `|uz|` no centro da sapata, em mm. Translação horizontal `hypot(ux,uy)` em mm; rotação `hypot(θx,θy,θz)` em mrad. Comparação somente com limites informados e justificados.
- ELU de estacas: ações aplicadas à matriz global e reações recuperadas de C ou das molas axiais correspondentes. Referência de resistência: `(RL + RPconsiderado)/max(FSg,2)` na via característica simples, ou `(RL + RPconsiderado)/1,4` na via de cálculo.
- ELU da sapata analítica: pressão de borda da distribuição bilateral, comparada a `qult/max(FSg,3)` ou `qult/2,15`. Sem majoração adicional de ações já de cálculo. Sem liberação automática quando há carga horizontal, momento de tombamento, contato parcial, regime de drenagem incompatível ou base geotécnica não declarada.
- Os fatores menores da norma exigem os dados e condições específicos de ensaios/regiões representativas; não estão implementados como simples opções numéricas.

A base rígida de referência representa uma hipótese de deslocamento nulo. Não deve ser confundida automaticamente com a cota de recusa de uma sondagem SPT. Consulte o alcance, as condições executivas e as pendências em [NBR6122-2022.md](NBR6122-2022.md).

## Correlação opcional E0 de Aoki (1984) - versão 0.4.0

A foto fornecida pelo usuário distingue o módulo inicial E0 da atualização posterior de Es por tensões. A opção **E0 Aoki** implementa somente:

`E0 (MPa) = a K_AV (kPa/golpe) N̄ / 1000`

| Execução        |   a |
| --------------- | --: |
| Cravada         |   6 |
| Hélice contínua |   4 |
| Escavada        |   3 |

A média N̄ é ponderada pela espessura em cada camada. K_AV é o coeficiente de capacidade Aoki-Velloso, distinto de K_E de Schmertmann. A seleção não altera o E manual salvo, não deduz kh/kt/kp e não aplica a lei de atualização de Es por tensão geostática e acréscimos de tensão. Não se atribuem os fatores 6/4/3 à NBR 6122. O tipo executivo declarado na conferência é comparado ao fator selecionado.

A correlação foi disponibilizada somente para estacas. Exige SPT até o fim da última camada consumida; N̄ nulo ou perfil insuficiente bloqueiam o cálculo. O caso externo de 16 m mantém E manual, pois os valores de E já foram informados no print e não há SPT abaixo de 20 m.

## Caso externo de 16 m

O projeto e a comparação em tela/PDF estão documentados em [REFERENCIA-16M.md](REFERENCIA-16M.md). A contribuição axial `η Bᵀ C⁻¹ B` é apresentada separadamente da flexão local. A opção diagnóstica com Cij=0 para i≠j permite inspecionar estacas independentes; não modifica o método ativo nem sua matriz completa.
