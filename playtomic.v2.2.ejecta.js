/* Playtomic HTML5 API
 -----------------------------------------------------------------------
 Documentation is available at:
 https://playtomic.com/api/html5

 Support is available at:
 https://playtomic.com/community
 https://playtomic.com/issues
 https://playtomic.com/support has more options if you're a premium user

 Github repositories:
 https://github.com/playtomic

 You may modify this SDK if you wish but be kind to our servers.  Be
 careful about modifying the analytics stuff as it may give you
 borked reports.

 Pull requests are welcome if you spot a bug or know a more efficient
 way to implement something.

 Copyright (c) 2011 Playtomic Inc.  Playtomic APIs and SDKs are licensed
 under the MIT license.  Certain portions may come from 3rd parties and
 carry their own licensing terms and are referenced where applicable.
 */


var Playtomic = {};

(function() 
{
	var Temp = {};
	var SWFID = 0;
	var GUID = "";
	var Enabled = true;
	var SourceUrl = "";
	var UseSSL = false;
	var BaseUrl = "";
	var APIUrl = "";
	var APIKey = "";
	var Pings = 0;
	var FailCount = 0;
	var ScriptHolder = null;
	var Beacon = new Image();
	var URLStub = "";
	var URLTail = "";
	var SECTIONS = {};
	var ACTIONS = {};
	                 					
	// Logging
	(function()
	{
		var Request = new LogRequest();
		var Plays = 0;
		var Pings = 0;
		var PTime = 0;
		var FirstPing = true;
		var Frozen = false;
		var FrozenQueue = [];
		var Customs = [];
		var LevelCounters = [];
		var LevelAverages = [];
		var LevelRangeds = [];
		
		/**
		 * Adds an event and if ready or a view or not queuing, sends it
		 * @param	s	The event as an ev/xx string
		 * @param	view	If it's a view or not
		 */	
		function Send(data, forcesend)
		{		
			if(Frozen)
			{
				FrozenQueue.push(data);
				return;
			}
			
			if(Request == null)
			{
				Request = LogRequest();
			}

			Request.Queue(data);
			
			if(Request.Ready || forcesend)
			{
				Request.Send();
				Request = new LogRequest();
			}
		}
		
		/**
		 * Sends a PEvent
		 * @param	params	The data to send
		 * @param	location	The location of the player
		 */	
		function SendPEvent(params, location)
		{		
			if(location != null)
			{
				PData.locationbefore = PData.location;
				PData.location = location;
			}
			
			PData.timebefore = PData.time;
			PData.time = PTime;
			PData.eventnum++;
			PData.params = params == null ? {} : params;
			
			for(var x in Playtomic.PersistantParams)
				PData.params[x] = Playtomic.PersistantParams[x];
			
			var pda = "data=" + Escape(Encode.Base64(JSON.stringify(PData)));
			var request = window.XDomainRequest ? new XDomainRequest() : new XMLHttpRequest(); 
			var url = URLStub + "tracker/p.aspx?" + URLTail + "&" + Math.random() + "Z";
			
			/*request.onerror = function()
			{
				complete(callback, postdata, {}, Response(0, 1));
			};*/
			// I added this 
			request.onerror = function() {
//				console.log('SendPEvent error', request);
			};

			request.onload = function()
			{
			};
			
			if(window.XDomainRequest)
			{
				request.open("POST", url);
			}
			else
			{
				request.open("POST", url, true);
			}
			
//			console.log('sending pda data', pda);
//			console.log('the request', request);

			request.send(pda);
		}
		
		/**
		 * Sends a PEvent
		 * @param	params	The data to send
		 * @param	location	The location of the player
		 */	
		function SendReferrer(referrer)
		{
			var pda = "referrer=" + Escape(referrer);
			var request = window.XDomainRequest ? new XDomainRequest() : new XMLHttpRequest(); 
			var url = URLStub + "tracker/r.aspx?" + URLTail + "&" + Math.random() + "Z";
			
			/*request.onerror = function()
			{
				complete(callback, postdata, {}, Response(0, 1));
			};*/
			request.onerror = function() {
//				console.log('Sendreferrer error', request);
			};

			request.onload = function()
			{
			};
			
			if(window.XDomainRequest)
			{
				request.open("POST", url);
			}
			else
			{
				request.open("POST", url, true);
			}

//			console.log('sending pda data', pda);
//			console.log('the request', request);
			
			request.send(pda);
		}
		
		/**
		 * Increases the play time and triggers events being sent
		 */
		function Ping()
		{
			PTime++;
			
			if(!Enabled)
				return;
			
			if(PTime == 60)
			{
				Pings = 1;
				Send("t/y/1", true);						
			}
			else if(PTime > 60 && PTime % 30 == 0)
			{
				Pings++;
				Send("t/n/" + Pings, true);
			}
		}

		/**
		 * Cleans a piece of text of reserved characters
		 * @param	s	The string to be cleaned
		 */
		function Clean(s)
		{
			if(s == null || s == "")
				return "";

			s = s.toString();

			while(s.indexOf("/") > -1)
				s = s.replace("/", "\\");
				
			while(s.indexOf("~") > -1)
				s = s.replace("~", "-");				

			return escape(s);		
		}
		
		function Unescape(s)
		{
			return decodeURI(s).replace(/\+/g, " ");
		}
		
		/**
		 * Saves a localStorage or cookie value
		 * @param	key		The key (views, plays)
		 * @param	value	The value
		 */
		function SetCookie(key, value)
		{
			if(localStorage)
			{
				localStorage.setItem(key, value);
				return;
			}
			
			if(document)
			{
				var expires = new Date();
				expires.setDate(expires.getDate() + 30);
				document.cookie = key + "=" + escape(value) + ";expires=" + expires.toUTCString();
			}
		}

		/**
		 * Gets a localStorage or cookie value
		 * @param	key		The key (views, plays)
		 */
		function GetCookie(key)
		{
			if(localStorage)
			{
				return localStorage[key] || 0;
			}
			
			if(document.cookie.length == 0)
				return 0;

			var start = document.cookie.indexOf(key + "=");

			if (start == -1)
				return 0;
		
			start = start + key.length + 1;
			var end = document.cookie.indexOf(";", start);
			
			if (end == -1) 
				end = document.cookie.length;

			return unescape(document.cookie.substring(start, end));
		}
		
		/*
		 * PEvent data
		 */ 
		Playtomic.PersistantParams = {};
		Playtomic.PEventsEnabled = false;
		var PData = {};
		PData.params = {};
		
		/**
		 * Sets user defined session information.  Leave parameters empty strings to use default values
		 * @param	sessionid	Your own session id
		 * @param	referredby	The ad or campaign or other source this visitor came by
		 * @param	invitedby	The invitation that led to the player joining your game
		 */
		function SetSessionInfo(sessionid, referredby, invitedby)
		{
			if(sessionid != null && sessionid != "")
			{
				SetCookie("sessionid", sessionid);
				PData.sessionid = sessionid;
			}
			
			if(referredby != null && referredby != "")
			{
				SetCookie("referredby", referredby);
				PData.referredby = referredby;
			}
			
			if(invitedby != null && invitedby != "")
			{
				SetCookie("invitedby", invitedby);
				PData.invitedby = invitedby;
			}
		}
		
		/**
		 * Sets the player session up if it hasn't already been
		 */
		function SetSession()
		{
			if(!PData.session)
			{
				var csession = GetCookie("session");
				if(csession != "")
				{
					PData.session = csession;
				}
				else
				{
					PData.session = Encode.MD5(CreateSessionId() + CreateSessionId());
					SetCookie("session", PData.session);
				}
			}
			
			if(!PData.invitedby)
			{
				var cinvited = GetCookie("invitedby");
				PData.invitedby = cinvited == 0 ? "" : cinvited;
			}
			
			if(!PData.referredby)
			{
				var creferred = GetCookie("referredby");
				PData.referredby = creferred == 0 ? "" : creferred;
			}
		}
		
		/**
		 * Generates a likely-unique id
		 */
		function CreateSessionId()
		{
			var counter = 0;
			var Characters = "0123456789abcdef";
			var dt = new Date();
			var id1 = dt.getTime();
			var id2 = Math.random() * Number.MAX_VALUE;
			var src = id1 + id2 + counter++;
			
			return binb2hex(core_sha1(str2binb(src), src.length*8));

			function core_sha1(x, len) 
			{
				x[len >> 5] |= 0x80 << (24-len%32);
				x[((len+64 >> 9) << 4)+15] = len;
				
				var w = new Array(80);
				var a = 1732584193;
				var b = -271733879;
				var c = -1732584194;
				var d = 271733878;
				var e = -1009589776;
				
				for (var i = 0; i<x.length; i += 16) 
				{
					var olda = a;
					var oldb = b;
					var oldc = c;
					var oldd = d;
					var olde = e;
					
					for (var j = 0; j<80; j++) 
					{
						if (j<16) 
							w[j] = x[i+j];
						else 
							w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
						
						var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
						e = d; 
						d = c;
						c = rol(b, 30);
						b = a; 
						a = t;
					}
					
					a = safe_add(a, olda);
					b = safe_add(b, oldb);
					c = safe_add(c, oldc);
					d = safe_add(d, oldd);
					e = safe_add(e, olde);
				}
				
				return [a, b, c, d, e];
			}
		
			function sha1_ft(t, b, c, d) 
			{
				if (t<20) return (b & c) | ((~b) & d);
				if (t<40) return b ^ c ^ d;
				if (t<60) return (b & c) | (b & d) | (c & d);
				return b ^ c ^ d;
			}
		
			function sha1_kt(t) 
			{
				return (t<20) ? 1518500249 : (t<40) ? 1859775393 : (t<60) ? -1894007588 : -899497514;
			}
		
			function safe_add(x, y) 
			{
				var lsw = (x & 0xFFFF)+(y & 0xFFFF);
				var msw = (x >> 16)+(y >> 16)+(lsw >> 16);
				return (msw << 16) | (lsw & 0xFFFF);
			}
		
			function rol(num, cnt) 
			{
				return (num << cnt) | (num >>> (32-cnt));
			}
		
			function str2binb(str) 
			{
				var bin = new Array();
				var mask = (1 << 8)-1;
				
				for (var i = 0; i<str.length*8; i += 8) 
				{
					bin[i >> 5] |= (str.charCodeAt(i/8) & mask) << (24-i%32);
				}
				
				return bin;
			}
		
			function binb2hex(binarray) 
			{
				var str = "";
				
				for (var i = 0; i<binarray.length*4; i++) 
				{
					str += Characters.charAt((binarray[i >> 2] >> ((3-i%4)*8+4)) & 0xF) + Characters.charAt((binarray[i >> 2] >> ((3-i%4)*8)) & 0xF);
				}
				
				return str;
			}
		}
		
		/**
		 * Sets the API to use HTTPS for all communication.  This is a premium feature, if you are not a premium user this
		 * will not work.
		 */
		Playtomic.SetSSL = function()
		{
			UseSSL = true;
		}

		/**
		 * Initializes the API without sending a View.  This is for page-based sites and applications without a single persistant page
		 * @param	swfid		Your game id
		 * @param	guid		Your game guid
		 * @param	apikey		Your game API key
		 * @param	defaulturl	The default url
		 */
		Playtomic.Initialize = function(swfid, guid, apikey, defaulturl)
		{
			// game credentials
			if(SWFID > 0)
				return;

			SWFID = swfid;
			GUID = guid;
			Enabled = true;

			if(SWFID == 0 || GUID == "")
			{
				Enabled = false;
				return;
			}
					
			// game & api urls
			SourceUrl = defaulturl ? defaulturl.toString() : (document ? document.location.toString() : null);
			
			if(SourceUrl == null || SourceUrl == "" || SourceUrl.indexOf("http://") != 0)
				SourceUrl = "http://localhost/";
			
			BaseUrl = SourceUrl.split("://")[1];
			
			if(BaseUrl.indexOf("/") > -1)
				BaseUrl = BaseUrl.substring(0, BaseUrl.indexOf("/"));

			URLStub = (UseSSL ? "https://g" : "http://g") + GUID + ".api.playtomic.com/";
			URLTail = "swfid=" + SWFID + "&js=y";

            // debugging
            //URLStub = "http://127.0.0.1:3000/";
            //URLTail = "swfid=" + SWFID + "&guid=" + GUID + "&js=y&debug=yes";
			
			// section & actions
			SECTIONS = {
				"gamevars": Encode.MD5("gamevars-" + apikey),
				"geoip": Encode.MD5("geoip-" + apikey),
				"leaderboards": Encode.MD5("leaderboards-" + apikey),
				"playerlevels": Encode.MD5("playerlevels-" + apikey),
				"data": Encode.MD5("data-" + apikey),
				"parse": Encode.MD5("parse-" + apikey)						
			};
			
			ACTIONS = {
				"gamevars-load": Encode.MD5("gamevars-load-" + apikey),
				"gamevars-loadsingle": Encode.MD5("gamevars-loadsingle-" + apikey),
				"geoip-lookup": Encode.MD5("geoip-lookup-" + apikey),
				"leaderboards-list": Encode.MD5("leaderboards-list-" + apikey),
				"leaderboards-listfb": Encode.MD5("leaderboards-listfb-" + apikey),
				"leaderboards-save": Encode.MD5("leaderboards-save-" + apikey),
				"leaderboards-savefb": Encode.MD5("leaderboards-savefb-" + apikey),
				"leaderboards-saveandlist": Encode.MD5("leaderboards-saveandlist-" + apikey),
				"leaderboards-saveandlistfb": Encode.MD5("leaderboards-saveandlistfb-" + apikey),
				"leaderboards-createprivateleaderboard": Encode.MD5("leaderboards-createprivateleaderboard-" + apikey),
				"leaderboards-loadprivateleaderboard": Encode.MD5("leaderboards-loadprivateleaderboard-" + apikey),
				"playerlevels-save": Encode.MD5("playerlevels-save-" + apikey),
				"playerlevels-load": Encode.MD5("playerlevels-load-" + apikey),
				"playerlevels-list": Encode.MD5("playerlevels-list-" + apikey),
				"playerlevels-rate": Encode.MD5("playerlevels-rate-" + apikey),
				"data-views": Encode.MD5("data-views-" + apikey),
				"data-plays": Encode.MD5("data-plays-" + apikey),
				"data-playtime": Encode.MD5("data-playtime-" + apikey),
				"data-custommetric": Encode.MD5("data-custommetric-" + apikey),
				"data-levelcountermetric": Encode.MD5("data-levelcountermetric-" + apikey),
				"data-levelrangedmetric": Encode.MD5("data-levelrangedmetric-" + apikey),
				"data-levelaveragemetric": Encode.MD5("data-levelaveragemetric-" + apikey),
				"parse-save": Encode.MD5("parse-save-" + apikey),
				"parse-delete": Encode.MD5("parse-delete-" + apikey),
				"parse-load": Encode.MD5("parse-load-" + apikey),
				"parse-find": Encode.MD5("parse-find-" + apikey)	
			};
			
			// Create our script holder (not necesary now)
			//ScriptHolder = document.createElement("div");
			//ScriptHolder.style.position = "absolute";
			//document.getElementsByTagName("body")[0].appendChild(ScriptHolder);
			
			// Start the play timer
			setInterval(Ping, 1000);
			
			// PEvents
			if(!Playtomic.PEventsEnabled)
				return;

			PData.source = BaseUrl;
			PData.views = GetCookie("views");
			PData.time = 0;
			PData.eventnum = 0;
			PData.location = "initialize";
			PData.api = "html5";
			PData.apiversion = "2.0";
			
			SetSession();
			SendPEvent();
		};
				
		Playtomic.Log = {
							
			/**
			 * Logs a view and initializes the API.  You must do this first before anything else!
			 * @param	swfid		Your game id from the Playtomic dashboard
			 * @param	guid		Your game guid from the Playtomic dashboard
			 * @param	apikey		Your secret API key from the Playtomic dashboard
			 * @param	defaulturl	Should be root.loaderInfo.loaderURL or some other default url value to be used if we can't detect the page
			 */
			View: function(swfid, guid, apikey, defaulturl)
			{
				Playtomic.Initialize(swfid, guid, apikey, defaulturl);
	
				// Log the view (first or repeat visitor)
				var views = GetCookie("views");
				views++;
				SetCookie("views", views);
				Send("v/" + views, true);
			},
			
			/**
			 * Logs a play.  Call this when the user begins an actual game (eg clicks play button)
			 */
			Play: function()
			{
				if(!Enabled)
					return;
	
				LevelCounters = [];
				LevelAverages = [];
				LevelRangeds = [];
				Plays++;
				Send("p/" + Plays);
			},
			
			/**
			 * Logs a PEvent.
			 * @param	params		Any parameters you wish to include with the event such as gender, how they found your game, etc
			 * @param	location	The player's current location (eg main menu, level 1) 
			 */
			PEvent: function(params, location)
			{
				SendPEvent(params, location);
			},

			/**
			 * Logs a PEvent.
			 * @param	referrer	Any parameters you wish to include with the event such as gender, how they found your game, etc
			 */
			Referrer: function(referrer)
			{
				SendReferrer(referrer);
			},
			
			/**
			 * Logs a transaction in a PEvent
			 * @param	params		Any parameters you wish to include
			 * @param	location	The player's current location
			 * @param	transactions	Array of transactions: {item: string, quantity: int, price: number, any other properties you want}
			 */
			PTransaction: function(params, location, transactions)
			{
				var nparams = {};
				
				if(params != null) {
					for(var x in params) {
						nparams[x] = params[x];
					}
				}
				
				var total = 0;
				
				for(var i=0; i<transactions.length; i++)
				{
					if(!transactions[i].hasOwnProperty("item"))
					{
						//alert("** PEVENT ERROR ** Transaction is missing 'item'.\nThe transactions array must be {item: 'name', quantity: int, price: number, ... }");
						return;
					}
					
					if(!transactions[i].hasOwnProperty("quantity"))
					{
						//alert("** PEVENT ERROR ** Transaction is missing 'quantity'.\nThe transactions array must be {item: 'name', quantity: int, price: number, ... }");
						return;
					}
					
					if(!transactions[i].hasOwnProperty("price"))
					{
						//alert("** PEVENT ERROR ** Transaction is missing 'price'.\nThe transactions array must be {item: 'name', quantity: int, price: number, ... }");
						return;
					}
					
					total += transactions[i].price;
				}
				
				nparams.transactions = transactions;
				nparams.total = total;
				PData.transaction = true;
				SendPEvent(nparams, location);
				delete(PData.transaction);
			},
			
			/**
			 * Logs an invitation in a PEvent
			 * @param	params		Any parameters you wish to include
			 * @param	location	The player's current location
			 * @param	invitations	Array of friend id's invited, from Facebook or other
			 */
			PInvitation: function(params, location, invitations)
			{
				var nparams = {};
				
				if(params != null) {
					for(var x in params) {
						nparams[x] = params[x];
					}
				}
				
				nparams.invitations = invitations;
				nparams.total = invitations.length;
				PData.invitation = true;
				SendPEvent(nparams, location);
				delete(PData.invitation);
			},
							
			/**
			 * Logs the link results, internal use only.  The correct use is Link.Open(...)
			 * @param	levelid		The player level id
			 */
			Link: function(name, group, url, unique, total, fail)
			{
//                console.log(name, group, url);
				if(!Enabled)
					return;
				
				Send("l/" + Clean(name) + "/" + Clean(group) + "/" + Clean(url) + "/" + unique + "/" + total + "/" + fail);
			},
			
			/**
			 * Logs a custom metric which can be used to track how many times something happens in your game.
			 * @param	name		The metric name
			 * @param	group		Optional group used in reports
			 * @param	unique		Only count a metric one single time per view
			 */		
			CustomMetric: function(name, group, unique)
			{
//                console.log(name, group, unique);
				if(!Enabled)
					return;
	
				if(group == null || group == undefined)
					group = "";
	
				if(unique)
				{
					if(Customs.indexOf(name) > -1)
						return;
	
					Customs.push(name);
				}
					
				Send("c/" + Clean(name) + "/" + Clean(group));
			},
				
			/**
			 * Logs a level counter metric which can be used to track how many times something occurs in levels in your game.
			 * @param	name		The metric name
			 * @param	level		The level number as an integer or name as a string
			 * @param	unique		Only count a metric one single time per play
			 */
			LevelCounterMetric: function(name, level, unique)
			{
//                console.log(name, level, unique);
				if(!Enabled)
					return;
	
				if(unique)
				{
					var key = name + "." + level.toString();
					
					if(LevelCounters.indexOf(key) > -1)
						return;
	
					LevelCounters.push(key);
				}
				
				Send("lc/" + Clean(name) + "/" + Clean(level));
			},
	
			/**
			 * Logs a level ranged metric which can be used to track how many times a certain value is achieved in levels in your game.
			 * @param	name		The metric name
			 * @param	level		The level number as an integer or name as a string
			 * @param	value		The value being tracked
			 * @param	unique		Only count a metric one single time per play
			 */
			LevelRangedMetric: function(name, level, value, unique)
			{
//                console.log(name, group, value);
				if(!Enabled)
					return;
	
				if(unique)
				{
					var key = name + "." + level.toString();
					
					if(LevelRangeds.indexOf(key) > -1)
						return;
	
					LevelRangeds.push(key);
				}
				
				Send("lr/" + Clean(name) + "/" + Clean(level) + "/" + value);
			},
			
			/**
			 * Logs a level average metric which can be used to track the min, max, average and total values for an event.
			 * @param	name		The metric name
			 * @param	level		The level number as an integer or name as a string
			 * @param	value		The value being added
			 * @param	unique		Only count a metric one single time per play
			 */
			LevelAverageMetric: function(name, level, value, unique)
			{
//                console.log(name, level, value);
				if(!Enabled)
					return;
	
				if(unique)
				{
					var key = name + "." + level.toString();
					
					if(Log.LevelAverages.indexOf(key) > -1)
						return;
	
					LevelAverages.push(key);
				}
				
				Send("la/" + Clean(name) + "/" + Clean(level) + "/" + value);
			},
				
			/**
			 * Logs a heatmap which allows you to visualize where some event occurs.
			 * @param	metric		The metric you are tracking (eg clicks)
			 * @param	heatmap		The heatmap (it has the screen attached in Playtomic dashboard)
			 * @param	x			The x coordinate
			 * @param	y			The y coordinate
			 */
			Heatmap: function(metric, heatmap, x, y)
			{
				if(!Enabled)
					return;
	
				Send("h/" + Clean(metric) + "/" + Clean(heatmap) + "/" + x + "/" + y);
			},
			
			/**
			 * Not yet implemented :(
			 */
			Funnel: function(name, step, stepnum)
			{
				if(!Enabled)
					return;
	
				Send("f/" + Clean(name) + "/" + Clean(step) + "/" + num);
			},
			
			/**
			 * Logs a start of a player level, internal use only.  The correct use is PlayerLevels.LogStart(...);
			 * @param	levelid		The player level id
			 */			
			PlayerLevelStart: function(levelid)
			{
				if(!Enabled)
					return;
	
				Send("pls/" + levelid);
			},
			
			/**
			 * Logs a win on a player level, internal use only.  The correct use is PlayerLevels.LogWin(...);
			 * @param	levelid		The player level id
			 */
			PlayerLevelWin: function(levelid)
			{
				if(!Enabled)
					return;
	
				Send("plw/" + levelid);
			},
	
			/**
			 * Logs a quit on a player level, internal use only.  The correct use is PlayerLevels.LogQuit(...);
			 * @param	levelid		The player level id
			 */
			PlayerLevelQuit: function(levelid)
			{
				if(!Enabled)
					return;
	
				Send("plq/" + levelid);
			},
	
			/**
			 * Logs a retry on a player level, internal use only.  The correct use is PlayerLevels.LogRetry(...);
			 * @param	levelid		The player level id
			 */
			PlayerLevelRetry: function(levelid)
			{
				if(!Enabled)
					return;
	
				Send("plr/" + levelid);
			},
			
			/**
			 * Logs a flag on a player level, internal use only.  The correct use is PlayerLevels.Flag(...);
			 * @param	levelid		The player level id
			 */
			PlayerLevelFlag: function(levelid)
			{
				if(!Enabled)
					return;
	
				Send("plf/" + levelid);
			},
			
			/**
			 * Forces the API to send any unsent data now
			 */
			ForceSend: function()
			{
				if(!Enabled)
					return;
				
				if(Request == null)
					Request = new LogRequest();
	
				Request.Send();
				Request = new LogRequest();
			},
			
			/**
			 * Freezes the API so analytics events are queued but not sent
			 */		
			Freeze: function()
			{
				Frozen = true;
			},
			
			/**
			 * Unfreezes the API and sends any queued events
			 */		
			UnFreeze: function()
			{
				Frozen = false;
				
				if(FrozenQueue.length > 0)
				{
					Request.MassQueue();
				}
			}
		};
		
		function LogRequest()
		{
			var Data = [];
			var Ready = false;
	
			this.Queue = function(data)
			{
				Data.push(data);

				if(Data.length > 8)
				{
					Ready = true;
				}
			};

			this.Send = function()
			{
				/*var s = document.createElement("script");
				s.async = true;
				s.src = URLStub + "tracker/q.aspx?swfid=" + SWFID + "&q=" + Data.join("~") + "&url=" + SourceUrl + "&" + Math.random() + "z";
				ScriptHolder.innerHTML = "";
				ScriptHolder.appendChild(s);*/
                
                
				
				var url = URLStub + "tracker/q.aspx?swfid=" + SWFID + "&q=" + Data.join("~") + "&url=" + SourceUrl + "&" + Math.random() + "z";
				//console.log('send url', url);

				if (XMLHttpRequest) {
                    var xhr = new XMLHttpRequest();
                    if(true || "withCredentials" in xhr) {
                        xhr.open("get", url, true)
						xhr.send();
                        return;
                    }
				}
                
                if (typeof XDomainRequest != "undefined") {
                    //trace("with xdr");
					var xdr = new XDomainRequest();
					xdr.open("get", url);
					xdr.send();
				} else {
                    //trace("xhr is null");
				}
		    };
			
			this.SendPEvent = function(o)
			{
				/*var s = document.createElement("script");
				s.async = true;
				s.src = URLStub + "tracker/q.aspx?swfid=" + SWFID + "&q=" + Data.join("~") + "&url=" + SourceUrl + "&" + Math.random() + "z";
				ScriptHolder.innerHTML = "";
				ScriptHolder.appendChild(s);*/
			};		
		
			this.MassQueue = function(frozenqueue)
			{
				if(frozenqueue.length == 0)
				{
					Log.Request = this;
					return;
				}
				
				for(var i=frozenqueue.length-1; i>-1; i--)
				{
					Queue(frozenqueue[i]);
					frozenqueue.splice(i, 1);
					
					if(Ready)
					{
						Send();
						var request = new LogRequest();
						request.MassQueue(frozenqueue);
						return;
					}
				}
			};
		}
	}());
	
	// links
	(function()
	{
		var Clicks = [];
		
		Playtomic.Link = {
				
			/**
			 * Tracks the unique/total/failed(may not apply to JS) clicks the user experiences.
			 * @param	url			The url to open
			 * @param	name		A name for the URL (eg splashscreen)
			 * @param	group		The group for the reports (eg sponsor links)
			 * @param	options		Object with day, month, year properties or null for all time
			 */
			Track: function(url, name, group)
			{
				var unique = 0;
				var bunique = 0;
				var total = 0;
				var btotal = 0;
				var fail = 0;
				var bfail = 0;
				var key = url + "." + name;
				var result;
	
				var baseurl = url;
				baseurl = baseurl.replace("http://", "");
				
				if(baseurl.indexOf("/") > -1)
					baseurl = baseurl.substring(0, baseurl.indexOf("/"));
	
				if(baseurl.indexOf("?") > -1)
					baseurl = baseurl.substring(0, baseurl.indexOf("?"));
				
				baseurl = "http://" + baseurl + "/";
	
				var baseurlname = baseurl;
				
				if(baseurlname.indexOf("//") > -1)
					baseurlname = baseurlname.substring(baseurlname.indexOf("//") + 2);
				
				baseurlname = baseurlname.replace("www.", "");
	
				if(baseurlname.indexOf("/") > -1)
				{
					baseurlname = baseurlname.substring(0, baseurlname.indexOf("/"));
				}
	
				if(Clicks.indexOf(key) > -1)
				{
					total = 1;
				}
				else
				{
					total = 1;
					unique = 1;
					Clicks.push(key);
				}
	
				if(Clicks.indexOf(baseurlname) > -1)
				{
					btotal = 1;
				}
				else
				{
					btotal = 1;
					bunique = 1;
					Clicks.push(baseurlname);
				}
							
				Playtomic.Log.Link(baseurl, baseurlname.toLowerCase(), "DomainTotals", bunique, btotal, bfail);
				Playtomic.Log.Link(url, name, group, unique, total, fail);
				Playtomic.Log.ForceSend();
			},
			
			/**
			 * Opens the URL (popup blockers might screw things up though) + tracks the unique/total/failed(may not apply to JS) clicks the user experiences.
			 * @param	url			The url to open
			 * @param	name		A name for the URL (eg splashscreen)
			 * @param	group		The group for the reports (eg sponsor links)
			 * @param	options		Object with day, month, year properties or null for all time
			 */
			Open: function(url, name, group)
			{
				var page = window.open(url, "_blank");
				this.Track(url, name, group);
			}
		};
	}());
	
	// level sharing
	(function()
	{
		Playtomic.PlayerLevels = 
		{
			POPULAR: "popular",
			NEWEST: "newest",
	
			/**
			 * Saves a player level
			 * @param	level			The PlayerLevel to save
			 * @param	thumb			A movieclip or other displayobject (optional)
			 * @param	callback		Your function to receive the response:  function(level:PlayerLevel, response:Response)
			 */		
			Save: function(level, callback)
			{
				var postdata = {};
				postdata.nothumb = true;
				postdata.playerid = level.PlayerId;
				postdata.playersource = level.PlayerSource;
				postdata.playername = level.PlayerName;
				postdata.name = level.Name;
				
				var c = 0;
				
				if(level.CustomData)
				{
					for(var key in level.CustomData)
					{
						postdata["ckey" + c] = key;
						postdata["cdata" + c] = level.CustomData[key];
						c++;
					}
				}
		
				postdata.customfields= c;
				postdata.data = level.Data;
		
				SendAPIRequest(SECTIONS["playerlevels"], ACTIONS["playerlevels-save"], SaveComplete, callback, postdata);
			},				
			
			/**
			 * Loads a player level
			 * @param	levelid			The playerLevel.LevelId 
			 * @param	callback		Your function to receive the response:  function(response:Response)
			 */
			Load: function(levelid, callback)
			{				
				var postdata = {};
				postdata.levelid = levelid;
		
				SendAPIRequest(SECTIONS["playerlevels"], ACTIONS["playerlevels-load"], LoadComplete, callback, postdata);
			},
	
			/**
			 * Lists player levels
			 * @param	callback		Your function to receive the response:  function(response:Response)
			 * @param	options			The list options, see http://playtomic.com/api/as3#PlayerLevels
			 */
			List: function(callback, options)
			{
				if(options == null)
					options = new Object();
				
				var postdata = {};
		
				postdata.mode = options.mode ? options.mode : "popular";
				postdata.page = options.page ? options.page : 1;
				postdata.perpage = options.perpage ? options.perpage : 20;
				postdata.data = options.data || options.data == false ? (options.data ? "y" : "n") : "n";
				postdata.thumbs = "n";
				postdata.datemin = options.datemin ? options.datemin : "";
				postdata.datemax = options.datemax ? options.datemax : "";
				
				var customfilters = options.hasOwnProperty("customfilters") ? options["customfilters"] : {};
				var c = 0;
				
				for(var key in customfilters)
				{
					postdata["ckey" + c] = key;
					postdata["cdata" + c] = level.CustomData[key];
					c++;
				}
				
				postdata.filters = c;
				
				SendAPIRequest(SECTIONS["playerlevels"], ACTIONS["playerlevels-list"], ListComplete, callback, postdata);
			},
			
			/**
			 * Rates a player level
			 * @param	levelid			The playerLevel.LevelId 
			 * @param	rating			Integer from 1 to 10
			 * @param	callback		Your function to receive the response:  function(response:Response)
			 */
			Rate: function(levelid, rating, callback)
			{
				var postdata = {};
				postdata.levelid = levelid;
				postdata.rating = rating;
				
				SendAPIRequest(SECTIONS["playerlevels"], ACTIONS["playerlevels-rate"], RateComplete, callback, postdata);
			},
	
			/**
			 * Logs a start on a player level
			 * @param	levelid			The playerLevel.LevelId 
			 */
			LogStart: function(levelid)
			{
				Playtomic.Log.PlayerLevelStart(levelid);
			},
		
			/**
			 * Logs a quit on a player level
			 * @param	levelid			The playerLevel.LevelId 
			 */		
			LogQuit: function(levelid)
			{
				Playtomic.Log.PlayerLevelQuit(levelid);
			},
		
			/**
			 * Logs a win on a player level
			 * @param	levelid			The playerLevel.LevelId 
			 */
			LogWin: function(levelid)
			{
				Playtomic.Log.PlayerLevelWin(levelid);
			},
		
			/**
			 * Logs a retry on a player level
			 * @param	levelid			The playerLevel.LevelId 
			 */
			LogRetry: function(levelid)
			{
				Playtomic.Log.PlayerLevelRetry(levelid);
			},
		
			/**
			 * Flags a player level
			 * @param	levelid			The playerLevel.LevelId 
			 */	
			Flag: function(levelid)
			{
				Playtomic.Log.PlayerLevelFlag(levelid);
			}
		};
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function SaveComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			callback(data.LevelId, response);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function LoadComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;

			callback(data, response);
		}	
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function ListComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;

			callback(data.Levels, data.NumLevels, response);
		};
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function RateComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;

			callback(response);
		};
		
	}());
	
	// leaderboards
	(function()
	{
		Playtomic.Leaderboards = 
		{
			TODAY: "today",
			LAST7DAYS: "last7days",
			LAST30DAYS: "last30days",
			ALLTIME: "alltime",
			NEWEST: "newest",
	
			/**
			 * Lists scores from a table
			 * @param	table		The name of the leaderboard
			 * @param	callback	Callback function to receive the data:  function(scores:Array, numscores:int, response:Response)
			 * @param	options		The leaderboard options, check the documentation at http://playtomic.com/api/as3#Leaderboards
			 */		
			List: function(table, callback, options)
			{
				if(options == null)
					options = new Object();
				
				var highest = options.highest || options.highest == false ? options.highest : true;
				var facebook = options.facebook || options.facebook == false ? options.facebook : false;
				
				var postdata = {};
				postdata.highest = highest ? "y" : "n";
				postdata.facebook = facebook ? "y" : "n";
				postdata.mode = options.mode ? options.mode : "alltime";
				postdata.page = options.page ? options.page : 1;
				postdata.perpage = options.perpage ? options.perpage : 20;
						
				var customfilters = options.customfilters ? options.customfilters : {};
				var numcustomfilters = 0;
		
				for(var x in customfilters)
				{
					postdata["ckey" + numcustomfilters] = x;
					postdata["cdata" + numcustomfilters] = customfilters[x];
					numcustomfilters++;
				}
		
				var global = options.global || options.global == false ? options.global : true;
				postdata.url = (global ? "global" : SourceUrl);
				postdata.table = table;
				postdata.filters = numcustomfilters;
				
				var action = "leaderboards-list";
				
				if(facebook)
				{
					var friendslist = options.friendslist ? options.friendslist : [];
					
					if(friendslist.length > 0)
					{
						postdata.friendslist = friendslist.join(",");
					}
					
					action += "fb";
				}
		
				SendAPIRequest(SECTIONS["leaderboards"], ACTIONS[action], ListComplete, callback, postdata);		
			},
			
			/**
			 * Saves a user's score
			 * @param	score		The player's score as a PlayerScore
			 * @param	table		The name of the leaderboard
			 * @param	callback	Callback function to receive the data:  function(score:PlayerScore, response:Response)
			 * @param	options		The leaderboard options, check the documentation at http://playtomic.com/api/as3#Leaderboards
			 */		
			Save: function(score, table, callback, options)
			{
				if(options == null)
					options = new Object();
				
				var allowduplicates = options.allowduplicates || options.allowduplicates == false ? options.allowduplicates : false;
				var highest = highest = options.highest || options.highest == false ? options.highest : true;
				
				var postdata = {};
				postdata.allowduplicates = allowduplicates ? "y" : "n";
				postdata.highest = highest ? "y" : "n";
				postdata.table = table;
				postdata.name = score.Name;
				postdata.points = score.Points.toString();
				postdata.auth = Encode.MD5(SourceUrl + score.Points.toString());
				postdata.url = SourceUrl;

				if(score.FBUserId != null && score.FBUserId != "")
				{
					postdata.fbuserid = score.FBUserId;
					postdata.fb = "y";
				}
				else
				{
					postdata.fbuserid = "";
					postdata.fb = "n";
				}
		
				var c = 0;
		
				if(score.CustomData)
				{
					for(var key in score.CustomData)
					{
						postdata["ckey" + c] = key;
						postdata["cdata" + c] = score.CustomData[key];
						c++;
					}
				}
		
				postdata.customfields = c;
				
				SendAPIRequest(SECTIONS["leaderboards"], ACTIONS["leaderboards-save"], SaveComplete, callback, postdata);
			},
			
			/**
			 * Performs a save and a list in a single request that returns the player's score and page of scores it occured on
			 * @param	score		The player's score as a PlayerScore
			 * @param	table		The name of the leaderboard
			 * @param	callback	Callback function to receive the data:  function(scores:Array, numscores:int, response:Response)
			 * @param	options		The leaderboard options, check the documentation at http://playtomic.com/api/as3#Leaderboards
			 */
			SaveAndList: function(score, table, callback, saveoptions, listoptions)
			{
				// common data
				var postdata = {};
				postdata.table = table;
				
				// save data
				var allowduplicates = saveoptions.allowduplicates || saveoptions.allowduplicates == false ? saveoptions.allowduplicates : false;
				var highest = saveoptions.highest || saveoptions.highest == false ? saveoptions.highest : true;
				var facebook = saveoptions.facebook || saveoptions.facebook == false ? saveoptions.facebook : false;
				
				if(saveoptions == null)
					saveoptions = new Object();
					
				postdata.allowduplicates = allowduplicates ? "y" : "n";
				postdata.highest = highest ? "y" : "n";
				postdata.facebook = facebook ? "y" : "n";
				postdata.name = score.Name;
				postdata.points = score.Points.toString();
				postdata.auth = Encode.MD5(SourceUrl + score.Points.toString());
				postdata.url = SourceUrl;
		
				if(score.FBUserId != null && score.FBUserId != "")
				{
					postdata.fbuserid = score.FBUserId;
					postdata.fb = "y";
				}
				else
				{
					postdata.fbuserid = "";
					postdata.fb = "n";
				}
		
				var c = 0;
		
				if(score.CustomData)
				{
					for(var key in score.CustomData)
					{
						postdata["ckey" + c] = key;
						postdata["cdata" + c] = score.CustomData[key];
						c++;
					}
				}
		
				postdata.numfields = c;
				
				// list options
				if(listoptions == null)
					listoptions = new Object();
				
				var global = listoptions.global || listoptions.global == false ? listoptions.global : true;
				
				postdata.global = global ? "y" : "n";
				postdata.mode = listoptions.mode ? listoptions.mode : "alltime";
				postdata.perpage = listoptions.perpage ? listoptions.perpage : 20;
				
				var customfilters = listoptions.customfilters ? listoptions.customfilters : {};
				var numcustomfilters = 0;

				if(customfilters != null)
				{
					for(var key in customfilters)
					{
						postdata["lkey" + numcustomfilters] = key;
						postdata["ldata" + numcustomfilters] = customfilters[key];
						numcustomfilters++;
					}
				}
				
				postdata.numfilters = numcustomfilters;
				
				// extra wranging for facebook
				var action = "leaderboards-saveandlist";
				
				if(facebook)
				{
					var friendslist = listoptions.friendslist ? listoptions.friendslist : [];
					
					if(friendslist.length > 0)
					{
						postdata.friendslist = friendslist.join(",");
					}
					
					action += "fb";
				}
				
				SendAPIRequest(SECTIONS["leaderboards"], ACTIONS[action], ListComplete, callback, postdata);
			},
			
			/**
			 * Creates a private leaderboard for the user
			 * @param	table		The name of the leaderboard
			 * @param	permalink	The stem of the permalink, eg http://mywebsite.com/game.html?leaderboard=
			 * @param	callback	Callback function to receive the data:  function(leaderboard:Leaderboard, response:Response)
			 * @param	highest		The board's mode (true for highest, false for lowest)
			 */
			CreatePrivateLeaderboard: function(table, permalink, callback, highest)
			{
				var postdata = {};
				postdata.table = table;
				postdata.highest = (highest ? "y" : "n");
				postdata.permalink = permalink;
				
				SendAPIRequest(SECTIONS["leaderboards"], ACTIONS["leaderboards-createprivateleaderboard"], CreatePrivateLeaderboardComplete, callback, postdata);
			},
		
			/**
			 * Loads a private leaderboard
			 * @param	tableid		The id of the leaderboard
			 * @param	callback	Callback function to receive the data:  function(leaderboard:Leaderboard, response:Response)
			 */
			LoadPrivateLeaderboard: function(tableid, callback)
			{
				var postdata = {};
				postdata.tableid = tableid;
				
				SendAPIRequest(SECTIONS["leaderboards"], ACTIONS["leaderboards-loadprivateleaderboard"], CreatePrivateLeaderboardComplete, callback, postdata);
			}
		};	
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function ListComplete(callback, postdata, data, response) // also used for saveandlist
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback([], 0, response);
			}

			var scores = [];
			var arr = data.Scores;
	
			for(var i=0; i<arr.length; i++)
			{
				var score = {};
				score.Name = unescape(arr[i].Name);
				score.FBUserId = arr[i].FBUserId;
				score.Points = arr[i].Points;
				score.Website = arr[i].Website;
				score.SDate = arr[i].SDate;
				score.RDate = arr[i].RDate;
				score.Rank = arr[i].Rank;
				
				if(arr[i]["SubmittedOrBest"] != null)
				{
					score.SubmittedOrBest = arr[i].SubmittedOrBest == "true";
				}
				else
				{
					score.SubmittedOrBest = false;
				}
				
				score.CustomData = {};
				
				for(x in arr[i].CustomData)
					score.CustomData[x] = unescape(arr[i].CustomData[x]);
	
				scores[i] = score;
			}
	
			callback(scores, data.NumScores, response);
		}	
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function SaveComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;

			callback(response);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function CreatePrivateLeaderboardComplete(callback, postdata, data, response) // also used for loading
		{
			if(response.Success == false)
			{
				callback({}, response);
			}

			var leaderboard = { 
				TableId: data.TableId, 
				Name: data.Name, 
				Permalink: data.Permalink, 
				Bitly: data.Bitly,
				RealName: data.RealName
			};
			
			callback(leaderboard, response);
		}
	}());
	
	// data api
	(new function()
	{
		Playtomic.Data = 
		{
			/**
			 * Loads the views your game logged on a day or all time
			 * @param	callback	Your function to receive the data:  callback(data:Object, response:Response);
			 * @param	options		Object with day, month, year properties or null for all time
			 */
			Views: function(callback, options)
			{		
				General(ACTIONS["data-views"], "views", callback, options);
			},
	
			/**
			 * Loads the plays your game logged on a day or all time
			 * @param	callback	Your function to receive the data:  callback(data:Object, response:Response);
			 * @param	options		Object with day, month, year properties or null for all time
			 */
			Plays: function(callback, options)
			{		
				General(ACTIONS["data-plays"], "plays", callback, options);
			},
	
			/**
			 * Loads the playtime your game logged on a day or all time
			 * @param	callback	Your function to receive the data:  callback(data:Object, response:Response);
			 * @param	options		Object with day, month, year properties or null for all time
			 */			
			PlayTime: function(callback, options)
			{		
				General(ACTIONS["data-playtime"], "playtime", callback, options);
			},
			
			/**
			 * Loads a custom metric's data for a date or all time
			 * @param	metric		The name of your metric
			 * @param	callback	Your function to receive the data:  callback(data:Object, response:Response);
			 * @param	options		Object with day, month, year properties or null for all time
			 */
			CustomMetric: function(metric, callback, options)
			{
				if(options == null)
					options = {};
				
				var postdata = {};		
				postdata.day = options.day ? options.day : 0;
				postdata.month = options.month ? options.month : 0;
				postdata.year = options.year ? options.year : 0;
				
				SendAPIRequest(SECTIONS["data"], ACTIONS["data-custommetric"], CustomMetricComplete, callback, postdata);
			},
			
			/**
			 * Loads a level counter metric's data for a level on a date or all time
			 * @param	metric		The name of your metric
			 * @param	level		The level number (integer) or name (string)
			 * @param	callback	Your function to receive the data:  callback(data:Object, response:Response);
			 * @param	options		Object with day, month, year properties or null for all time
			 */
			LevelCounterMetric: function(metric, level, callback, options)
			{
				LevelMetric(ACTIONS["data-levelcountermetric"], metric, level, LevelCounterMetricComplete, callback, options);
			},
		
			/**
			 * Loads a level ranged metric's data for a level on a date or all time
			 * @param	metric		The name of your metric
			 * @param	level		The level number (integer) or name (string)
			 * @param	callback	Your function to receive the data:  callback(data:Object, response:Response);
			 * @param	options		Object with day, month, year properties or null for all time
			 */		
			LevelRangedMetric: function(metric, level, callback, options)
			{
				LevelMetric(ACTIONS["data-levelrangedmetric"], metric, level, LevelRangedMetricComplete, callback, options);
			},

			/**
			 * Loads a level average metric's data for a level on a date or all time
			 * @param	metric		The name of your metric
			 * @param	level		The level number (integer) or name (string)
			 * @param	callback	Your function to receive the data:  callback(data:Object, response:Response);
			 * @param	options		Object with day, month, year properties or null for all time
			 */			
			LevelAverageMetric: function(metric, level, callback, options)
			{
				LevelMetric(ACTIONS["data-levelaveragemetric"], metric, level, LevelAverageMetricComplete, callback, options);
			}
		};
		
		/**
		 * Passes a general request on
		 * @param	action		The action on the server
		 * @param	type		The type of data being requested
		 * @param	callback	The user's callback function
		 * @param	options		Object with day, month, year properties or null for all time
		 */
		function General(action, type, callback, options)
		{
			if(options == null)
				options = {};
			
			var postdata = {};
			postdata.type = type;
			postdata.day = options.day ? options.day : 0;
			postdata.month = options.month ? options.month : 0;
			postdata.year = options.year ? options.year : 0;
			
			SendAPIRequest(SECTIONS["data"], action, GeneralComplete, callback, postdata);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function GeneralComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}

			var result = {
				Name: postdata.type, 
				Day: postdata.day, 
				Month: postdata.month, 
				Year: postdata.year, 
				Value: data.Value
			};
			
			callback(result, response);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */	
		function CustomMetricComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}

			var result = {
				Name: "custommetric", 
				Day: postdata.day, 
				Month: postdata.month, 
				Year: postdata.year, 
				Value: data.Value
			};
			
			callback(result, response);
		}
				
		/**
		 * Passes a level metric request on
		 * @param	action		The action on the server
		 * @param	metric		The metric
		 * @param	level		The level number or name as a string
		 * @param	complete	The complete handler
		 * @param	callback	The user's callback function
		 * @param	options		Object with day, month, year properties or null for all time
		 */
		function LevelMetric(action, metric, level, complete, callback, options)
		{
			if(options == null)
				options = {};
			
			var postdata = {};	
			postdata.metric = metric;
			postdata.level = level;
			postdata.day = options.day ? options.day : 0;
			postdata.month = options.month ? options.month : 0;
			postdata.year = options.year ? options.year : 0;
			
			SendAPIRequest(SECTIONS["data"], action, complete, callback, postdata);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function LevelCounterMetricComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}

			var result = {
				Name: "levelcountermetric", 
				Metric: metric, 
				Level: level, 
				Day: day, 
				Month: month, 
				Year: year, 
				Value: data.Value
			};
			
			callback(result, response);
		};

		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */		
		function LevelRangedMetricComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}

			var result = {
				Name: "levelrangedmetric", 
				Metric: metric, 
				Level: level, 
				Day: day, 
				Month: month, 
				Year: year, 
				Data: data.Values
			};
			
			callback(result, response);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function LevelAverageMetricComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}
	
			var result = {
				Name: "levelaveragemetric", 
				Metric: metric, 
				Level: level, 
				Day: day, 
				Month: month, 
				Year: year, 
				Min: data.Min, 
				Max: data.Max, 
				Average: data.Average, 
				Total: data.Total
			};
				
			callback(data, response);
		}
	}());
	
	// geoip
	(new function()
	{
		Playtomic.GeoIP = 
		{
			/**
			 * Performs a country lookup on the player IP address
			 * @param	callback	Your function to receive the data:  callback(data:Object, response:Response);
			 * @param	view	If it's a view or not
			 */			
			Lookup: function(callback)
			{		
				SendAPIRequest(SECTIONS["geoip"], ACTIONS["geoip-lookup"], LookupComplete, callback, null);
			}
		};
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	status		The request status returned from the esrver (1 for success)
		 * @param	errorcode	The errorcode returned from the server (0 for none)
		 */	
		function LookupComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}
				
			callback(data, response);
		}
	}());
	
	// gamevars
	(new function()
	{	
		Playtomic.GameVars = 
		{
			/**
			 * Loads your GameVars 
			 * @param	callback	Your function to receive the data:  callback(gamevars, response);
			 */		
			Load: function(callback)
			{		
				SendAPIRequest(SECTIONS["gamevars"], ACTIONS["gamevars-load"], LoadComplete, callback, null);
			},
			
			/**
			 * Loads a single GameVar
			 * @param	name	The GameVar to load
			 * @param callback	Your function receive the data:  callback(gamevars, response);
			 */
			LoadSingle: function(name, callback)
			{
				var postdata = {};
				postdata.name = name;
				
				SendAPIRequest(SECTIONS["gamevars"], ACTIONS["gamevars-loadsingle"], LoadComplete, callback, postdata);
			}
		};
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	status		The request status returned from the esrver (1 for success)
		 * @param	errorcode	The errorcode returned from the server (0 for none)
		 */		
		function LoadComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}
				
			callback(data, response);
		}
	}());
	
	/**
	 * Creates a Parse.com database object
	 */
	Playtomic.PFObject = function()
	{
		this.ObjectId = "";
		this.ClassName = "";
		this.Data = {};
		this.UpdatedAt = null;
		this.CreatedAt = null;
		this.Password = "";
	};

	/**
	 * Creates a Parse.com database query object
	 */
	Playtomic.PFQuery = function()
	{
		this.ClassName = "";
		this.WhereData = {};
		this.Order = "";
		this.Limit = 10;
	};

	(function()
	{
		Playtomic.Parse = {
							
			/**
			 * Creates or updates an object in your Parse.com database
			 * @param	pobject		A ParseObject, if it has an objectId it will update otherwise save
			 * @param	callback	Callback function to receive the data:  function(pobject:ParseObject, response:Response)
			 */
			Save: function(pobject, callback)
			{
				SendAPIRequest(SECTIONS["parse"], ACTIONS["parse-save"], SaveComplete, callback, ObjectPostData(pobject));
			},
		
			/**
			 * Deletes an object in your Parse.com database
			 * @param	pobject		A ParseObject that must include the ObjectId
			 * @param	callback	Callback function to receive the data:  function(response:Response)
			 */	
			Delete: function(pobject, callback)
			{
				SendAPIRequest(SECTIONS["parse"], ACTIONS["parse-delete"], DeleteComplete, callback, ObjectPostData(pobject));
			},
		
			/**
			 * Loads a specific object from your Parse.com database
			 * @param	pobject		A ParseObject that must include the ObjectId and className
			 * @param	callback	Callback function to receive the data:  function(pobject:ParseObject, response:Response)
			 */
			Load: function(pobjectid, classname, callback)
			{
				var postdata = {};
				postdata.id = pobjectid;
				postdata.classname = classname;
				
				SendAPIRequest(SECTIONS["parse"], ACTIONS["parse-load"], LoadComplete, callback, postdata);
			},
		
			/**
			 * Finds objects matching the criteria in your ParseQuery
			 * @param	pquery		A ParseQuery object
			 * @param	callback	Callback function to receive the data:  function(objects:Array, response:Response)
			 */
			Find: function(pquery, callback)
			{
				var postdata = {};
				postdata.classname = pquery.ClassName;
				postdata.limit = pquery.Limit;
				postdata.order =  (pquery.Order != null && pquery.Order != "" ? pquery.Order : "created_at");
				
				for(var key in pquery.WhereData)
					postdata["data" + key] = pquery.WhereData[key];
					
				SendAPIRequest(SECTIONS["parse"], ACTIONS["parse-find"], FindComplete, callback, postdata);
			}
		};
	
		function ObjectPostData(pobject)
		{
			var postdata = {};
			postdata.classname = pobject.ClassName;
			postdata.id = (pobject.ObjectId == null ? "" : pobject.ObjectId);
			postdata.password = (pobject.Password == null ? "" : pobject.Password);

			for(var key in pobject.Data)
				postdata["data" + key] = pobject.Data[key];
			
			return postdata;
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function SaveComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;

			var po = new Playtomic.PFObject();
			po.ClassName = postdata.classname;
			po.Password = postdata.password;
			
			for(var key in postdata)
			{
				if(key.indexOf("data") == 0)
				{
					po.Data[key.substring(4)] = postdata[key];
				}
			}
			
			if(response.Success)
				po.ObjectId = data.id;
			
			callback(po, response);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function LoadComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}
			
			var po = new Playtomic.PFObject();
			po.ClassName = data.classname;
			po.ObjectId = data.id;
			po.Password = data.password;
			po.CreatedAt = DateParse(data.created);
			po.UpdatedAt = DateParse(data.updated);
			
			for(var key in data.fields)
			{
				po.Data[key] = data.fields[key];
			}
							
			callback(po, response);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function DeleteComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback(null, response);
				return;
			}
				
			callback(data, response);
		}
		
		/**
		 * Processes the response received from the server, returns the data and response to the user's callback
		 * @param	callback	The user's callback function
		 * @param	postdata	The data that was posted
		 * @param	data		The XML returned from the server
		 * @param	response	The response from the server
		 */
		function FindComplete(callback, postdata, data, response)
		{
			if(callback == null)
				return;
			
			if(response.Success == false)
			{
				callback([], response);
				return;
			}
			
			var results = [];
			
			for(var i=0; i<data.length; i++)
			{
				var ptemp = data[i];
				
				var po = new Playtomic.PFObject();
				po.ClassName = ptemp.classname;
				po.ObjectId = ptemp.id;
				po.Password = ptemp.password;
				po.CreatedAt = DateParse(ptemp.created);
				po.UpdatedAt = DateParse(ptemp.updated);
				
				for(var key in ptemp.fields)
				{
					po.Data[key] = ptemp.fields[key];
				}
								
				results.push(po);
			}
				
			callback(results, response);
		}
		
		/**
		 * Converts the server's MM/dd/yyyy hh:mm:ss into a Flash Date
		 * @param	date		The date from the XML
		 */	
		function DateParse(date)
		{
			var parts = date.split(" ");
			var dateparts = (parts[0].toString()).split("/");
			var timeparts = (parts[1].toString()).split(":");
			var day = parseInt(dateparts[1]);
			var month = parseInt(dateparts[0]);
			var year = parseInt(dateparts[2]);
			var hours = parseInt(timeparts[0]);
			var minutes = parseInt(timeparts[1]);
			var seconds = parseInt(timeparts[2]);

			return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
		}
		
	}());
	
	function Escape(str)
	{
		if(str == null)
			return "";
		
		str = str.toString();
		str = str.split("%").join("%25");
		str = str.split(";").join("%3B");
		str = str.split("?").join("%3F");
		str = str.split("/").join("%2F");
		str = str.split(":").join("%3A");
		str = str.split("#").join("%23");
		str = str.split("&").join("%26");
		str = str.split("=").join("%3D");
		str = str.split("+").join("%2B");
		str = str.split("$").join("%24");
		str = str.split(",").join("%2C");
		str = str.split(" ").join("%20");
		str = str.split("<").join("%3C");
		str = str.split(">").join("%3E");
		str = str.split("~").join("%7E");
		return str;
	}
	
	function SendAPIRequest(section, action, complete, callback, postdata)
	{
		var url = URLStub + "v3/api.aspx?" + URLTail + "&r=" + Math.random() + "Z";
        //url = "http://127.0.0.1:3000/v3/api.aspx?swfid=940628&guid=b7101c2a073d4e59&js=y&debug=yes";
		var timestamp = String(new Date().getTime()).substring(0, 10);
		var nonce = Encode.MD5(new Date().getTime() * Math.random() + GUID);
		
		var pd = ["nonce=" + nonce, "timestamp=" + timestamp];
		
		for(var key in postdata)
			pd.push(key + "=" + Escape(postdata[key]));
			
		GenerateKey("section", section, pd);
		GenerateKey("action", action, pd);
		GenerateKey("signature", nonce + timestamp + section + action + url + GUID, pd);

		var pda = "data=" + Escape(Encode.Base64(pd.join("&")));
		
		//trace(pd.join("<br>"));
		//trace("url: " + url);
		var request = window.XDomainRequest ? new XDomainRequest() : new XMLHttpRequest(); 
//		console.log('request', request);
		
		request.onerror = function()
		{
//			console.log('err!', request);
			complete(callback, postdata, {}, Response(0, 1));
		};

		request.onload = function()
		{
//			console.log('request.responseText', request.responseText);
			//alert(request.responseText);
			var data = JSON.parse(request.responseText);
			complete(callback, postdata, data.Data, Response(data.Status, data.ErrorCode));
		};
		
		if(window.XDomainRequest)
		{
			request.open("POST", url);
		}
		else
		{
			request.open("POST", url, true);
		}
//		console.log('request.send(pda)', pda);
		
		request.send(pda);
	}
	
	// Responses
	var ERRORS = 
	{
		// General Errors
		"0": "No error",
		"1": "General error, this typically means the player is unable to connect to the Playtomic servers",
		"2": "Invalid game credentials. Make sure you use your SWFID and GUID from the `API` section in the dashboard.",
		"3": "Request timed out.",
		"4": "Invalid request.",
		
		// GeoIP Errors
		"100": "GeoIP API has been disabled. This may occur if your game is faulty or overwhelming the Playtomic servers.",
		
		// Leaderboard Errors
		"200": "Leaderboard API has been disabled. This may occur if your game is faulty or overwhelming the Playtomic servers.",
		"201": "The source URL or name weren't provided when saving a score. Make sure the player specifies a name and the game is initialized before anything else using the code in the `Set your game up` section.",
		"202": "Invalid auth key. You should not see this normally, players might if they tamper with your game.",
		"203": "No Facebook user id on a score specified as a Facebook submission.",
		"204": "Table name wasn't specified for creating a private leaderboard.",
		"205": "Permalink structure wasn't specified: http://website.com/game/whatever?leaderboard=",
		"206": "Leaderboard id wasn't provided loading a private leaderboard.",
		"207": "Invalid leaderboard id was provided for a private leaderboard.",
		"208": "Player is banned from submitting scores in your game.",
		"209": "Score was not the player's best score.  You can notify the player, highlight their best score via score.SubmittedOrBest, or circumvent this by specifying 'allowduplicates' to be true in your save options.",

		// GameVars Errors
		"300": "GameVars API has been disabled. This may occur if your game is faulty or overwhelming the Playtomic servers.",
		
		// LevelSharing Errors
		"400": "Level sharing API has been disabled. This may occur if your game is faulty or overwhelming the Playtomic servers.",
		"401": "Invalid rating value (must be 1 - 10).",
		"402": "Player has already rated that level.",
		"403": "The level name wasn't provided when saving a level.",
		"404": "Invalid image auth. You should not see this normally, players might if they tamper with your game.",
		"405": "Invalid image auth (again). You should not see this normally, players might if they tamper with your game.",
		
		// Data API Errors
		"500": "Data API has been disabled. This may occur if the Data API is not enabled for your game, or your game is faulty or overwhelming the Playtomic servers.",
		
		// Playtomic + Parse.com Errors
		"600": "You have not configured your Parse.com database.  Sign up at Parse and then enter your API credentials in your Playtomic dashboard.",
		"601": "No response was returned from Parse.  If you experience this a lot let us know exactly what you're doing so we can sort out a fix for it.",
		"6021": "Parse's servers had an error.",
		"602101": "Object not found.  Make sure you include the classname and objectid and that they are correct.",
		"602102": "Invalid query.  If you think you're doing it right let us know what you're doing and we'll look into it.",
		"602103": "Invalid classname.",
		"602104": "Missing objectid.",
		"602105": "Invalid key name.",
		"602106": "Invalid pointer (not used anymore).",
		"602107": "Invalid JSON.",
		"602108": "Command unavailable."
	};

	function Response(status, errorcode)
	{
		//alert("Response " + status + " / " + errorcode + " / " + ERRORS[errorcode]);
		
		return {
			Success: status == 1, 
			ErrorCode: errorcode, 
			ErrorMessage: ERRORS[errorcode] 
		};
	};
	
	function GenerateKey(name, key, arr)
	{
		arr.sort();
		arr.push(name + "=" + Encode.MD5(arr.join("&") + key));
	}	
	
	function PostData(postdata, script, callback, failvalue)
	{
		//alert("posting " + postdata + " to " + url);
		var request;

		if(window.XDomainRequest)
		{
			request = new XDomainRequest(); 
			request.onerror = function()
			{
				callback(failvalue);
			};

			request.onload = function()
			{
				//alert(request.responseText);
				//callback(JSON.parse(request.responseText));
				
				var parsed;
				
				try
				{
					parsed = JSON.parse(request.responseText);
				}
				catch(s)
				{
					callback(failvalue);
					return;
				}
				
				callback(parsed);
			};

			if(postdata != "")
			{
				request.open("POST", script);
				request.send(postdata);
			}
			else
			{
				request.open("GET", script);
				request.send();
			}
		}
		else
		{
			request = new XMLHttpRequest();
//			console.log('request', request);

			request.onerror = function()
			{
//				console.log('an error', request);
				callback(failvalue);
			};

			request.onload = function()
			{
//				console.log(' a success', request);
				//alert(request.responseText);
				var parsed;
				
				try
				{
					parsed = JSON.parse(request.responseText);
				}
				catch(s)
				{
					callback(failvalue);
					return;
				}
				
				callback(parsed);
			};

			if(postdata != "")
			{
				request.open("POST", script, true);
				request.send(postdata);
			}
			else
			{
				request.open("GET", script, true);
				request.send();
			}
		}
	}
	
	// encoding is derived from these two sources:
	// Base64 encoding: http://www.webtoolkit.info/javascript-base64.html
	// MD5 enconding: Version 2.2 Copyright (C) Paul Johnston 1999 - 2009 See http://pajhome.org.uk/crypt/md5 for more info.
	var Encode = (new function()
	{
		var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var hex_chr = "0123456789abcdef";
		
		return {
			
			Base64: function(str) 
			{
			    var output = "";
			    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			    var i = 0;
	
			    str = _utf8_encode(str);
			
			    while (i < str.length) 
			    {
			        chr1 = str.charCodeAt(i++);
			        chr2 = str.charCodeAt(i++);
			        chr3 = str.charCodeAt(i++);
			        enc1 = chr1 >> 2;
			        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			        enc4 = chr3 & 63;
			
			        if (isNaN(chr2)) 
			            enc3 = enc4 = 64;
			        else if (isNaN(chr3)) 
			            enc4 = 64;
	
			        output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
			    }
			
			    return output;
			},

			MD5: function(str)
			{
				var x = str2blks_MD5(str);
				var a =  1732584193;
				var b = -271733879;
				var c = -1732584194;
				var d =  271733878;
	
				for(var i=0; i<x.length; i += 16)
				{
					var olda = a;
					var oldb = b;
					var oldc = c;
					var oldd = d;
		
					a = ff(a, b, c, d, x[i+ 0], 7 , -680876936);
					d = ff(d, a, b, c, x[i+ 1], 12, -389564586);
					c = ff(c, d, a, b, x[i+ 2], 17,  606105819);
					b = ff(b, c, d, a, x[i+ 3], 22, -1044525330);
					a = ff(a, b, c, d, x[i+ 4], 7 , -176418897);
					d = ff(d, a, b, c, x[i+ 5], 12,  1200080426);
					c = ff(c, d, a, b, x[i+ 6], 17, -1473231341);
					b = ff(b, c, d, a, x[i+ 7], 22, -45705983);
					a = ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
					d = ff(d, a, b, c, x[i+ 9], 12, -1958414417);
					c = ff(c, d, a, b, x[i+10], 17, -42063);
					b = ff(b, c, d, a, x[i+11], 22, -1990404162);
					a = ff(a, b, c, d, x[i+12], 7 ,  1804603682);
					d = ff(d, a, b, c, x[i+13], 12, -40341101);
					c = ff(c, d, a, b, x[i+14], 17, -1502002290);
					b = ff(b, c, d, a, x[i+15], 22,  1236535329);    
					a = gg(a, b, c, d, x[i+ 1], 5 , -165796510);
					d = gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
					c = gg(c, d, a, b, x[i+11], 14,  643717713);
					b = gg(b, c, d, a, x[i+ 0], 20, -373897302);
					a = gg(a, b, c, d, x[i+ 5], 5 , -701558691);
					d = gg(d, a, b, c, x[i+10], 9 ,  38016083);
					c = gg(c, d, a, b, x[i+15], 14, -660478335);
					b = gg(b, c, d, a, x[i+ 4], 20, -405537848);
					a = gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
					d = gg(d, a, b, c, x[i+14], 9 , -1019803690);
					c = gg(c, d, a, b, x[i+ 3], 14, -187363961);
					b = gg(b, c, d, a, x[i+ 8], 20,  1163531501);
					a = gg(a, b, c, d, x[i+13], 5 , -1444681467);
					d = gg(d, a, b, c, x[i+ 2], 9 , -51403784);
					c = gg(c, d, a, b, x[i+ 7], 14,  1735328473);
					b = gg(b, c, d, a, x[i+12], 20, -1926607734);
					a = hh(a, b, c, d, x[i+ 5], 4 , -378558);
					d = hh(d, a, b, c, x[i+ 8], 11, -2022574463);
					c = hh(c, d, a, b, x[i+11], 16,  1839030562);
					b = hh(b, c, d, a, x[i+14], 23, -35309556);
					a = hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
					d = hh(d, a, b, c, x[i+ 4], 11,  1272893353);
					c = hh(c, d, a, b, x[i+ 7], 16, -155497632);
					b = hh(b, c, d, a, x[i+10], 23, -1094730640);
					a = hh(a, b, c, d, x[i+13], 4 ,  681279174);
					d = hh(d, a, b, c, x[i+ 0], 11, -358537222);
					c = hh(c, d, a, b, x[i+ 3], 16, -722521979);
					b = hh(b, c, d, a, x[i+ 6], 23,  76029189);
					a = hh(a, b, c, d, x[i+ 9], 4 , -640364487);
					d = hh(d, a, b, c, x[i+12], 11, -421815835);
					c = hh(c, d, a, b, x[i+15], 16,  530742520);
					b = hh(b, c, d, a, x[i+ 2], 23, -995338651);
					a = ii(a, b, c, d, x[i+ 0], 6 , -198630844);
					d = ii(d, a, b, c, x[i+ 7], 10,  1126891415);
					c = ii(c, d, a, b, x[i+14], 15, -1416354905);
					b = ii(b, c, d, a, x[i+ 5], 21, -57434055);
					a = ii(a, b, c, d, x[i+12], 6 ,  1700485571);
					d = ii(d, a, b, c, x[i+ 3], 10, -1894986606);
					c = ii(c, d, a, b, x[i+10], 15, -1051523);
					b = ii(b, c, d, a, x[i+ 1], 21, -2054922799);
					a = ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
					d = ii(d, a, b, c, x[i+15], 10, -30611744);
					c = ii(c, d, a, b, x[i+ 6], 15, -1560198380);
					b = ii(b, c, d, a, x[i+13], 21,  1309151649);
					a = ii(a, b, c, d, x[i+ 4], 6 , -145523070);
					d = ii(d, a, b, c, x[i+11], 10, -1120210379);
					c = ii(c, d, a, b, x[i+ 2], 15,  718787259);
					b = ii(b, c, d, a, x[i+ 9], 21, -343485551);
		
					a = addme(a, olda);
					b = addme(b, oldb);
					c = addme(c, oldc);
					d = addme(d, oldd);
				}
		
				return rhex(a) + rhex(b) + rhex(c) + rhex(d);
			}
		};
		
		function _utf8_encode(string) 
		{
		    string = string.replace(/\r\n/g,"\n");
		    var utftext = "";
		
		    for (var n = 0; n < string.length; n++) 
		    {
		        var c = string.charCodeAt(n);
		
		        if (c < 128) 
		        {
		            utftext += String.fromCharCode(c);
		        }
		        else if((c > 127) && (c < 2048)) 
		        {
		            utftext += String.fromCharCode((c >> 6) | 192);
		            utftext += String.fromCharCode((c & 63) | 128);
		        }
		        else 
		        {
		            utftext += String.fromCharCode((c >> 12) | 224);
		            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
		            utftext += String.fromCharCode((c & 63) | 128);
		        }
		    }
		
		    return utftext;
		}
				
		function bitOR(a, b)
		{
			var lsb = (a & 0x1) | (b & 0x1);
			var msb31 = (a >>> 1) | (b >>> 1);

			return (msb31 << 1) | lsb;
		}

		function bitXOR(a, b)
		{			
			var lsb = (a & 0x1) ^ (b & 0x1);
			var msb31 = (a >>> 1) ^ (b >>> 1);

			return (msb31 << 1) | lsb;
		}
		
		function bitAND(a, b)
		{ 
			var lsb = (a & 0x1) & (b & 0x1);
			var msb31 = (a >>> 1) & (b >>> 1);

			return (msb31 << 1) | lsb;
		}

		function addme(x, y)
		{
			var lsw = (x & 0xFFFF)+(y & 0xFFFF);
			var msw = (x >> 16)+(y >> 16)+(lsw >> 16);

			return (msw << 16) | (lsw & 0xFFFF);
		}

		function rhex(num)
		{
			var str = "";
			var j;

			for(j=0; j<=3; j++)
				str += hex_chr.charAt((num >> (j * 8 + 4)) & 0x0F) + hex_chr.charAt((num >> (j * 8)) & 0x0F);

			return str;
		}

		function str2blks_MD5(str)
		{
			var nblk = ((str.length + 8) >> 6) + 1;
			var blks = new Array(nblk * 16);
			var i;

			for(i=0; i<nblk * 16; i++) 
				blks[i] = 0;
																
			for(i=0; i<str.length; i++)
				blks[i >> 2] |= str.charCodeAt(i) << (((str.length * 8 + i) % 4) * 8);

			blks[i >> 2] |= 0x80 << (((str.length * 8 + i) % 4) * 8);

			var l = str.length * 8;
			blks[nblk * 16 - 2] = (l & 0xFF);
			blks[nblk * 16 - 2] |= ((l >>> 8) & 0xFF) << 8;
			blks[nblk * 16 - 2] |= ((l >>> 16) & 0xFF) << 16;
			blks[nblk * 16 - 2] |= ((l >>> 24) & 0xFF) << 24;

			return blks;
		}
		
		function rol(num, cnt)
		{
			return (num << cnt) | (num >>> (32 - cnt));
		}

		function cmn(q, a, b, x, s, t)
		{
			return addme(rol((addme(addme(a, q), addme(x, t))), s), b);
		}

		function ff(a, b, c, d, x, s, t)
		{
			return cmn(bitOR(bitAND(b, c), bitAND((~b), d)), a, b, x, s, t);
		}

		function gg(a, b, c, d, x, s, t)
		{
			return cmn(bitOR(bitAND(b, d), bitAND(c, (~d))), a, b, x, s, t);
		}

		function hh(a, b, c, d, x, s, t)
		{
			return cmn(bitXOR(bitXOR(b, c), d), a, b, x, s, t);
		}

		function ii(a, b, c, d, x, s, t)
		{
			return cmn(bitXOR(c, bitOR(b, (~d))), a, b, x, s, t);
		}
		
	}());

}());









// JSON via json.org
if (!this.JSON) {
    this.JSON = {};
}

(function () {

    function f(n) {
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                   this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {


        var i, 
            k,  
            v,    
            length,
            mind = gap,
            partial,
            value = holder[key];

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }


        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }


        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':


            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':


            return String(value);


        case 'object':


            if (!value) {
                return 'null';
            }


            gap += indent;
            partial = [];


            if (Object.prototype.toString.apply(value) === '[object Array]') {


                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }


                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }


            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {


                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }


            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }


    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {


            var i;
            gap = '';
            indent = '';

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }


            } else if (typeof space === 'string') {
                indent = space;
            }

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

            return str('', {'': value});
        };
    }



    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {


            var j;

            function walk(holder, key) {


                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }


            if (/^[\],:{}\s]*$/
.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
.replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {


                j = eval('(' + text + ')');


                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

            throw new SyntaxError('JSON.parse');
        };
    }
}());
