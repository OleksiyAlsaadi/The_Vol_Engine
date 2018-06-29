from django.shortcuts import render
from django.http import HttpResponse

from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required

from .models import *
from .forms import *

def index(request):
    #return HttpResponse("Hello, world. You're at the polls index.")

    context = {
        'title':"Home",
        }

    return render(request, 'index.html', context)
