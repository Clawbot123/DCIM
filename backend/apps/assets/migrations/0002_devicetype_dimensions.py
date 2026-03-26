from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assets', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='devicetype',
            name='width_mm',
            field=models.FloatField(default=482.6, help_text='Device width in mm (standard 19" = 482.6mm)'),
        ),
        migrations.AddField(
            model_name='devicetype',
            name='depth_mm',
            field=models.FloatField(default=400.0, help_text='Device depth in mm'),
        ),
    ]
