from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg, Q
from apps.locations.models import DataCenter, Room, Rack
from apps.assets.models import Device, DeviceType
from apps.monitoring.models import Alert
from apps.cooling.models import TemperatureSensor


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_dcs = DataCenter.objects.count()
        total_rooms = Room.objects.count()
        total_racks = Rack.objects.count()
        total_devices = Device.objects.count()
        active_devices = Device.objects.filter(status='active').count()
        active_alerts = Alert.objects.filter(status='active').count()
        critical_alerts = Alert.objects.filter(status='active', severity='critical').count()

        # Rack utilization
        racks = Rack.objects.all()
        avg_utilization = 0
        if racks.exists():
            utils = [r.utilization_percent for r in racks]
            avg_utilization = sum(utils) / len(utils) if utils else 0

        # Device by role
        by_role = list(
            Device.objects.values('device_type__device_role')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Device by status
        by_status = list(
            Device.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Top racks by utilization
        top_racks = []
        for rack in Rack.objects.select_related('row__room__datacenter').all():
            top_racks.append({
                'id': rack.id,
                'name': rack.name,
                'location': f"{rack.row.room.datacenter.code}/{rack.row.room.name}",
                'utilization': rack.utilization_percent,
                'used_u': rack.used_u,
                'total_u': rack.u_height,
            })
        top_racks.sort(key=lambda x: x['utilization'], reverse=True)
        top_racks = top_racks[:10]

        return Response({
            'total_datacenters': total_dcs,
            'total_rooms': total_rooms,
            'total_racks': total_racks,
            'total_devices': total_devices,
            'active_devices': active_devices,
            'active_alerts': active_alerts,
            'critical_alerts': critical_alerts,
            'avg_rack_utilization': round(avg_utilization, 1),
            'devices_by_role': by_role,
            'devices_by_status': by_status,
            'top_racks_by_utilization': top_racks,
        })


class CapacityReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dc_id = request.query_params.get('datacenter')
        racks = Rack.objects.select_related('row__room__datacenter').all()
        if dc_id:
            racks = racks.filter(row__room__datacenter_id=dc_id)

        data = []
        for rack in racks:
            data.append({
                'rack_id': rack.id,
                'rack_name': rack.name,
                'datacenter': rack.row.room.datacenter.name,
                'room': rack.row.room.name,
                'row': rack.row.name,
                'total_u': rack.u_height,
                'used_u': rack.used_u,
                'free_u': rack.free_u,
                'utilization_pct': rack.utilization_percent,
                'max_power_kw': rack.max_power_kw,
            })

        summary = {
            'total_racks': len(data),
            'total_u': sum(d['total_u'] for d in data),
            'used_u': sum(d['used_u'] for d in data),
            'free_u': sum(d['free_u'] for d in data),
            'avg_utilization': round(sum(d['utilization_pct'] for d in data) / len(data), 1) if data else 0,
        }

        return Response({'summary': summary, 'racks': data})


class PowerReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.power.models import PowerPanel, PowerFeed
        dc_id = request.query_params.get('datacenter')

        panels = PowerPanel.objects.select_related('datacenter').all()
        if dc_id:
            panels = panels.filter(datacenter_id=dc_id)

        total_capacity_kw = 0
        panel_data = []
        for panel in panels:
            feeds = panel.feeds.all()
            cap = sum(f.capacity_kw for f in feeds)
            total_capacity_kw += cap
            panel_data.append({
                'panel_id': panel.id,
                'name': panel.name,
                'datacenter': panel.datacenter.name,
                'incoming_power_kw': panel.incoming_power_kw,
                'feeds_count': feeds.count(),
                'total_capacity_kw': round(cap, 2),
            })

        return Response({
            'total_capacity_kw': round(total_capacity_kw, 2),
            'panels': panel_data,
        })


class TemperatureReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sensors = TemperatureSensor.objects.select_related('rack', 'room').all()
        data = []
        for s in sensors:
            data.append({
                'id': s.id,
                'name': s.name,
                'location': s.rack.name if s.rack else (s.room.name if s.room else 'N/A'),
                'current_temp_c': s.current_temp_c,
                'threshold_high_c': s.threshold_high_c,
                'status': s.status,
            })
        return Response({'sensors': data})
