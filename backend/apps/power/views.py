from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PowerPanel, PowerFeed, PDU, PowerOutlet
from .serializers import PowerPanelSerializer, PowerFeedSerializer, PDUSerializer, PowerOutletSerializer


class PowerPanelViewSet(viewsets.ModelViewSet):
    queryset = PowerPanel.objects.all().select_related('datacenter')
    serializer_class = PowerPanelSerializer
    filterset_fields = ['datacenter']
    search_fields = ['name']


class PowerFeedViewSet(viewsets.ModelViewSet):
    queryset = PowerFeed.objects.all().select_related('power_panel', 'rack')
    serializer_class = PowerFeedSerializer
    filterset_fields = ['power_panel', 'rack', 'status', 'phase']
    search_fields = ['name']


class PDUViewSet(viewsets.ModelViewSet):
    queryset = PDU.objects.all().select_related('device', 'power_feed').prefetch_related('outlets')
    serializer_class = PDUSerializer
    filterset_fields = ['pdu_type', 'power_feed']

    @action(detail=True, methods=['get'])
    def power_map(self, request, pk=None):
        pdu = self.get_object()
        outlets = pdu.outlets.select_related('connected_device').all()
        data = {
            'pdu': self.get_serializer(pdu).data,
            'outlets': PowerOutletSerializer(outlets, many=True).data,
        }
        return Response(data)


class PowerOutletViewSet(viewsets.ModelViewSet):
    queryset = PowerOutlet.objects.all().select_related('pdu', 'connected_device')
    serializer_class = PowerOutletSerializer
    filterset_fields = ['pdu', 'connected_device', 'enabled']
