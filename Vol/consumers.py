import json

from django.http import HttpResponse
from channels.handler import AsgiHandler
from channels import Group
from channels.sessions import channel_session

from random import randint

from .models import *



# Randomize Tiles
board = [];
height = [];
redo = 0

def redoLevel():
	global board
	global height
	board = [];
	height = [];

	for n in range(49):
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

		h = randint(0,2)-1
		#height.append( h*8 )
		height.append(0);

def changeHeight():
	global height
	height = [];
	flat = randint(0,1);
	for n in range(49):
		h = randint(0,2)-1
		
		if (flat == 0):
			height.append( h*8 )
		else:
			height.append( 0 )

redoLevel();

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
	global redo

	if (redo == 50):
		redo = 0
		changeHeight();

	redo += 1;
	print(redo)


	data = json.loads(message['text'])
	

	Group("game-%s" % message.channel_session['room']).send({
        "text": json.dumps({
            "mx": data['x'],
            "my": data['y'],
            "mz": data['z'],
            "id": data['id'],
            "board": board,
            "height": height,
            "still": data['still'],
            "rl": data['rl'],
            "r_x": data['r_x'],
            "r_y": data['r_y'],
            "r_z": data['r_z'],
            "killed": data['killed'],
        }),
    })
	return




# Connected to websocket.disconnect
@channel_session
def ws_disconnect(message):
    Group("game-%s" % message.channel_session['room']).discard(message.reply_channel)
