from rest_framework import serializers
from .models import Manufacturer, DeviceType, Device, Interface


class ManufacturerSerializer(serializers.ModelSerializer):
    device_type_count = serializers.SerializerMethodField()

    class Meta:
        model = Manufacturer
        fields = '__all__'

    def get_device_type_count(self, obj):
        return obj.device_types.count()


class DeviceTypeSerializer(serializers.ModelSerializer):
    manufacturer_name = serializers.CharField(source='manufacturer.name', read_only=True)
    device_count = serializers.SerializerMethodField()

    class Meta:
        model = DeviceType
        fields = '__all__'

    def get_device_count(self, obj):
        return obj.devices.count()


class InterfaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interface
        fields = '__all__'


class DeviceSerializer(serializers.ModelSerializer):
    device_type_name = serializers.CharField(source='device_type.model', read_only=True)
    manufacturer_name = serializers.CharField(source='device_type.manufacturer.name', read_only=True)
    device_role = serializers.CharField(source='device_type.device_role', read_only=True)
    u_height = serializers.IntegerField(source='device_type.u_height', read_only=True)
    location_display = serializers.ReadOnlyField()
    rack_name = serializers.CharField(source='rack.name', read_only=True)
    room_name = serializers.CharField(source='rack.row.room.name', read_only=True)
    datacenter_name = serializers.CharField(source='rack.row.room.datacenter.name', read_only=True)
    interfaces = InterfaceSerializer(many=True, read_only=True)

    class Meta:
        model = Device
        fields = '__all__'
