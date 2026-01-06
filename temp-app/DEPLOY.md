# Guía de Despliegue (Deployment Guide)

Para ejecutar esta aplicación desde cualquier dispositivo, necesitas alojarla en la nube. La forma más sencilla y recomendada para aplicaciones Next.js + Supabase es usar **Vercel**.

## Paso 1: Subir código a GitHub

El código ya está guardado localmente (commit realizado). Ahora necesitas subirlo a la nube.

1.  Ve a [GitHub](https://github.com/new) y crea un **Nuevo Repositorio**.
    - Nombre: `tpv-app` (o el que gustes).
    - Público o Privado (Privado recomendado).
    - **NO** inicialices con README, .gitignore o License (ya los tenemos).
2.  Copia la URL del repositorio (ej. `https://github.com/tu-usuario/tpv-app.git`).
3.  Ejecuta estos comandos en tu terminal (en la carpeta del proyecto):

```bash
git remote add origin https://github.com/TU-USUARIO/tpv-app.git
git branch -M main
git push -u origin main
```

_(Si ya tenías un remote configurado, usa `git remote set-url origin <URL>`)_

## Paso 2: Desplegar en Vercel

1.  Ve a [Vercel](https://vercel.com) y regístrate/inicia sesión (idealmente con tu cuenta de GitHub).
2.  Haz clic en **"Add New..."** -> **"Project"**.
3.  Importa el repositorio `tpv-app` que acabas de subir.
4.  En la configuración del proyecto ("Configure Project"):

    - **Framework Preset**: Next.js (se detecta automático).
    - **Environment Variables**: Esto es CRÍTICO. Debes añadir las claves de Supabase.

    Copia los valores de tu archivo `.env.local` y agrégalos aquí:

    | Key                             | Value                                      |
    | ------------------------------- | ------------------------------------------ |
    | `NEXT_PUBLIC_SUPABASE_URL`      | `https://utvzgxbwzbeoqistexgk.supabase.co` |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _(Tu Clave Larga que empieza con eyJ...)_  |

    _Nota: Si tienes otras variables en el futuro, agrégalas también._

5.  Haz clic en **"Deploy"**.

## Paso 3: Verificar

Vercel construirá tu aplicación. Una vez termine (1-2 minutos), te dará una URL (ej. `https://tpv-app.vercel.app`).

- Abre esa URL en tu celular, tablet o cualquier PC.
- ¡Listo! Tu aplicación es accesible globalmente.
