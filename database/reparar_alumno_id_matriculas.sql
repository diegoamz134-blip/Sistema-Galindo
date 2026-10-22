-- =========================================================================
-- SCRIPT DE REPARACIÓN: VINCULAR MATRÍCULAS HUÉRFANAS CON SUS ALUMNOS
-- SISTEMA GALINDO - BARBER ACADEMY & SUPPLY
-- =========================================================================
-- PROBLEMA: El código anterior no incluía `alumno_id` en el INSERT de
-- matrículas, dejando esa columna en NULL. Este script intenta reparar
-- los registros históricos vinculando cada matrícula con el alumno más
-- cercano en tiempo de creación.
--
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu Supabase Studio
-- 2. Pega y ejecuta este script completo
-- 3. Verifica los resultados con la query de diagnóstico al final
-- =========================================================================

-- PASO 1: Ver cuántas matrículas están rotas (alumno_id = NULL)
SELECT 
    COUNT(*) AS matriculas_sin_alumno,
    MIN(creado_en) AS primera_afectada,
    MAX(creado_en) AS ultima_afectada
FROM public.matriculas
WHERE alumno_id IS NULL;

-- PASO 2: Si solo hay UN alumno por cada matrícula rota, vinculamos por
-- proximidad temporal (el alumno se creó segundos antes que la matrícula)
UPDATE public.matriculas m
SET alumno_id = subq.alumno_id
FROM (
    SELECT DISTINCT ON (m.id)
        m.id AS matricula_id,
        a.id AS alumno_id,
        ABS(EXTRACT(EPOCH FROM (a.creado_en - m.creado_en))) AS diff_segundos
    FROM public.matriculas m
    JOIN public.alumnos a
        ON ABS(EXTRACT(EPOCH FROM (a.creado_en - m.creado_en))) < 300
    WHERE m.alumno_id IS NULL
    ORDER BY m.id, ABS(EXTRACT(EPOCH FROM (a.creado_en - m.creado_en))) ASC
) subq
WHERE m.id = subq.matricula_id;

-- PASO 3: Verificar resultado de la reparación
SELECT 
    m.id,
    m.codigo_matricula,
    m.alumno_id,
    a.nombres,
    a.apellidos,
    a.dni,
    a.celular,
    m.creado_en
FROM public.matriculas m
LEFT JOIN public.alumnos a ON m.alumno_id = a.id
ORDER BY m.creado_en DESC
LIMIT 50;

-- PASO 4: Verificar si quedaron matrículas aún sin alumno
SELECT 
    m.id,
    m.codigo_matricula,
    m.creado_en,
    'SIN ALUMNO VINCULADO' AS estado
FROM public.matriculas m
WHERE m.alumno_id IS NULL
ORDER BY m.creado_en DESC;

-- =========================================================================
-- NOTA: Si aún quedan matrículas sin alumno después del PASO 2, significa
-- que no hubo un alumno creado en esa ventana de tiempo. Esos registros
-- deberán vincularse manualmente:
--
-- UPDATE public.matriculas
-- SET alumno_id = '<UUID_DEL_ALUMNO>'
-- WHERE id = '<UUID_DE_LA_MATRICULA>';
-- =========================================================================
