from rest_framework.routers import DefaultRouter
from .views import CoolingUnitViewSet, TemperatureSensorViewSet, HumidityReadingViewSet

router = DefaultRouter()
router.register(r'cooling-units', CoolingUnitViewSet, basename='cooling-unit')
router.register(r'temp-sensors', TemperatureSensorViewSet, basename='temp-sensor')
router.register(r'humidity', HumidityReadingViewSet, basename='humidity')

urlpatterns = router.urls
