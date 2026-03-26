from django.db import models


class PowerPanel(models.Model):
    datacenter = models.ForeignKey('locations.DataCenter', on_delete=models.CASCADE, related_name='power_panels')
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True)
    incoming_power_kw = models.FloatField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['datacenter', 'name']
        unique_together = [['datacenter', 'name']]

    def __str__(self):
        return f'{self.datacenter.code} / {self.name}'


class PowerFeed(models.Model):
    SUPPLY_CHOICES = [
        ('ac', 'AC'),
        ('dc', 'DC'),
    ]
    PHASE_CHOICES = [
        ('single-phase', 'Single Phase'),
        ('three-phase', 'Three Phase'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('planned', 'Planned'),
        ('failed', 'Failed'),
        ('offline', 'Offline'),
    ]
    power_panel = models.ForeignKey(PowerPanel, on_delete=models.CASCADE, related_name='feeds')
    rack = models.ForeignKey('locations.Rack', on_delete=models.SET_NULL, null=True, blank=True, related_name='power_feeds')
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    supply = models.CharField(max_length=10, choices=SUPPLY_CHOICES, default='ac')
    phase = models.CharField(max_length=20, choices=PHASE_CHOICES, default='single-phase')
    voltage = models.PositiveSmallIntegerField(default=208)
    amperage = models.PositiveSmallIntegerField(default=30)
    max_utilization = models.FloatField(default=80, help_text='Max utilization percentage')
    is_redundant = models.BooleanField(default=False)
    redundant_feed = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    comments = models.TextField(blank=True)

    class Meta:
        ordering = ['power_panel', 'name']

    def __str__(self):
        return f'{self.power_panel.name} / {self.name}'

    @property
    def capacity_kw(self):
        return (self.voltage * self.amperage * (1.732 if self.phase == 'three-phase' else 1)) / 1000


class PDU(models.Model):
    TYPE_CHOICES = [
        ('basic', 'Basic'),
        ('metered', 'Metered'),
        ('switched', 'Switched'),
        ('monitored', 'Monitored'),
        ('smart', 'Smart'),
    ]
    device = models.OneToOneField('assets.Device', on_delete=models.CASCADE, related_name='pdu_info')
    power_feed = models.ForeignKey(PowerFeed, on_delete=models.SET_NULL, null=True, blank=True, related_name='pdus')
    pdu_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='basic')
    outlets_count = models.PositiveSmallIntegerField(default=16)
    max_amperage = models.FloatField(default=20)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    inlet_type = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f'PDU: {self.device.name}'


class PowerOutlet(models.Model):
    OUTLET_TYPE_CHOICES = [
        ('nema-5-15r', 'NEMA 5-15R'),
        ('nema-5-20r', 'NEMA 5-20R'),
        ('nema-l5-20r', 'NEMA L5-20R'),
        ('nema-l5-30r', 'NEMA L5-30R'),
        ('nema-l6-20r', 'NEMA L6-20R'),
        ('iec-60320-c13', 'IEC 60320 C13'),
        ('iec-60320-c19', 'IEC 60320 C19'),
        ('other', 'Other'),
    ]
    pdu = models.ForeignKey(PDU, on_delete=models.CASCADE, related_name='outlets')
    name = models.CharField(max_length=20)
    outlet_type = models.CharField(max_length=30, choices=OUTLET_TYPE_CHOICES, default='iec-60320-c13')
    connected_device = models.ForeignKey('assets.Device', on_delete=models.SET_NULL, null=True, blank=True,
                                          related_name='power_outlets')
    power_draw_w = models.FloatField(default=0, help_text='Current power draw in watts')
    feed_leg = models.CharField(max_length=5, choices=[('A', 'A'), ('B', 'B'), ('C', 'C')], blank=True)
    enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = [['pdu', 'name']]

    def __str__(self):
        return f'{self.pdu.device.name} / {self.name}'
