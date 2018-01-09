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
    super_ada: false,
    keywords: ["ada"],
    pages: [],
    icons: [],
    related_applications: [{"platform": "web"}],
    page: {
        charset: "UTF-8",
        meta: {
            viewport: "width=device-width, initial-scale=1.0, minimum-scale=1.0, user-scalable=no",
            format_detection: "telephone=no",
            apple_mobile_web_app_status_bar_style: "white",
            apple_mobile_web_app_capable: "yes"
        },
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
                "@babel/typescript", ["@babel/env", {"targets": {"browsers": "last 2 Chrome versions"}}]
            ],
            plugins: ["transform-decorators", "@babel/transform-async-to-generator", "@babel/syntax-dynamic-import"]
        },
        uglify: {},
        uglifycss: {},
        autoprefixer: {},
        sass: {},
        minifier: {}
    }
};