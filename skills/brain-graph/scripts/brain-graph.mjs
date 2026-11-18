#!/usr/bin/env node
// Gera um grafo HTML (autossuficiente, sem dependencias) das paginas do brain.
//
// Uso (da raiz do projeto):
//   node <skill>/scripts/brain-graph.mjs            -> escreve docs/brain-graph.html
//   node <skill>/scripts/brain-graph.mjs --open     -> escreve e abre no navegador
//   node <skill>/scripts/brain-graph.mjs --out x.html
//
// Somente LE o brain (nao escreve nada dentro dele).
// Arestas: [[wikilinks]] no corpo (solido) e `affects:` da timeline (tracejado).
// Link para pagina que nao existe vira no "fantasma" (lacuna no conhecimento).

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const argVal = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const root = process.cwd();
const outFile = resolve(root, argVal('--out') || 'docs/brain-graph.html');

// --- resolve diretorio do brain (mesma regra do CLI) ---
function brainDir() {
  const pref = join(root, '.mindmux', 'preferences.json');
  try {
    if (existsSync(pref)) {
      const br = JSON.parse(readFileSync(pref, 'utf8')).brainRoot;
      if (br) return resolve(root, br);
    }
  } catch { /* cai no default */ }
  return join(root, 'brain');
}
const BRAIN = brainDir();
if (!existsSync(BRAIN)) { console.error(`brain nao encontrado em ${BRAIN}`); process.exit(1); }

// --- parse ---
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const k = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!k) continue;
    let v = k[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else v = v.replace(/^["']|["']$/g, '');
    fm[k[1]] = v;
  }
  return { fm, body: m[2] };
}

function parseTimeline(tl) {
  const entries = [];
  let cur = null;
  for (const line of tl.split('\n')) {
    const s = line.match(/^- (\w+):\s*(.*)$/);
    const c = line.match(/^\s+(\w+):\s*(.*)$/);
    if (s) { cur = {}; entries.push(cur); cur[s[1]] = s[2].replace(/^["']|["']$/g, ''); }
    else if (c && cur) cur[c[1]] = c[2].replace(/^["']|["']$/g, '');
  }
  return entries;
}

const wikilinks = (text) =>
  [...text.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)].map((m) => m[1].trim());

const nodes = new Map();
const edges = new Map(); // "a>b" -> {source,target,kind}

function addEdge(source, target, kind) {
  if (source === target) return;
  const key = `${source}>${target}`;
  if (!edges.has(key) || kind === 'link') edges.set(key, { source, target, kind });
}

// paginas
const pagesDir = join(BRAIN, 'pages');
if (existsSync(pagesDir)) {
  for (const f of readdirSync(pagesDir).filter((x) => x.endsWith('.md')).sort()) {
    const { fm, body } = parseFrontmatter(readFileSync(join(pagesDir, f), 'utf8'));
    const id = fm.id || f.replace(/\.md$/, '');
    const [truthPart, tlPart = ''] = body.split(/\n## Timeline\n/);
    const truth = truthPart.replace('<!-- compiled_truth -->', '').trim();
    const timeline = parseTimeline(tlPart);
    nodes.set(id, {
      id, title: fm.title || id, category: fm.category || 'reference',
      status: fm.status || 'active', tags: Array.isArray(fm.tags) ? fm.tags : [],
      created: fm.created || '', updated: fm.updated || '',
      truth, timeline: timeline.slice(-5).reverse(), timelineCount: timeline.length,
    });
    for (const t of wikilinks(truth)) addEdge(id, t, 'link');
    for (const e of timeline) {
      const aff = String(e.affects || '').replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const a of aff) addEdge(id, a, 'affects');
    }
  }
}

// root pages (architecture, stack, ...)
const ROOTS = ['background', 'architecture', 'flow', 'mindmap', 'stack', 'roadmap'];
for (const slug of ROOTS) {
  const p = join(BRAIN, `${slug}.md`);
  if (!existsSync(p)) continue;
  const { fm, body } = parseFrontmatter(readFileSync(p, 'utf8'));
  const h1 = body.match(/^#\s+(.+)$/m);
  nodes.set(`root:${slug}`, {
    id: `root:${slug}`, title: (h1 && h1[1]) || fm.title || slug, category: 'root',
    status: 'active', tags: [], created: fm.created || '', updated: fm.updated || '',
    truth: body.trim(), timeline: [], timelineCount: 0, slug,
  });
  for (const t of wikilinks(body)) addEdge(`root:${slug}`, t, 'link');
}

// resolve alvos; cria fantasmas para links quebrados
const resolveId = (t) => (nodes.has(t) ? t : nodes.has(`root:${t}`) ? `root:${t}` : null);
const finalEdges = [];
for (const e of edges.values()) {
  let target = resolveId(e.target);
  if (!target) {
    target = `ghost:${e.target}`;
    if (!nodes.has(target)) {
      nodes.set(target, {
        id: target, title: e.target, category: 'ghost', status: 'missing', tags: [],
        created: '', updated: '', truth: `Link \`[[${e.target}]]\` aponta para pagina que **nao existe**. Lacuna no conhecimento: criar a pagina ou corrigir o link.`,
        timeline: [], timelineCount: 0,
      });
    }
  }
  finalEdges.push({ source: e.source, target, kind: e.kind });
}

const data = {
  generated: new Date().toISOString(),
  nodes: [...nodes.values()],
  edges: finalEdges,
};

// --- HTML ---
const html = readFileSync(new URL('./brain-graph.template.html', import.meta.url), 'utf8')
  .replace('/*__DATA__*/null', JSON.stringify(data).replace(/</g, '\\u003c'));

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html);
const real = data.nodes.filter((n) => n.category !== 'ghost').length;
const ghosts = data.nodes.length - real;
console.log(`${outFile}\n${real} paginas, ${data.edges.length} ligacoes${ghosts ? `, ${ghosts} link(s) quebrado(s)` : ''}`);

if (args.includes('--open')) {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(opener, [outFile], { stdio: 'ignore', detached: true }).unref();
}
