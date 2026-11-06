# Sapatas: meio contínuo e comparação com a referência

Implementado na versão 0.7.0. O método **Meio contínuo · FEMA 273 · k0** calcula as seis rigidezes equivalentes da sapata como um todo, referidas ao centro da base. É uma solução de sapata rígida sobre semiespaço elástico homogêneo e isotrópico, com círculos equivalentes diferentes para cada movimento.

## Como selecionar

1. Selecione uma sapata e abra **Propriedades → Métodos**.
2. Escolha **Meio contínuo · FEMA 273 · k0**.
3. Em **Módulo do solo E**, selecione informado por camada, Schmertmann ou Teixeira–Godoy.
4. Em **Solo do meio contínuo**, escolha parâmetros da camada de apoio estendidos ao meio homogêneo, ou homogeneização explícita na faixa de 2B.
5. Edite E, ν, K_E e αTG em **Sondagem → Camadas de solo**. K_E tem unidade MPa; αTG não é α de Aoki–Velloso. Os padrões de αTG são 3 para areia, 5 para silte e 7 para argila. Aterro exige associação explícita.

![Comparação das 13 sapatas na interface](assets/sapatas-fema273.png)

**Início → Exemplo sapatas** abre 13 sapatas quadradas, de 60 a 180 cm. A aba **Comparar print** mostra os valores atuais e os transcritos do print, lado a lado. Alterações nas entradas são refletidas na comparação, sem alterar os alvos. Também estão disponíveis o projeto JSON e a memória S100 na pasta `examples/`.

## O que existia antes

O método antigo, agora identificado como **Legado · disco + rotações Winkler**, utilizava as translações de um disco de mesma área, mas calculava as rotações por `kv Ix`, `kv Iy` e `(Kh/A)(Ix+Iy)`. Portanto, não era a solução contínua dos seis movimentos usada no print. Essa opção continua disponível e os projetos antigos mantêm seus resultados.

Exemplo de 1,00 × 1,00 m, E=12,25 MPa e ν=0,35:

| Grandeza  |  Legado | Meio contínuo k0 | Unidade  |
| --------- | ------: | ---------------: | -------- |
| Kx = Ky   | 1.265,6 |          1.265,6 | tf/m     |
| Kz        | 1.606,3 |          1.606,3 | tf/m     |
| Kθx = Kθy |   133,9 |            352,9 | tf·m/rad |
| Kθz       |   210,9 |            458,7 | tf·m/rad |

## Fórmulas e eixos

Para dimensões Bx ao longo de X e By ao longo de Y:

`A=Bx By; Ix=Bx By³/12; Iy=By Bx³/12; G=E/[2(1+ν)]`

`rT=√(A/π); rθx=(4Ix/π)^(1/4); rθy=(4Iy/π)^(1/4); rθz=[2(Ix+Iy)/π]^(1/4)`

| Movimento        | Constante k0     |
| ---------------- | ---------------- |
| Translação X e Y | 8G rT/(2−ν)      |
| Translação Z     | 4G rT/(1−ν)      |
| Rotação X        | 8G rθx³/[3(1−ν)] |
| Rotação Y        | 8G rθy³/[3(1−ν)] |
| Torção Z         | 16G rθz³/3       |

O desenho da FEMA usa sua própria orientação B/L. O programa preserva seus eixos X/Y por meio de Ix/Iy; trocar Bx e By troca Kθx e Kθy. Não basta copiar a posição de B/L no desenho.

Estas são as constantes **k0** da figura 4-2, com os fatores de forma e embutimento α=β=1. Não foram digitalizados os ábacos da figura 4-3. Assim, Kx=Ky também no retângulo, nesta aproximação. A cota D seleciona a camada de apoio, mas não acrescenta correção de confinamento. E deve ser compatível com a deformação de interesse; o programa não o transforma em módulo de pequenas deformações ou módulo dinâmico.

O coeficiente `kv=Kz/A` é apresentado apenas como equivalência vertical. Reutilizá-lo em `kv I` faria perder justamente as rigidezes rotacionais do meio contínuo.

## Reprodução do print

Para silte com NSPT=7, adota-se a correlação publicada no TQS 3828:

`E=αTG K_E NSPT=5 × 0,35 × 7=12,25 MPa`

`E=1.249,152360897962 tf/m²; ν=0,35; G=4.537,037037 kPa`

A tabela abaixo contém os alvos independentes transcritos do print. O motor reproduz as 52 entradas na mesma precisão de uma casa decimal. Os testes verificam também Ky e Kθy, iguais a Kx e Kθx para estas sapatas quadradas.

| Sapata (cm) | Kx=Ky (tf/m) | Kz (tf/m) | Kθx=Kθy (tf·m/rad) | Kθz (tf·m/rad) |
| ----------- | -----------: | --------: | -----------------: | -------------: |
| 60 × 60     |        759,3 |     963,8 |               76,2 |           99,1 |
| 70 × 70     |        885,9 |   1.124,4 |              121,0 |          157,3 |
| 80 × 80     |      1.012,4 |   1.285,0 |              180,7 |          234,9 |
| 90 × 90     |      1.139,0 |   1.445,7 |              257,2 |          334,4 |
| 100 × 100   |      1.265,6 |   1.606,3 |              352,9 |          458,7 |
| 110 × 110   |      1.392,1 |   1.766,9 |              469,7 |          610,6 |
| 120 × 120   |      1.518,7 |   1.927,5 |              609,7 |          792,7 |
| 130 × 130   |      1.645,2 |   2.088,2 |              775,2 |        1.007,8 |
| 140 × 140   |      1.771,8 |   2.248,8 |              968,3 |        1.258,7 |
| 150 × 150   |      1.898,3 |   2.409,4 |            1.190,9 |        1.548,2 |
| 160 × 160   |      2.024,9 |   2.570,1 |            1.445,3 |        1.878,9 |
| 170 × 170   |      2.151,5 |   2.730,7 |            1.733,6 |        2.253,7 |
| 180 × 180   |      2.278,0 |   2.891,3 |            2.057,9 |        2.675,3 |

Não se deve arredondar E para 1.249,15 antes de calcular: essa entrada arredondada dá Kθz=2.675,2460 para 180 cm (exibição 2.675,2), enquanto 12,25 MPa dá 2.675,2511 (exibição 2.675,3). A diferença relativa é de cerca de 0,0002%, explicada pelo arredondamento do parâmetro no cabeçalho. Existe teste específico para isso.

D=0, altura de 0,40 m e N=10 tf foram escolhidos somente para construir o projeto executável; não constam do print. As constantes k0 independem da carga e da altura neste modelo. As resistências e tensões de capacidade que o aplicativo também apresenta não foram validadas por essa tabela.

## O que aproveitamos da documentação TQS

| Documento                                                                                            | Aplicação no MolaStruct                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [3828 — CRV](https://docs.tqs.com.br/Docs/Details?id=3828&language=pt-BR)                            | Correlação Teixeira–Godoy E=αTG K_E N e tabelas 5.8/5.9. Estimativa vertical com Mindlin e procedimento de Steinbrenner já disponível; não confundida com punção rígida.   |
| [1523972768 — Vínculos elásticos](https://docs.tqs.com.br/Docs/Details?id=1523972768&language=pt-BR) | Alternativa Winkler/SAFE–Morrison, Kz=kv A, rotações kv I e Kh como parcela de Kz. Não é o modelo contínuo de seis molas deste print.                                      |
| [3829 — CRH](https://docs.tqs.com.br/Docs/Details?id=3829&language=pt-BR)                            | Para sapatas, descreve a dificuldade do contato e a estimativa CRH como parcela de CRV. As tabelas por profundidade pertencem a tubulões; não são aplicadas à sapata FEMA. |
| [3830 — Correções de contato](https://docs.tqs.com.br/Docs/Details?id=3830&language=pt-BR)           | Fundamenta a distinção entre rigidez global e distribuição local de tensões. As correções específicas do SISEs não foram implementadas ou reivindicadas.                   |

## Meio homogêneo, camadas e contato

- **Camada de apoio:** E e ν do material imediatamente abaixo da base são estendidos ao semiespaço inteiro. Se a base coincide com uma interface, adota-se a camada inferior. As camadas ainda fornecem as informações geotécnicas de capacidade e sondagem; não são uma solução estratificada da rigidez.
- **Equivalente em 2B:** usa E harmônico e ν médio por espessura na faixa abaixo da base; é uma homogeneização declarada. Não representa de forma exata um maciço em camadas nem uma base rígida próxima.
- **Mindlin–Steinbrenner:** integra pressão retangular uniforme, com recalque no centro, estratigrafia e base indeslocável. Continua disponível e aceita a nova correlação de E. Não é uma solução de contato de sapata rígida; suas rotações continuam aproximadas por kv I.
- O modelo FEMA é linear, bilateral e sem amortecimento. Não resolve levantamento, escorregamento, plastificação, resistência passiva ou interação entre sapatas. qmin/qmax pela distribuição plana são apenas triagem, não as tensões do punção rígido elástico.

Reproduzir a tabela confirma a implementação das constantes idealizadas; a adequação de E/ν, do nível de deformação e das hipóteses ao terreno continua sendo uma avaliação geotécnica. A NBR 6122 não transforma uma correlação empírica em validação universal.

## Conferências reproduzíveis

```bash
npm run validate:footings
npm run check
npm run test:core
npm run examples:generate
```

Os 24 testes específicos usam alvos transcritos, não regenerados pelo motor. Incluem os 13 tamanhos, arredondamento de E, troca X/Y, escalas E e dimensões, equilíbrio das seis ações, ausência de majoração automática por D, camada na interface, homogeneização, média ponderada de NSPT, coeficientes personalizados e preservação de seletores/exportações. A paridade TypeScript/Rust inclui 21 novos casos e preserva os 50 anteriores.

Referência primária da formulação: [FEMA 273 (1997), figura 4-2, p. 4-11](https://www.wbdg.org/FFC/DHS/ARCHIVES/FEMA273_NEHRP_Guidelines_for_the_Seismic_Rehabilitation_of_Buildings_1997.pdf). As tabelas e fórmulas foram conferidas visualmente; a fonte creditada pela FEMA é Gazetas (1991) e Lam et al. (1991).
