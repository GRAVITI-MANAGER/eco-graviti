"""
Agrega published_data a WebsiteConfig para separación draft/publish.

- published_data: snapshot congelado de todos los datos al momento de publicar
- Los campos existentes (content_data, theme_data, etc.) son siempre el "borrador"
- Data migration: para sitios ya publicados, copia datos actuales a published_data
"""

from django.db import migrations, models


def populate_published_data(apps, schema_editor):
    """Para sitios ya publicados, copiar datos actuales como snapshot."""
    WebsiteConfig = apps.get_model('websites', 'WebsiteConfig')

    for config in WebsiteConfig.objects.filter(status='published'):
        config.published_data = {
            'content_data': config.content_data or {},
            'theme_data': config.theme_data or {},
            'pages_data': config.pages_data or {},
            'seo_data': config.seo_data or {},
            'media_data': config.media_data or {},
        }
        config.save(update_fields=['published_data'])


def reverse_migration(apps, schema_editor):
    """Limpia published_data."""
    WebsiteConfig = apps.get_model('websites', 'WebsiteConfig')
    WebsiteConfig.objects.all().update(published_data={})


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0013_add_pages_data'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteconfig',
            name='published_data',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Snapshot de todos los datos al momento de publicar',
                verbose_name='Datos publicados',
            ),
        ),
        migrations.RunPython(populate_published_data, reverse_migration),
    ]
