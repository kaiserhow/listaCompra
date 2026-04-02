# 🛒 La Compra

Webapp de lista de la compra con grupos, sincronización en la nube y modo compartir.

## 🚀 Deploy en GitHub Pages

1. Crea un repositorio en GitHub (puede ser privado o público)
2. Sube todos estos archivos al repositorio
3. Ve a **Settings → Pages**
4. En *Source* selecciona **Deploy from a branch**
5. Elige la rama `main` y carpeta `/ (root)`
6. Guarda — en unos minutos tendrás tu URL tipo `https://tuusuario.github.io/tu-repo`

## ⚠️ Paso previo: Crear las tablas en Supabase

Antes de usar la app, ejecuta el contenido de `setup.sql` en el **SQL Editor** de tu proyecto Supabase:

1. Ve a [supabase.com](https://supabase.com) → tu proyecto
2. Menú lateral → **SQL Editor**
3. Pega el contenido de `setup.sql` y ejecuta

## ✨ Funcionalidades

- 📋 **Lista**: Añade productos con nombre y cantidad
- 🗂️ **Grupos**: Organiza por secciones (Frutería, Carnicería, etc.)
- 🛒 **Comprar**: Tacha productos mientras compras, con barra de progreso
- 🔗 **Compartir**: Comparte tu lista con un enlace o ID único
- ☁️ **Nube**: Datos guardados en Supabase, accesibles desde cualquier dispositivo
