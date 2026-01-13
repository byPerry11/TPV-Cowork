# Migración de Base de Datos: Pomodoro Sessions

Este documento contiene las instrucciones SQL para crear la tabla `pomodoro_sessions` necesaria para el funcionamiento del Pomodoro Timer.

## Instrucciones

Ejecuta el siguiente script SQL en tu consola de Supabase (SQL Editor):

```sql
-- Crear tabla para sesiones de Pomodoro
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('work', 'shortBreak', 'longBreak')),
    duration_minutes INTEGER NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed ON pomodoro_sessions(completed);

-- Habilitar Row Level Security (RLS)
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias sesiones
CREATE POLICY "Users can view own pomodoro sessions"
    ON pomodoro_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política: Los usuarios pueden insertar sus propias sesiones
CREATE POLICY "Users can insert own pomodoro sessions"
    ON pomodoro_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar sus propias sesiones
CREATE POLICY "Users can update own pomodoro sessions"
    ON pomodoro_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden eliminar sus propias sesiones
CREATE POLICY "Users can delete own pomodoro sessions"
    ON pomodoro_sessions
    FOR DELETE
    USING (auth.uid() = user_id);
```

## Notas

- La tabla almacena todas las sesiones de Pomodoro de los usuarios
- Cada sesión tiene una fase: `work` (25 min), `shortBreak` (5 min), o `longBreak` (15 min)
- Las políticas RLS garantizan que los usuarios solo puedan ver y modificar sus propias sesiones
- Los índices mejoran el rendimiento de las consultas más comunes

## Verificación

Para verificar que la tabla se creó correctamente, ejecuta:

```sql
SELECT * FROM pomodoro_sessions LIMIT 1;
```

Deberías ver la estructura de la tabla sin errores.
