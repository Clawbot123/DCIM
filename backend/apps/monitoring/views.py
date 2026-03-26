from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Alert, MetricData, SNMPDevice
from .serializers import AlertSerializer, MetricDataSerializer, SNMPDeviceSerializer


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().select_related('device', 'rack', 'room', 'acknowledged_by')
    serializer_class = AlertSerializer
    filterset_fields = ['alert_type', 'severity', 'status', 'device', 'rack', 'room']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'severity']

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        return Response(AlertSerializer(alert).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_at = timezone.now()
        alert.save()
        return Response(AlertSerializer(alert).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        return Response({
            'active': Alert.objects.filter(status='active').count(),
            'critical': Alert.objects.filter(status='active', severity='critical').count(),
            'warning': Alert.objects.filter(status='active', severity='warning').count(),
            'info': Alert.objects.filter(status='active', severity='info').count(),
            'acknowledged': Alert.objects.filter(status='acknowledged').count(),
        })


class MetricDataViewSet(viewsets.ModelViewSet):
    queryset = MetricData.objects.all().select_related('device')
    serializer_class = MetricDataSerializer
    filterset_fields = ['device', 'metric_name']
    ordering_fields = ['timestamp']

    @action(detail=False, methods=['get'])
    def latest(self, request):
        device_id = request.query_params.get('device')
        metric = request.query_params.get('metric')
        qs = self.queryset
        if device_id:
            qs = qs.filter(device_id=device_id)
        if metric:
            qs = qs.filter(metric_name=metric)
        latest = qs.order_by('-timestamp')[:100]
        return Response(MetricDataSerializer(latest, many=True).data)


class SNMPDeviceViewSet(viewsets.ModelViewSet):
    queryset = SNMPDevice.objects.all().select_related('device')
    serializer_class = SNMPDeviceSerializer
    filterset_fields = ['enabled', 'snmp_version']
