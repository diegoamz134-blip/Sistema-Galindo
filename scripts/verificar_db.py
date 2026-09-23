import urllib.request
import json

headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODk3MTI4MDMsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.GrmuCF6vZw14uNj-9smSyaC3oXiOqErU7bnojQHYa80',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODk3MTI4MDMsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.GrmuCF6vZw14uNj-9smSyaC3oXiOqErU7bnojQHYa80',
    'Prefer': 'count=exact'
}

req_p = urllib.request.Request('http://sistemagalindo-supabase-0cc0c7-148-113-243-176.sslip.io/rest/v1/productos?select=sku,nombre,precio_venta,stock', headers=headers)
with urllib.request.urlopen(req_p) as resp:
    prods = json.loads(resp.read().decode())
    print(f"Total productos en base de datos: {len(prods)}")
    print("Muestra de productos:")
    for p in prods[:5]:
        print(f"  [{p['sku']}] {p['nombre']} - S/ {p['precio_venta']} (Stock: {p['stock']})")
    print("  ...")
    for p in prods[-5:]:
        print(f"  [{p['sku']}] {p['nombre']} - S/ {p['precio_venta']} (Stock: {p['stock']})")

req_c = urllib.request.Request('http://sistemagalindo-supabase-0cc0c7-148-113-243-176.sslip.io/rest/v1/categorias?select=nombre,slug,orden&order=orden.asc', headers=headers)
with urllib.request.urlopen(req_c) as resp:
    cats = json.loads(resp.read().decode())
    print(f"\nTotal categorias en base de datos: {len(cats)}")
    for c in cats:
        print(f"  {c['orden']}. {c['nombre']} ({c['slug']})")
