from django.db import models

class Data(models.Model):
    data = models.CharField(max_length=140)

    def __str__(self):
        return self.suggestion
