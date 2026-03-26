from rest_framework import serializers
from .models import Alert, MetricData, SNMPDevice


class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    rack_name = serializers.CharField(source='rack.name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.username', read_only=True)

    class Meta:
        model = Alert
        fields = '__all__'


class MetricDataSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = MetricData
        fields = '__all__'


class SNMPDeviceSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = SNMPDevice
        fields = '__all__'
        extra_kwargs = {'community': {'write_only': True}}
