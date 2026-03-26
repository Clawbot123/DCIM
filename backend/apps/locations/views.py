from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import DataCenter, Room, Row, Rack
from .serializers import (DataCenterSerializer, DataCenterDetailSerializer,
                           RoomSerializer, RowSerializer, RackSerializer)


class DataCenterViewSet(viewsets.ModelViewSet):
    queryset = DataCenter.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['city', 'country']
    search_fields = ['name', 'code', 'city']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DataCenterDetailSerializer
        return DataCenterSerializer

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        dc = self.get_object()
        from apps.assets.models import Device
        from apps.power.models import PowerFeed
        total_racks = Rack.objects.filter(row__room__datacenter=dc).count()
        total_devices = Device.objects.filter(rack__row__room__datacenter=dc).count()
        return Response({
            'total_racks': total_racks,
            'total_devices': total_devices,
            'rooms_count': dc.rooms.count(),
            'pue': dc.pue,
            'total_power_kw': dc.total_power_kw,
        })

    @action(detail=True, methods=['get'])
    def floor_plan(self, request, pk=None):
        dc = self.get_object()
        include_devices = request.query_params.get('include_devices', 'false').lower() == 'true'

        from apps.assets.models import Device
        # Pre-fetch all devices for this DC in one query (keyed by rack_id)
        rack_devices = {}
        if include_devices:
            devices = Device.objects.filter(
                rack__row__room__datacenter=dc,
                position_u__isnull=False,
            ).select_related('device_type').order_by('position_u')
            for d in devices:
                rack_id = d.rack_id
                if rack_id not in rack_devices:
                    rack_devices[rack_id] = []
                rack_devices[rack_id].append({
                    'id': d.id,
                    'name': d.name,
                    'position_u': d.position_u,
                    'u_height': d.device_type.u_height,
                    'role': d.device_type.device_role,
                    'color': d.device_type.color,
                    'status': d.status,
                })

        rooms = dc.rooms.prefetch_related('rows__racks').all()
        data = []
        for room in rooms:
            room_data = {
                'id': room.id,
                'name': room.name,
                'room_type': room.room_type,
                'width': room.width,
                'height': room.height,
                'doors': room.doors,
                'rows': []
            }
            for row in room.rows.all():
                row_data = {
                    'id': row.id,
                    'name': row.name,
                    'position_x': row.position_x,
                    'position_y': row.position_y,
                    'orientation': row.orientation,
                    'racks': []
                }
                for rack in row.racks.all():
                    rack_data = {
                        'id': rack.id,
                        'name': rack.name,
                        'status': rack.status,
                        'position_x': rack.position_x,
                        'position_y': rack.position_y,
                        'u_height': rack.u_height,
                        'utilization_percent': rack.utilization_percent,
                        'max_power_kw': rack.max_power_kw,
                        'width': rack.width,
                        'depth': rack.depth,
                    }
                    if include_devices:
                        rack_data['devices'] = rack_devices.get(rack.id, [])
                    row_data['racks'].append(rack_data)
                room_data['rows'].append(row_data)
            data.append(room_data)
        return Response(data)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all().select_related('datacenter')
    serializer_class = RoomSerializer
    filterset_fields = ['datacenter', 'room_type', 'floor_number']
    search_fields = ['name']


class RowViewSet(viewsets.ModelViewSet):
    queryset = Row.objects.all().select_related('room__datacenter')
    serializer_class = RowSerializer
    filterset_fields = ['room', 'orientation']
    search_fields = ['name']


class RackViewSet(viewsets.ModelViewSet):
    queryset = Rack.objects.all().select_related('row__room__datacenter')
    serializer_class = RackSerializer
    filterset_fields = ['row', 'status', 'row__room', 'row__room__datacenter']
    search_fields = ['name', 'serial_number', 'asset_tag']

    @action(detail=True, methods=['get'])
    def elevation(self, request, pk=None):
        rack = self.get_object()
        from apps.assets.models import Device
        devices = Device.objects.filter(rack=rack).select_related(
            'device_type', 'device_type__manufacturer'
        ).order_by('position_u')

        # Key: (u, face) so front and rear devices can coexist in the same slot
        occupied = {}
        for device in devices:
            info = {
                'device_id': device.id,
                'device_name': device.name,
                'device_type': device.device_type.model,
                'role': device.device_type.device_role,
                'status': device.status,
                'u_height': device.device_type.u_height,
                'start_u': device.position_u,
                'color': device.device_type.color,
                'width_mm': device.device_type.width_mm,
                'depth_mm': device.device_type.depth_mm,
                'is_full_depth': device.device_type.is_full_depth,
                'face': device.face,
                # Device-level image takes priority over device-type image
                'front_image': (device.front_image.url if device.front_image else
                                device.device_type.front_image.url if device.device_type.front_image else None),
                'rear_image':  (device.rear_image.url if device.rear_image else
                                device.device_type.rear_image.url if device.device_type.rear_image else None),
            }
            for u in range(device.position_u, device.position_u + device.device_type.u_height):
                occupied[(u, device.face)] = info

        units = []
        for u in range(1, rack.u_height + 1):
            front = occupied.get((u, 'front'))
            rear  = occupied.get((u, 'rear'))
            if front:
                units.append({'u': u, **front})
            if rear:
                units.append({'u': u, **rear})
            if not front and not rear:
                units.append({'u': u, 'device_id': None, 'device_name': None})

        return Response({
            'rack': RackSerializer(rack).data,
            'units': units,
        })
