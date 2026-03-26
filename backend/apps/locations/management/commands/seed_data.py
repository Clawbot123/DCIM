"""
Management command to seed demo data for the DCIM application.
Run: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import random


class Command(BaseCommand):
    help = 'Seeds the database with demo DCIM data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding demo data...')
        User = get_user_model()

        # Create superuser
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@dcim.local', 'admin123', role='admin')
            self.stdout.write(self.style.SUCCESS('Created admin user (admin/admin123)'))

        # Create demo users
        for username, role in [('engineer1', 'engineer'), ('viewer1', 'viewer')]:
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(username, f'{username}@dcim.local', 'dcim1234', role=role)

        from apps.locations.models import DataCenter, Room, Row, Rack
        from apps.assets.models import Manufacturer, DeviceType, Device

        # Manufacturers
        dell, _ = Manufacturer.objects.get_or_create(name='Dell Technologies', defaults={'website': 'https://dell.com'})
        cisco, _ = Manufacturer.objects.get_or_create(name='Cisco', defaults={'website': 'https://cisco.com'})
        apc, _ = Manufacturer.objects.get_or_create(name='APC by Schneider', defaults={'website': 'https://apc.com'})
        hp, _ = Manufacturer.objects.get_or_create(name='HPE', defaults={'website': 'https://hpe.com'})

        # Device Types
        server_1u, _ = DeviceType.objects.get_or_create(
            manufacturer=dell, model='PowerEdge R750',
            defaults={'device_role': 'server', 'u_height': 1, 'power_draw_w': 400, 'color': '#1d4ed8',
                      'width_mm': 482.6, 'depth_mm': 748, 'is_full_depth': True}
        )
        server_2u, _ = DeviceType.objects.get_or_create(
            manufacturer=dell, model='PowerEdge R750xs',
            defaults={'device_role': 'server', 'u_height': 2, 'power_draw_w': 600, 'color': '#1d4ed8',
                      'width_mm': 482.6, 'depth_mm': 680, 'is_full_depth': True}
        )
        switch_1u, _ = DeviceType.objects.get_or_create(
            manufacturer=cisco, model='Catalyst 9300-48T',
            defaults={'device_role': 'switch', 'u_height': 1, 'power_draw_w': 150, 'color': '#059669',
                      'width_mm': 445.0, 'depth_mm': 370, 'is_full_depth': False}
        )
        pdu_1u, _ = DeviceType.objects.get_or_create(
            manufacturer=apc, model='AP7900B',
            defaults={'device_role': 'pdu', 'u_height': 1, 'power_draw_w': 0, 'color': '#d97706',
                      'width_mm': 482.6, 'depth_mm': 150, 'is_full_depth': False}
        )
        blade_chassis, _ = DeviceType.objects.get_or_create(
            manufacturer=hp, model='BladeSystem c7000',
            defaults={'device_role': 'server', 'u_height': 10, 'power_draw_w': 4800, 'color': '#7c3aed',
                      'width_mm': 482.6, 'depth_mm': 826, 'is_full_depth': True}
        )

        # Data Center
        dc, _ = DataCenter.objects.get_or_create(
            code='DC1',
            defaults={
                'name': 'Primary Data Center',
                'address': '100 Tech Park Drive',
                'city': 'Austin',
                'country': 'USA',
                'total_power_kw': 2000,
                'total_cooling_tons': 600,
                'pue': 1.4,
                'contact_name': 'John Smith',
                'contact_email': 'ops@datacenter.com',
            }
        )
        dc2, _ = DataCenter.objects.get_or_create(
            code='DC2',
            defaults={
                'name': 'DR Data Center',
                'address': '200 Business Ave',
                'city': 'Denver',
                'country': 'USA',
                'total_power_kw': 800,
                'pue': 1.6,
            }
        )

        # Rooms
        room1, _ = Room.objects.get_or_create(
            datacenter=dc, name='Server Room A',
            defaults={'width': 30, 'height': 20, 'max_power_kw': 800, 'floor_number': 1}
        )
        room2, _ = Room.objects.get_or_create(
            datacenter=dc, name='Network Room B',
            defaults={'width': 20, 'height': 15, 'max_power_kw': 400, 'floor_number': 1, 'room_type': 'network'}
        )

        # Rows and Racks for Room 1
        rack_num = 1
        for row_idx, row_letter in enumerate(['A', 'B', 'C', 'D']):
            row, _ = Row.objects.get_or_create(
                room=room1, name=row_letter,
                defaults={'position_x': 2.0, 'position_y': 2.0 + row_idx * 3.0, 'orientation': 'horizontal'}
            )
            for rack_pos in range(1, 9):
                rack_name = f'{row_letter}{rack_pos:02d}'
                rack, created = Rack.objects.get_or_create(
                    row=row, name=rack_name,
                    defaults={
                        'u_height': 42,
                        'max_power_kw': 20,
                        'position_x': (rack_pos - 1) * 0.7,
                        'position_y': row_idx * 3.0,
                        'status': 'active',
                    }
                )
                if created:
                    # Add random devices
                    u = 1
                    while u <= 38:
                        dtype = random.choice([server_1u, server_1u, server_1u, server_2u, switch_1u])
                        if u + dtype.u_height - 1 <= 42:
                            dev_name = f'srv-{row_letter}{rack_pos:02d}-{u:02d}'
                            if not Device.objects.filter(name=dev_name).exists():
                                Device.objects.create(
                                    name=dev_name,
                                    device_type=dtype,
                                    rack=rack,
                                    position_u=u,
                                    status=random.choice(['active', 'active', 'active', 'planned', 'offline']),
                                    hostname=f'{dev_name}.dc1.local',
                                    ip_address=f'10.{rack_num}.{u}.1',
                                )
                            u += dtype.u_height
                        else:
                            break
                    rack_num += 1

        # Rows for Room 2
        row_net, _ = Row.objects.get_or_create(
            room=room2, name='Net-A',
            defaults={'position_x': 2.0, 'position_y': 2.0, 'orientation': 'horizontal'}
        )
        for i in range(1, 5):
            Rack.objects.get_or_create(
                row=row_net, name=f'NET{i:02d}',
                defaults={'u_height': 42, 'max_power_kw': 10, 'position_x': (i-1)*0.7, 'position_y': 2.0}
            )

        # Monitoring - Alerts
        from apps.monitoring.models import Alert
        devices = list(Device.objects.all()[:5])
        alert_data = [
            ('Temperature Critical - Rack A03', 'critical', 'temperature', 'Rack A03 temperature exceeds 35°C'),
            ('High Power Utilization - Row B', 'warning', 'power', 'Row B power utilization at 87%'),
            ('Device Offline - srv-B05-01', 'critical', 'hardware', 'Server srv-B05-01 is not responding'),
            ('Rack Capacity Warning - A04', 'warning', 'capacity', 'Rack A04 is 90% full'),
            ('UPS Battery Low - UPS-A01', 'warning', 'power', 'UPS-A01 battery at 15% capacity'),
        ]
        for title, severity, atype, msg in alert_data:
            Alert.objects.get_or_create(
                title=title,
                defaults={
                    'severity': severity,
                    'alert_type': atype,
                    'message': msg,
                    'status': 'active',
                }
            )

        # Cooling Units
        from apps.cooling.models import CoolingUnit, TemperatureSensor
        for i in range(1, 5):
            CoolingUnit.objects.get_or_create(
                room=room1, name=f'CRAC-{i:02d}',
                defaults={
                    'unit_type': 'crac',
                    'status': 'active',
                    'cooling_capacity_kw': 50,
                    'cooling_capacity_tons': 14.2,
                    'power_draw_kw': 15,
                    'position_x': (i - 1) * 5.0,
                    'position_y': 18.0,
                }
            )

        # Temperature Sensors
        for rack in Rack.objects.all()[:12]:
            TemperatureSensor.objects.get_or_create(
                rack=rack, name=f'Temp-{rack.name}-Front',
                defaults={
                    'location_type': 'rack-front',
                    'current_temp_c': round(random.uniform(18, 28), 1),
                    'threshold_high_c': 30,
                    'threshold_critical_c': 35,
                }
            )

        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully!'))
        self.stdout.write('Login: admin / admin123')
