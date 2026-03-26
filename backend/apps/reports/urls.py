from django.urls import path
from .views import DashboardStatsView, CapacityReportView, PowerReportView, TemperatureReportView

urlpatterns = [
    path('reports/dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('reports/capacity/', CapacityReportView.as_view(), name='capacity-report'),
    path('reports/power/', PowerReportView.as_view(), name='power-report'),
    path('reports/temperature/', TemperatureReportView.as_view(), name='temperature-report'),
]
