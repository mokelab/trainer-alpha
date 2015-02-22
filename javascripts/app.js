/// <reference path="kiilib/kii/KiiAppAPI.ts" />
/// <reference path="kiilib/KiiApp.ts" />
var APP_ID = "4769da4c";
var APP_KEY = "ad1bb6acb266b0fa0288c47d7cbc85a1";
var BASE_URL = "https://api-jp.kii.com/api";

var $;
var _;
var Backbone;

var AppRouter = Backbone.Router.extend({
    routes: {
        "": "top",
        "main": "main"
    },
    initialize: function () {
        _.bindAll(this, 'top', 'main');
    },
    top: function () {
        app.service = new TitleServiceImpl();
        app.ractive = new Ractive({
            el: '#container',
            template: '#topTemplate'
        });
        app.ractive.on('login', function (e) {
            var email = app.ractive.get('email');
            var password = app.ractive.get('password');
            app.service.login(email, password);
        });
    },
    main: function () {
        if (app.context === undefined || app.context.getAccessToken() == null) {
            app.router.navigate('', { trigger: true });
            return;
        }
        app.service = new MainServiceImpl();
        app.ractive = new Ractive({
            el: '#container',
            template: '#mainTemplate',
            data: {
                user: app.user,
                courses: [],
                getCourse: function (id, list) {
                    for (var i = 0; i < list.length; ++i) {
                        if (list[i].id == id) {
                            return list[i];
                        }
                    }
                    return { data: { title: "(削除されたコース)" } };
                }
            }
        });
        app.ractive.on('courseClicked', function (e, index) {
            app.service.courseSelected(index);
        });
        app.service.getCourses();
    }
});

var TitleServiceImpl = (function () {
    function TitleServiceImpl() {
    }
    TitleServiceImpl.prototype.login = function (email, password) {
        var _this = this;
        app.kii.login(email, password, {
            success: function (user) {
                _this.getUser(user.getId());
            },
            error: function (status, body) {
                console.log("Error " + status);
            }
        });
    };
    TitleServiceImpl.prototype.getUser = function (id) {
        var _this = this;
        app.kii.userAPI().fetchUser(id, {
            success: function (user) {
                app.user = user;
                _this.showMainPage();
            },
            error: function (status, body) {
                console.log("Error " + status);
            }
        });
    };
    TitleServiceImpl.prototype.showMainPage = function () {
        app.router.navigate('main', { trigger: true });
    };
    return TitleServiceImpl;
})();

var MainServiceImpl = (function () {
    function MainServiceImpl() {
    }
    MainServiceImpl.prototype.getCourses = function () {
        var _this = this;
        var bucket = new Kii.KiiBucket(new Kii.KiiGroup('vtncvzi8ykjklcirqm54egbjb'), 'cources');
        var params = new Kii.QueryParams(Kii.KiiClause.all());

        app.kii.bucketAPI().query(bucket, params, {
            success: function (results, params) {
                var user = app.ractive.get('user');
                app.ractive.set('courses', results);
                app.ractive.set('currentCourses', _this.toArray(user.data.currentCourses));
                app.ractive.update();
                console.log('result count=' + results.length);
            },
            error: function (status, body) {
                console.log("Error " + status);
            }
        });
        //app.kii.objectAPI().create(bucket, {
        //            'title' : 'Git(2)',
        //            'description' : 'リモートリポジトリの使い方を学びます。',
        //            'url' : '',
        //        });
    };
    MainServiceImpl.prototype.toArray = function (obj) {
        var array = [];
        for (var key in obj) {
            obj.id = key;
            array.push(obj);
        }
        return array;
    };
    MainServiceImpl.prototype.courseSelected = function (index) {
        var user = app.ractive.get('user');
        var courses = app.ractive.get('courses');
        var course = courses[index];
        if (course.getId() in user.data.currentCourses) {
            alert('このコースは学習中です！');
            return;
        }
        if (user.data.point <= 0) {
            alert('ポイント不足です！');
            return;
        }
        if (!confirm('このコースの学習を開始しますか？')) {
            return;
        }
        this.startCourse(user, course);
    };
    MainServiceImpl.prototype.startCourse = function (user, course) {
        user.data.point--;
        user.data.currentCourses[course.getId()] = {
            "date": new Date().getTime()
        };
        app.kii.userAPI().update(user, {
            success: function (user) {
                app.ractive.update();
            },
            error: function (status, body) {
                console.log('failed to update');
            }
        });
    };
    return MainServiceImpl;
})();

var app = {
    router: null,
    context: null,
    kii: null,
    service: null,
    ractive: null,
    user: null
};

$((function (app) {
    return function () {
        app.context = new Kii.KiiContext(APP_ID, APP_KEY, BASE_URL);
        app.kii = new Kii.KiiAppAPI(app.context);
        app.router = new AppRouter();
        Backbone.history.start();
    };
})(app));
