
const GLOB = require("glob");
const SERVER = require("io.pinf.server.www");


SERVER.for(module, __dirname, function(app) {

	app.get(/^\/$/, function (req, res, next) {
		return GLOB("*/*/*.html", {
			cwd: __dirname
		}, function (err, paths) {
			if (err) return next(err);

			var payload = [];
			payload.push('<h2>Manual Firebug Tests</h2>');
			payload.push('<ul>');
			paths.forEach(function(path) {
				payload.push('<li><a href="' + path + '">' + path + '</a></li>');
			});
			payload.push('</ul>');

			payload = payload.join("\n");

			res.writeHead(200, {
				"Content-Type": "text/html",
				"Content-Length": payload.length
			});

			return res.end(payload);
		});
	});

});
