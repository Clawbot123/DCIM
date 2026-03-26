from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Cable(models.Model):
    TYPE_CHOICES = [
        ('cat5e', 'CAT5e'),
        ('cat6', 'CAT6'),
        ('cat6a', 'CAT6A'),
        ('cat8', 'CAT8'),
        ('mmf', 'Multimode Fiber'),
        ('smf', 'Single-Mode Fiber'),
        ('dac', 'DAC (Direct Attach)'),
        ('power-c13-c14', 'Power C13-C14'),
        ('power-c19-c20', 'Power C19-C20'),
        ('power-nema', 'Power NEMA'),
        ('console', 'Console'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('connected', 'Connected'),
        ('planned', 'Planned'),
        ('decommissioned', 'Decommissioned'),
    ]
    # Termination A
    termination_a_type = models.ForeignKey(ContentType, on_delete=models.PROTECT,
                                            related_name='cable_termination_a', null=True)
    termination_a_id = models.PositiveBigIntegerField(null=True)
    termination_a = GenericForeignKey('termination_a_type', 'termination_a_id')

    # Termination B
    termination_b_type = models.ForeignKey(ContentType, on_delete=models.PROTECT,
                                            related_name='cable_termination_b', null=True)
    termination_b_id = models.PositiveBigIntegerField(null=True)
    termination_b = GenericForeignKey('termination_b_type', 'termination_b_id')

    cable_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='cat6')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='connected')
    color = models.CharField(max_length=7, default='#3b82f6', help_text='Hex color')
    length = models.FloatField(null=True, blank=True, help_text='Cable length in meters')
    label = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['cable_type', 'label']

    def __str__(self):
        return f'Cable {self.label or self.id} ({self.cable_type})'


class PatchPanel(models.Model):
    device = models.OneToOneField('assets.Device', on_delete=models.CASCADE, related_name='patch_panel_info')
    port_count = models.PositiveSmallIntegerField(default=24)
    port_type = models.CharField(max_length=30, default='rj45')

    def __str__(self):
        return f'PatchPanel: {self.device.name}'


class PatchPanelPort(models.Model):
    patch_panel = models.ForeignKey(PatchPanel, on_delete=models.CASCADE, related_name='ports')
    name = models.CharField(max_length=20)
    rear_port_position = models.PositiveSmallIntegerField(default=1)

    class Meta:
        unique_together = [['patch_panel', 'name']]

    def __str__(self):
        return f'{self.patch_panel.device.name} / {self.name}'
