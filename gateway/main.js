var noble = require('noble'); //modules
var mqtt = require('mqtt');
var Integer = require('integer');
var fs = require('fs');


//name of my device, universal number, service of interest
var peripheralOfInterest = "AVATAR";
var peripheralOfInterestUUID = 'ceb6302cf7bd';
var serviceOfInterestUuids = ['a000', 'b000','d000', 'e000'];//a-accelerometer, b-magnetimeter, c-ADC, d-button A, e-enables to write a data

var peripheralGlobal;
var notifyChar =['2019'];
var writeCharUuid = ['e001'];
var writeChar;

//create a txt file for to memorize data
var accStream = fs.createWriteStream('acc.txt','utf8','a');	
var magStream = fs.createWriteStream('mag.txt','utf8','a');	

var allowDuplicates = false;
var peripheralGlobal;


//for the application use
//in offline mode set enableEnergySavingMode variable
//program will track if time interval is long enought for energy saving mode
//and set energySavingMode varialbe
var enableEnergySavingMode = 0;
var energySavingMode = 0;

//variables related to timers (setInterval and setTimer)
var totalTime = 20000;//how many seconds my application will be running
var intervalTime = 8;//after how many seconds readings will be refreshed
//varables for tracking information weather data is x, y or z value
var a = 0;
var b = 0;
//distinguish between init and gatherig info part
//variables for initialisation and tracking whether we are reading x,y or z chars
var first_init = 1;
var first_setup = 1;
var coordinates = ['x', 'y', 'z'];
var s = 0; //tracking dispay status

setTimeout(closingF, totalTime*1000);

//variables for managing timers
var timeout;
var timeoutEnergyCon;


var mqttClient  = mqtt.connect('mqtt://broker.mqttdashboard.com');
var topicPub="LED_status";
var topicSub = "readEvery";
var topicPubTime = "recordingTime";
var topicSubLED = "displayStatus";
var topicSubMicro = "microbitStatus";
var savingT = "saving";
//var topicPubMicro = "microbitStatusInfo";



//for calcuating change in acceleration and Euler's angles
var accMemory = new Buffer([0, 0, 0]);
var accMemoryNew = new Buffer([0, 0, 0]);
//var accMemoryNew = [0, 0, 0];

//mqtt event
mqttClient.on('connect', connectMqtt);
mqttClient.on('message', messageEventHandler);  
//file system event
accStream.on('finish', function() {
	console.log("Write completed.");
 });
 //stateChange from powerOFF to powerON
 //noble event
noble.on('stateChange', stateChangeEventHandler);
noble.on('discover', discoverDeviceEventHandler);




//if(enableEnergySavingMode){
//	console.log('Energy Saving Mode on');
//}

function connectMqtt() {
    console.log("Connected to cloud MQTT broker");
	//Subscribe to a timeInterval, displayStatus and microbitStatus topics
	mqttClient.subscribe(topicSub);
	mqttClient.subscribe(topicSubLED);//ask for display status
	mqttClient.subscribe(topicSubMicro);
	mqttClient.subscribe(savingT);	
}
//messageEventHandler will distinguish between different topics and 
//differenty treat messages
function messageEventHandler(topic, message, packet){
	
	console.log('The message has been published on topic ' + topic);
	if (topic == topicSub){//timeInterval
		intervalTime = message;		
		console.log("Inerval time has changed to " + intervalTime);
		
		 //time interval changed, new timer will be set
		clearInterval(timeout);
		timeout = setInterval(readPeriodically, intervalTime*1000, peripheralGlobal);

		//handling energy saving mode
		if(intervalTime > 10 && enableEnergySavingMode){
			energySavingMode = 1;
			mqttClient.publish("refreshInfo","Refresh rate is " + intervalTime + " seconds. Energy Saving Mode ON");
		}
		else {
			energySavingMode = 0;
			clearInterval(timeoutEnergyCon);//when to wake up device from a sleep
			mqttClient.publish("refreshInfo","Refresh rate is " + intervalTime + " seconds. Energy Saving Mode OFF");
		}

	}else if(topic == topicSubLED){//displayStatus
		if (message == 'on' && s == 0){//prevent from uncotroled turning off and on with unrelevant messages
			s = 1;
			writeChar.write(new Buffer([0]), false, writeDataCallback);
			
		}else if(message == 'off' && s == 1){
			s = 0;
			writeChar.write(new Buffer([0]), false, writeDataCallbackOff);

		}

		
	}else if(topic == topicSubMicro){//microbitStatus
		var accelerationX = accMemoryNew[0]+0.01;
		var accelerationY = accMemoryNew[1]+0.01;
		var accelerationZ = accMemoryNew[2]+0.01;
		var M_PI = 3.14159;
		var pitch = 180 * Math.atan (accelerationX/Math.sqrt(accelerationY**2 + accelerationZ**2))/M_PI;
		var roll = 180 * Math.atan (accelerationY/Math.sqrt(accelerationX**2+ accelerationZ**2))/M_PI;
		var yaw = 180 * Math.atan (accelerationZ/Math.sqrt(accelerationX**2 + accelerationZ**2))/M_PI;
		//comaparing acceleration from a consecutive measurements
		/*if(accMemory[0]**2 + accMemory[2]**2 + accMemory[1]**2 < accMemoryNew[0]**2 + accMemoryNew[2]**2 + accMemoryNew[1]**2){
			//mqttClient.publish("info", "Microbit has a positive acceleration. Euler's angles are: pitch = "+accelerationX + " roll = " + roll + " yaw = " + yaw, publishCallback);
			//mqttClient.publish(topicPub, "Microbit has a positive acceleration", publishCallback);
		} else{
			//mqttClient.publish("info", "Microbit has a positive acceleration", publishCallback);
			//mqttClient.publish(topicPub, "Microbit has a negative acceleration.  Euler's angles are: pitch = "+pitch + " roll = " + roll + " yaw = " + yaw, publishCallback);
		}*/
	}else if(topic == savingT){
		if(message == "1")
			enableEnergySavingMode=1;


		mqttClient.publish("refreshInfo", "Energy Saving Mode: " + enableEnergySavingMode );
		console.log("Energy Saving Mode: " + enableEnergySavingMode);
	}

}  
function publishCallback(error) {     
         if (error) {
          console.log("error publishing data");
      }
}

function stateChangeEventHandler(state) { //event handler callback function
    if (state === 'poweredOn' || energySavingMode) {
		if (energySavingMode && !first_init ){
			mqttClient.publish("info", "Connected to AVATAR again" );
			console.log('\r\n Waking up! \r\n Scanning for devices with service uuid: ' + serviceOfInterestUuids )
		}
		else{
			console.log("Starting scanning for devices with service uuid : " + serviceOfInterestUuids);  
		}
      
      noble.startScanning(serviceOfInterestUuids, allowDuplicates); //scan for devices containing the service of interest
    } else {
      console.log("stopping scanning****");  
      noble.stopScanning();
      process.exit(0);
    }
}
//discover event happened and object noble has registered it //
//as a result, discoverDeviceEventHandler is called
//purpose of this function is to find my peripheral and make connection
function discoverDeviceEventHandler(peripheral) {
    var localName = peripheral.advertisement.localName;
	if (localName.indexOf(peripheralOfInterest) > -1){//compares by the name peripheral and AVATAR
		//showing different text on console depending weather is initialisation part or not
		if(!first_init){
			console.log("Looking for "+peripheralGlobal.advertisement.localName);
		}
		else{ 
			console.log('Found device with local name: ' + peripheral.advertisement.localName);
			console.log("peripheral uuid : " + peripheral.uuid);
		}
		//setting my peripheral as global since I will connect only to one targeted microbit
		peripheralGlobal = peripheral;
		//when the connectCallback fun is called, connecting part is done and we have info it the device is connected or not
		peripheral.connect(connectCallback);
	}; 
}

function connectCallback(error) { //this will be executed when the connect request returns
	if (error) {
		console.log("error connecting to peripheral");
	} else {
		//energy saving mode timer doese't need to be set and 
		//put two cases separately
		if(first_init){
			first_init = 0;
			//in this stage, device is connected and we are looking for particular services
			peripheralGlobal.discoverServices([], discoverServicesCallback);
			//timer is set for periodically discovering services 
			timeout = setInterval(readPeriodically, intervalTime*1000, peripheralGlobal);
			console.log('connected to peripheral device: ' + peripheralGlobal.uuid  + "   " + peripheralGlobal.advertisement.localName);
		}else{
			console.log('Connected to '+ peripheralGlobal.advertisement.localName + " again");
		}

	}
}
 //function will be executed when the discoverServices request returns
 //discover characteristics of service of interest
function discoverServicesCallback(error, services) {
	if (error) {
		console.log("error discovering services");
	} else {
		console.log("device advertises the following services");			
		for (var i in services) {
			console.log('  ' + i + ' uuid: ' + services[i].uuid);
		}
		for (var i in services) { 
			if (serviceOfInterestUuids.includes(services[i].uuid)) {
				//in a console, tracking this line shows affect of asinhronious reading
				console.log("Discovering characteristics of service " + services[i].uuid );
				//for every service we will discover its chars
				services[i].discoverCharacteristics(null, discoverCharsCallback);
			}
		} 
	}
}
//there is 3 types of characteristic:readable, writable, notification 
function discoverCharsCallback(error, characteristics) {
	if (error) {
		console.log("error discovering characteristics");
	} else {
		for (var i in characteristics) {
			if (first_setup)
				console.log('  ' + i + ' uuid: ' + characteristics[i].uuid);

			// Enable notifications and indications for button A
			if(notifyChar.includes(characteristics[i].uuid)){
				if(first_setup){
					console.log('Setting notify for button A pressed of '+characteristics[i].uuid);
				}

				characteristics[i].subscribe(bleSubscribeCallback);//subscribtion on characteristics
				characteristics[i].on('data', dataCallback);	// Register a callback for the data event

			}else if (writeCharUuid.includes(characteristics[i].uuid)){
				writeChar = characteristics[i]; //write on a display

			} else{
				//reading acc and mag data, reading function for each
				//I set in mictrobit code that charact of acc start with a
				if (characteristics[i].uuid[0] === "a"){
					characteristics[i].read(aReadDataCallback,1);
				}
				if (characteristics[i].uuid[0] === "b"){
					characteristics[i].read(bReadDataCallback,1);
				}

			}

		
		}

	} 
}
//fun will be executed when data is avaliable and read request returns
function aReadDataCallback(error, data) { 
	if (error) {
		console.log("error reading data");
	} else {
		//memory elements for tracking microbit's acceleration
		accMemory[a] = accMemoryNew[a];
		//unsigned int, microbit range is +/-2g
		accMemoryNew[a] = parseInt(data.toString('hex'), 16);
		accMemoryNew[a] = accMemoryNew[a]*5/Math.pow(2,8);//to get the real acc, this value needs to be multiplied with g = 9,81 m/s^2
		//accMemoryNew[a] = accMemoryNew[a]*5/Math.pow(2,16);
			

		//writing values with corresponding label into console and .txt file
		if(a == 0)
			console.log('Accelerometer data: ');

		console.log("a" + coordinates[(a)%3] + " = "+ data.toString('hex') + ", a" + coordinates[(a)%3] + " = " +accMemoryNew[a]+ "*9.81 m/s^2");
		accStream.write('a' + coordinates[(a)%3] + " = " + data.toString('hex') + ' ');

		mqttClient.publish('acc', accMemoryNew[a]+  "*9.81 m/s^2");

		//the way of tracking if current data label is x, y or z
		if (a === 2){
			accStream.write('\r\n ');
			a = 0;
		} else a++;			
		


		//peripheralGlobal.disconnect(disconnectCallback);
	}
}
function bReadDataCallback(error, data) { //this will be executed when the read request returns
	if (error) {
		console.log("error reading data");
	} else {
		if(b == 0)
			console.log('Magnetometer data: ');
		console.log("mag" + coordinates[(b)%3] +" = "+ data.toString('hex'));
		magStream.write(data.toString('hex') + ' ');
		mqttClient.publish('mag', data.toString('hex'));
		if (b === 2){
			magStream.write('\n ');
			b = 0;
		} else b++;
		//we have date and don't have to make sure that magStream is written, we can disconnect device
		//no need for timer to disconnect
		if (energySavingMode && !b){
			//var date_ob = new Date();
			//mqttClient.publish(topicPubTime, "Data recorded: " + date_ob.getHours() + ':' + date_ob.getMinutes() + ':' + date_ob.getSeconds(), publishCallback);
			peripheralGlobal.disconnect(disconnectCallback);
			timeoutEnergyCon = setTimeout(stateChangeEventHandler, (intervalTime-6)*1000);
			//microbit will wake up 6s before interval timer is off, connect to a device and  wait before reading data all over again
		}
		var date_ob = new Date();
		if(!b)
			mqttClient.publish(topicPubTime, "Data recorded: " + date_ob.getHours() + ':' + date_ob.getMinutes() + ':' + date_ob.getSeconds(), publishCallback);
		
	}
}
function disconnectCallback(error){ //this will be executed when the disconnect request returns
	if (error) {
		console.log("error disconnecting");
	} else {
		console.log("Disconnected from BLE peripheral");
		if(energySavingMode){
			mqttClient.publish("info","\r\nTime to sleep" );
			console.log("\r\nTime to sleep");
		}
	}
}

function bleSubscribeCallback(error){
	if(error){
		console.log('Error Subscribing');
	} else{	
		if(first_setup){
			console.log('Notifications for display status enabled');
			first_setup = 0;
		}
		
	}
}

/* Callback for BLE data event */
function dataCallback(data, isNotification){
	var UUID = this.uuid;	// Get the UUID of the notifying characteristic. 
	console.log('\r\n-----------------------------------------------');
	console.log('BLE Notification for characteristic with uuid: ' +UUID+ ' data value: '+ data.toString('hex')+'\r\n');
	mqttClient.publish("LED", data.toString('hex'), publishCallback);
}

function readPeriodically(peripheralGlobal){
	console.log('\r\n-.-.-.-.-.-.-.-.-.-.-.New Readings.-.-.-.-.-.-.-.-.-.-.-');
	//device is connected and starting from discovering services
	//enable to start discovering sevices all over again
	peripheralGlobal.discoverServices([], discoverServicesCallback);
}

function closingF(){
	peripheralGlobal.disconnect(disconnectCallback);
	accStream.end();
	 //global object process;
	console.log('Application has been running for '+totalTime+' s');
	console.log('Goodbye');
	process.exit(0);
}

function writeDataCallback(error, data) { //this will be executed when the write request returns
	if (error) {
		console.log("error writing data");
	}else{
		mqttClient.publish(topicPub, "Data is written on microbit, letter E is blinking", publishCallback);
	}
}
function writeDataCallbackOff(error, data) { //this will be executed when the write request returns
	if (error) {
		console.log("error writing data");
	}else{
		mqttClient.publish(topicPub, "Data is written on microbit, letter E stopped blinking", publishCallback);
	}
}
//eventEmitter.on('updateServer', function(){
//	console.log('data received succesfully.');
// });

/*


var server = app.listen(8080, function () {
   var host = server.address().address
   var port = server.address().port
   
   //console.log("Example app listening at http://%s:%s", host, port)
});

eventEmitter.on('updateServer', function(){
	app.get('/', function (req, res) {
		res.send(memory[0]+memory[1]+memory[2]);
	 })
});
*/

