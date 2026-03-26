from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, MetricDataViewSet, SNMPDeviceViewSet

router = DefaultRouter()
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'metrics', MetricDataViewSet, basename='metric')
router.register(r'snmp-devices', SNMPDeviceViewSet, basename='snmp-device')

urlpatterns = router.urls
