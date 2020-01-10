//Using Hive broker - dashboard available at http://www.hivemq.com/demos/websocket-client/
//Uses the Paho MQTT JS client library - http://www.eclipse.org/paho/files/jsdoc/index.html to send and receive messages using a web browser
//Example code available at https://www.hivemq.com/blog/mqtt-client-library-encyclopedia-paho-js

//document.getElementById("connect").addEventListener("click", connectToBroker);

// Create a client instance of a paho library
var client = new Paho.MQTT.Client("broker.mqttdashboard.com", 8000, "web_" + parseInt(Math.random() * 100, 10));

client.connect();
// set callback handlers
client.onConnected = onConnected;
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;


var topic = "myTopic";
var message;
var name;
var surname;
var saving;


function changeTopic(){
	topic = document.getElementById('fname').value;
	console.log("The topic is changed to: " + topic);
	return false;
}

var array1 = [0,0,0];
var array2 = [0,0,0];
var array3 = [0,0,0];

var a = 0;
var xyz=["x","y","z"];

var marray1 = [0,0,0];
var marray2 = [0,0,0];
var marray3 = [0,0,0];

var date = ["","",""];

var m = 0;

var options = {
	onSuccess: print
	};

function onMessageArrived(message){
	if(message.destinationName =='acc'){
		array3[a%3] = array2[a%3];
		array2[a%3] = array1[a%3];
		array1[a%3] = message.payloadString;
		//console.log("Message arrived a"+xyz[a]+"=  " + message.payloadString );

		if(a === 2){
			a = 0;
			console.log(array1);
			document.getElementById('ax1').innerHTML = array1[0];
			document.getElementById('ay1').innerHTML = array1[1];
			document.getElementById('az1').innerHTML = array1[2];

			document.getElementById('ax2').innerHTML = array2[0];
			document.getElementById('ay2').innerHTML = array2[1];
			document.getElementById('az2').innerHTML = array2[2];
			
			document.getElementById('ax3').innerHTML = array3[0];
			document.getElementById('ay3').innerHTML = array3[1];
			document.getElementById('az3').innerHTML = array3[2];		
		}else
			a++;
	}
	if(message.destinationName =='mag'){
		marray3[m%3] = marray2[m%3];
		marray2[m%3] = marray1[m%3];
		marray1[m%3] = message.payloadString;
		//console.log("Message arrived a"+xyz[a]+"=  " + message.payloadString );

		if(m === 2){
			m = 0;
			console.log(marray1);
			document.getElementById('mx1').innerHTML = marray1[0];
			document.getElementById('my1').innerHTML = marray1[1];
			document.getElementById('mz1').innerHTML = marray1[2];

			document.getElementById('mx2').innerHTML = marray2[0];
			document.getElementById('my2').innerHTML = marray2[1];
			document.getElementById('mz2').innerHTML = marray2[2];
			
			document.getElementById('mx3').innerHTML = marray3[0];
			document.getElementById('my3').innerHTML = marray3[1];
			document.getElementById('mz3').innerHTML = marray3[2];		
		}else{
			m++;
		}
	}
	if(message.destinationName =="LED"){
		if(message.payloadString === "01"){
			//console.log(message.payloadString);
			document.getElementById('myImage').src = "pic_bulbon.png"

		}else{
			document.getElementById('myImage').src = "pic_bulboff.png"
		}
	}
	if(message.destinationName == "info"){
		//console.log(message.payloadString);
		document.getElementById('infoBoxA').innerHTML = message.payloadString;

	}
	if(message.destinationName == "recordingTime"){
		//console.log(message.payloadString);
		//document.getElementById('infoBoxB').innerHTML = message.payloadString;
		date[2] = date[1];
		date[1] =  date[0];
		date[0] = message.payloadString;

		//date = [message.payloadString, date[0], date[2]];
		//console.log(date[0] + date[1] + date[2]);
		
		document.getElementById('infoBoxB').innerHTML = date[0] + "<br>" + date[1] + "<br>" + date[2];
 
	}
	if(message.destinationName == "refreshInfo"){
		//console.log(message.payloadString);
		document.getElementById('infoBox').innerHTML = message.payloadString;
		document.getElementById('infoBoxA').innerHTML = "Connected to AVATAR";
	}

	if(message.destinationName == "dbTopic"){
		//console.log(message.payloadString);
		document.getElementById('infoBoxDB').innerHTML = message.payloadString;
	}
	
	}

function print(){		 
	console.log('Subscribed')
	}

function connectToBroker(){
	client.connect(connectOptions);
}


function publishToBroker(){
	console.log(message);
	client.publish("displayStatus", message, 0, false); //publish a message to the broker
}
function disconnectFromBroker(){
	//client.publish("displayStatus",  "Bye!", 0, false);
	client.disconnect();
	console.log('Disconnected');
	window.location.href="page1.html";
}
// called when the client connect request is successful

function onConnected(){
	subscribeToTopic('info');
	subscribeToTopic('recordingTime');
	subscribeToTopic('refreshInfo');
	var x = document.getElementById("subText");
	x.style.display = "inline";
	var x = document.getElementById("likeAcc");
	x.style.display = "inline";
	var x = document.getElementById("magSubText");
	x.style.display = "inline";
	var x = document.getElementById("LEDSubText");
	x.style.display = "inline";
	var x = document.getElementById("conTitle");
	x.style.display = "inline";
	var x = document.getElementById("buttonInfo");
	x.style.display = "inline";
	var x = document.getElementById("likeAcc");
	x.style.display = "inline";
	var x = document.getElementById("likeMag");
	x.style.display = "inline";
	var x = document.getElementById("likeLED");
	x.style.display = "inline";
	var x = document.getElementById("buttonDB");
	x.style.display = "inline";
	var x = document.getElementById("buttonDis");
	x.style.display = "inline";
	
}
// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
	}
}
function subscribeToTopic(topic){
	console.log("Subscibed on topic: "+topic);
	client.subscribe(topic);
	
}

function subscribeToAcc(x){
	x.classList.toggle("fa-thumbs-down");
	var x = document.getElementById("accTable");
	var y = document.getElementById("subText");

	if (y.innerHTML === "Subscribe") {
		subscribeToTopic('acc');
		y.innerHTML = "Unsubscribe";
		x.style.display = "inline";
	  } else {
		y.innerHTML = "Subscribe";
		x.style.display = "none";
		client.unsubscribe('acc');
	  }	
}
function subscribeToMag(x){
	x.classList.toggle("fa-thumbs-down");
	var x = document.getElementById("magTable");
	var y = document.getElementById("magSubText");

	if (y.innerHTML === "Subscribe") {
		subscribeToTopic('mag');
		y.innerHTML = "Unsubscribe";
		x.style.display = "inline";
	  } else {
		y.innerHTML = "Subscribe";
		x.style.display = "none";
		client.unsubscribe('mag');
	  }	
}
function subscribeToLED(x){
	x.classList.toggle("fa-thumbs-down");
	var y = document.getElementById("LEDSubText");
	var x = document.getElementById("myImage");
	var z = document.getElementById("LEDon");
	var t = document.getElementById("LEDoff");
	var p = document.getElementById("LEDTable");

	if (y.innerHTML === "Subscribe") {
		subscribeToTopic('LED');
		y.innerHTML = "Unsubscribe";
		x.style.display ="block";
		t.style.display ="inline";
		z.style.display ="inline";
		p.style.display ="inline";
	  } else {
		y.innerHTML = "Subscribe";
		client.unsubscribe('LED');
		x.style.display = "none";
		t.style.display = "none";
		z.style.display = "none";
		p.style.display = "none";
	  }	
}

function readMessage(){
	message = document.getElementById('fmess').value;
	return false;
}
function turnLEDon(){
	document.getElementById('myImage').src='pic_bulbon.png';
	client.publish("displayStatus", "on", 0, false); //publish a message to the broker
}

function turnLEDoff(){
	document.getElementById('myImage').src='pic_bulboff.png';
	client.publish("displayStatus", "off", 0, false); //publish a message to the broker
}
	
function  changeInterval(){
	client.publish("readEvery",  document.getElementById('timeInterval').value);
	return false;
}
function addInfoShow(){
	var x = document.getElementById("fieldInfo");
	x.style.display = "block";

	var x = document.getElementById("buttonInfo");
	x.style.display = "none";

	document.getElementById('infoBoxA').innerHTML = "*";
}

function dbProcessing(){
	var x = document.getElementById("dbInfo");
	x.style.display = "block";

	var x = document.getElementById("buttonDB");
	x.style.display = "none";
	//document.getElementById('infoBoxA').innerHTML = "*";
	subscribeToTopic("dbTopic");
}
function dbUpdate(){
	client.publish("dbUpdate","on");
}

