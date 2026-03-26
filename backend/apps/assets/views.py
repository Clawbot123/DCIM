from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Manufacturer, DeviceType, Device, Interface
from .serializers import ManufacturerSerializer, DeviceTypeSerializer, DeviceSerializer, InterfaceSerializer


class ManufacturerViewSet(viewsets.ModelViewSet):
    queryset = Manufacturer.objects.all()
    serializer_class = ManufacturerSerializer
    search_fields = ['name']


class DeviceTypeViewSet(viewsets.ModelViewSet):
    queryset = DeviceType.objects.all().select_related('manufacturer')
    serializer_class = DeviceTypeSerializer
    filterset_fields = ['manufacturer', 'device_role']
    search_fields = ['model', 'manufacturer__name']


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all().select_related(
        'device_type__manufacturer', 'rack__row__room__datacenter'
    ).prefetch_related('interfaces')
    serializer_class = DeviceSerializer
    filterset_fields = ['status', 'rack', 'rack__row__room', 'rack__row__room__datacenter',
                        'device_type__device_role', 'device_type__manufacturer']
    search_fields = ['name', 'serial_number', 'asset_tag', 'hostname', 'ip_address']
    ordering_fields = ['name', 'status', 'created_at']

    @action(detail=False, methods=['get'])
    def summary(self, request):
        total = Device.objects.count()
        by_status = {}
        for choice in Device.STATUS_CHOICES:
            by_status[choice[0]] = Device.objects.filter(status=choice[0]).count()
        by_role = {}
        from .models import DeviceType
        for choice in DeviceType.ROLE_CHOICES:
            by_role[choice[0]] = Device.objects.filter(device_type__device_role=choice[0]).count()
        return Response({
            'total': total,
            'by_status': by_status,
            'by_role': by_role,
        })


class InterfaceViewSet(viewsets.ModelViewSet):
    queryset = Interface.objects.all().select_related('device')
    serializer_class = InterfaceSerializer
    filterset_fields = ['device', 'interface_type', 'enabled']
    search_fields = ['name', 'mac_address', 'ip_address']
