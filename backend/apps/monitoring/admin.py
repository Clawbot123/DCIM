from django.contrib import admin
from .models import Alert, MetricData, SNMPDevice


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'severity', 'alert_type', 'status', 'device', 'created_at']
    list_filter = ['severity', 'status', 'alert_type']
    search_fields = ['title', 'message']


@admin.register(MetricData)
class MetricDataAdmin(admin.ModelAdmin):
    list_display = ['device', 'metric_name', 'value', 'timestamp']
    list_filter = ['metric_name']


@admin.register(SNMPDevice)
class SNMPDeviceAdmin(admin.ModelAdmin):
    list_display = ['device', 'ip_address', 'snmp_version', 'enabled', 'last_polled']
