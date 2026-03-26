from rest_framework.routers import DefaultRouter
from .views import PowerPanelViewSet, PowerFeedViewSet, PDUViewSet, PowerOutletViewSet

router = DefaultRouter()
router.register(r'power-panels', PowerPanelViewSet, basename='power-panel')
router.register(r'power-feeds', PowerFeedViewSet, basename='power-feed')
router.register(r'pdus', PDUViewSet, basename='pdu')
router.register(r'power-outlets', PowerOutletViewSet, basename='power-outlet')

urlpatterns = router.urls
