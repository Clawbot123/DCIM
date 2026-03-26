from rest_framework import viewsets
from .models import CoolingUnit, TemperatureSensor, HumidityReading
from .serializers import CoolingUnitSerializer, TemperatureSensorSerializer, HumidityReadingSerializer


class CoolingUnitViewSet(viewsets.ModelViewSet):
    queryset = CoolingUnit.objects.all().select_related('room__datacenter')
    serializer_class = CoolingUnitSerializer
    filterset_fields = ['room', 'unit_type', 'status']
    search_fields = ['name', 'manufacturer', 'model']


class TemperatureSensorViewSet(viewsets.ModelViewSet):
    queryset = TemperatureSensor.objects.all().select_related('room', 'rack')
    serializer_class = TemperatureSensorSerializer
    filterset_fields = ['room', 'rack', 'location_type']
    search_fields = ['name']


class HumidityReadingViewSet(viewsets.ModelViewSet):
    queryset = HumidityReading.objects.all().select_related('room')
    serializer_class = HumidityReadingSerializer
    filterset_fields = ['room']
