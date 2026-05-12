# Graph Report - server  (2026-05-11)

## Corpus Check
- 24 files · ~6,520 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 169 nodes · 229 edges · 10 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14d19362`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `{ Pool }` - 9 edges
2. `processVideo()` - 7 edges
3. `downloadAndExtract()` - 5 edges
4. `analyze()` - 4 edges
5. `GeminiService` - 4 edges
6. `initDatabase()` - 3 edges
7. `transcribe()` - 3 edges
8. `cleanup()` - 3 edges
9. `generateFichaEmbedding()` - 3 edges
10. `start` - 2 edges

## Surprising Connections (you probably didn't know these)
- `processVideo()` --calls--> `downloadAndExtract()`  [EXTRACTED]
  workers/videoProcessor.js → services/downloader.js
- `start` --calls--> `initDatabase()`  [EXTRACTED]
  index.js → db/connection.js
- `processVideo()` --calls--> `transcribe()`  [EXTRACTED]
  workers/videoProcessor.js → services/transcriber.js
- `processVideo()` --calls--> `analyze()`  [EXTRACTED]
  workers/videoProcessor.js → services/analyzer.js
- `processVideo()` --calls--> `generateFichaEmbedding()`  [EXTRACTED]
  workers/videoProcessor.js → services/embedder.js

## Communities (10 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (19): config, logger, { Pool }, crypto, { pool }, express, logger, { pool } (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (22): analyze(), extractJSON(), gemini, logger, cleanup(), gemini, generateFichaEmbedding(), logger (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): initDatabase(), apiKeyAuth(), config, errorHandler(), logger, agentsRouter, aiRouter, { apiKeyAuth } (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (19): db, jobId, limit, logger, parsed, { processVideo }, { Router }, { submitUrlSchema } (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (12): logger, { pool }, queries, express, logger, newConfig, queries, router (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (9): config, db, GeminiService, { GoogleGenerativeAI }, logger, config, envSchema, parsed (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (9): crypto, expiresAt, express, id, logger, passwordHash, { pool }, router (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (8): crypto, express, keyHash, logger, planLimits, { pool }, rawKey, router

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (9): downloadAndExtract(), { exec }, execAsync, extractVideoId(), fs, logger, os, path (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): express, id, logger, { pool }, router, { v4: uuidv4 }

## Knowledge Gaps
- **118 isolated node(s):** `express`, `cors`, `helmet`, `path`, `config` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `{ Pool }` connect `Community 0` to `Community 9`, `Community 4`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `processVideo()` connect `Community 1` to `Community 8`, `Community 3`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `express`, `cors`, `helmet` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._