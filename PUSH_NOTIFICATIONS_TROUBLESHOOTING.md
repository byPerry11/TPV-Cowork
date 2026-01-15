# Diagnóstico y Solución: Push Notifications Error 500

## 🔍 Problema Identificado

Los errores 500 en `/api/push/subscribe` y `/api/push/subscriptions` ocurren porque **falta la variable de entorno `SUPABASE_SERVICE_ROLE_KEY` en Vercel**.

## ✅ Solución Paso a Paso

### 1. Obtener el Service Role Key de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Settings** → **API**
3. Busca la sección **Project API keys**
4. Copia el **`service_role` secret** (⚠️ NO el anon/public key)

### 2. Configurar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega estas **3** variables (si no están todas):

```
Variable 1:
Name: SUPABASE_SERVICE_ROLE_KEY
Value: <tu-service-role-key-aqui>
Environments: Production, Preview, Development

Variable 2:
Name: NEXT_PUBLIC_VAPID_PUBLIC_KEY
Value: <your_public_key>
Environments: Production, Preview, Development

Variable 3:
Name: VAPID_PRIVATE_KEY
Value: <your_private_key>
Environments: Production, Preview, Development
```

### 3. Re-deployar

Después de agregar las variables:

- En Vercel → **Deployments** → último deploy → **⋮** (tres puntos) → **Redeploy**
- O haz un commit vacío y push:
  ```bash
  git commit --allow-empty -m "Trigger redeploy"
  git push origin main
  ```

### 4. Verificar tabla en Supabase

Ejecuta este SQL en Supabase SQL Editor para asegurar que la tabla está correcta:

```sql
-- Eliminar y recrear la tabla con estructura correcta
DROP TABLE IF EXISTS push_subscriptions CASCADE;

CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id
ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Las políticas RLS NO deben aplicar al service_role
-- Supabase automáticamente bypasea RLS cuando usas service_role_key
-- Pero las creamos para seguridad del anon key

DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON push_subscriptions;

CREATE POLICY "Users can view own subscriptions"
ON push_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON push_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON push_subscriptions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON push_subscriptions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
```

### 5. Verificar en Local

Asegúrate que tu `.env.local` tenga todas las variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your_public_key>
VAPID_PRIVATE_KEY=<your_private_key>
```

Luego reinicia el servidor:

```bash
# Detén con Ctrl+C
npm run dev
```

## 🧪 Cómo Verificar que Funciona

1. Ve a tu app → Settings → Notifications
2. Click en "Enable"
3. Acepta los permisos del navegador
4. Deberías ver: ✅ "Push notifications enabled!"
5. Verifica en Supabase → Table Editor → `push_subscriptions` que hay un registro nuevo

## 📊 Checklist Completo

- [ ] `SUPABASE_SERVICE_ROLE_KEY` en Vercel
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en Vercel
- [ ] `VAPID_PRIVATE_KEY` en Vercel
- [ ] Todas las variables en `.env.local`
- [ ] Tabla `push_subscriptions` creada en Supabase
- [ ] Re-deployed en Vercel
- [ ] Servidor local reiniciado

## 🐛 Si Persiste el Error

1. **Verifica en logs de Vercel:**

   - Ve a tu deployment → Functions → selecciona la función que falló
   - Revisa los logs exactos del error

2. **Verifica variables de entorno en Vercel:**

   - Ve a Settings → Environment Variables
   - Busca cada variable y confirma que no está vacía

3. **Verifica RLS en Supabase:**
   - El service_role_key debería bypasear RLS automáticamente
   - Si no funciona, temporalmente puedes deshabilitar RLS:
     ```sql
     ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
     ```
   - (No recomendado en producción a largo plazo)

## ⚠️ Seguridad

- ❌ NUNCA compartas el `SUPABASE_SERVICE_ROLE_KEY` públicamente
- ❌ NUNCA lo uses en código del cliente (solo en API routes)
- ✅ Solo debe estar en variables de entorno del servidor
- ✅ El service role bypasea RLS y tiene acceso total a la DB

## 📝 Notas

- El service role key es diferente del anon key
- El service role key se usa SOLO en el servidor (API routes)
- Las VAPID keys son para browser push, no tienen nada que ver con Supabase
