from rest_framework import serializers
from .models import PowerPanel, PowerFeed, PDU, PowerOutlet


class PowerPanelSerializer(serializers.ModelSerializer):
    datacenter_name = serializers.CharField(source='datacenter.name', read_only=True)
    feeds_count = serializers.SerializerMethodField()

    class Meta:
        model = PowerPanel
        fields = '__all__'

    def get_feeds_count(self, obj):
        return obj.feeds.count()


class PowerFeedSerializer(serializers.ModelSerializer):
    capacity_kw = serializers.ReadOnlyField()
    panel_name = serializers.CharField(source='power_panel.name', read_only=True)
    rack_name = serializers.CharField(source='rack.name', read_only=True)

    class Meta:
        model = PowerFeed
        fields = '__all__'


class PowerOutletSerializer(serializers.ModelSerializer):
    connected_device_name = serializers.CharField(source='connected_device.name', read_only=True)

    class Meta:
        model = PowerOutlet
        fields = '__all__'


class PDUSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    outlets = PowerOutletSerializer(many=True, read_only=True)
    feed_name = serializers.CharField(source='power_feed.name', read_only=True)
    total_power_w = serializers.SerializerMethodField()

    class Meta:
        model = PDU
        fields = '__all__'

    def get_total_power_w(self, obj):
        return sum(o.power_draw_w for o in obj.outlets.all())
