# DevAssist Web

Este repositorio queda reorganizado para trabajar solo sobre la version web de DevAssist.

## Estructura actual

- `dashboard/`: frontend web en React + Vite.
- `server/`: API backend Express para fichas, busqueda y pipeline de video.
- `docs/`: documentacion funcional y guias de migracion.
- `legacy/desktop-electron/`: app antigua de escritorio Electron y materiales historicos.

## Comandos principales

Desde la raiz:

```bash
npm run dev:dashboard
npm run dev:server
npm run build
npm run test
```

Tambien se puede trabajar por paquete:

```bash
cd dashboard && npm run dev
cd server && npm run dev
```

## Legado Electron

La app de escritorio anterior no se ha borrado. Esta archivada en:

```text
legacy/desktop-electron/app
```

El inventario funcional para migrar capacidades a web esta en:

```text
docs/DESKTOP_LEGACY_FUNCTIONS.md
```

## Prioridad de migracion

1. Consolidar autenticacion y configuracion segura en `server/`.
2. Migrar modulos de alto valor: Proyectos, Fichas, TESS/Agentes, AI Hub.
3. Reemplazar dependencias Electron/IPC por endpoints HTTP y jobs backend.
4. Mantener el legado solo como referencia hasta completar la paridad funcional.
