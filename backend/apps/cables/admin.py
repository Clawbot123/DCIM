from django.contrib import admin
from .models import Cable, PatchPanel, PatchPanelPort


@admin.register(Cable)
class CableAdmin(admin.ModelAdmin):
    list_display = ['label', 'cable_type', 'status', 'color', 'length']
    list_filter = ['cable_type', 'status']


@admin.register(PatchPanel)
class PatchPanelAdmin(admin.ModelAdmin):
    list_display = ['device', 'port_count', 'port_type']


@admin.register(PatchPanelPort)
class PatchPanelPortAdmin(admin.ModelAdmin):
    list_display = ['name', 'patch_panel']
