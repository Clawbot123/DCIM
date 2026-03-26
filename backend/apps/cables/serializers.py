from rest_framework import serializers
from .models import Cable, PatchPanel, PatchPanelPort


class CableSerializer(serializers.ModelSerializer):
    termination_a_type_name = serializers.CharField(source='termination_a_type.model', read_only=True)
    termination_b_type_name = serializers.CharField(source='termination_b_type.model', read_only=True)

    class Meta:
        model = Cable
        fields = '__all__'


class PatchPanelPortSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatchPanelPort
        fields = '__all__'


class PatchPanelSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    ports = PatchPanelPortSerializer(many=True, read_only=True)

    class Meta:
        model = PatchPanel
        fields = '__all__'
