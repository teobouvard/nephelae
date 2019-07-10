from django.urls import path
from django.views.generic import RedirectView

from . import views

urlpatterns = [
    # URL for empty path
    path('', RedirectView.as_view(url='preview')),

    # URL for preview page, update requests routed to map update view
    path('preview/', views.preview, name='preview'),
    path('preview/update/', views.update_map, name='update_chart'),
    path('preview/box/', views.get_box, name='update_chart'),

    # URL for map page
    path('map/', views.map, name='map'),
    path('map/box/', views.mesonh_box, name='mesonh_box'),
    path('map/update/', views.update_map, name='update_map'),
    path('map/tile/<int:z>/<int:x>/<int:y>', views.map_tiles, name='map_tiles'),
    path('map/plane_icon/<int:index>', views.plane_icon, name='plane_icon'),
    path('map/<str:variable_name>_img/<int:time_value>/<int:altitude_value>', views.layer_img, name='layer_img'),
    
    # URL for simulation page
    path('simulation/', views.simulation, name='simulation'),
    path('simulation/update/', views.update_map),
    path('simulation/textures/<str:file_name>', views.texture),

    # URL for simulation page
    path('commands/', views.commands, name='commands'),

    # URL for sections page
    path('sections/', views.sections, name='sections'),
    path('sections/box/', views.mesonh_box, name='mesonh_box'),
    path('sections/update/<int:time_value>/<int:altitude_value>', views.update_section, name='update_section'),
    

    # URL for vertical profiles page
    path('profiles/', views.profiles, name='profiles'),
    path('profiles/update/', views.update_profiles, name='update_profiles'),

    # URL for vertical profiles page
    path('cloud_data/', views.cloud_data, name='cloud_data'),
    path('cloud_data/update/', views.update_cloud_data, name='update_cloud_data'),
    
]
