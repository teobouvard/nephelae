import os

from django.http import HttpResponseNotFound, HttpResponse, JsonResponse
from django.shortcuts import render

def update_profiles(request):
    data = {}

    return JsonResponse(data)

def profiles(request):
    return render(request, 'profiles.html')
