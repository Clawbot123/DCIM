from rest_framework.routers import DefaultRouter
from .views import ManufacturerViewSet, DeviceTypeViewSet, DeviceViewSet, InterfaceViewSet

router = DefaultRouter()
router.register(r'manufacturers', ManufacturerViewSet, basename='manufacturer')
router.register(r'device-types', DeviceTypeViewSet, basename='device-type')
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'interfaces', InterfaceViewSet, basename='interface')

urlpatterns = router.urls
