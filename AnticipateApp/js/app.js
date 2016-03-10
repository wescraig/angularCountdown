'use strict';

var anticipateApp = angular.module('anticipateApp', [
	'firebase',
	'ngRoute',
	'anticipateControllers'
]);

anticipateApp.config(['$routeProvider',
	function($routeProvider){
		$routeProvider.
			when('/', {
				templateUrl:'partials/signUpLogin.html',
				controller:'signUpCntrl'
			}).
			when('/userHomePage', {
				templateUrl:'partials/userHomePage.html',
				controller: 'userPageCntrl'
			}).
			when('/event', {
				templateUrl:'partials/event.html',
				controller: 'eventPageCntrl'
			}).
			otherwise({
				redirectTo:'/'
			});


}]);