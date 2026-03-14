"""
Agrega pages_data a WebsiteConfig para arquitectura multi-página.

Migra datos existentes:
- content_data + enabled_pages → pages_data con estructura:
  {
    "global": { "sections": ["header", "footer"], "content": {...} },
    "pages": [
      { "id": "home", "slug": "/", "name": "Inicio", "order": 0,
        "sections": ["hero", ...], "content": {...}, "seo": {} },
      { "id": "about", "slug": "/nosotros", "name": "Nosotros", ... }
    ]
  }
"""

from django.db import migrations, models


# Mapeo de section ID → nombre de página y slug
PAGE_META = {
    'home':         {'name': 'Inicio',              'slug': '/'},
    'hero':         {'name': 'Inicio',              'slug': '/'},
    'about':        {'name': 'Nosotros',            'slug': '/nosotros'},
    'services':     {'name': 'Servicios',           'slug': '/servicios'},
    'products':     {'name': 'Productos',           'slug': '/productos'},
    'pricing':      {'name': 'Precios',             'slug': '/precios'},
    'gallery':      {'name': 'Galería',             'slug': '/galeria'},
    'testimonials': {'name': 'Testimonios',         'slug': '/testimonios'},
    'team':         {'name': 'Equipo',              'slug': '/equipo'},
    'blog':         {'name': 'Blog',                'slug': '/blog'},
    'faq':          {'name': 'Preguntas frecuentes','slug': '/faq'},
    'contact':      {'name': 'Contacto',            'slug': '/contacto'},
}

# Secciones que siempre van en global (aparecen en todas las páginas)
GLOBAL_SECTIONS = {'header', 'footer'}

# Secciones que pertenecen a Home por defecto
HOME_SECTIONS = {'hero', 'features', 'stats', 'highlights', 'cta'}


def migrate_to_pages_data(apps, schema_editor):
    """Convierte content_data + enabled_pages → pages_data."""
    WebsiteConfig = apps.get_model('websites', 'WebsiteConfig')

    for config in WebsiteConfig.objects.all():
        content = config.content_data or {}
        enabled = config.enabled_pages or []

        # Extraer contenido global
        global_content = {}
        for sec in GLOBAL_SECTIONS:
            if sec in content:
                global_content[sec] = content[sec]

        # Construir página Home con secciones no globales y no de otras páginas
        # Las secciones "de página" son las de enabled_pages
        page_section_ids = set(enabled)  # ["about", "services", "faq", ...]

        # Secciones que van a Home: todo lo que no es global ni es una "página" propia
        home_section_ids = [
            s for s in content.keys()
            if s not in GLOBAL_SECTIONS and s not in page_section_ids
            and not s.startswith('_')
        ]

        home_content = {s: content[s] for s in home_section_ids if s in content}

        pages = [
            {
                'id': 'home',
                'slug': '/',
                'name': 'Inicio',
                'order': 0,
                'sections': home_section_ids,
                'content': home_content,
                'seo': {},
            }
        ]

        # Crear una página por cada sección habilitada
        for order, section_id in enumerate(enabled, start=1):
            if section_id in GLOBAL_SECTIONS:
                continue
            meta = PAGE_META.get(section_id, {
                'name': section_id.replace('_', ' ').title(),
                'slug': f'/{section_id}',
            })
            sec_content = {}
            if section_id in content:
                sec_content[section_id] = content[section_id]

            pages.append({
                'id': section_id,
                'slug': meta['slug'],
                'name': meta['name'],
                'order': order,
                'sections': [section_id],
                'content': sec_content,
                'seo': {},
            })

        config.pages_data = {
            'global': {
                'sections': list(GLOBAL_SECTIONS & set(content.keys())),
                'content': global_content,
            },
            'pages': pages,
        }
        config.save(update_fields=['pages_data'])


def reverse_migration(apps, schema_editor):
    """Limpia pages_data (la reversión mantiene content_data intacto)."""
    WebsiteConfig = apps.get_model('websites', 'WebsiteConfig')
    WebsiteConfig.objects.all().update(pages_data={})


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0012_update_sections_to_pages_text'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteconfig',
            name='pages_data',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Estructura multi-página: global (header/footer) + páginas con sus secciones',
                verbose_name='Estructura de páginas',
            ),
        ),
        migrations.RunPython(migrate_to_pages_data, reverse_migration),
    ]