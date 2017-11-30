var restify = require('restify');
var builder = require('botbuilder');
var exec=require('child_process').exec;
var filename='pythonwiki.py'
var recomend='recomendation.py'
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');
var request = require('request');
var OpenCC = require('opencc');
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
var natural_language_understanding = new NaturalLanguageUnderstandingV1({
  'username': 'd8a3985c-4c01-4fd9-8abe-feca656b66e9',
  'password': 'NCLAYuJdktp4',
  'version_date': '2017-02-27'
});


//MS translator
var MsTranslator = require('mstranslator');
var client = new MsTranslator({
  api_key: '76578759ef2648adb3038a9578043084'
}, true);
// Load the default Simplified to Traditional config
var opencc = new OpenCC('t2s.json');

// Load the default Simplified to Traditional config

var studentID=process.argv[2];


// Connection URL
var url = 'mongodb://localhost:27017/skyapp';

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    //appId: "b181073c-7305-4c92-a7c8-d14bf8507948",
    //appPassword: "gkKUnHsqK3P3HTeq0npDyMp"
    appId:null,
    appPasswork:null
});


// Receive messages from the user
var bot = new builder.UniversalBot(connector);
// Listen for messages from users 
server.post('/api/messages', connector.listen());
// Imports the Google Cloud client library
	const Language = require('@google-cloud/language');
// Instantiates a client
	const language = Language();




// Can hardcode if you know that the language coming in will be chinese/english for sure
// Otherwise can use the code for locale detection provided here: https://docs.botframework.com/en-us/node/builder/chat/localization/#navtitle
var FROMLOCALE = 'zh-CHT'; //Chinese Tradition
var TOLOCALE = 'zh-CHS';//Chinese simplified

bot.use({
    receive: function (event, next) {
    var converted = opencc.convertSync(event.text);
	event.text=converted;

    next();
    
    }
});



// Add Microsoft LUIS recognizer to the bot
//https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/c85c3abd-0121-4de5-ae24-9a91523e1b7d?subscription-key=c891c5fccfc642629f36dd705bafa3a7
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/c85c3abd-0121-4de5-ae24-9a91523e1b7d?subscription-key=c891c5fccfc642629f36dd705bafa3a7';
//const recognizer=new builder.LuisRecognizer(model);
//const intents = new builder.IntentDialog({
//    recognizers: [recognizer]
//});
const recognizer=new builder.LuisRecognizer(model);
bot.intents = new builder.IntentDialog({ recognizers: [recognizer] })


bot.dialog('/', bot.intents)

//bot.recognizer(new builder.LuisRecognizer(model)); 

// Documentation for text translation API here: http://docs.microsofttranslator.com/text-translate.html

//bot.dialog('/', intents);
bot.intents.matches('Question','Question');
bot.intents.matches('None','None');
bot.intents.matches('Recommendation','Recommendation');
bot.intents.matches('Confuse','Confuse');
bot.intents.matches('greeting','greeting');
bot.intents.matches('asking','asking');
bot.dialog('Question',
	function(session,context,next){
	const tag = builder.EntityRecognizer.findEntity(context.entities, 'Wiki');
	if(tag){
MongoClient.connect(url,function(err,db){

db.collection('student').findOne({"student":studentID},function(err,result){

exec('python3'+' '+filename+' '+tag.entity,function(err,stdout,stderr){
		if(err){
			session.send("抱歉暫時在維基上找不到相應的信息");
			session.endDialog();
			}
		if(stderr){
			session.send("抱歉暫時無法解決您的問題");
			session.endDialog();
			}
		if(stdout){
			session.send(stdout);
			session.endDialog();
}
});
exec('python3 recomendation.py'+' '+studentID+' '+tag.entity,function(err,stdout,stderr){

		if(stdout!=2&&stdout!=3){
		session.send("針對"+tag.entity+",我覺得現階段練習"+stdout+'可以提升你對它的理解，要不要試試？');
		session.endDialog();
		}
});

});
	});}
	else
	{	// Imports the Google Cloud client library
	session.send('對不起，暫時無法識別您的提問含義。請直接詢問定義或輸入相關的問題。');
	session.endDialog();}
	
	
	const document = {
	  'content': session.message.text,
	  type: 'PLAIN_TEXT'
	};
	//calling sentiment analysis API
var sentiments=function(){
	return language.analyzeSentiment({ document: document })
  	.then((results) => {
    	const sentiment = results[0].documentSentiment;
    	console.log(sentiment.magnitude);
    	return sentiment.score;
 	 })
 	 }
 	 var sentimentscore=sentiments();


 	 sentimentscore.then(function(result){
 	 console.log(result);
 	 console.log(sentiment.magnitude);
		if(result>=0.6) {session.send('你現在已經做得非常好了。請繼續保持聯繫，會有更大的進步的！');
		session.endDialog();}
		if(result<=-0.6) {session.send('不要放棄，只要保持多做練習，你會有很大的進步。');
		session.endDialog();}
		
	});
	})//.triggerAction({
	//matches:'Question'});
	
	
	
	
bot.dialog('None',
	function(session,args){
	session.send('對不起，暫時無法回答您的問題。如果在學習上有疑問或感謝歡迎隨時和我討論。');
	session.endDialog();
	})//.triggerAction({
	//matches:'None'});
	
bot.dialog('greeting',
	function(session,args){
	session.send('你好。');
	session.endDialog();
	})//.triggerAction({
	//matches:'greeting'});
	
bot.dialog('asking',
	function(session,args){
	session.send("目前，我可以做到的事情有：替你查詢不懂的專有名詞的定義（例如，詢問我直角是什麼）或者給你推薦相應的練習題（例如，詢問我“我在乘除法上要做什麼練習？”），同時，也歡迎你"+
	"跟我聊聊你在學習上的感受")
	//session.send("目前，我可以做到的事情有：替你查询不懂的专有名词的定义（例如，询问我“直角是什么？”）"+
	//"给你推荐相应的练习题（例如，询问我“我在乘除法上应该做什么练习？”，同时，也很欢迎你跟我聊聊你在学习上的感受。");
	session.endDialog();
	})//.triggerAction({
	//matches:'asking'});
	
//.triggerAction({
	//matches:'Recommendation'}).cancelAction('cancelrecommend','Cancelled',{
	//matches:/^(取消|算了)/i, confirmPrompt: "你确定？"});

bot.dialog('Recommendation',[
function(session,context,next){
var tag = builder.EntityRecognizer.findEntity(context.entities, 'Wiki');
if(tag){
next({response:tag.entity});
}
else{builder.Prompts.text(session, '你想提高哪方面的知識？');}},
function(session,results){
var exercisetag=results.response;
const document = {
	  'content': session.message.text,
	  type: 'PLAIN_TEXT'
	};
var sentiments=function(){
	return language.analyzeSentiment({ document: document })
  	.then((results) => {
    	const sentiment = results[0].documentSentiment;
    	return sentiment.score;
 	 })
 	 }
 	 var sentimentscore=sentiments();

 	 //handling sentiment analysis result
 	 sentimentscore.then(function(result){
 	 console.log(result);
		if(result>=0.6) {
		MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		console.log(result)
		if(result!=null){
		if(result.totaltime>12000 && result.totalattempt>20){
		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("抱歉暫時沒找到這方面的習題，但是看你已經做了很多習題了，要不先停一停再繼續吧。");
		session.endDialog();}
		else {session.send("針對"+exercisetag+",我覺得現階段練習"+stdout+'比較適合你，但是看到你已經做了很多練習了，要不要先休息一下？');
		session.endDialog();}
})
		}
		else{
		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){
		if(stdout){
		session.send("針對"+exercisetag+"現階段練習"+stdout+'可能比較適合你');
		session.endDialog();}
		else{
		session.send("抱歉暫時沒找到這方面的習題，但是看你已經做了很多習題了，要不先停一停再繼續吧。");
		session.endDialog();
		}
});
		}
		}
		
		});
		});
		}
		else if(result>-0.6 && result <0.6){
		MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		console.log(result)
		if(result!=null){
		if(result.totaltime>12000 && result.totalattempt>20){
		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("抱歉暫時沒找到這方面的習題，但是看你已經做了很多習題了，要不先停一停再繼續吧。");
		session.endDialog();}
		else {session.send("針對"+exercisetag+",我覺得現階段練習"+stdout+'比較適合你，但是看到你已經做了很多練習了，要不要先休息一下？');
		session.endDialog();}
})
		}
		else{
		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("抱歉暫時沒找到這方面的習題。");
		session.endDialog();}
		else {session.send("針對"+exercisetag+",現階段練習"+stdout+'比較適合你');
		session.endDialog();}
})

		}
		}
		
		});
		});
		}
		else {
		var params = {
  text: session.message.text
  , from: 'zh-CHS'
  , to: 'en'
};
 
// be auto-generated access token if needed. 
client.translate(params, function(err, data) {
  var parameters = {
  'text': data,
    'features': {
    'emotion': {}
  }
};

natural_language_understanding.analyze(parameters, function(err, response) {
  if (err){
  console.log('error:', err);
    MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>12000 && result.totalattempt>20){
				exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("我能體會到你的困惑和想提高的心情，但我這邊暫時沒找到合適的練習題。或者你可以問問老師？");
		session.endDialog();}
		else {session.send("針對"+exercisetag+"習題"+stdout+'可能比較適合你');
		session.endDialog();}
})
		session.endDialog();}
		else{

		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("不要急，我這邊暫時沒找到合適的練習題。或者你可以問問老師？");
		session.endDialog();}
		else {session.send("不用著急的，針對"+exercisetag+",我覺得現階段練習"+stdout+'比較適合你');
		session.endDialog();}
})
		

		}
});
});
}
  else{
var sadness=response.emotion.document.emotion.sadness
var angry=response.emotion.document.emotion.angry
var fear=response.emotion.document.emotion.fear
var disgust=response.emotion.document.emotion.disgust;
var largestemotion=sadness;
if (angry>largestemotion) largestemotion=angry;
if (fear>largestemotion) largestemotion=fear;
if (disgust>largestemotion) largestemotion=disgust;


if(largestemotion==sadness && sadness>0.5){
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("不要傷心，你可能不是缺乏練習的問題，或者你先休息一下明天再繼續學習？");
		session.endDialog();}
		else{
		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("能體會到你的傷心，但我這邊找不到你要求的練習題呢，要不你和老師溝通一下？");
		session.endDialog();}
		else {session.send("不用傷心啦，對於"+exercisetag+",你試試做練習"+stdout+'一定會有進步的！');
		session.endDialog();}
})
		
		}
});
});
}
else if(largestemotion==fear &&fear>0.5){
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("其實它並不可怕的，你做了很多練習了，現在先休息一會吧");
		session.endDialog();}
		else{
		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("其實它並不可怕的，但不巧我這邊沒有相關的練習題，你可能需要問問老師。");
		session.endDialog();}
		else {session.send("其實它並不可怕的。對於"+exercisetag+",你試試做練習"+stdout+'說不定就不會怕啦');
		session.endDialog();}
})
		
		}
});
});
}
else if(largestemotion==disgust &&disgust>0.5){
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("我這邊查到你已經做了很多相關練習了，既然你已經開始感到厭煩了，不如就先休息下吧");
		session.endDialog();}
		else{
		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("能體會到你現在很厭煩，但是很抱歉數據庫里暫時沒有能幫助你的練習題，要不你問問老師？");
		session.endDialog();}
		else {session.send("其實"+exercisetag+"很有趣的！練習"+stdout+'很適合你，你會有所提升的！加油！');
		session.endDialog();}
})
		
		}
});
});
}
else if(largestemotion==angry &&angry>0.5){
//connect to mock-up database
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>14400 || result.totalattempt>20){
		session.send("摸摸头，不要生气，你已经很努力了，现在先休息一下吧：）");
		session.endDialog();}
		else{

		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("先不要生氣嘛，或者你只是需要更多的練習而已哦？我給你推薦下練習題？");
		session.endDialog();}
		else {session.send("不要生氣啦，針對"+exercisetag+",我覺得現階段練習"+stdout+'比較適合你，要不再試試？');
		session.endDialog();}
})
		
		}
});
});

}
else {		
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>14400 || result.totalattempt>20){
		session.send("我能體會到你的困惑，但既然你已經做了非常大量的練習了，我覺得你現在需要的是休息一下或者做點別的學科的內容。");
		session.endDialog();}
		else{

		exec('python3 recomendation.py'+' '+studentID+' '+exercisetag,function(err,stdout,stderr){
		if(stdout){
		if(stdout==2||stdout==3){
		session.send("非常抱歉，數據庫里暫時沒有你需要的相關習題。");
		session.endDialog();}
		else {session.send("針對"+exercisetag+"我認為現階段練習"+stdout+'能解決你的困惑');
		session.endDialog();
		}
		}
		if(err){session.send('抱歉，好像數據庫出錯了呢');
		session.endDialog();}
		if(stderr){session.send('好像有什麼地方出錯了~');
		session.endDialog();}
})
		

		session.endDialog();}
});
});
}
}
});
});
}

});

}

])
bot.dialog('Confuse',[
function(session,context,next){
var tag = builder.EntityRecognizer.findEntity(context.entities, 'Wiki');
const document = {
	  'content': session.message.text,
	  type: 'PLAIN_TEXT'
	};
var sentiments=function(){
	return language.analyzeSentiment({ document: document })
  	.then((results) => {
    	const sentiment = results[0].documentSentiment;
    	return sentiment.score;
 	 })
 	 }
 	 var sentimentscore=sentiments();

 	 //handling sentiment analysis result
 	 sentimentscore.then(function(result){
 	 console.log(result);
		if(result>=0.6) {
		MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		console.log(result)
		if(result!=null){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("哇！你已经做了好多练习了！好厉害！做的不错！要不要停下来休息一下？");
		session.endDialog();
		}
		else{
		if(tag){
		session.send("学习"+tag.entity+"很有趣吧。但是，千万不要掉以轻心哦。有空可以多看看书或者做做练习巩固一下。");
		session.endDialog();}
		else{
		session.send("雖然你現在覺得很有趣，表現得不錯，但也不要掉以輕心哦");
		session.endDialog();
		}
		}
		}
		
		});
		});
		}
		else if(result<=0.6&&result>0.1){
		
		MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		console.log(result)
		if(result!=null){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("哇！你做了好多練習！做的很好！要不要停下來休息一下？");
		session.endDialog();
		}
		else{
		if(tag){
		session.send("學習"+tag.entity+"其實不是特別難。但是，千萬不要掉以輕心。有空可以看看書或者做做練習看看有什麼漏洞。");
		session.endDialog();}
		else{
		session.send("其實它不算特別難，不過該做的練習還是做做吧。");
		session.endDialog();
		}
		}
		}
		
		});
		});
		
		}
		else if(result>=-0.1 && result <=0.1){
		session.send("你現在的態度就很好，繼續努力！");
		session.endDialog();
		}
		else {
		var params = {
  text: session.message.text
  , from: 'zh-CHS'
  , to: 'en'
};
 
// be auto-generated access token if needed. 
client.translate(params, function(err, data) {
  var parameters = {
  'text': data,
    'features': {
    'emotion': {}
  }
};

natural_language_understanding.analyze(parameters, function(err, response) {
  if (err){
  console.log('error:', err);
    MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("不要著急，要不停下來休息一下？加油，你可以的！");
		session.endDialog();}
		else{
		if (tag){
		exec('python3 recomendation.py'+' '+studentID+' '+tag.entity,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("不要急，或者你可能需要更多的練習？");
		session.endDialog();}
		else {session.send("不用著急的，針對"+tag.entity+",我覺得現階段練習"+stdout+'比較適合你，要不再試試？');
		session.endDialog();}
})
		}
		else {session.send('不要擔心，你可能只是練習不夠充足，試著繼續做點練習看看吧，會有進步的！');
		session.endDialog();}
		}
});
});
}
  else{
var sadness=response.emotion.document.emotion.sadness
var angry=response.emotion.document.emotion.angry
var fear=response.emotion.document.emotion.fear
var disgust=response.emotion.document.emotion.disgust;
var largestemotion=sadness;
if (angry>largestemotion) largestemotion=angry;
if (fear>largestemotion) largestemotion=fear;
if (disgust>largestemotion) largestemotion=disgust;


if(largestemotion==sadness && sadness>0.5){
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("不要擔心，繼續你的努力，一定能有進步的。");
		session.endDialog();}
		else{
		if (tag){
		exec('python3 recomendation.py'+' '+studentID+' '+tag.entity,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("不要傷心，你對它只要多做練習，會有進步的~");
		session.endDialog();}
		else {session.send("不用傷心啦，對於"+tag.entity+",你試試做練習"+stdout+'一定會有進步的！');
		session.endDialog();}
})
		}
		else {session.send('不要傷心！你只是練習做的還不夠，再堅持多聯繫聯繫吧');
		session.endDialog();}
		}
});
});
}
else if(largestemotion==fear &&fear>0.5){
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("其實它並不可怕的，你做了很多練習了，現在先休息一會吧");
		session.endDialog();}
		else{
		if (tag){
		exec('python3 recomendation.py'+' '+studentID+' '+tag.entity,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("其實它並不可怕呀，你多練練就不會害怕它了");
		session.endDialog();}
		else {session.send("其實它並不可怕的。對於"+tag.entity+",你試試做練習"+stdout+'說不定就不會怕啦');
		session.endDialog();}
})
		}
		else {session.send('不要害怕！你只是缺一些練習，熟練熟練就不用怕了！');
		session.endDialog();}
		}
});
});
}
else if(largestemotion==disgust &&disgust>0.5){
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>12000 && result.totalattempt>20){
		session.send("你可能只是做的練習太多了一時間厭煩了，先休息一下吧~");
		session.endDialog();}
		else{
		if (tag){
		exec('python3 recomendation.py'+' '+studentID+' '+tag.entity,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("其實很有趣的，你多接觸下回改變你對它的看法的~");
		session.endDialog();}
		else {session.send("它其實很有趣的~對於"+tag.entity+",我覺得現階段練習"+stdout+'可能會改變你的看法，要不要試試？');
		session.endDialog();}
})
		}
		else {session.send('哈哈，其實你多接觸接觸，會喜歡上也說不定哦');
		session.endDialog();}
		}
});
});
}
else if(largestemotion==angry &&angry>0.5){
//connect to mock-up database
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>14400 || result.totalattempt>20){
		session.send("摸摸头，不要生气，你已经很努力了，现在先休息一下吧：）");
		session.endDialog();}
		else{
		if (tag){
		exec('python3 recomendation.py'+' '+studentID+' '+tag.entity,function(err,stdout,stderr){

		if(stdout==2||stdout==3){
		session.send("先不要生氣嘛，或者你只是需要更多的練習而已哦？我給你推薦下練習題？");
		session.endDialog();}
		else {session.send("不要生氣，針對"+tag.entity+",我覺得現階段練習"+stdout+'比較適合你，要不再試試？');
		session.endDialog();}
})
		}
		else {session.send('先不要生氣啦，你可能只是練習不夠充足，試著繼續做點練習看看吧，會有進步的！');
		session.endDialog();}
		}
});
});

}
else {		
MongoClient.connect(url,function(err,db){
		db.collection('student').findOne({"student":studentID},function(err,result){
		if(result.totaltime>14400 || result.totalattempt>20){
		session.send("不要著急，要不停下來休息一下？加油，你可以的！");
		session.endDialog();}
		else{
		if (tag){
		exec('python3 recomendation.py'+' '+studentID+' '+tag.entity,function(err,stdout,stderr){
		if(stdout){
		if(stdout==2||stdout==3){
		session.send("不要急，或者你可能需要更多的練習？");
		session.endDialog();
		}
		else {session.send("不要著急，針對"+tag.entity+",我覺得現階段練習"+stdout+'比較適合你，要不要再試試？');
		session.endDialog();
		}}
		if(err){session.send('抱歉，好像數據庫出錯了呢');
		session.endDialog();}
		if(stderr){session.send('好像有什麼地方出錯了~');
		session.endDialog();}
})
		}
		else {session.send('不要擔心，你可能只是練習不夠充足，試著繼續做點練習看看吧，會有進步的！');
		session.endDialog();}
		}
});
});
}
}
});
});
}

});

}

])//.triggerAction({
	//matches:'Confuse'});

