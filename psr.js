var net = require('net');
var clients = [];
var matches = [];

net.createServer(function(socket)
{	
	var me = {'socket' : socket, 'status' : 0, 'name' : 'user'};
	clients.push(me);	
	
	me.socket.write('Welcome to Paper, Scissors, Rocks!\n');
	me.socket.write('What\'s your name?\n');	

	socket.on('data', function(data)
	{
		parseData(data, me);
	});
	
	socket.on('close', function(data)
	{
		if(me.match != undefined)
		{
			var match = matches[me.match];
			var pr = match.player1 == me ? match.player2 : match.player1;	
			
			pr.status = 0;
			pr.match = undefined;
			pr.socket.write(me.name+' has quit the match. You win by forfiet! Play again? y/n \n');
			matches.splice(me.match, 1);	
		}
		
		var i = clients.indexOf(me.socket);
		clients.splice(i, 1);
	});
}).listen(8000, '127.0.0.1');

function parseData(data, me)
{
	var command = data.toString();
	command = command.replace(/[\n\r]/g, '');
	command = command.toLowerCase();
		
	if(me.status == 0 && me.name == 'user')
	{
		me.name = command;
		me.socket.write('Welcome, '+me.name+'\n');

		setTimeout(function(){me.socket.write(clients.length+' players online. Type "find" to start a new match. Type "quit" at anytime to disconnect. \n')}, 1000);
	}
	else if(command.indexOf('quit') >= 0 || (command == 'n' && me.status == 0))
	{	
		me.socket.end();
	}
	else if(command.indexOf('find') >= 0 || (me.status == 0 && command == 'y'))
	{		
		if(me.status == 2) 
		{
			me.socket.write('You are already matched!\n');
			return;
		}

		me.status = 1;

		if(clients.length > 1)
		{
			me.socket.write('Finding match...\n');

			var t = clients.length;
				
			for(var i = 0; i < t; i++)
			{
				var client = clients[i];
				
				if(client.socket != me.socket && client.status == 1)
				{
					startMatch(me, client);
				}
			}
		}
		else
		{
			me.socket.write('No players online. Awaiting a challenger...\n');
		}
	}
	else if(command.indexOf('paper') >= 0 || command.indexOf('scissors') >= 0 || command.indexOf('rock') >= 0)   
	{
		var m = 0;
		var match = matches[me.match];

		if(command.indexOf('paper') >= 0)
		{
			m = 1
		}
		else if(command.indexOf('scissors') >= 0)
		{
			m = 2;
		}
		else if(command.indexOf('rock') >= 0)
		{
			m = 3;
		}

		if(match.player1.socket == me.socket)
		{	
			match.player1Move = m;
		}
		else
		{	
			match.player2Move = m;
		}
		
		checkWinner(me.match);
	}
	else
	{
		me.socket.write('Invalid command');
	}
}

function checkWinner(i)
{
	var match = matches[i];

	if(match.player1Move == 0)
	{
		match.player2.socket.write('Waiting for '+match.player1.name+'\'s move\n');
		match.player1.socket.write(match.player2.name+' has made their move, what\'s yours?\n');
		return false;
	}
	else if(match.player2Move == 0)
	{
		match.player1.socket.write('Waiting for '+match.player2.name+'\'s move...\n');
		match.player2.socket.write(match.player1.name+' has made their move, what\'s yours?\n');
		return false;
	}
	else
	{
		var p1m = match.player1Move;
		var p2m = match.player2Move;
		
		if((p1m == 1 && p2m  == 3) || (p1m == 2 && p2m == 1) || (p1m == 3 && p2m == 2))
		{
			match.player1Score++;
			var msg = match.player1.name+'\'s '+moveTextForInt(p1m)+' beats '+match.player2.name+'\'s '+moveTextForInt(p2m)+'\n';	
			match.player1.socket.write(msg);
			match.player2.socket.write(msg);

			match.player1Move = match.player2Move = 0;
		}
		else if((p2m == 1 && p1m  == 3) || (p2m == 2 && p1m == 1) || (p2m == 3 && p1m == 2))
		{
			match.player2Score++;
			var msg = match.player2.name+'\'s '+moveTextForInt(p2m)+' beats '+match.player1.name+'\'s '+moveTextForInt(p1m)+'\n';	
			match.player1.socket.write(msg);
			match.player2.socket.write(msg);

			match.player1Move = match.player2Move = 0;
		}
		else if(p1m == p2m)
		{
			var tieMsg = 'Tie! You both chose '+moveTextForInt(p1m)+'\n';
			match.player1.socket.write(tieMsg);
			match.player2.socket.write(tieMsg);
			
			match.player1Move = match.player2Move = 0; 
		}

		var scoreMsg = 'Score: '+match.player1.name+' '+match.player1Score+' / '+match.player2.name+' '+match.player2Score+'\n';
		match.player1.socket.write(scoreMsg);
		match.player2.socket.write(scoreMsg);
		
		var gameMsg = 'Make your next move. Type paper, scissors, or rock.\n';

		if(match.player1Score - match.player2Score >= 2 || match.player2Score - match.player1Score >= 2)
		{
			var winner = (match.player1Score > match.player2Score) ? match.player1.name : match.player2.name;
			gameMsg = winner+' wins the match! Play again? y/n \n';
			match.player1.status = match.player2.status = 0;
			match.player1.match = undefined;
			match.player2.match = undefined;
		
			matches.splice(i, 1);
		}
		
		match.player1.socket.write(gameMsg);
		match.player2.socket.write(gameMsg);
	}
}

function moveTextForInt(i)
{
	switch(i)
	{
		case 1:
			return 'paper';
			break;
		case 2:
			return 'scissors';
			break;
		case 3:
			return 'rock';
			break;
	}

	return 'none';
}

function startMatch(me, client)
{
	var match = {'player1':me, 'player2':client, 'player1Score':0, 'player2Score':0, 'player1Move':0, 'player2Move':0 };
	matches.push(match);
	me.status = 2;
	client.status = 2;
	me.match = matches.length-1;
	client.match = matches.length-1;
				
	me.socket.write('Match found! Your opponent is '+client.name+'\n');
	client.socket.write('Match found! Your opponent is '+me.name+'\n');				
	
	setTimeout(function(){makeMove(me, client);},1000);
}

function makeMove(me, client)
{	
	me.socket.write("Make your move: Type paper, scissors, or rock\n")
	client.socket.write("Make your move: Type paper, scissors, or rock\n")
}

