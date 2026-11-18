---
name: brain-graph
description: Gera um grafo HTML interativo (arquivo único, offline) das páginas do Project Brain — nós por categoria, ligações pelos [[wikilinks]], painel lateral com o conteúdo renderizado (inclui diagramas Mermaid), busca e filtros. Use sempre que o usuário quiser ver, navegar, mapear ou entender visualmente o brain/base de conhecimento do projeto, pedir "grafo do brain", "mapa das páginas", "ver as ligações entre decisões", "brain graph", achar páginas órfãs ou links quebrados, ou perguntar como abrir/atualizar/consertar o grafo — mesmo sem citar a palavra "grafo".
---

# brain-graph

Transforma o brain (`brain/pages/*.md` + páginas-raiz) num grafo que um humano consegue explorar. É só leitura: nunca escreve dentro do brain.

## Gerar e abrir

Da raiz do projeto:

```bash
node .claude/skills/brain-graph/scripts/brain-graph.mjs --open
```

- Saída padrão: `docs/brain-graph.html`. Muda com `--out <arquivo>`.
- A saída fica **fora** do brain de propósito: o brain é gerenciado pelo CLI `brain` e não se mistura arquivo gerado ali (um `reindex`/`init` futuro poderia estranhar ou limpar). O HTML é derivado e se refaz do zero.
- O script acha o brain como o CLI faz: `brainRoot` em `.mindmux/preferences.json`, senão `./brain`.
- Ao final imprime quantas páginas, ligações e links quebrados achou — use isso para responder ao usuário.

## O que o grafo mostra

- **Nós**: uma página = um nó. Cor = categoria (decisão, conceito, pessoa, organização, referência, projeto, raiz). Tamanho = nº de ligações. Páginas `archived` ficam esmaecidas.
- **Ligações sólidas**: `[[id-da-página]]` no corpo (também `[[id|apelido]]`). **Tracejadas**: `affects:` das entradas de timeline.
- **Nó fantasma vermelho tracejado**: `[[link]]` para página que não existe. É lacuna de conhecimento — crie a página (`brain create-page`) ou corrija o link.
- **Painel lateral**: conteúdo renderizado (listas, tabelas, citações, código, **Mermaid**), "aponta para", "citada por", últimas entradas da timeline. Redimensionável (arrastar a borda; duplo clique restaura).

Isso significa que **a qualidade do grafo depende dos `[[links]]`**. Ao escrever/atualizar páginas do brain (`brain-ingest`, `brain-page`), linke as páginas relacionadas com `[[id]]`; página sem link vira ilha solta.

## Atualização automática

Um hook `PostToolUse` (matcher `Bash`) roda `scripts/post-brain-write-hook.sh`: se o comando executado foi uma **escrita** do CLI do brain (`create-page`, `update-truth`, `append-timeline`, `archive-page`, `set-tags`, `update-root`), regenera o HTML em silêncio (~100 ms, nunca bloqueia). Leituras não disparam.

Está ligado em `.claude/settings.json`:

```json
{
  "matcher": "Bash",
  "hooks": [{ "type": "command", "timeout": 15,
    "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/skills/brain-graph/scripts/post-brain-write-hook.sh" }]
}
```

Limite: só cobre comandos que o Claude roda na sessão. Se o brain mudar por fora (terminal, outra ferramenta), rode o script na mão.

## Usar em outro projeto

Copie a pasta `brain-graph/` para `.claude/skills/` (ou `~/.claude/skills/` para valer em todos), adicione o bloco de hook acima apontando para o caminho certo e rode o script. Requer só Node e `jq` (o hook). Sem dependências npm.

## Limites e dicas

- **Mermaid** é baixado do CDN (jsdelivr, versão fixa) ao abrir uma página que tenha diagrama. Sem rede, o código do diagrama aparece como texto. Clicar no diagrama o amplia (`Esc` fecha).
- O grafo é estático; o layout é recalculado a cada abertura, então a posição dos nós muda.
- Para conferir visualmente por automação de navegador, sirva a pasta por HTTP (`python3 -m http.server <porta> --bind 127.0.0.1` em `docs/`); `file://` costuma ser bloqueado. Na rotina normal basta `--open`.
- `docs/brain-graph.html` é arquivo gerado: avalie ignorá-lo no `.gitignore` e versionar só a skill.

## Ajustar a aparência

Tudo (CSS, layout de forças, painel, Mermaid) está em `scripts/brain-graph.template.html`; o parse do brain está em `scripts/brain-graph.mjs`. O dado entra no template pelo marcador `/*__DATA__*/null` — mantenha esse marcador ao editar. Depois de mexer, regenere e confira no navegador (clique num nó, numa página com tabela e numa com Mermaid, por exemplo as raízes `flow` e `stack`).
