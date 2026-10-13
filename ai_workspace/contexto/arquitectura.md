# Arquitectura actual

La raíz real sigue siendo C:/Users/adria/Desktop/cartas_pokemon. El nombre elegido del proyecto es web_pokemon_tcg; la marca visible es rodrytela.

- catalogo_cartas.html carga catalogo_cartas/catalogo.css, datos.js y catalogo.js mediante rutas relativas. Funciona abierto directamente, sin servidor ni conexión para consultar las cartas locales.
- catalogo_cartas/datos.json contiene 177 fichas y 178 ejemplares provisionales. datos.js es su copia para el navegador y se regenera con herramientas/actualizar_catalogo.py.
- imagenes_cartas contiene 177 imágenes, una por ficha. Las carpetas son japones, español, coreano y pendientes. Una ficha pendiente guarda su imagen en pendientes, sin perder el campo idioma.
- Se incorporaron 15 fotos propias del escritorio, completas y sin modificar su contenido. En esas fichas, encuadre guarda x, y, ancho, alto y dimensiones originales; JavaScript aplica el recorte visual en miniatura. El detalle utiliza la misma imagen completa.
- El resto de las imágenes existentes se conserva. No hay funciones, campos ni actualizadores de precios.
- herramientas/abrir_catalogo.cmd abre el HTML. herramientas/validar_catalogo.py verifica datos, imágenes, referencias locales y estructura; admite la infraestructura de IA aparte del catálogo.
- No hay compilación ni framework. catalogo_cartas/cuenta.js integra el SDK oficial Supabase, guardado localmente en supabase.js; configuracion.js contiene únicamente URL y clave Publishable públicas.
- El nombre junto al logo proviene de tcg_profiles.username, vinculado al identificador de Google/Supabase, y se actualiza solo tras confirmar el guardado remoto. Sin sesión aparece rodrytela.
- tcg_cards mantiene fichas remotas que se combinan por id con el inventario local; las copias se editan mediante su cantidad total. Storage guarda las fotos completas y encuadre controla solo la miniatura.
- herramientas/configurar_supabase.sql define perfiles privados, cartas públicas y escritura limitada al Google verificado del administrador. Está probado con PostgreSQL local; requiere aplicarlo al proyecto real antes de usar la edición.

## Evolución elegida, aún pendiente

Publicación pública en GitHub Pages con ItsRodryy/web_pokemon_tcg, autorizada con autoría de Adrián Rodríguez. Proyecto Supabase jrdgqdczplvehzzyhgqx confirmado y Google habilitado; falta aplicar el SQL, completar redirecciones y usuarios de prueba y comprobar el flujo real. El formulario está implementado y probado con un servicio simulado. No guardar secretos de administración en HTML ni JavaScript públicos. No tocar otros repositorios ni realizar operaciones destructivas sin preguntar.
