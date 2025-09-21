from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0002_sitesettings_home_hero_subtitle_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='distance_sale_pdf',
            field=models.FileField(upload_to='legal/', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='delivery_returns_pdf',
            field=models.FileField(upload_to='legal/', null=True, blank=True),
        ),
    ]
