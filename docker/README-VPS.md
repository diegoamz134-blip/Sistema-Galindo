# Guía de Despliegue en VPS - Sistema Galindo (Ica, Perú)

Esta guía explica cómo levantar todo el sistema (Base de Datos PostgreSQL, Supabase Self-Hosted, API y la Aplicación Web Next.js) en cualquier servidor VPS (Hetzner, Contabo, DigitalOcean, AWS Lightsail, etc.) con Ubuntu Server.

---

## 1. Requisitos Recomendados del VPS
* **Sistema Operativo:** Ubuntu 22.04 LTS o 24.04 LTS
* **RAM mínima:** 4 GB de RAM (recomendado 4 GB a 8 GB para Docker + Supabase Studio holgado)
* **Disco:** 40 GB SSD / NVMe
* **Puertos abiertos en Firewall:** 80 (HTTP), 443 (HTTPS), 22 (SSH)

---

## 2. Paso 1: Instalar Docker y Docker Compose en el VPS
Conéctate por SSH a tu VPS y ejecuta:

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker y Docker Compose
sudo apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx

# Iniciar y habilitar Docker
sudo systemctl enable --now docker
```

---

## 3. Paso 2: Subir el Proyecto al VPS
Clona tu repositorio en el VPS o sube los archivos a `/var/www/sistema-galindo`:

```bash
cd /var/www/sistema-galindo
cp .env.example .env
```

Edita el archivo `.env` con tus contraseñas seguras y tus datos de Ica:
```bash
nano .env
```

---

## 4. Paso 3: Levantar los Contenedores
Dentro de la carpeta `docker/`, ejecuta:

```bash
cd docker
docker-compose up -d --build
```

Esto levantará automáticamente en segundo plano:
1. `galindo-db` (PostgreSQL con todo el esquema de tablas ya inicializado desde `database/schema.sql`)
2. `galindo-studio` (Panel visual de Supabase en el puerto 3001)
3. `galindo-rest` (API REST automática)
4. `galindo-web` (La tienda y el panel de Galindo en el puerto 3000)

Puedes verificar el estado con:
```bash
docker-compose ps
```

---

## 5. Paso 4: Configurar Nginx y Dominio con SSL (HTTPS)
Copia la configuración de Nginx:

```bash
sudo cp docker/nginx.conf /etc/nginx/sites-available/galindo.conf
sudo ln -s /etc/nginx/sites-available/galindo.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Para activar el candadito verde (SSL gratuito) con tu dominio:
```bash
sudo certbot --nginx -d tudominio.pe -d www.tudominio.pe
```

---

## 6. Backups Automáticos de la Base de Datos
Para programar una copia de seguridad diaria de la base de datos a las 2:00 AM:

```bash
crontab -e
```
Agrega al final:
```bash
0 2 * * * docker exec -t galindo-db pg_dumpall -c -U postgres | gzip > /var/backups/galindo_$(date +\%F).sql.gz
```
Listo. Tus datos de alumnos, ventas y caja chica estarán 100% protegidos en tu propio servidor.
