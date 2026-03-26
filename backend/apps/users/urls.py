from rest_framework.routers import DefaultRouter
from .views import UserViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = router.urls
