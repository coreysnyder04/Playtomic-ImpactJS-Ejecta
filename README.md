Playtomic-ImpactJS-Ejecta
=========================

For anyone who's trying to use the playtomic API in their ImpactJS Ejecta games, here's the version you should be using.

Include the file inside your 'App/index.js' file include the API
<pre><code>
ejecta.require('lib/playtomic/playtomic.v2.2.ejecta.js');
</code></pre>


Inside your main.js file add the Log.View call
<pre><code>
Playtomic.Log.View(
	'951XXX',
	'3662178XXXXXXX',
	'63e10e10db12XXXXXXXXXXXXX',
	{
		hash: "#",
		host: "MyAppName",
		hostname: "MyAppName",
		href: "MyAppName",
		origin: "MyAppName",
		pathname: "/",
		port: "",
		protocol: "http:",
		search: ""
	}
);
ig.main('#canvas', MyGame, 60, width, height, 1, ig.ImpactSplashLoader );
</code></pre>

Then You can start throwing events inside of your code:
<pre><code>
Playtomic.Log.Play();
Playtomic.Log.LevelCounterMetric("Failed", ig.game.currentLevel);
Playtomic.Log.LevelAverageMetric("MissedShots", ig.game.currentLevel, this.missedShots);
</code></pre>





