#!/bin/bash

# Script para organizar archivos existentes de optimizaciones en sesiones
# Mueve archivos del root a .sessions/ organizados por contexto

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🗂️  Organizando archivos de optimizaciones existentes..."

# Crear directorio de sesiones si no existe
mkdir -p .sessions

# Función para crear sesión y mover archivos
organize_sprint1() {
    echo ""
    echo "📁 Organizando archivos de Sprint 1..."

    SESSION_DIR=".sessions/sprint1-optimization-$(date +%Y-%m-%d)"
    mkdir -p "$SESSION_DIR"

    # Archivos relacionados con Sprint 1
    FILES=(
        "SPRINT1_CHANGELOG.md"
        "SPRINT1_DEPLOY_GUIDE.md"
        "SPRINT1_IMPORTANTE.md"
        "SPRINT1_SUMMARY.md"
        "SPRINT1_VISUAL_DIFF.md"
        "ROUTINE_ANALYSIS_REPORT.md"
        "IMPLEMENTATION_SUMMARY.md"
        "CORRECCIONES_FINALES.md"
        "routine.json"
        "routine_optimized_sprint1.json"
        "routine_optimized_sprint1.json.bak"
        "routine_optimized_sprint1.json.bak2"
        "routine_optimized_sprint1.json.bak3"
        "routine_optimized_sprint1.json.bak4"
        "routine_optimized_sprint1_temp.json"
    )

    MOVED_COUNT=0
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            echo "  ✓ Moviendo $file"
            mv "$file" "$SESSION_DIR/"
            MOVED_COUNT=$((MOVED_COUNT + 1))
        fi
    done

    if [ $MOVED_COUNT -gt 0 ]; then
        # Crear README para esta sesión
        cat > "$SESSION_DIR/README.md" << 'EOF'
# Sprint 1 Optimization Session

Archivos de la optimización Sprint 1 (migrados desde root).

## Archivos incluidos

- `SPRINT1_*.md` - Documentación del sprint
- `ROUTINE_ANALYSIS_REPORT.md` - Análisis detallado
- `IMPLEMENTATION_SUMMARY.md` - Resumen de implementación
- `CORRECCIONES_FINALES.md` - Correcciones finales
- `routine.json` - Rutina original
- `routine_optimized_sprint1*.json` - Versiones optimizadas

## Contexto

Estos archivos fueron generados durante las optimizaciones de Sprint 1
y han sido movidos del root del proyecto para mantener organización.
EOF

        echo "  ✅ $MOVED_COUNT archivos movidos a $SESSION_DIR"
    else
        echo "  ℹ️  No se encontraron archivos de Sprint 1"
        rmdir "$SESSION_DIR"
    fi
}

# Función para mover otros archivos
organize_misc() {
    echo ""
    echo "📁 Organizando otros archivos..."

    SESSION_DIR=".sessions/misc-files-$(date +%Y-%m-%d)"
    mkdir -p "$SESSION_DIR"

    FILES=(
        "apicotalekr.json"
        "reporte.json"
        "analyze_flow.cjs"
        "fix_json.py"
        "test_api_complete.sh"
        "test_endpoints.sh"
        "test_write_extension_jsonpatch.md"
        "write_extension_ccjs_only.js"
        "write_extension_jsonpatch_example.js"
        "rutina_write_extension.js"
    )

    MOVED_COUNT=0
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            echo "  ✓ Moviendo $file"
            mv "$file" "$SESSION_DIR/"
            MOVED_COUNT=$((MOVED_COUNT + 1))
        fi
    done

    if [ $MOVED_COUNT -gt 0 ]; then
        cat > "$SESSION_DIR/README.md" << 'EOF'
# Miscellaneous Files

Archivos varios relacionados con desarrollo y testing.

## Archivos incluidos

- `apicotalekr.json` - Datos de API Cotalker
- `reporte.json` - Reporte de análisis
- Scripts de testing y helpers varios

## Contexto

Archivos de utilidad y testing movidos desde root para mantener organización.
EOF

        echo "  ✅ $MOVED_COUNT archivos movidos a $SESSION_DIR"
    else
        echo "  ℹ️  No se encontraron archivos misceláneos"
        rmdir "$SESSION_DIR"
    fi
}

# Ejecutar organización
organize_sprint1
organize_misc

# Actualizar symlink "latest"
LATEST_SESSION=$(ls -t .sessions | grep -v latest | head -1)
if [ -n "$LATEST_SESSION" ]; then
    cd .sessions
    rm -f latest
    ln -s "$LATEST_SESSION" latest
    cd ..
    echo ""
    echo "🔗 Symlink 'latest' actualizado a: $LATEST_SESSION"
fi

echo ""
echo "✅ Organización completa!"
echo ""
echo "📂 Archivos organizados en:"
ls -d .sessions/*/ 2>/dev/null | sed 's/^/  - /'

echo ""
echo "💡 Tip: Revisa .sessions/latest/ para ver los archivos más recientes"
echo "💡 Para limpiar todo: rm -rf .sessions/*"
