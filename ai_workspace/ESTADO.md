# Estado

Actualizado el 29 de octubre de 2026.

## Hecho

- Web completa y publicada en GitHub Pages (`v=20261014_6`): catálogo, vista móvil y lista, editor
  lateral, avatares, Descubrir, colecciones ajenas, moderación, licencia MIT y `privacidad.html`
  (responde 200 el 29/10). Licencias de los iconos resueltas en `THIRD_PARTY_NOTICES`.
- SQL v2 aplicado y app de Google publicada (14/10); el usuario confirmó que entrar y Descubrir
  funcionaban.
- AI Workspace 2.3.0 (`v1.0.0`). Aviso automático `.github/workflows/supabase_activo.yml`: consulta
  `tcg_cards` cada 3 días para que Supabase no pause el proyecto por inactividad.

## Pendiente

- **Supabase caído (29/10):** `jrdgqdczplvehzzyhgqx.supabase.co` no existe en DNS (NXDOMAIN en
  1.1.1.1 y 8.8.8.8; `supabase.com` sí responde). Casi seguro, pausa del plan gratuito por
  inactividad. Sin él no funcionan la sesión, «Tu colección» ni Descubrir (el catálogo estático sí).
  El usuario lo deja pendiente: restaurarlo en supabase.com → proyecto → *Restore*, y después
  comprobar con dos cuentas (entrar, avatar, cartas, Descubrir, ocultarse, salir).
- Tras restaurarlo: ver en GitHub → Actions que «Supabase activo» sale en verde.
- Daldagury es un servicio de aficionados: conviene pedir permiso por su índice e imágenes
  (contact@daldagury.com).

## Siguiente paso

Restaurar Supabase y repetir la prueba con dos cuentas.
