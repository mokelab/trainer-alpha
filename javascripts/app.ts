/// <reference path="kiilib/kii/KiiAppAPI.ts" />
/// <reference path="kiilib/KiiApp.ts" />
var APP_ID = "4769da4c";
var APP_KEY = "ad1bb6acb266b0fa0288c47d7cbc85a1";
var BASE_URL = "https://api-jp.kii.com/api";

var $ : any;
var _ : any;
var Backbone : any;
declare class Ractive {
    constructor(param : any);
}

var AppRouter = Backbone.Router.extend({
    routes : {
        "" : "top",
        "main" : "main",
    },
    initialize : function() {
        _.bindAll(this, 'top', 'main');
    },
    top : () => {
        app.service = new TitleServiceImpl();
        app.ractive = new Ractive({
            el : '#container',
            template : '#topTemplate',
        });
        app.ractive.on('login', (e : any) => {
            var email = app.ractive.get('email');
            var password = app.ractive.get('password');
            (<TitleService>app.service).login(email, password);
        });
    },
    main : () => {
        if (app.context === undefined || app.context.getAccessToken() == null) {
            app.router.navigate('', {trigger:true});
            return;
        }
        app.service = new MainServiceImpl();
        app.ractive = new Ractive({
            el : '#container',
            template : '#mainTemplate',
            data : {
                user : app.user,
                courses : [],
                getCourse : (id : string, list : Array<any>) => {
                    for (var i = 0 ; i < list.length ; ++i) {
                        if (list[i].id == id) {
                            return list[i];
                        }
                    }
                    return {data : {title : "(削除されたコース)"}};
                }
            }
        });
        app.ractive.on('courseClicked', (e : any, index : number) => {
            (<MainService>app.service).courseSelected(index);
        });
        (<MainService>app.service).getCourses();
    }
});

interface Service {
}

interface TitleService extends Service {
    login(email : string, password : string);
}

interface MainService extends Service {
    getCourses();
    courseSelected(index : number);
}

class TitleServiceImpl implements TitleService {
    login(email : string, password : string) {
        app.kii.login(email, password, {
	    success : (user : Kii.KiiUser) => {
                this.getUser(user.getId());
            },
	    error : (status : number, body : any) => {
                console.log("Error " + status);
            }
        });
    }
    getUser(id : string) {
        app.kii.userAPI().fetchUser(id, {
	    success : (user : Kii.KiiUser) => {
                app.user = user;
                this.showMainPage();
            },
	    error : (status : number, body : any) => {
                console.log("Error " + status);
            }
        });
    }
    showMainPage() {
        app.router.navigate('main', {trigger:true});
    }
}

class MainServiceImpl implements MainService {
    getCourses() {
        var bucket = new Kii.KiiBucket(new Kii.KiiGroup('vtncvzi8ykjklcirqm54egbjb'), 'cources');
        var params = new Kii.QueryParams(Kii.KiiClause.all());
        
        app.kii.bucketAPI().query(bucket, params, {
            success : (results : Array<Kii.KiiObject>, params : Kii.QueryParams) => {
                var user = app.ractive.get('user');
                app.ractive.set('courses', results);
                app.ractive.set('currentCourses', this.toArray(user.data.currentCourses));
                app.ractive.update();
                console.log('result count=' + results.length);
            },
	    error : (status : number, body : any) => {
                console.log("Error " + status);
            }            
        });
        //app.kii.objectAPI().create(bucket, {
//            'title' : 'Git(2)',
//            'description' : 'リモートリポジトリの使い方を学びます。',
//            'url' : '',
//        });
    }
    toArray(obj : any) {
        var array = [];
        for (var key in obj) {
            obj.id = key;
            array.push(obj);
        }
        return array;
    }
    courseSelected(index : number) {
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
    }
    startCourse(user : Kii.KiiUser, course : Kii.KiiObject) {
        user.data.point--;
        user.data.currentCourses[course.getId()] = {
            "date" : new Date().getTime()
        };
        app.kii.userAPI().update(user, {
            success : (user : Kii.KiiUser) => {
                app.ractive.update();
            },
            error : (status : number, body : any) => {
                console.log('failed to update');
            }
        });
    }
}


interface App {
    router : any;
    context : Kii.KiiContext;
    kii : Kii.AppAPI;
    service : Service;
    ractive : Ractive;
    user : Kii.KiiUser;
}

var app = {
    router:null,
    context:null,
    kii:null,
    service : null,
    ractive : null,
    user : null,
};

$(((app : App) => {
    return () => {
        app.context = new Kii.KiiContext(APP_ID, APP_KEY, BASE_URL);
        app.kii = new Kii.KiiAppAPI(app.context);
        app.router = new AppRouter();
        Backbone.history.start();        
    }
})(app));