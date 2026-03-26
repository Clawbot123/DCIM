from rest_framework import serializers
from .models import CoolingUnit, TemperatureSensor, HumidityReading


class CoolingUnitSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    datacenter_name = serializers.CharField(source='room.datacenter.name', read_only=True)

    class Meta:
        model = CoolingUnit
        fields = '__all__'


class TemperatureSensorSerializer(serializers.ModelSerializer):
    status = serializers.ReadOnlyField()
    room_name = serializers.CharField(source='room.name', read_only=True)
    rack_name = serializers.CharField(source='rack.name', read_only=True)

    class Meta:
        model = TemperatureSensor
        fields = '__all__'


class HumidityReadingSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)

    class Meta:
        model = HumidityReading
        fields = '__all__'
