var mysql = require('mysql');
var mqtt = require('mqtt');

var mqttClient  = mqtt.connect('mqtt://broker.mqttdashboard.com');



var accArray = ["","",""];
var magArray = ["","",""];
var a = 0;
var b = 0;
var x = new Date();
// set callback handlers
mqttClient.on('connect', connectMqtt);
mqttClient.on('message', messageEventHandler); 


var con = mysql.createConnection({
  host: "localhost",
  user: "edina",
  password: "becutan",
  database: "IOT"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to database!");
}); 



function connectMqtt() {
    console.log("Connected to cloud MQTT broker");
	//Subscribe to a timeInterval, displayStatus and microbitStatus topics
    mqttClient.subscribe("acc");
    mqttClient.subscribe("LED");
    mqttClient.subscribe("mag");
    mqttClient.subscribe("dbUpdate");	
}
function messageEventHandler(topic, message, packet){   
    if(topic == "acc"){
        accArray[a%3] = message;

		if(a === 2){
            a = 0;
            var sql = "INSERT INTO accIoT (Re_Date, ax, ay, az) VALUES?";
            var t = new Date();
            var values = [
                [t,( "" + accArray[0]).charAt(0), ("" + accArray[1]).charAt(0),("" + accArray[2]).charAt(0)]
            ];
            con.query(sql, [values], function (err, result) {
                if (err) throw err;
                console.log("Number of records inserted in accIoT table: " + result.affectedRows);
              });
		}else
			a++;

    }
    if (topic == "LED"){
        message = "" + message;
        if(message == "01"){
            x = new Date();
        }else if(message == "00"){
            var sql = "INSERT INTO ledIoT (On_Date, totalTime) VALUES?";
            var t = new Date();
            var values = [
                [x,Math.abs(x-t)]
            ];
            con.query(sql, [values], function (err, result) {
                if (err) throw err;
                console.log("Number of records inserted in ledIoT table: " + result.affectedRows);
              });
              LEDtotalTime();
        }

    }
    if(topic == "mag"){
        message = "" + message;
        magArray[a] = message;
        if(b == 2){
            b = 0;
            var sql = "INSERT INTO magIoT (Re_Date, mx, my, mz) VALUES?";
            var t = new Date();
            var values = [
                [t,( "" + magArray[0]), ("" + magArray[1]),("" + magArray[2])]
            ];
            con.query(sql, [values], function (err, result) {
                if (err) throw err;
                console.log("Number of records inserted in magIoT table: " + result.affectedRows);
              });
		}else
			b++;
        }
    if(topic == "dbUpdate")
        LEDtotalTime();
}

function LEDtotalTime(){
//    var sizeTable = con.query("SELECT COUNT(*) FROM ledIoT", function (err, result, fields) {
//        if (err) throw err;
//      });
    con.query("SELECT totalTime FROM ledIoT", function (err, result, fields) {
        if (err) throw err;
        var sum = 0;
        for(i = 0; i<result.length; i++){
            sum = sum + parseInt(result[i].totalTime);
        }
        //console.log(result, "rows number: " + sizeTable, " Total sum: "+sum);
        mqttClient.publish("dbTopic", "Total time: " + sum + "ms"+ "<br><br>" + "Average time (LED on): " + sum/(result.length + 0.00001) );
      });

}
