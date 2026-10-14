# Arquitectura actual

Nombre web_pokemon_tcg; autor Adrián Rodríguez. Estado en ESTADO.md.

## Web (HTML, CSS y JavaScript sin framework)

- catalogo_cartas.html carga, con `?v=` (subir al cambiar un recurso), datos, configuración pública, SDK de Supabase local y los módulos: `dialogos.js` (cierres con aviso de cambios), `catalogo.js` (filtros, cuadrícula/lista, detalle), `registro.js` (selector de cartas del índice), `cuenta.js` (sesión, perfil, cuenta), `editor.js` (alta y edición) y `coleccion.js` (colección propia, Descubrir y colecciones ajenas). index.html redirige conservando el retorno OAuth y `?u=`.
- Un solo diálogo de trabajo (`#detail-dialog`): detalle a la izquierda y editor a la derecha (apilados por debajo de 1100 px). La X, Esc y el clic fuera pasan por `tcgDialogos.request`: con cambios sin guardar aparece «Seguir editando · Descartar cambios · Guardar».
- Vistas: cuadrícula (5 columnas en escritorio, 3 en móvil) y lista de una carta por fila; se recuerda en `localStorage` (`tcg_vista`).
- Colección principal = datos.json/js (177 fichas, 178 ejemplares) más `tcg_cards` en Supabase, editable solo por el propietario. Colecciones de otras personas = filas de `tcg_user_cards` (idioma, catalogo_id, cantidad, tipo, categoría) que se muestran con nombre, expansión e imagen del índice; solo lectura salvo la propia.
- Imágenes: 156 escaneos originales (TCGdex, pokemon-card.com y Daldagury; los coreanos llevan la marca de agua oficial) con esquinas redondeadas por CSS, y 21 fotos propias (15 nuevas y 6 anteriores) intactas. Las colecciones ajenas enlazan los escaneos desde TCGdex (`…/low|high.webp`) o Daldagury (`_medium.webp`) según la referencia `i` del índice; sin imagen, marcador neutro.
- Sin subidas de usuarios: ni fotos de cartas ni de perfil. Avatares: ocho PNG blancos de 256 px sobre fondo transparente en `catalogo_cartas/avatares/` (a1–a6 de iconos descargados por el usuario, sin créditos por decisión suya; a7 y a8, dibujos propios en el mismo estilo; sin nombres visibles).

## Datos y herramientas

- referencias.json (completo) y referencias.js (reducido, 4,9 MB; incluye la referencia de imagen `i`) se generan con actualizar_referencias.py y completar_referencias.py; `--solo-web` regenera el JS sin descargas. Sin precios.
- validar_catalogo.py comprueba datos, imágenes, avatares, licencias, nombres, vocabulario de tipos (TCGdex en español) y que referencias.js derive del JSON.
- Tipos: Agua, Dragón, Fuego, Hada, Incolora, Lucha, Metálica, Oscura, Planta, Psíquico, Rayo, Entrenador, Energía.

## Supabase (proyecto exclusivo) y Google

- configurar_supabase.sql (aplicado) y configurar_supabase_v2.sql (pendiente de aplicar por el usuario). Ambos repetibles.
- v2: `tcg_profiles` con avatar, visible y oculto (solo el administrador cambia `oculto`); `tcg_user_cards` con comprobaciones de formato, cantidad 1–9999 y límite de 500 cartas; funciones `tcg_descubrir`, `tcg_perfil_publico`, `tcg_ocultar` y `tcg_borrar_mis_datos`. Lectura pública solo de perfiles visibles y no ocultos.
- Si v2 no está aplicado, el cliente oculta Descubrir y usa solo el nombre del perfil.
- Los nuevos usuarios reciben el nombre `Entrenador####` y se abre Tu cuenta para elegir nombre y avatar. Se almacena el correo de Google en Supabase (no se muestra en la web).
- Para abrir el acceso a cualquiera hay que publicar la app en Google Cloud (Google Auth Platform › Audience › Publish app); la hace el usuario.
- Cierre de sesión: máximo 3 s esperando al servicio; después sale en local, borra las claves de este proyecto y recarga.

## Pruebas (todas simuladas)

herramientas/comprobacion: probar_interfaz, probar_oauth (SDK real con transporte falso), probar_colecciones (Descubrir y colecciones, con ayuda_navegador.cjs) y probar_permisos (PGlite con ambos SQL). Los perfiles de Chrome son temporales y están ignorados por Git.

## Publicación y licencia

Pages en https://itsrodryy.github.io/web_pokemon_tcg/. Git en solo lectura: cada escritura requiere permiso expreso. LICENSE (MIT, fotos propias reservadas), THIRD_PARTY_NOTICES y pie de página con créditos, marcas y privacidad. Daldagury es un servicio de aficionados: su uso es no comercial; conviene pedirles permiso.
