# Checagem de atualizações (issue #1)

## Estado anterior e causa

Na triagem em `c53e4f7` (0.7.0), o executável nativo (`src-tauri/src/lib.rs`) registrava apenas
os plugins de diálogo e de arquivos e o comando `foundation_stiffness`. Não havia comando,
plugin de updater ou interface que consultasse versões, e `src/` não tinha nenhuma chamada desse
tipo. O aplicativo não verificava atualizações ao ser aberto, em nenhum sistema. A oferta vista
no Struct Launcher é do próprio Launcher e só aparece quando ele é aberto. No Linux, a causa é
**implementação ausente**, e não falha de rede ou de pacote. O Windows tem a mesma ausência.

A conclusão vem da leitura do código e da distribuição. A instalação do relato no Linux (versão,
formato e caminho do executável) não foi reproduzida nesta contribuição.

Atalhos que abrem uma cópia antiga são outro problema, acompanhado em
[Launcher #3](https://github.com/ricardocorsini/launcher-struct/issues/3). Depois de uma
atualização, o aplicativo agora detecta e informa esse caso (ver _Conferência após reiniciar_).

## Fonte oficial e contratos reutilizados

A consulta usa o mesmo catálogo assinado que o Launcher lê, no hub
`ricardocorsini/openstruct-catalog`. Ela não usa a última release do hub nem o feed
`launcher/latest.json`, que é exclusivo do Launcher. Os contratos seguem `scripts/security.mjs`
e `release-lib.mjs` do catálogo, e as chaves públicas vêm de `distribution.json`:

1. `catalog.signed.json` é um envelope `{payload, signature, keyId}`. O aplicativo exige
   `keyId = catalog-v1` e confere a assinatura Ed25519 com a chave pública fixada no binário.
2. `schemaVersion` deve ser 1. Outro esquema é tratado como erro, nunca como “atualizado”.
3. Somente o produto `molastruct` é considerado. Um ID ausente ou duplicado é erro.
4. Versões: SemVer canônico, canal `stable`, sem pré-lançamento nem build metadata, e
   estritamente maior que a versão em execução. Versão igual ou mais antiga nunca é oferecida.
5. Pacote: mesmos `platform`, `arch` e `kind` da instalação (`windows/x86_64/nsis` ou
   `linux/x86_64/appimage`), `keyId = molastruct-packages-v1`, URL dentro de
   `https://github.com/ricardocorsini/mola-struct/releases/download/vX.Y.Z/`, tamanho e
   SHA-256 válidos e assinatura Ed25519 da mensagem `OPENSTRUCT-PACKAGE-V1` conferida.
6. Se a versão mais nova para o sistema for recusada, o aplicativo mostra o erro e não oferece
   uma versão anterior em silêncio.

A assinatura do catálogo não é uma assinatura Tauri. O MolaStruct não é publicado com artefatos
do updater Tauri, que continuam exclusivos do Launcher. O SHA-256 sozinho não comprova
autenticidade: ele só é aceito porque vem do pacote assinado. O binário não contém chave privada
nem token. A consulta é um GET anônimo a uma URL fixa e não envia arquivos nem dados do projeto.
Nenhuma permissão nova foi dada à janela (`capabilities/default.json` não mudou): não há shell
genérico nem URL arbitrária. O acesso HTTPS fica no Rust, restrito aos hosts oficiais, e cada
redirecionamento é conferido.

## Comportamento

- **Ao abrir** (inclusive por atalho, sem o Launcher), a consulta roda em segundo plano 4 s
  depois da inicialização e da recuperação do rascunho, uma vez por sessão. O resultado
  automático fica em cache por 10 minutos no processo e não há polling.
- **Sem conexão, timeout (10 s para conectar, 20 s no total), catálogo inválido ou assinatura
  recusada** aparecem na barra de status como “Atualizações não verificadas”, sem interromper o
  trabalho. Um clique mostra o motivo e permite tentar de novo.
- **Oferta**: um aviso não modal mostra a versão em execução, a oferecida, o pacote, a data e
  as notas da versão, com os botões “Atualizar” e “Agora não”. Adiar não baixa nem instala, e
  silencia apenas aquela versão por 24 horas. A barra de status continua indicando a
  atualização disponível.
- **Consulta manual**: Exibir > Aplicativo > **Verificar atualizações**, ou clique na barra de
  status.
- **Download** só depois de “Atualizar”. O catálogo é consultado de novo: se a versão mudou ou
  saiu do catálogo, nada é baixado e a nova oferta precisa ser confirmada. O progresso aparece
  na tela e o download pode ser cancelado. Tamanho e SHA-256 são conferidos durante a
  transferência, e um arquivo divergente, interrompido ou maior que o declarado é apagado.
- **Antes de reiniciar**, o usuário escolhe “Salvar projeto e reiniciar” (`.molas.json`),
  “Reiniciar agora” ou “Cancelar”. O rascunho local é gravado na hora e a nova versão o reabre.
  Se não for possível gravá-lo, só o salvamento em arquivo libera o reinício. Cancelar ou falhar
  ao salvar impede o reinício. Uma exportação em andamento (PDF) e a janela “Dados do projeto”
  aberta com edições não aplicadas também impedem.
- **Instalação**: o arquivo é conferido de novo logo antes do uso. Uma trava entre processos
  impede que duas cópias instalem ao mesmo tempo, e cliques repetidos não iniciam outra operação.

## Por tipo de instalação

| Instalação                                         | Detecção                                                                          | Comportamento                                                                                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Struct Launcher (Windows/Linux)                    | `.openstruct-managed.json` com `appId: molastruct` ao lado do executável/AppImage | Mostra a oferta, mas não baixa nem executa instalador próprio. O Launcher mantém o inventário, a versão ativa e os atalhos. No Windows, o botão abre o Struct Launcher instalado em `%LOCALAPPDATA%\Struct Launcher`.                   |
| NSIS independente (Windows)                        | `uninstall.exe` na pasta do executável, sem a marca do Launcher                   | Executa o instalador oficial conferido com `/P /R /UPDATE /D=<pasta atual>`: modo passivo com progresso, mesma pasta, escolhas de atalho preservadas, downgrade recusado e aplicativo reaberto (`molasstruct.exe`).                     |
| AppImage independente (Linux)                      | `$APPIMAGE` aponta para um arquivo existente                                      | Baixa ao lado do AppImage (exige permissão de escrita na pasta), copia as permissões do arquivo atual e o substitui com `rename` atômico, depois reabre o mesmo caminho. Uma falha antes do `rename` deixa o AppImage anterior intacto. |
| Pacote do sistema (`.deb` em `/usr`/`/opt`)        | Executável fora de AppImage                                                       | Sem atualização interna. O aviso orienta usar o gerenciador de pacotes ou o AppImage oficial pelo Launcher e não troca o método de instalação.                                                                                          |
| Executável avulso ou compilação de desenvolvimento | Sem instalador/AppImage, ou `debug_assertions`                                    | A consulta funciona, mas a instalação é recusada com a explicação e a página oficial de releases.                                                                                                                                       |

O pacote oficial só existe para x86_64. Em outra arquitetura, uma versão nova aparece como
“sem pacote compatível”, nunca como atualizada. A interface web (`npm run dev`) não consulta
nada e explica que a verificação é do aplicativo desktop.

## Conferência após reiniciar

Antes de aplicar, o aplicativo grava `{from, to, mode}`. Na abertura seguinte, compara esse
registro com a versão realmente em execução. Ele confirma “MolaStruct atualizado de X para Y”
ou avisa que a versão anterior foi aberta (instalador cancelado ou atalho apontando para outra
cópia).

## Testes

- `cargo test --manifest-path src-tauri/Cargo.toml` (job `native` do CI) cobre assinatura e
  esquema do catálogo, o catálogo real publicado com as chaves fixadas, seleção de produto,
  SemVer e canal, downgrade, pacote incompatível, assinatura/URL/tamanho/hash adulterados,
  versões duplicadas, detecção Launcher/NSIS/AppImage/pacote/avulso, hosts e redirecionamentos
  HTTPS, download interrompido, timeout, hash divergente, cancelamento, disco cheio, permissão e
  trava contra instaladores concorrentes.
- `cargo test --manifest-path src-tauri/Cargo.toml -- --ignored` (manual, exige internet)
  consulta o catálogo oficial como 0.5.1, baixa o instalador real da 0.7.0 seguindo os
  redirecionamentos do GitHub e confere tamanho e SHA-256, sem instalar.
- `tests/updates.test.ts` cobre transições, cliques repetidos, adiamento, rótulos de erro e a
  conferência pós-reinício.

Testes web e simulados não comprovam a atualização nativa. Antes de publicar uma versão com
este recurso, valide em cada sistema com um pacote anterior instalado e uma versão mais nova no
catálogo. Registre a versão de origem e de destino, o pacote, a arquitetura, o ambiente, a
versão aberta após o reinício, a preservação do rascunho e a coerência de atalhos e inventário
do Launcher.

## Limitações

- A primeira versão capaz de se atualizar é a que contém este código. Instalações 0.7.0 ou
  anteriores continuam precisando do Launcher ou de instalação manual para chegar até ela.
- Não há proteção contra a reapresentação de um catálogo antigo, mas válido. O pior efeito é
  não oferecer a versão mais nova.
- O caminho do Struct Launcher no Linux não é conhecido. Nesse caso, o aviso só orienta a
  abri-lo.
- Uma instalação NSIS por máquina (fora do padrão por usuário) pode pedir elevação ao
  instalador.
