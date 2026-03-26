from rest_framework import viewsets
from .models import Cable, PatchPanel, PatchPanelPort
from .serializers import CableSerializer, PatchPanelSerializer, PatchPanelPortSerializer


class CableViewSet(viewsets.ModelViewSet):
    queryset = Cable.objects.all()
    serializer_class = CableSerializer
    filterset_fields = ['cable_type', 'status']
    search_fields = ['label', 'description']


class PatchPanelViewSet(viewsets.ModelViewSet):
    queryset = PatchPanel.objects.all().select_related('device').prefetch_related('ports')
    serializer_class = PatchPanelSerializer


class PatchPanelPortViewSet(viewsets.ModelViewSet):
    queryset = PatchPanelPort.objects.all().select_related('patch_panel__device')
    serializer_class = PatchPanelPortSerializer
    filterset_fields = ['patch_panel']
