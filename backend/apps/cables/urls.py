from rest_framework.routers import DefaultRouter
from .views import CableViewSet, PatchPanelViewSet, PatchPanelPortViewSet

router = DefaultRouter()
router.register(r'cables', CableViewSet, basename='cable')
router.register(r'patch-panels', PatchPanelViewSet, basename='patch-panel')
router.register(r'patch-panel-ports', PatchPanelPortViewSet, basename='patch-panel-port')

urlpatterns = router.urls
