from rest_framework import serializers
from .models import DataCenter, Room, Row, Rack


class RackSerializer(serializers.ModelSerializer):
    used_u = serializers.ReadOnlyField()
    free_u = serializers.ReadOnlyField()
    utilization_percent = serializers.ReadOnlyField()
    row_name = serializers.CharField(source='row.name', read_only=True)
    room_name = serializers.CharField(source='row.room.name', read_only=True)
    datacenter_name = serializers.CharField(source='row.room.datacenter.name', read_only=True)
    datacenter_id = serializers.IntegerField(source='row.room.datacenter.id', read_only=True)
    room_id = serializers.IntegerField(source='row.room.id', read_only=True)

    class Meta:
        model = Rack
        fields = '__all__'


class RowSerializer(serializers.ModelSerializer):
    racks = RackSerializer(many=True, read_only=True)
    rack_count = serializers.SerializerMethodField()

    class Meta:
        model = Row
        fields = '__all__'

    def get_rack_count(self, obj):
        return obj.racks.count()


class RoomSerializer(serializers.ModelSerializer):
    rows = RowSerializer(many=True, read_only=True)
    total_racks = serializers.ReadOnlyField()
    datacenter_name = serializers.CharField(source='datacenter.name', read_only=True)

    class Meta:
        model = Room
        fields = '__all__'


class DataCenterSerializer(serializers.ModelSerializer):
    rooms_count = serializers.ReadOnlyField()
    total_racks = serializers.ReadOnlyField()

    class Meta:
        model = DataCenter
        fields = '__all__'


class DataCenterDetailSerializer(DataCenterSerializer):
    rooms = RoomSerializer(many=True, read_only=True)
