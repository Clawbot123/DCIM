from django.db import models


class CoolingUnit(models.Model):
    TYPE_CHOICES = [
        ('crac', 'CRAC (Computer Room Air Conditioner)'),
        ('crah', 'CRAH (Computer Room Air Handler)'),
        ('in-row', 'In-Row Cooling'),
        ('overhead', 'Overhead Cooling'),
        ('rear-door', 'Rear Door Heat Exchanger'),
        ('chiller', 'Chiller'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('standby', 'Standby'),
        ('maintenance', 'Maintenance'),
        ('offline', 'Offline'),
    ]
    room = models.ForeignKey('locations.Room', on_delete=models.CASCADE, related_name='cooling_units')
    name = models.CharField(max_length=100)
    unit_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='crac')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    manufacturer = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    cooling_capacity_kw = models.FloatField(default=0, help_text='Cooling capacity in kW')
    cooling_capacity_tons = models.FloatField(default=0, help_text='Cooling capacity in tons')
    power_draw_kw = models.FloatField(default=0)
    airflow_cfm = models.FloatField(default=0, help_text='Airflow in CFM')
    supply_temp_c = models.FloatField(default=16, help_text='Supply air temperature in Celsius')
    return_temp_c = models.FloatField(default=24, help_text='Return air temperature in Celsius')
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    install_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['room', 'name']

    def __str__(self):
        return f'{self.room.name} / {self.name}'


class TemperatureSensor(models.Model):
    LOCATION_TYPE_CHOICES = [
        ('rack-front', 'Rack Front'),
        ('rack-rear', 'Rack Rear'),
        ('rack-top', 'Rack Top'),
        ('room', 'Room'),
        ('cooling-supply', 'Cooling Supply'),
        ('cooling-return', 'Cooling Return'),
    ]
    room = models.ForeignKey('locations.Room', on_delete=models.SET_NULL, null=True, blank=True, related_name='temp_sensors')
    rack = models.ForeignKey('locations.Rack', on_delete=models.SET_NULL, null=True, blank=True, related_name='temp_sensors')
    name = models.CharField(max_length=100)
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES, default='rack-front')
    current_temp_c = models.FloatField(default=0)
    threshold_high_c = models.FloatField(default=30)
    threshold_critical_c = models.FloatField(default=35)
    threshold_low_c = models.FloatField(default=15)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.name} ({self.current_temp_c}°C)'

    @property
    def status(self):
        if self.current_temp_c >= self.threshold_critical_c:
            return 'critical'
        elif self.current_temp_c >= self.threshold_high_c:
            return 'warning'
        elif self.current_temp_c <= self.threshold_low_c:
            return 'low'
        return 'ok'


class HumidityReading(models.Model):
    room = models.ForeignKey('locations.Room', on_delete=models.CASCADE, related_name='humidity_readings')
    current_rh = models.FloatField(help_text='Relative humidity %')
    threshold_high = models.FloatField(default=70)
    threshold_low = models.FloatField(default=40)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        get_latest_by = 'timestamp'
