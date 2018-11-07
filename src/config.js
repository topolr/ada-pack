module.exports = {
	basePath: "/",
	sourcePath: "./src/",
	distPath: "./dist/",
	indexPath: "./dist/index.html",
	siteURL: "/",
	main: "./src/root.js",
	initer: "",
	worker: {
		scope: "/",
		path: ""
	},
	entryPath: "./src/entries",
	staticPath: "./src/static",
	ignore: [],
	baseInfo: {
		name: "ada",
		icons: [],
		short_name: "ada",
		start_url: "/",
		display: "standalone",
		background_color: "#fff",
		theme_color: "#fff",
		description: "ada web framework.",
		related_applications: [{"platform": "web"}],
		keywords: "",
		charset: "UTF-8",
		meta: [
			{name: 'viewport', content: "width=device-width, initial-scale=1.0, minimum-scale=1.0, user-scalable=no"},
			{name: 'format_detection', content: "telephone=no"},
			{name: 'apple_mobile_web_app_status_bar_style', content: "white"},
			{name: 'apple_mobile_web_app_capable', content: "yes"}
		],
		link: [],
		style: [],
		script: []
	},
	dependence: {
		js: {
			dependence: {
				"uglify-es": "^3.3.8",
				"@babel/cli": "^7.1.0",
				"@babel/core": "^7.1.0",
				"@babel/runtime-corejs2": "^7.1.2",
				"@babel/plugin-proposal-class-properties": "^7.1.0",
				"@babel/plugin-proposal-decorators": "^7.0.0-beta.52",
				"@babel/plugin-proposal-do-expressions": "^7.0.0",
				"@babel/plugin-proposal-function-bind": "^7.0.0",
				"@babel/plugin-proposal-object-rest-spread": "^7.0.0",
				"@babel/plugin-syntax-dynamic-import": "^7.0.0",
				"@babel/plugin-syntax-export-extensions": "^7.0.0-beta.32",
				"@babel/plugin-transform-async-to-generator": "^7.1.0",
				"@babel/plugin-transform-runtime": "^7.1.0",
				"@babel/polyfill": "^7.0.0",
				"@babel/preset-env": "^7.1.0",
				"@babel/preset-typescript": "^7.1.0",
				"@babel/register": "^7.0.0",
				"@babel/runtime": "^7.0.0",
			},
			maker: require("./lib/maker/jsmaker")
		},
		css: {
			dependence: {
				"autoprefixer": "^7.1.6",
				"postcss": "^5.2.5",
				"uglifycss": "^0.0.25",
				"html-minifier": "^3.5.6"
			},
			maker: require("./lib/maker/cssmaker")
		},
		scss: {
			dependence: {
				"autoprefixer": "^7.1.6",
				"postcss": "^5.2.5",
				"uglifycss": "^0.0.25",
				"node-sass": "^3.10.1",
				"html-minifier": "^3.5.6"
			},
			maker: require("./lib/maker/sassmaker")
		},
		less: {
			dependence: {
				"autoprefixer": "^7.1.6",
				"postcss": "^5.2.5",
				"uglifycss": "^0.0.25",
				"less": "^2.7.1",
				"html-minifier": "^3.5.6"
			},
			maker: require("./lib/maker/lessmaker")
		},
		json: {
			dependence: {},
			maker: require("./lib/maker/jsonmaker")
		},
		html: {
			dependence: {
				"html-minifier": "^3.5.6"
			},
			maker: require("./lib/maker/htmlmaker")
		},
		icon: {
			dependence: {
				"html-minifier": "^3.5.6"
			},
			maker: require("./lib/maker/iconmaker")
		},
		ts: {
			dependence: {
				"typescript": "^2.6.2",
				"uglify-es": "^3.3.8",
				"@babel/cli": "^7.1.0",
				"@babel/core": "^7.1.0",
				"@babel/runtime-corejs2": "^7.1.2",
				"@babel/plugin-proposal-class-properties": "^7.1.0",
				"@babel/plugin-proposal-decorators": "^7.0.0-beta.52",
				"@babel/plugin-proposal-do-expressions": "^7.0.0",
				"@babel/plugin-proposal-function-bind": "^7.0.0",
				"@babel/plugin-proposal-object-rest-spread": "^7.0.0",
				"@babel/plugin-syntax-dynamic-import": "^7.0.0",
				"@babel/plugin-syntax-export-extensions": "^7.0.0-beta.32",
				"@babel/plugin-transform-async-to-generator": "^7.1.0",
				"@babel/plugin-transform-runtime": "^7.1.0",
				"@babel/polyfill": "^7.0.0",
				"@babel/preset-env": "^7.1.0",
				"@babel/preset-typescript": "^7.1.0",
				"@babel/register": "^7.0.0",
				"@babel/runtime": "^7.0.0",
			},
			maker: require("./lib/maker/tsmaker")
		}
	},
	compiler: {
		babel: {
			presets: [
				"@babel/typescript", ["@babel/env", {"targets": {"chrome": "59"}}]
			],
			plugins: [
				["@babel/plugin-transform-runtime", {
					"helpers": false,
					"regenerator": true
				}],
				["@babel/plugin-proposal-decorators", {"legacy": true}],
				["@babel/plugin-proposal-class-properties", {"loose": true}],
				"@babel/transform-async-to-generator",
				"@babel/plugin-syntax-dynamic-import",
				"@babel/plugin-proposal-function-bind",
				"@babel/plugin-syntax-export-extensions",
				"@babel/plugin-proposal-do-expressions",
				"@babel/plugin-proposal-object-rest-spread"
			]
		},
		uglify: {},
		uglifycss: {},
		autoprefixer: {},
		sass: {},
		minifier: {},
		typescript: ["--target ESNext", "--noEmit", "--pretty", "--skipLibCheck", "--experimentalDecorators"]
	},
	server: {
		protocol: "http",
		host: "localhost",
		port: "8080",
		serverPath: "./server.js",
		proxy: null
	},
	hook: []
};