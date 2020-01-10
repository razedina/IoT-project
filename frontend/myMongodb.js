var mongodb=require('mongodb');
var mqtt=require('mqtt');
var mongodbClient=mongodb.MongoClient;
var mongodbURI = 'mongodb://localhost:27017/mydb';
var topicToSubscribeTo = "acc";
var LEDtopic = "LED";
var collection,client;

var accArray = ["","",""];
var a = 0;

mongodbClient.connect(mongodbURI, {useNewUrlParser: true }, setupCollectionAndMQTT);
console.log("Connected successfully to database server");

var mqttClient  = mqtt.connect('mqtt://broker.mqttdashboard.com');


function setupCollectionAndMQTT(err, client) {
  if(err) throw err;
  //collection will be created if doesen't exist
  collection = mongodbClient.db('mydb').collection("accIoT");

 //   dbo.createCollection("customers", function(err, res) {
 //   if (err) throw err;
 //   console.log("Collection created!");
 // });

  mqttClient.subscribe(topicToSubscribeTo);
  mqttClient.subscribe(LEDtopic);

  console.log("waiting for message for topic 'acc'");
  //when an MQTT 'message' event is raised call the insertMessasInDB callback event handler function
  mqttClient.on('message', insertMessageInDB);
}


function insertMessageInDB(topic, payload) {
  if(topic == topicToSubscribeTo){
    accArray[a] = payload;
    if(a == 2){
      a = 0;
      if(active == 1){
        active = 0;
        var fromMqttObj = {Rec_Date: {time: new Date(),led:"on"}, ax: accArray[0], ay: accArray[1],az: accArray[2],units:"m/s^2" };
      }else{
        var fromMqttObj = {Rec_Date: new Date(), ax: accArray[0], ay: accArray[1], az: accArray[2],units:"m/s^2" };
      }
      
      //create a collection (equivalent to a table in SQL) if it does not already exist 
      //insert a document (equivalent to a record in SQL) into it
      collection.insertOne(fromMqttObj, function(err, res) {
        if (err) throw err;
        console.log("1 document inserted");    
      });  

    }else{
      a++;
    }
  }
  if(topic == "LEDtopic"){
    if(payload == "01"){
      active = 1;
    }
  }
}

