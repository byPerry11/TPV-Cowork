# Corrección de Visibilidad de Proyectos y Equipos

Este script corrige los problemas con:
1. Proyectos de usuarios miembros que no cargan
2. Usuarios del equipo que no aparecen en las cards de proyectos
3. **Error PGRST200**: "Could not find a relationship between 'project_members' and 'profiles'"

## Instrucciones

Ejecuta el siguiente script en **Supabase SQL Editor**:

```sql
-- ================================================================
-- FIX TEAM VISIBILITY AND PROJECT MEMBERS LOADING
-- ================================================================

-- ================================================================
-- PASO 0: CREAR FOREIGN KEY ENTRE project_members Y profiles
-- ================================================================
-- Este es el paso MÁS IMPORTANTE. Sin esta FK, Supabase no puede 
-- hacer el join implícito profiles(avatar_url) desde project_members

-- Primero eliminamos cualquier FK existente que pueda conflictar
ALTER TABLE project_members 
DROP CONSTRAINT IF EXISTS project_members_user_id_profiles_fkey;

-- Crear la foreign key a profiles
-- Nota: profiles.id ya es una FK a auth.users(id), así que esto funciona
ALTER TABLE project_members
ADD CONSTRAINT project_members_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ================================================================
-- PASO 1: Asegurar que los perfiles son legibles por usuarios autenticados
-- ================================================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who are logged in" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- PASO 2: Asegurar que project_members es visible para todos los autenticados
-- ================================================================
-- Esto permite que las queries anidadas funcionen correctamente

DROP POLICY IF EXISTS "See project members" ON project_members;
DROP POLICY IF EXISTS "Project members are viewable by project members" ON project_members;
DROP POLICY IF EXISTS "Members viewable by project access" ON project_members;
DROP POLICY IF EXISTS "View Members Policy" ON project_members;

CREATE POLICY "All authenticated can view project members"
ON project_members FOR SELECT
TO authenticated
USING (true);

-- PASO 3: Asegurar políticas de INSERT correctas para project_members
-- ================================================================

DROP POLICY IF EXISTS "Users can join projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Project admins can add members" ON project_members;
DROP POLICY IF EXISTS "Admins and managers can insert members" ON project_members;

-- El usuario puede insertarse a sí mismo
CREATE POLICY "Users can insert self as member"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Los owners del proyecto pueden agregar miembros
CREATE POLICY "Project owners can add any members"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE id = project_id 
        AND owner_id = auth.uid()
    )
);

-- Admins del proyecto pueden agregar miembros
CREATE POLICY "Project admins can add members"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
        AND pm.status = 'active'
    )
);

-- PASO 4: Políticas de UPDATE para project_members
-- ================================================================

DROP POLICY IF EXISTS "Update Members Policy" ON project_members;
DROP POLICY IF EXISTS "Users can update own membership" ON project_members;
DROP POLICY IF EXISTS "Admins can update members" ON project_members;

-- Los usuarios pueden actualizar su propia membresía (aceptar/rechazar invitaciones)
CREATE POLICY "Users can update own membership"
ON project_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Los admins pueden actualizar a otros miembros
CREATE POLICY "Admins can update project members"
ON project_members FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('admin', 'manager')
        AND pm.status = 'active'
    )
);

-- PASO 5: Políticas de DELETE para project_members
-- ================================================================

DROP POLICY IF EXISTS "Delete Members Policy" ON project_members;
DROP POLICY IF EXISTS "Users can leave projects" ON project_members;
DROP POLICY IF EXISTS "Admins can remove members" ON project_members;

-- Los usuarios pueden salirse de un proyecto
CREATE POLICY "Users can leave projects"
ON project_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Los admins pueden remover miembros
CREATE POLICY "Admins can remove project members"
ON project_members FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('admin', 'manager')
        AND pm.status = 'active'
    )
);

-- ================================================================
-- VERIFICACIÓN
-- ================================================================
-- Ejecutar para verificar las políticas creadas:

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('profiles', 'project_members');
```

## Después de ejecutar

1. Recarga la página de dashboard
2. Los proyectos compartidos deberían aparecer correctamente
3. Los avatares del equipo deberían mostrarse en las cards de proyectos
