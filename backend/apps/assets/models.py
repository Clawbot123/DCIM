from django.db import models


class Manufacturer(models.Model):
    name = models.CharField(max_length=100, unique=True)
    website = models.URLField(blank=True)
    support_phone = models.CharField(max_length=20, blank=True)
    support_email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to='manufacturers/', blank=True, null=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class DeviceType(models.Model):
    ROLE_CHOICES = [
        ('server', 'Server'),
        ('switch', 'Network Switch'),
        ('router', 'Router'),
        ('firewall', 'Firewall'),
        ('pdu', 'PDU'),
        ('ups', 'UPS'),
        ('patch_panel', 'Patch Panel'),
        ('kvm', 'KVM'),
        ('storage', 'Storage'),
        ('tape', 'Tape Library'),
        ('console', 'Console Server'),
        ('load_balancer', 'Load Balancer'),
        ('other', 'Other'),
    ]
    manufacturer = models.ForeignKey(Manufacturer, on_delete=models.PROTECT, related_name='device_types')
    model = models.CharField(max_length=100)
    device_role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='server')
    u_height = models.PositiveSmallIntegerField(default=1)
    is_full_depth = models.BooleanField(default=True)
    width_mm = models.FloatField(default=482.6, help_text='Device width in mm (standard 19" = 482.6mm)')
    depth_mm = models.FloatField(default=400.0, help_text='Device depth in mm')
    power_draw_w = models.FloatField(default=0, help_text='Typical power draw in watts')
    max_power_draw_w = models.FloatField(default=0)
    weight_kg = models.FloatField(default=0)
    front_image = models.ImageField(upload_to='device_types/front/', blank=True, null=True)
    rear_image = models.ImageField(upload_to='device_types/rear/', blank=True, null=True)
    color = models.CharField(max_length=7, default='#6b7280', help_text='Hex color for visualization')
    airflow = models.CharField(max_length=20, choices=[
        ('front-to-rear', 'Front to Rear'),
        ('rear-to-front', 'Rear to Front'),
        ('passive', 'Passive'),
        ('side', 'Side'),
    ], default='front-to-rear')
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['manufacturer', 'model']
        unique_together = [['manufacturer', 'model']]

    def __str__(self):
        return f'{self.manufacturer.name} {self.model}'


class Device(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('planned', 'Planned'),
        ('staged', 'Staged'),
        ('failed', 'Failed'),
        ('decommissioning', 'Decommissioning'),
        ('offline', 'Offline'),
    ]
    FACE_CHOICES = [
        ('front', 'Front'),
        ('rear', 'Rear'),
    ]
    name = models.CharField(max_length=100)
    device_type = models.ForeignKey(DeviceType, on_delete=models.PROTECT, related_name='devices')
    rack = models.ForeignKey('locations.Rack', on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    position_u = models.PositiveSmallIntegerField(null=True, blank=True, help_text='Lowest U position (1-indexed from bottom)')
    face = models.CharField(max_length=10, choices=FACE_CHOICES, default='front')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    serial_number = models.CharField(max_length=100, blank=True)
    asset_tag = models.CharField(max_length=50, blank=True, unique=True, null=True)
    hostname = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    management_ip = models.GenericIPAddressField(null=True, blank=True)
    os = models.CharField(max_length=100, blank=True, verbose_name='Operating System')
    cpu_cores = models.PositiveSmallIntegerField(null=True, blank=True)
    ram_gb = models.FloatField(null=True, blank=True)
    storage_tb = models.FloatField(null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    warranty_expires = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    vendor_order_number = models.CharField(max_length=100, blank=True)
    front_image = models.ImageField(upload_to='devices/front/', blank=True, null=True)
    rear_image  = models.ImageField(upload_to='devices/rear/',  blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def location_display(self):
        if self.rack:
            r = self.rack
            return f'{r.row.room.datacenter.code} / {r.row.room.name} / {r.name}'
        return 'Unracked'


class Interface(models.Model):
    TYPE_CHOICES = [
        ('1000base-t', '1000BASE-T (1GE)'),
        ('10gbase-t', '10GBASE-T (10GE)'),
        ('25gbase-x-sfp28', 'SFP28 (25GE)'),
        ('40gbase-x-qsfpp', 'QSFP+ (40GE)'),
        ('100gbase-x-qsfp28', 'QSFP28 (100GE)'),
        ('sfp', 'SFP (1GE Optical)'),
        ('fiber-lc', 'Fiber (LC)'),
        ('fiber-sc', 'Fiber (SC)'),
        ('console', 'Console'),
        ('mgmt', 'Management'),
        ('power', 'Power'),
        ('virtual', 'Virtual'),
        ('other', 'Other'),
    ]
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='interfaces')
    name = models.CharField(max_length=50)
    interface_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='1000base-t')
    mac_address = models.CharField(max_length=17, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    enabled = models.BooleanField(default=True)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = [['device', 'name']]

    def __str__(self):
        return f'{self.device.name} - {self.name}'
