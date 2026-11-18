# brain-graph

Skill do Claude Code que gera um **grafo interativo** (um único arquivo HTML, offline) a partir de um Project Brain — a base de conhecimento em Markdown com `[[wikilinks]]` mantida pelo CLI `brain`.

- Nós por categoria (decisão, conceito, pessoa, organização…), ligados pelos `[[links]]` das páginas
- Painel lateral com o conteúdo renderizado, incluindo tabelas e **diagramas Mermaid**
- Busca, filtro por categoria, zoom, arrastar nós, tema claro/escuro, painel redimensionável
- Links quebrados aparecem como nós vermelhos (lacunas no conhecimento)
- Hook opcional que regenera o grafo sempre que o brain é escrito
- Só lê o brain, nunca escreve nele. Sem dependências npm (só Node; `jq` no hook)

## Instalar

Copie a pasta da skill para o projeto (ou para `~/.claude/skills/` para valer em todos):

```bash
cp -r skills/brain-graph <seu-projeto>/.claude/skills/
```

## Usar

Da raiz do projeto que tem o brain:

```bash
node .claude/skills/brain-graph/scripts/brain-graph.mjs --open   # gera docs/brain-graph.html
```

Ou peça ao Claude: "me mostra o grafo do brain".

### Atualização automática (opcional)

Em `.claude/settings.json` do projeto:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "timeout": 15,
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/skills/brain-graph/scripts/post-brain-write-hook.sh"
          }
        ]
      }
    ]
  }
}
```

Detalhes completos em [`skills/brain-graph/SKILL.md`](skills/brain-graph/SKILL.md).

## Próximos passos

- [ ] Empacotar como plugin do Claude Code
- [ ] Opção de Mermaid embutido (100% offline)
