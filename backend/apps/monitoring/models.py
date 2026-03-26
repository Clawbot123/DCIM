from django.db import models


class Alert(models.Model):
    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('warning', 'Warning'),
        ('info', 'Info'),
    ]
    TYPE_CHOICES = [
        ('temperature', 'Temperature'),
        ('power', 'Power'),
        ('connectivity', 'Connectivity'),
        ('capacity', 'Capacity'),
        ('hardware', 'Hardware'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]
    alert_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='other')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    title = models.CharField(max_length=200)
    message = models.TextField()
    device = models.ForeignKey('assets.Device', on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    rack = models.ForeignKey('locations.Rack', on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    room = models.ForeignKey('locations.Room', on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    acknowledged_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.severity.upper()}] {self.title}'


class MetricData(models.Model):
    METRIC_CHOICES = [
        ('cpu_util', 'CPU Utilization'),
        ('mem_util', 'Memory Utilization'),
        ('power_draw', 'Power Draw (W)'),
        ('temperature', 'Temperature (°C)'),
        ('bandwidth_in', 'Bandwidth In (Mbps)'),
        ('bandwidth_out', 'Bandwidth Out (Mbps)'),
        ('disk_util', 'Disk Utilization'),
        ('fan_speed', 'Fan Speed (RPM)'),
    ]
    device = models.ForeignKey('assets.Device', on_delete=models.CASCADE, related_name='metrics')
    metric_name = models.CharField(max_length=30, choices=METRIC_CHOICES)
    value = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', 'metric_name', 'timestamp']),
        ]


class SNMPDevice(models.Model):
    VERSION_CHOICES = [
        ('v1', 'SNMPv1'),
        ('v2c', 'SNMPv2c'),
        ('v3', 'SNMPv3'),
    ]
    device = models.OneToOneField('assets.Device', on_delete=models.CASCADE, related_name='snmp_config')
    ip_address = models.GenericIPAddressField()
    port = models.PositiveSmallIntegerField(default=161)
    snmp_version = models.CharField(max_length=5, choices=VERSION_CHOICES, default='v2c')
    community = models.CharField(max_length=100, default='public')
    enabled = models.BooleanField(default=True)
    last_polled = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'SNMP: {self.device.name} ({self.ip_address})'
