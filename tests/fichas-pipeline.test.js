/**
 * tests/fichas-pipeline.test.js
 * Tests del pipeline de procesamiento de fichas (saveFicha, mapeo, IPC)
 * Ejecutar con: npx jest tests/fichas-pipeline.test.js
 */

// ─────────────────────────────────────────────────────────────────
// BLOQUE 1: saveFicha — detección de formato plano vs anidado
// ─────────────────────────────────────────────────────────────────
describe('saveFicha — Detección formato plano vs anidado', () => {
    // Simulamos la lógica de saveFicha sin necesitar la DB
    function extractData(f) {
        if (f.data && typeof f.data === 'object') return f.data;
        if (f.details && typeof f.details === 'object') return f.details;
        const { id: _id, title: _t, titulo: _tu, timestamp: _ts, createdAt: _ca, data: _d, details: _det, ...rest } = f;
        return rest;
    }

    test('Formato plano: extrae toda la ficha como data', () => {
        const ficha = { id: '1', titulo: 'Test', concepto: 'Texto', tags: ['a', 'b'], videoName: 'v.mp4' };
        const data = extractData(ficha);
        expect(data.concepto).toBe('Texto');
        expect(data.tags).toEqual(['a', 'b']);
        expect(data.videoName).toBe('v.mp4');
        // No debe incluir campos de metadatos
        expect(data.id).toBeUndefined();
        expect(data.titulo).toBeUndefined();
    });

    test('Formato con .data: usa el subcampo data', () => {
        const ficha = { id: '2', title: 'Test2', data: { concepto: 'Anidado', tags: ['x'] } };
        const data = extractData(ficha);
        expect(data.concepto).toBe('Anidado');
        expect(data.tags).toEqual(['x']);
    });

    test('Formato con .details: usa el subcampo details', () => {
        const ficha = { id: '3', title: 'Test3', details: { concepto: 'Details', herramientas: [] } };
        const data = extractData(ficha);
        expect(data.concepto).toBe('Details');
    });

    test('data tiene prioridad sobre details', () => {
        const ficha = { id: '4', title: 'T4', data: { concepto: 'data-wins' }, details: { concepto: 'details-loses' } };
        const data = extractData(ficha);
        expect(data.concepto).toBe('data-wins');
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 2: getFichas — mapper de normalización
// ─────────────────────────────────────────────────────────────────
describe('getFichas — Mapper de normalización (simulado)', () => {
    function mapRow(r) {
        let details = {};
        try { details = JSON.parse(r.data); } catch (e) {}
        return {
            ...details,
            ...r,
            titulo: r.title || details.titulo || details.title || 'Sin título',
            id: r.id,
            timestamp: r.timestamp,
            createdAt: r.timestamp,
            data: details,
            details: details,
            tags: details.tags || []
        };
    }

    test('titulo se normaliza desde title (campo DB)', () => {
        const row = { id: '1', title: 'DB Title', data: '{"concepto":"x"}', timestamp: 123 };
        const result = mapRow(row);
        expect(result.titulo).toBe('DB Title');
    });

    test('concepto disponible en raíz del objeto', () => {
        const row = { id: '2', title: 'T', data: '{"concepto":"Mi concepto","tags":["a"]}', timestamp: 1 };
        const result = mapRow(row);
        expect(result.concepto).toBe('Mi concepto');
    });

    test('tags como array aunque no exista', () => {
        const row = { id: '3', title: 'T', data: '{"concepto":"sin tags"}', timestamp: 1 };
        const result = mapRow(row);
        expect(Array.isArray(result.tags)).toBe(true);
        expect(result.tags).toEqual([]);
    });

    test('createdAt mapeado desde timestamp', () => {
        const row = { id: '4', title: 'T', data: '{}', timestamp: 9999 };
        const result = mapRow(row);
        expect(result.createdAt).toBe(9999);
    });

    test('JSON malformado no lanza excepción', () => {
        const row = { id: '5', title: 'T', data: 'INVALID', timestamp: 1 };
        expect(() => mapRow(row)).not.toThrow();
        const result = mapRow(row);
        expect(result.tags).toEqual([]);
    });

    test('investigacion_profunda disponible en raíz', () => {
        const inv = '## Deep Research\n- Punto 1';
        const row = { id: '6', title: 'T', data: JSON.stringify({ investigacion_profunda: inv, concepto: 'x' }), timestamp: 1 };
        const result = mapRow(row);
        expect(result.investigacion_profunda).toBe(inv);
    });

    test('herramientas disponibles en raíz', () => {
        const row = { id: '7', title: 'T', data: JSON.stringify({ herramientas: [{ nombre: 'Gemini' }] }), timestamp: 1 };
        const result = mapRow(row);
        expect(Array.isArray(result.herramientas)).toBe(true);
        expect(result.herramientas[0].nombre).toBe('Gemini');
    });

    test('puntos_exploracion disponibles en raíz', () => {
        const row = { id: '8', title: 'T', data: JSON.stringify({ puntos_exploracion: [{ tema: 'React', pregunta: '¿?' }] }), timestamp: 1 };
        const result = mapRow(row);
        expect(result.puntos_exploracion[0].tema).toBe('React');
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 3: Filtrado Frontend — FichasModule
// ─────────────────────────────────────────────────────────────────
describe('FichasModule — Lógica de filtrado', () => {
    const fichas = [
        { id: '1', titulo: 'Gemini 2.0 Flash', concepto: 'IA de Google', tags: ['IA', 'Google'] },
        { id: '2', titulo: 'React Server Components', concepto: 'Renderizado en servidor', tags: ['React', 'Frontend'] },
        { id: '3', titulo: null, concepto: null, tags: null }, // Ficha con datos nulos
        { id: '4', titulo: 'SQLite en Electron', concepto: undefined, tags: [] },
    ];

    function filterFichas(fichas, searchQuery, activeTag = null) {
        return fichas.filter(f => {
            const title = f.titulo || f.title || '';
            const concept = f.concepto || f.concept || '';
            const tags = Array.isArray(f.tags) ? f.tags : [];

            const matchesSearch =
                title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesTag = !activeTag || tags.includes(activeTag);

            return matchesSearch && matchesTag;
        });
    }

    test('Búsqueda por título', () => {
        const result = filterFichas(fichas, 'Gemini');
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('1');
    });

    test('Búsqueda por concepto', () => {
        const result = filterFichas(fichas, 'servidor');
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('2');
    });

    test('Búsqueda por tag', () => {
        const result = filterFichas(fichas, 'React');
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('2');
    });

    test('Búsqueda vacía retorna todas las fichas', () => {
        const result = filterFichas(fichas, '');
        expect(result.length).toBe(fichas.length);
    });

    test('Filtrado por activeTag', () => {
        const result = filterFichas(fichas, '', 'IA');
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('1');
    });

    test('No crashea con ficha nula (titulo/concepto/tags null)', () => {
        expect(() => filterFichas(fichas, 'test')).not.toThrow();
    });

    test('No crashea con concepto undefined', () => {
        expect(() => filterFichas(fichas, 'SQLite')).not.toThrow();
        const result = filterFichas(fichas, 'SQLite');
        expect(result.length).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 4: Parsing del JSON de respuesta de IA
// ─────────────────────────────────────────────────────────────────
describe('AI Response Parsing', () => {
    function parseAIJson(raw) {
        try {
            const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            return null;
        }
    }

    test('JSON limpio se parsea correctamente', () => {
        const raw = '{"titulo": "Test", "concepto": "x", "tags": ["a","b"]}';
        const result = parseAIJson(raw);
        expect(result).not.toBeNull();
        expect(result.titulo).toBe('Test');
    });

    test('JSON con bloques markdown se parsea correctamente', () => {
        const raw = '```json\n{"titulo": "Test2", "nivel": "avanzado"}\n```';
        const result = parseAIJson(raw);
        expect(result).not.toBeNull();
        expect(result.titulo).toBe('Test2');
    });

    test('JSON inválido retorna null sin crash', () => {
        const result = parseAIJson('esto no es json');
        expect(result).toBeNull();
    });

    test('JSON con caracteres especiales en español', () => {
        const raw = '{"concepto": "Análisis técnico con ñoños y tildes: é, á, ü"}';
        const result = parseAIJson(raw);
        expect(result.concepto).toContain('ñoños');
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 5: Searching en LogsModule
// ─────────────────────────────────────────────────────────────────
describe('LogsModule — Filtrado defensivo', () => {
    function filterLogs(logs, filter) {
        return logs.filter(line => {
            if (!line) return false;
            const lineStr = String(line);
            return !filter || lineStr.toLowerCase().includes(filter.toLowerCase());
        });
    }

    test('Filtra por texto en log', () => {
        const logs = ['[INFO] App iniciada', '[ERROR] DB fallo', '[WARN] Conexión lenta'];
        const result = filterLogs(logs, 'error');
        expect(result.length).toBe(1);
        expect(result[0]).toContain('ERROR');
    });

    test('Filtro vacío retorna todo', () => {
        const logs = ['a', 'b', 'c'];
        expect(filterLogs(logs, '').length).toBe(3);
    });

    test('No crashea con null en el array de logs', () => {
        const logs = ['válido', null, undefined, ''];
        expect(() => filterLogs(logs, 'válido')).not.toThrow();
        const result = filterLogs(logs, 'válido');
        expect(result.length).toBe(1);
    });

    test('No crashea con valores numéricos en logs', () => {
        const logs = [42, 'texto', null];
        expect(() => filterLogs(logs, 'texto')).not.toThrow();
    });
});
