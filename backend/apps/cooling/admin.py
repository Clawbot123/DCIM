from django.contrib import admin
from .models import CoolingUnit, TemperatureSensor, HumidityReading


@admin.register(CoolingUnit)
class CoolingUnitAdmin(admin.ModelAdmin):
    list_display = ['name', 'room', 'unit_type', 'status', 'cooling_capacity_kw']
    list_filter = ['unit_type', 'status']


@admin.register(TemperatureSensor)
class TemperatureSensorAdmin(admin.ModelAdmin):
    list_display = ['name', 'rack', 'room', 'current_temp_c', 'threshold_high_c']


@admin.register(HumidityReading)
class HumidityReadingAdmin(admin.ModelAdmin):
    list_display = ['room', 'current_rh', 'timestamp']
