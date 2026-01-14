# Migración de Evidencias

Este documento contiene las instrucciones SQL para crear la tabla `evidences` y configurar el storage bucket necesario para el funcionamiento de las evidencias.

## Instrucciones

Ejecuta el siguiente script SQL en tu consola de Supabase (SQL Editor):

## PASO 1: Crear la tabla 'evidences'

```sql
CREATE TABLE IF NOT EXISTS evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_evidences_checkpoint_id ON evidences(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_evidences_user_id ON evidences(user_id);
```

## PASO 2: Habilitar RLS

```sql
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;
```

## PASO 3: Políticas RLS

```sql
-- Los usuarios pueden ver evidencias de proyectos donde son miembros
CREATE POLICY "Users can view evidences of their projects"
    ON evidences
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoints cp
            JOIN project_members pm ON pm.project_id = cp.project_id
            WHERE cp.id = evidences.checkpoint_id
            AND pm.user_id = auth.uid()
            AND pm.status = 'active'
        )
    );

-- Los usuarios pueden insertar evidencias en checkpoints de sus proyectos
CREATE POLICY "Users can insert evidences in their projects"
    ON evidences
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM checkpoints cp
            JOIN project_members pm ON pm.project_id = cp.project_id
            WHERE cp.id = checkpoint_id
            AND pm.user_id = auth.uid()
            AND pm.status = 'active'
        )
    );

-- Los usuarios pueden actualizar sus propias evidencias
CREATE POLICY "Users can update own evidences"
    ON evidences
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Managers pueden eliminar evidencias para rechazo
CREATE POLICY "Managers can delete evidences for rejection"
    ON evidences
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM checkpoints cp
            JOIN project_members pm ON pm.project_id = cp.project_id
            WHERE cp.id = evidences.checkpoint_id
            AND pm.user_id = auth.uid()
            AND pm.status = 'active'
            AND pm.role IN ('admin', 'manager')
        )
    );
```

## PASO 4: Configurar Storage Bucket

En **Supabase Dashboard > Storage**:

1. Crear un nuevo bucket llamado `evidences`
2. Marcarlo como **Public** (para URLs públicas de imágenes)
3. Agregar las siguientes políticas de storage:

```sql
-- Permitir a usuarios autenticados subir archivos
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidences');

-- Permitir a todos ver archivos (bucket público)
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'evidences');

-- Permitir a usuarios eliminar sus propios archivos
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'evidences' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Verificación

Para verificar que la tabla se creó correctamente:

```sql
SELECT * FROM evidences LIMIT 1;
```

Para verificar que el bucket existe:

```sql
SELECT * FROM storage.buckets WHERE name = 'evidences';
```
