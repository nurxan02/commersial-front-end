from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('odero', 'OderoPay')], default='odero', max_length=32)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='AZN', max_length=8)),
                ('status', models.CharField(choices=[('created', 'Created'), ('pending', 'Pending'), ('authorized', 'Authorized'), ('paid', 'Paid'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='created', max_length=16)),
                ('reference', models.CharField(blank=True, help_text='Provider-side payment reference or transaction id', max_length=128, null=True)),
                ('session_url', models.URLField(blank=True, null=True)),
                ('callback_payload', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='orders.order')),
            ],
        ),
    ]
