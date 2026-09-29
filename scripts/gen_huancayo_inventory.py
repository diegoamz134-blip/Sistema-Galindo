import csv
import io
import uuid
import re

data = """PRODUCTO	CANTIDAD
gel de afeitar	27
locion beard alfa	27
guantes latex	400
guantes lanero	500
vellus professional 7 levels	2
vellus professional 9 levels	30
peróxido yellow 30 vol	4
talco para nuca	30
laca spray bandido dorada	4
laca spray bandido negra	4
laca hair spray elegance	2
papel de cuello bandido	300
cera bandido roja	8
cera bandido spiderman	23
cera bandido negra	9
cera bandido verde	8
cera bandido azul	13
cera bandido dorada	3
cera bandido amarilla	12
cera bandido ploma	4
crema medio brillo level rojo	6
pomada alta brillante level dorado	4
pigmento naca	23
cool care	6
pasta elegante morada	9
pomada elegante negra	10
cream wax elegance	6
gel fijador xtyle 300 g	11
gel fijador xtyle 700 g	10
fibera pro keratine	8
botapelo profesional	7
triple action elegance negro	8
triple action elegance celesta	1
triple action elegance morada	1
talco argosss	18
black mask elegance	6
sanitizer hx	15
sanitizer steril aus wohl professional	3
magic clip cable negra	9
secadora vgr v-432	4
shaver plus professional andis	3
baByliss pro	9
kemey km-1990	5
pulverizador alfa negro	1
aerografo inalambrico plus	5
barber top rojo	1
barber top negro	1
maquina de malla	9
capa jrl professional	3
edicion la babyliss PRO	1
wmark professional ng-9801	4
kemei km-1993	5
vgr professional barber cuchillas v-432	7
pulverizador barbero	10
patillera andis pro li	4
wmark professional ng-w1	3
vgr professional v-181 hair clipper	2
shaving gel bandido 1000 ml	4
vgr professional v-140 hair clipper	2
vgr professional v-104 hair trimmer	3
vgr professional v-182 hair clipper	1
vgr professional v-106 hair shaver	1
kemei km-2299	1
kemei km-2240	1
tijera toni&guy professional	9
crema nivea lata verde	13
crema nivea	9
cateter rosado	5
gillette dorada	70
tijera de corte pulido schirmay	5
tijera de esculpir navaja titanium	9
tijera de entresacar navaja titanium	7
tijera de entresacar ploma gilardon	5
tijera filo de liso dorada schirmay	1
tijera filo de liso negro gilardon	4
tijera filo de liso ploma gilardon	3
papel negro hectografico	54
set peinetas whal	16
set peinetas de colores	2
cuchillas mondi	5
cuchillas	9
pinzas para cabello	5
kit de tijera dragón carbono	5
kit tijeras azul morado	4
kit de tijera KIN	7
kit de tijera con diseño dorada	7
pincel	10
ambientador spray verde	4
ambientador spray blanco	5
ambientador spray limon	6
ambientador spray rojo	7
ambientador spray naranja	2
peine blanco milimetrico	13
navaja barbero	8
guantes blanco flextrap	3
guantes con text Ag ap negro	1
guantes con text Ag ap blanco	9
guantes con text Ag ap morado	7
guantes con text Ag ap naranja	7
guantes con text Ag ap verde	5
cepillo barbero	6
brocha	15
sacudidor azul	13
escobilla	3
canguro	1
polo damas T-S	5
polo damas T-M	4
polo damas T-L	6
polo damas T-XL	1
polo varon T-M	1
polo varon T-L	1
polo varon T-XL	5
chaleco damas T-M	2
chaleco damas T-L	4
chaleco varon T-M	4
chaleco varon T-XL	1
capas barbero	12
capas edicion profesional	5
capas premium profesional	6
capas profesional gruesa	7
cobertor	3
vaselina 500 gr	9
cinta para grip	4
tinta para tatuaje dynamic blanco 1/2 oz 30 ml	7
tinta para tatuaje dynamic negra 1/2 oz 30 ml	13
tinta para tatuaje dynamic negra 8 1/2 oz 240 ml	1
agujas de cartucho spark 1005RM	76
agujas de cartucho spark 1205CM	63
agujas de cartucho spark 1009RM	32
agujas de cartucho spark 1011CM	30
agujas de cartucho spark 1003RL	36
agujas de cartucho spark 1209RL	10
agujas de cartucho spark 1007RL	32
agujas de cartucho spark 1005RL	5
agujas de cartucho blood mod 1003RL	6
agujas de cartucho blood mod 1005RL	22
agujas de cartucho spark 1005CM	10
agujas de cartucho spark 1205M	6
agujas de cartucho spark 1207M	6
aguja maquina pen blood 1007M-1	4
espatula mezcla con paletita	3
gluconato de clorhexidina	1
papel gecko	37
chata rojas	8
papel campo	124
piel sintetica	11
palitos mixer x 100	1
balsamo verde	2
pen soplador	2
caps 11 x 10	134
caps 13 x 11	294
caps	971
baja lengua	10
rasurador	16
kemei KM-2299	5
tijera mundial	4
botapelo basico	4
guia de barbero adulto	5
guia de barbero niños	20"""

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

categories = {
    'Maquinas de Corte (Clippers)': ['MAGIC', 'SENIOR', 'CLIP', 'CLIPPER', 'KEMEY', 'KEMEI', 'WMARK'],
    'Patilleras y Trimmers': ['TRIMMER', 'SLIMLINE', 'PATILLERA'],
    'Afeitadoras (Shavers)': ['SHAVER', 'AFEITADOR', 'RASURADOR'],
    'Tijeras & Navajas': ['CUCHILLA', 'BAJA LENGUA', 'TIJERA', 'NAVAJA', 'GILLETTE'],
    'Pomadas, Ceras y Quimicos': ['CERA', 'GEL', 'ESPUMA', 'DILUENTE', 'CREMA', 'ANESTESIA', 'VASELINA', 'SOLUTION', 'LOCION', 'PERÓXIDO', 'LACA', 'PASTA', 'POMADA', 'FIBERA', 'TALCO', 'SANITIZER', 'SHAVING'],
    'Accesorios & Capas': ['GUANTES', 'PIEL', 'PAPEL', 'FILM', 'CINTA', 'PISETA', 'PLUMON', 'CAPS', 'PARCHE', 'PEINETA', 'APOYA BRAZO', 'PINZAS', 'SAMBLOM', 'BOTAPELO', 'PULVERIZADOR', 'CAPA', 'PEINE', 'CEPILLO', 'BROCHA', 'SACUDIDOR', 'ESCOBILLA', 'GUIA'],
    'Insumos Tattoo & Piercing': ['CATETER', 'PIERCING', 'PIRCING', 'JOYAS', 'COYAR', 'MAQUINA DE TATUAR', 'MAQUINA DE TATUAJE', 'MAQUINA PEN', 'CHATA'],
    'Herramientas y Accesorios': ['AEROGRAFO', 'SECADORA', 'CUBRE GRIP', 'SOMBRERO', 'ESPATULA', 'MIXER', 'PEN'],
    'Agujas y Cartuchos Tattoo': ['AGUJA'],
    'Tintas Tattoo': ['TINTE', 'TINTA', 'DYNAMIC', 'PIGMENTO', 'BLACK'],
    'Ropa y Merchandising': ['VINO', 'POLO', 'CHALECO', 'CANGURO'],
}

def get_category(name):
    name_upper = name.upper()
    for cat, keywords in categories.items():
        for keyword in keywords:
            if keyword in name_upper:
                return cat
    return 'Herramientas y Accesorios'

sql_lines = []
sql_lines.append("-- =========================================================================")
sql_lines.append("-- SCRIPT DE INSERCIÓN: INVENTARIO SEDE HUANCAYO CATEGORIZADO")
sql_lines.append("-- =========================================================================")
sql_lines.append("")

sql_lines.append("INSERT INTO productos (")
sql_lines.append("    id, sku, nombre, slug, categoria_id, descripcion, ")
sql_lines.append("    precio_compra, precio_venta, stock_ica, stock_huancayo, stock_minimo, ")
sql_lines.append("    imagenes, destacado, en_oferta, activo, creado_en, actualizado_en")
sql_lines.append(") VALUES ")

values = []
reader = csv.reader(io.StringIO(data), delimiter='\t')
next(reader) # skip header
index = 1
for row in reader:
    if len(row) != 2:
        continue
    nombre = row[0].strip()
    stock = row[1].strip()
    
    sku = f"HYO-{str(index).zfill(3)}"
    index += 1
    
    slug = slugify(nombre) + "-" + sku.lower()
    descripcion = f"Producto de tienda (Huancayo): {nombre}"
    precio = "0"
    id_val = f"'{uuid.uuid4()}'"
    
    cat_name = get_category(nombre)
    cat_subquery = f"(SELECT id FROM categorias WHERE nombre = '{cat_name}' LIMIT 1)"
    
    v = f"({id_val}, '{sku}', '{nombre}', '{slug}', {cat_subquery}, '{descripcion}', 0, {precio}, 0, {stock}, 0, ARRAY[]::text[], false, false, true, NOW(), NOW())"
    values.append(v)

sql_lines.append(",\n".join(values))
sql_lines.append("ON CONFLICT (sku) DO UPDATE SET ")
sql_lines.append("    nombre = EXCLUDED.nombre,")
sql_lines.append("    categoria_id = EXCLUDED.categoria_id,")
sql_lines.append("    precio_venta = EXCLUDED.precio_venta,")
sql_lines.append("    stock_huancayo = EXCLUDED.stock_huancayo,")
sql_lines.append("    descripcion = EXCLUDED.descripcion;")
sql_lines.append("")

with open("C:/Users/diego/OneDrive/Desktop/sistema-galindo/database/insertar_inventario_huancayo.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print("SQL script generated!")
