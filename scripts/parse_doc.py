import zipfile
import xml.etree.ElementTree as ET
import re

docx_path = r'c:\Users\diego\OneDrive\Desktop\sistema-galindo\public\inventario ica.docx'

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')

root = ET.fromstring(xml_content)
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

tables = root.findall('.//w:tbl', namespaces)
print(f"Total tables: {len(tables)}")

rows_data = []
for table in tables:
    for row in table.findall('.//w:tr', namespaces):
        cells = row.findall('.//w:tc', namespaces)
        row_text = []
        for cell in cells:
            text = "".join(node.text for node in cell.findall('.//w:t', namespaces) if node.text)
            row_text.append(text.strip())
        if any(row_text):
            rows_data.append(row_text)

print(f"Total rows extracted: {len(rows_data)}")
for i, r in enumerate(rows_data[:15]):
    print(f"Row {i}: {r}")

print("...")
for i, r in enumerate(rows_data[-10:], start=len(rows_data)-10):
    print(f"Row {i}: {r}")
