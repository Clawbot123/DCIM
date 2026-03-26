from django.contrib import admin
from .models import Manufacturer, DeviceType, Device, Interface


@admin.register(Manufacturer)
class ManufacturerAdmin(admin.ModelAdmin):
    list_display = ['name', 'website', 'support_email']
    search_fields = ['name']


@admin.register(DeviceType)
class DeviceTypeAdmin(admin.ModelAdmin):
    list_display = ['manufacturer', 'model', 'device_role', 'u_height', 'power_draw_w']
    list_filter = ['manufacturer', 'device_role']
    search_fields = ['model', 'manufacturer__name']


class InterfaceInline(admin.TabularInline):
    model = Interface
    extra = 0


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['name', 'device_type', 'rack', 'position_u', 'status']
    list_filter = ['status', 'device_type__device_role', 'rack__row__room__datacenter']
    search_fields = ['name', 'serial_number', 'asset_tag', 'hostname']
    inlines = [InterfaceInline]
