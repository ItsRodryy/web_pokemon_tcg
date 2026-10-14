"""Guarda escaneos originales verificados; respeta las 15 fotos del usuario.

Sin recortes, reescalados ni fondos artificiales. Si falta una imagen exacta,
conserva la referencia existente y la marca para mostrar el aviso en la web.
"""
import hashlib
import io
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image
from actualizar_referencias import BASE, obtener

PROPIAS = {'c159', 'c162', 'c163', 'c160', 'c165', 'c028', 'c023', 'c107',
           'c161', 'c108', 'c104', 'c103', 'c088', 'c106', 'c010'}


def numero(v):
    return v.split('/')[0].lower().lstrip('0') or '0'


def imagen_verificada(c, refs):
    if c.get('imagen_url'):
        return c['imagen_url'], c.get('imagen_fuente') or c['imagen_url']
    fuente = c.get('fuente_identidad') or ''
    if fuente.startswith('https://api.tcgdex.net/'):
        try:
            detalle = json.loads(obtener(fuente))
            if detalle.get('image'):
                return detalle['image'] + '/high.png', fuente
        except Exception:
            pass
    sets = [s for s in refs['expansiones'] if s['idioma'] == c['idioma'] and s['codigo'].lower() == c['codigo'].lower()]
    for s in sorted(sets, key=lambda s: s.get('proveedor') != 'daldagury'):
        for carta in s['cartas']:
            if numero(carta['numero']) != numero(c['numero']):
                continue
            if carta['id'].startswith('dalda:') or carta.get('dalda_id'):
                try:
                    card_id = carta.get('dalda_id') or carta['id'].split(':')[1]
                    detalle = json.loads(obtener('https://api.daldagury.com/tcg/cards/' + card_id))['resultData']
                    if detalle.get('setCode', '').lower() not in {c['codigo'].lower(), s.get('codigo_fuente', '').lower()} or numero(detalle['cardNumber']) != numero(c['numero']):
                        continue
                    prints = detalle.get('prints') or []
                    matching = [p for p in prints if p.get('rarityCode') == c.get('rareza')]
                    p = (matching or prints)[0]
                    image = p.get('imageUrlOfficial') or p.get('imageUrlMedium')
                    if image:
                        return image, carta.get('fuente_imagen') or carta['fuente']
                except Exception:
                    pass
            elif carta.get('imagen'):
                return carta['imagen'] + '/high.png', s['fuente']
    return None, None


def actualizar_carta(c, refs):
    c = dict(c)
    if c['id'] in PROPIAS:
        c['imagen_faltante'] = False
        return c, 'propia'
    if c.get('imagen_archivo_original'):
        return c, 'escaneo'
    url, fuente = imagen_verificada(c, refs)
    if not url:
        c['imagen_faltante'] = True
        return c, 'sin_imagen'
    try:
        with urlopen(Request(url, headers={'User-Agent': 'web_pokemon_tcg/1.0'}), timeout=25) as response:
            raw = response.read()
        img = Image.open(io.BytesIO(raw));fmt = img.format;size = img.size;img.verify()
        ext = {'JPEG': '.jpg', 'PNG': '.png', 'WEBP': '.webp'}[fmt]
        if min(size) < 200:
            raise ValueError('Imagen demasiado pequena')
        original = (BASE / c['imagen']).resolve()
        destino = original.with_suffix(ext)
        if not destino.is_relative_to((BASE / 'imagenes_cartas').resolve()):
            raise ValueError('Destino fuera del proyecto')
        destino.write_bytes(raw)
        if destino != original:
            original.unlink()
        c.update(imagen=destino.relative_to(BASE).as_posix(), imagen_url=url,
                 imagen_fuente=fuente, imagen_origen='catalogo', imagen_faltante=False,
                 imagen_archivo_original=True, imagen_dimensiones=list(size))
        for key in ['encuadre', 'recorte_metodo', 'contorno_normalizado']:
            c.pop(key, None)
        return c, 'escaneo'
    except Exception as e:
        c['imagen_faltante'] = True
        return c, 'sin_imagen:' + type(e).__name__


def actualizar():
    archivo = BASE / 'catalogo_cartas/datos.json'
    cards = json.loads(archivo.read_text(encoding='utf-8'))
    refs = json.loads((BASE / 'catalogo_cartas/referencias.json').read_text(encoding='utf-8'))
    hashes = {c['id']: hashlib.sha256((BASE / c['imagen']).read_bytes()).hexdigest() for c in cards if c['id'] in PROPIAS}
    actualizadas, resultados = {}, {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(actualizar_carta, c, refs): c['id'] for c in cards}
        for i, f in enumerate(as_completed(futures), 1):
            c, estado = f.result();actualizadas[c['id']] = c
            resultados[estado] = resultados.get(estado, 0) + 1
            if i % 30 == 0:
                print(f'Imagenes revisadas: {i}/{len(cards)}', flush=True)
    cards = [actualizadas[c['id']] for c in cards]
    assert all(hashlib.sha256((BASE / c['imagen']).read_bytes()).hexdigest() == hashes[c['id']] for c in cards if c['id'] in PROPIAS)
    archivo.write_text(json.dumps(cards, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(resultados, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    actualizar()
