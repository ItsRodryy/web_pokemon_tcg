# Estado

Actualizado el 14 de octubre de 2026.

## Hecho (en local; publicado solo hasta el commit 1faef40)

- Las 6 fotos propias sin escaneo (c089, c095, c096, c100, c101, c111) pierden la cruz y quedan protegidas: 21 fotos propias en total. Esquinas redondeadas en todos los escaneos.
- Vista de 3 columnas en móvil y selector Cuadrícula/Lista (una carta ancha por fila), recordado en el navegador.
- Editar abre el editor a la derecha del detalle (apilado en pantallas estrechas); X, Esc y clic fuera avisan de cambios sin guardar («Seguir editando · Descartar cambios · Guardar»), también en Tu cuenta.
- Cerrar sesión con límite de 3 s y salida local garantizada (probado con un servidor que nunca responde). Tu cuenta muestra correo y si es administrador, para diagnosticar por qué no aparecía «Sincronizar».
- Ocho avatares SVG propios, nombre inicial `Entrenador####`, visibilidad en Descubrir, «Borrar mis datos».
- Descubrir y colecciones de otras personas (solo referencias al índice; sin subidas), colección propia para quien no es el propietario, enlaces `?u=`, moderación (ocultar) para el propietario.
- `configurar_supabase_v2.sql` (repetible, solo añade). Sin ese SQL la web sigue funcionando sin Descubrir (probado).
- LICENSE MIT, THIRD_PARTY_NOTICES, pie de página con licencias, créditos, marcas y privacidad. Licencias de TCGdex (MIT), PokéAPI (BSD-3) y supabase-js (MIT) comprobadas en sus repositorios.
- Módulos nuevos: dialogos.js, editor.js, coleccion.js; pruebas nuevas probar_colecciones.cjs y ayuda_navegador.cjs.

## Verificación (14/10/2026, en local)

- validar_catalogo.py, node --check y las cuatro suites simuladas correctas: interfaz (3 columnas, lista, editor lateral, avisos, avatares), OAuth con SDK real (incluye servidor mudo), colecciones (Descubrir, ajenas, propia, visibilidad, borrado, moderación, sin SQL v2) y permisos PGlite (RLS, límites, upsert exacto de PostgREST, ocultación).
- Capturas revisadas en escritorio y a 390 px.
- No verificado: nada con cuentas Google reales ni contra el Supabase real.

## Pendiente

- Publicar (permiso expreso por operación) y comprobar Pages.
- El usuario aplica configurar_supabase_v2.sql en Supabase y publica la app en Google Cloud (Google Auth Platform › Audience › Publish app) para abrirla a cualquiera.
- Comprobación real con dos cuentas: entrar, avatar, añadir cartas, Descubrir, ocultarse, cerrar sesión, «Sincronizar las 177 cartas».
- Mover la carpeta a D:\Proyectos\web_pokemon_tcg y actualizar rutas (al final; reabrir la sesión allí).
- Daldagury es un servicio de aficionados: conviene pedirles permiso para el uso de su índice e imágenes (contact@daldagury.com).
- Graphify y comprobación de hooks, aplazados por el usuario.

## Siguiente paso

Pedir permiso de publicación; guiar al usuario con el SQL y Google; mover la carpeta.
