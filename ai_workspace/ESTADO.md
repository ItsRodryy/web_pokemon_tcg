# Estado

Actualizado el 14 de octubre de 2026.

## Hecho

- Catálogo minimalista gris, negro y blanco, marca rodrytela y logo gris de líneas simples. Sin cabecera promocional.
- Cinco columnas en escritorio, textos ligeramente mayores, resumen total discreto y filtros conservados sin precios.
- Incorporadas 15 fotos propias desde el escritorio a sus fichas existentes, incluido Charizard. Recorte visual en cuadrícula y original completo en el detalle; originales del escritorio intactos.
- Inventario conservado: 177 fichas, 178 ejemplares provisionales, 177 imágenes; 63 fichas japonesas, 62 españolas y 52 coreanas.
- AI Workspace instalado para Codex y Claude, con Graphify. Plantilla archivada dentro de herramientas/plantilla_ai_workspace para mantener los cambios dentro del proyecto.
- Tipografía aumentada otra vez; Poké Ball alineada con el nombre del usuario. Implementados acceso Google, perfil editable persistente en Supabase, formulario privado, actualización de cantidades y fotografías completas con encuadre visual.
- URL y clave Publishable del proyecto Supabase confirmadas mediante su API. Google ya aparece habilitado en Auth. El usuario ha creado el repositorio ItsRodryy/web_pokemon_tcg y autorizó su publicación con autoría propia.

## Verificado

- actualizar_catalogo.py y validar_catalogo.py correctos.
- Sintaxis JavaScript correcta.
- Navegador Chrome: las 15 fotos completas cargan a 1200x1600; cinco columnas, marca, filtros, búsqueda, pendientes y siete ordenaciones correctos. Sin desbordamiento a 390 px.
- Comparación SHA-256 confirma que las 15 fotos incorporadas son copias exactas de los originales.
- Pruebas PostgreSQL locales: 177 fichas admitidas, perfiles privados, nombres persistentes, escritura solo del administrador con identidad Google verificada, visitantes sin edición y migración repetible.
- Pruebas de interfaz con servicio simulado: nombre guardado tras recargar, aumento de cantidad sin duplicar ficha, subida de foto completa y encuadre, restricciones de edición, salida de sesión, cinco columnas, tipografía y alineación, y móvil.

## Pendiente real

- Completar Google OAuth: añadir usuario de prueba y redirecciones, ejecutar herramientas/configurar_supabase.sql en el proyecto Supabase real y verificar un inicio de sesión real y persistencia entre dispositivos.
- Publicar en GitHub Pages únicamente ItsRodryy/web_pokemon_tcg. Git y publicación ya están autorizados para este repositorio; autoría de Adrián Rodríguez, sin firma de Codex. Operaciones destructivas requieren preguntar.
- Sustituir gradualmente las demás referencias por fotos propias según lleguen.

## Siguiente paso

Continuar la guía de configuración paso a paso. No confundir las pruebas locales o simuladas con la verificación de autenticación y persistencia en el servicio real.
