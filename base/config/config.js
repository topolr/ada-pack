module.exports = {
    name: "ada",
    base_path: "/",
    source_path: "./src/",
    dist_path: "./dist/",
    index_path: "./dist/index.html",
    site_url: "/",
    regist_service: false,
    short_name: "ada",
    start_url: "/",
    display: "standalone",
    background_color: "#fff",
    theme_color: "#fff",
    description: "ada web framework.",
    main: "./src/root.js",
    entry_path: "",
    entry_auto: true,
    ada_autobundle: true,
    super_ada: false,
    keywords: ["ada"],
    pages: [],
    icons: [],
    related_applications: [{"platform": "web"}],
    ignore: [],
    page: {
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
    worker: {
        scope: "/",
        beforeregist(regist) {
            regist().then(reg => {
                if (reg.installing) {
                    console.log('Service worker installing');
                } else if (reg.waiting) {
                    console.log('Service worker installed');
                } else if (reg.active) {
                    console.log('Service worker active');
                }
            }).catch(e => {
                console.log('Registration failed with ' + e);
            });
        },
        oninstall(event) {
            event.waitUntil(caches.open('v1').then(function (cache) {
                return cache.addAll(["/", '/dist/ada.js']);
            }));
        },
        onfetch(event) {
            event.respondWith(caches.match(event.request).then(function (response) {
                if (response !== undefined) {
                    return response;
                } else {
                    return fetch(event.request).then(function (response) {
                        let responseClone = response.clone();
                        caches.open('v1').then(function (cache) {
                            cache.put(event.request, responseClone);
                        });
                        return response;
                    }).catch(function () {
                        return caches.match('/sw-test/gallery/myLittleVader.jpg');
                    });
                }
            }));
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
        serverPath: "./server.js"
    },
    proxy: {
        server: "",
        path: [],
        option: {}
    },
    onbeforebundle(config) {
        return Promise.resolve(config);
    },
    onbundled(info) {
        return Promise.resolve();
    }
};