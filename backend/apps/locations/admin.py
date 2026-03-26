from django.contrib import admin
from .models import DataCenter, Room, Row, Rack


@admin.register(DataCenter)
class DataCenterAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'city', 'country', 'total_power_kw', 'pue']
    list_filter = ['city', 'country']
    search_fields = ['name', 'code']


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'datacenter', 'room_type', 'floor_number', 'max_power_kw']
    list_filter = ['datacenter', 'room_type']


@admin.register(Row)
class RowAdmin(admin.ModelAdmin):
    list_display = ['name', 'room', 'orientation']
    list_filter = ['room__datacenter', 'orientation']


@admin.register(Rack)
class RackAdmin(admin.ModelAdmin):
    list_display = ['name', 'row', 'status', 'u_height', 'max_power_kw']
    list_filter = ['status', 'row__room__datacenter']
    search_fields = ['name', 'serial_number', 'asset_tag']
