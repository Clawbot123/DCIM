from django.contrib import admin
from .models import PowerPanel, PowerFeed, PDU, PowerOutlet


@admin.register(PowerPanel)
class PowerPanelAdmin(admin.ModelAdmin):
    list_display = ['name', 'datacenter', 'incoming_power_kw']
    list_filter = ['datacenter']


@admin.register(PowerFeed)
class PowerFeedAdmin(admin.ModelAdmin):
    list_display = ['name', 'power_panel', 'rack', 'status', 'voltage', 'amperage']
    list_filter = ['status', 'phase']


@admin.register(PDU)
class PDUAdmin(admin.ModelAdmin):
    list_display = ['device', 'pdu_type', 'outlets_count', 'power_feed']


@admin.register(PowerOutlet)
class PowerOutletAdmin(admin.ModelAdmin):
    list_display = ['name', 'pdu', 'outlet_type', 'connected_device', 'power_draw_w']
