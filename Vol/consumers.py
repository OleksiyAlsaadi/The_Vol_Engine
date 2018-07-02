import json

from django.http import HttpResponse
from channels.handler import AsgiHandler
from channels import Group
from channels.sessions import channel_session

from random import randint

from .models import *




# Randomize Tiles
board = [];
for n in range(25):
	x = randint(0, 3)
	if (x == 2):
		y = randint(0, 1)
		if (y == 0):
			x = 1

	if (n == 0):
		x = 1
	if (n == 1):
		x = 3
	board.append( x )

# Connected to websocket.connect
@channel_session
def ws_connect(message):
    # Accept connection
    message.reply_channel.send({"accept": True})
    # Work out room name from path (ignore slashes)
    room = message.content['path'].strip("/")
    # Save room in session and add us to the group
    message.channel_session['room'] = room
    Group("game-%s" % room).add(message.reply_channel)




# Connected to websocket.receive
@channel_session
def ws_message(message):
	data = json.loads(message['text'])

	Group("game-%s" % message.channel_session['room']).send({
        "text": json.dumps({
            "mx": data['x'],
            "my": data['y'],
            "mz": data['z'],
            "id": data['id'],
            "dx": data['dx'],
            "dy": data['dy'],
            "dz": data['dz'],
            "board": board,
        }),
    })
	return




# Connected to websocket.disconnect
@channel_session
def ws_disconnect(message):
    Group("game-%s" % message.channel_session['room']).discard(message.reply_channel)
