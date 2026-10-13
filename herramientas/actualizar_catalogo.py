"""Actualiza los datos del HTML tras editar catalogo_cartas/datos.json.

Uso desde esta carpeta o la raiz: python actualizar_catalogo.py
"""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]


def actualizar(silencioso=False):
    destino = BASE / 'catalogo_cartas'
    cartas = json.loads((destino / 'datos.json').read_text(encoding='utf-8'))
    if not isinstance(cartas, list) or not cartas:
        raise ValueError('datos.json debe contener una lista de cartas.')
    ids = [c['id'] for c in cartas]
    if len(set(ids)) != len(ids):
        raise ValueError('Hay identificadores de ficha repetidos.')
    for c in cartas:
        if c.get('idioma') not in {'japones', 'español', 'coreano'}:
            raise ValueError(f"Idioma no admitido: {c['id']}")
        imagen = (BASE / c['imagen']).resolve()
        if not imagen.is_relative_to(BASE / 'imagenes_cartas') or not imagen.is_file():
            raise ValueError(f"Imagen ausente o fuera de imagenes_cartas: {c['id']}")
    contenido = 'window.CATALOGO_DATA = ' + json.dumps(cartas, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + ';\n'
    temporal = destino / 'datos_temporal.js'
    temporal.write_text(contenido, encoding='utf-8')
    temporal.replace(destino / 'datos.js')
    if not silencioso:
        print(f'Catalogo actualizado: {len(cartas)} fichas, {sum(c["cantidad"] for c in cartas)} ejemplares.')


if __name__ == '__main__':
    actualizar()
