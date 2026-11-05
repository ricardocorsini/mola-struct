# Motor 0.1.0 — hipóteses, equações e unidades

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

### Capacidade Aoki–Velloso

`RL = U SUM(alpha K N DeltaL / F2)`

`RP = Ap K Np / F1`

`Ru = RL + RP`

Integração dividida nos limites de SPT, nas transições de solo e na geometria da estaca. N representa o intervalo entre o registro anterior e a profundidade indicada. Np corresponde ao intervalo que contém a ponta; se a ponta coincide com uma fronteira, usa o intervalo que termina nela. Não há média na ponta ou truncamento automático de N. F1/F2 são editáveis e não são inferidos pelo tipo executivo. Resistências últimas por estaca isolada, sem verificação de grupo, arraste negativo, fator de segurança ou limites normativos. A capacidade não altera a rigidez linear.

## Sapata

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

Exportações mantêm kN, m e rad. A opção tf na tela divide rigidezes por 9,80665. Não há matriz em unidades mistas sem indicação de linha/coluna.

## Referências

- NIST GCR 12-917-21 (2012), Soil-Structure Interaction for Building Structures: <https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=915495>.
- Gazetas (1991), Formulas and Charts for Impedances of Surface and Embedded Foundations: <https://doi.org/10.1061/(ASCE)0733-9410(1991)117:9(1363)>.
- Cruz Junior et al. (2025), Analysis of a database of instrumented static load tests on continuous flight auger piles in tropical soils: <https://doi.org/10.1590/0370-44672023780128>.
- Vesić (1973), Analysis of Ultimate Loads of Shallow Foundations: <https://doi.org/10.1061/JSFEAQ.0001846>.
- USACE EM 1110-1-1905, edição histórica de 30/10/1992, fatores de capacidade: <https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-1-1905.pdf>.

Não há implementação nem reivindicação de conformidade com NBR 6122 nesta versão. Mindlin, Steinbrenner e Terzaghi aguardam referências e casos de validação.
