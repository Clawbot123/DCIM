from django.db import models


class DataCenter(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    total_power_kw = models.FloatField(default=0)
    total_cooling_tons = models.FloatField(default=0)
    pue = models.FloatField(default=1.5, help_text='Power Usage Effectiveness')
    contact_name = models.CharField(max_length=100, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'

    @property
    def total_racks(self):
        return Rack.objects.filter(row__room__datacenter=self).count()

    @property
    def rooms_count(self):
        return self.rooms.count()


class Room(models.Model):
    ROOM_TYPE_CHOICES = [
        ('server', 'Server Room'),
        ('network', 'Network Room'),
        ('storage', 'Storage Room'),
        ('idf', 'IDF (Intermediate Distribution Frame)'),
        ('mdf', 'MDF (Main Distribution Frame)'),
        ('colocation', 'Colocation'),
        ('mixed', 'Mixed'),
    ]
    datacenter = models.ForeignKey(DataCenter, on_delete=models.CASCADE, related_name='rooms')
    name = models.CharField(max_length=100)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='server')
    width = models.FloatField(default=20, help_text='Width in meters')
    height = models.FloatField(default=20, help_text='Height (depth) in meters')
    floor_number = models.IntegerField(default=1)
    raised_floor = models.BooleanField(default=True)
    raised_floor_height = models.FloatField(default=0.6, help_text='Raised floor height in meters')
    max_power_kw = models.FloatField(default=0)
    max_cooling_tons = models.FloatField(default=0)
    doors = models.JSONField(default=list, blank=True,
        help_text='[{wall:"top"|"bottom"|"left"|"right", position:float, width:float}]')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['datacenter', 'name']
        unique_together = [['datacenter', 'name']]

    def __str__(self):
        return f'{self.datacenter.code} / {self.name}'

    @property
    def total_racks(self):
        return Rack.objects.filter(row__room=self).count()


class Row(models.Model):
    ORIENTATION_CHOICES = [
        ('horizontal', 'Horizontal'),
        ('vertical', 'Vertical'),
    ]
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='rows')
    name = models.CharField(max_length=50)
    orientation = models.CharField(max_length=20, choices=ORIENTATION_CHOICES, default='horizontal')
    position_x = models.FloatField(default=0, help_text='X position on floor plan in meters')
    position_y = models.FloatField(default=0, help_text='Y position on floor plan in meters')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['room', 'name']
        unique_together = [['room', 'name']]

    def __str__(self):
        return f'{self.room} / Row {self.name}'


class Rack(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('planned', 'Planned'),
        ('reserved', 'Reserved'),
        ('decommissioned', 'Decommissioned'),
    ]
    row = models.ForeignKey(Row, on_delete=models.CASCADE, related_name='racks')
    name = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    u_height = models.PositiveIntegerField(default=42, help_text='Total rack height in U')
    width = models.FloatField(default=0.6, help_text='Width in meters')
    depth = models.FloatField(default=1.0, help_text='Depth in meters')
    max_weight_kg = models.FloatField(default=1000)
    max_power_kw = models.FloatField(default=20)
    position_x = models.FloatField(default=0, help_text='X position in row (meters)')
    position_y = models.FloatField(default=0, help_text='Y position on floor plan')
    serial_number = models.CharField(max_length=100, blank=True)
    asset_tag = models.CharField(max_length=50, blank=True)
    manufacturer = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['row', 'name']
        unique_together = [['row', 'name']]

    def __str__(self):
        return f'{self.row.room.datacenter.code} / {self.row.room.name} / {self.row.name} / {self.name}'

    @property
    def used_u(self):
        from apps.assets.models import Device
        # Count unique U positions (front+rear at same slot = 1 used U, not 2)
        occupied = set()
        for device in Device.objects.filter(rack=self, position_u__isnull=False).select_related('device_type'):
            for u in range(device.position_u, device.position_u + device.device_type.u_height):
                occupied.add(u)
        return len(occupied)

    @property
    def free_u(self):
        return max(self.u_height - self.used_u, 0)

    @property
    def utilization_percent(self):
        if self.u_height == 0:
            return 0
        return min(round((self.used_u / self.u_height) * 100, 1), 100.0)
