import zipfile
import xml.etree.ElementTree as ET
import json
import re
from collections import Counter

docx_path = r'c:\Users\diego\OneDrive\Desktop\sistema-galindo\public\inventario ica.docx'

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml').decode('utf-8')

root = ET.fromstring(xml_content.encode('utf-8'))
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

table = root.find('.//w:tbl', namespaces)
rows = table.findall('.//w:tr', namespaces)

products = []
for i, row in enumerate(rows):
    cells = row.findall('.//w:tc', namespaces)
    texts = []
    for cell in cells:
        t = "".join(node.text for node in cell.findall('.//w:t', namespaces) if node.text)
        texts.append(t.strip())
    
    # Skip title and header
    if i < 2:
        continue
    
    # We expect 4 columns: [Código, Producto/Servicio, Precio Venta, Stock]
    # Sometimes first column may be blank or different length
    if len(texts) >= 4:
        code = texts[0]
        name = texts[1]
        price_str = texts[2]
        stock_str = texts[3]
    elif len(texts) == 3:
        # Check if code was missing or merged
        code = texts[0]
        name = texts[1]
        price_str = texts[2]
        stock_str = ""
    else:
        print(f"Row {i} unexpected length {len(texts)}: {texts}")
        continue
    
    # Clean price
    # S/ 5 or S/ 3.5 or S/ 990
    price_clean = re.sub(r'[^\d.]', '', price_str.replace(',', '.'))
    price = float(price_clean) if price_clean else 0.0

    # Clean stock
    stock_clean = stock_str.strip()
    try:
        stock = int(stock_clean)
    except:
        stock = 0
    
    products.append({
        'row': i,
        'raw_code': code,
        'raw_name': name,
        'raw_price': price_str,
        'price': price,
        'raw_stock': stock_str,
        'stock': stock
    })

print(f"Total parsed products: {len(products)}")

# Check duplicate codes
codes = [p['raw_code'] for p in products]
counts = Counter(codes)
duplicates = {k: v for k, v in counts.items() if v > 1}
print(f"\nDuplicate codes count: {len(duplicates)}")
for k, v in duplicates.items():
    print(f"  Code: '{k}' appears {v} times:")
    for p in products:
        if p['raw_code'] == k:
            print(f"    Row {p['row']}: Name: '{p['raw_name']}', Price: {p['price']}, Stock: {p['stock']} (raw: '{p['raw_stock']}')")

# Check negative or 0 stock
negative_stocks = [p for p in products if p['stock'] < 0]
print(f"\nNegative stocks: {len(negative_stocks)}")
for p in negative_stocks:
    print(f"  Row {p['row']}: Code: '{p['raw_code']}', Name: '{p['raw_name']}', Stock: {p['stock']}")

empty_stocks = [p for p in products if p['raw_stock'] == '']
print(f"\nEmpty stocks: {len(empty_stocks)}")
for p in empty_stocks:
    print(f"  Row {p['row']}: Code: '{p['raw_code']}', Name: '{p['raw_name']}'")

# Check empty codes
empty_codes = [p for p in products if not p['raw_code']]
print(f"\nEmpty codes: {len(empty_codes)}")
for p in empty_codes:
    print(f"  Row {p['row']}: Name: '{p['raw_name']}', Price: {p['price']}, Stock: {p['stock']}")

