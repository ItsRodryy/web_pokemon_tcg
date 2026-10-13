# web_pokemon_tcg

Catálogo de la colección Pokémon TCG de Adrián Rodríguez, con nombre visible del usuario conectado y rodrytela como nombre por defecto sin sesión. Agrupa las copias por carta, idioma, edición y variante, y permite buscar, filtrar y consultar fotografías y datos. Se prepara su publicación pública y una zona de edición privada desde el móvil.

Autoría: Adrián Rodríguez. Ninguna IA figura como autora ni firma nada.

## Forma de trabajar

- Responde en español, breve y directo, con avisos cortos de progreso.
- Antes de cada tarea, indica el modelo en uso y el esfuerzo que recomiendas.
- No expongas el enfoque salvo en modo plan o con `crear-plan`. Si hay dudas que cambien el
  resultado, pregunta (cinco como máximo) y espera; después, trabaja sin paradas salvo un bloqueo
  real. Sin dudas, actúa directamente.
- Lo que el usuario diga en el chat prevalece sobre estos documentos. Si decide algo nuevo o cambia
  algo documentado, actualiza el documento afectado en el mismo trabajo, sin esperar a que lo pida.
- Comprueba rutas y datos reales antes de usarlos; no inventes. Di lo que no hayas podido comprobar.
- Git y publicación autorizados únicamente para ItsRodryy/web_pokemon_tcg, con autoría de Adrián Rodríguez. No tocar otros repositorios ni realizar operaciones destructivas sin preguntar.
- Al terminar: qué se hizo, cómo se verificó y qué queda. Sin volcados de consola.

## Proyecto

- Plataformas: Windows, Navegadores de ordenador y móvil.
- Tecnologías: HTML, CSS, JavaScript sin framework, Python 3.9 o posterior para herramientas locales.
- Trabajar únicamente dentro de C:/Users/adria/Desktop/cartas_pokemon; web_pokemon_tcg es el nombre elegido del proyecto, no una autorización para mover o renombrar esta carpeta.
- No incluir precios, filtros u ordenación por precio, ni automatizaciones o herramientas de valoración.
- Solo se coleccionan cartas en japonés, español y coreano. Conservar las dudas de identificación o variante como pendientes.
- Conservar las tres carpetas funcionales del catálogo: imagenes_cartas, herramientas y catalogo_cartas, más catalogo_cartas.html. La infraestructura de IA solicitada es adicional y usa los nombres estándar necesarios.
- Usar minúsculas y barrabajas en los archivos y carpetas del catálogo. imagenes_cartas contiene japones, español, coreano y pendientes. Numerar las imágenes e incluir nombre, edición y número de carta.
- Usar fotografías propias nuevas sin sustituirlas por imágenes de internet ni cambiarles el fondo. Conservar completas las fotos y aplicar el encuadre solo en la cuadrícula; el detalle muestra la foto completa.
- Mantener las imágenes actuales del resto de cartas hasta recibir sus fotografías propias. No añadir fichas ni aumentar cantidades por el mero hecho de sustituir una imagen.
- Catálogo público previsto en GitHub Pages, cuenta ItsRodryy, proyecto web_pokemon_tcg. Supabase gratuito elegido para guardar nuevas cartas y fotos; acceso privado de edición con Google. Estos servicios todavía no están configurados ni desplegados.
- El usuario autorizó subir y publicar únicamente ItsRodryy/web_pokemon_tcg. Los commits son de Adrián Rodríguez, sin firma ni coautoría de Codex. No tocar los demás proyectos y preguntar antes de operaciones destructivas.
- No contratar servicios ni planes de pago. El usuario ya tiene cuenta en Supabase; falta seleccionar y configurar su proyecto y usuario propietario.
- Las fotos originales del escritorio se pueden leer para incorporarlas cuando el usuario las señale; nunca modificarlas, moverlas ni borrarlas.
- Intocable sin orden expresa: Fotografías originales del escritorio y cualquier ruta fuera de este proyecto.
- Excepción expresa: el usuario pidió mantener C:/Users/adria/Desktop/credenciales_web_pokemon_tcg.md con accesos y datos importantes. Es privado y no se incorpora a Git ni a la web.
- La interfaz sigue `ai_workspace/contexto/estilo.md`.
- El nombre junto a la Poké Ball es el username editable del perfil de Supabase del usuario conectado, asociado a Google. Sin sesión se muestra rodrytela. Nunca simular persistencia solo en el navegador.

## Verificación

Antes de dar por bueno un cambio de código:

- `python herramientas/actualizar_catalogo.py (tras editar datos.json)`
- `python herramientas/validar_catalogo.py`
- `node --check catalogo_cartas/catalogo.js`
- `Comprobar en navegador búsqueda, idiomas, filtros, ordenación, detalle, cinco columnas en escritorio y ausencia de desbordamiento en móvil.`

## Estado y planes

- Estado actual: `ai_workspace/ESTADO.md`. Si existe `PLAN_ACTUAL.md`, léelo antes de retomar.
- Skills: `crear-plan` planifica y para; `ejecutar-plan` ejecuta (la orden aprueba el plan);
  `cerrar` verifica, actualiza el estado y archiva o deja el traspaso; `error` diagnostica.
- Graphify: antes de abrir archivos grandes, `graphify explain <símbolo>` o `graphify affected <símbolo>`. `cerrar` lo actualiza.

## Documentación bajo demanda

Rutas dentro de `ai_workspace/`.

| Si vas a… | Lee |
|---|---|
| cambiar datos, imágenes, herramientas o comportamiento del catálogo | `contexto/arquitectura.md` |
| crear o cambiar interfaz | `contexto/estilo.md` |
