import json

from django import forms



class DataForm(forms.Form):

    data = forms.CharField(
        label='',
        max_length=140,
        widget=forms.TextInput(attrs={
            'placeholder': 'Field'
            }))
