# Estado

Actualizado el 14 de octubre de 2026.

## Hecho (publicado en el commit 86ec468)

- Proyecto copiado a D:\Proyectos\personal\web_pokemon_tcg (copia verificada: mismo commit y mismos archivos). La carpeta antigua del Escritorio la borra el usuario.
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

## Sin publicar (14/10/2026, tarde)

- SQL v2 aplicado en Supabase (Descubrir responde) y app de Google publicada en producción; el usuario confirma que entrar y Descubrir funcionan.
- Avatares nuevos: seis iconos de línea del usuario pasados a blanco y dos propios (Jigglypuff, Ditto), en PNG; los SVG anteriores, retirados.
- Con una ventana abierta, la página de fondo ya no se desplaza (comprobado a 1440 y 390 px).
- Caché v=20261014_6. Validador, sintaxis y probar_interfaz correctos.

## Pendiente

- Autor y licencia de los iconos a1–a6 (THIRD_PARTY_NOTICES dice «PENDIENTE»); nombres de a5 y a6.
- privacidad.html: el enlace de privacidad dado a Google aún da 404.
- Commit y push de todo lo anterior y del cambio de rutas (requiere permiso).
- Daldagury es un servicio de aficionados: conviene pedirles permiso para el uso de su índice e imágenes (contact@daldagury.com).
- Graphify y comprobación de hooks, aplazados por el usuario.

## Siguiente paso

El usuario indica la fuente de los iconos y da permiso; se crea privacidad.html y se publica todo.
