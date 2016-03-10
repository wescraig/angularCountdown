'use strict';

var anticipateControllers = angular.module('anticipateControllers', ['firebase']);

anticipateControllers.service('currentUser', function(){
	var user;
	var usersObj;

	return {
		getUserName: function(){
			return localStorage.getItem('currUserName');
		},
		setUserName: function(value){
			localStorage.setItem('currUserName', value);
		},
		setUserObj: function(value){
			localStorage.setItem('users', angular.toJson(value));
		},
		getUserObj: function(){
			return JSON.parse(localStorage.getItem('users'));
		},
		getMode: function(){
			return localStorage.getItem('mode');
		},
		setMode: function(screenMode){
			localStorage.setItem('mode', screenMode);
		},
		setEventIndex : function(index){
			localStorage.setItem('index', index);
		},
		getEventIndex: function(){
			return localStorage.getItem('index');
		},
		setEvents: function(newLs){
			var users = JSON.parse(localStorage.getItem('users'));
			users.events = newLs;

			localStorage.setItem('users', angular.toJson(users));
		}


	};
});

anticipateControllers.controller('signUpCntrl', ['$scope','$firebaseAuth','$location','currentUser', function($scope, $firebaseAuth, $location, currentUser){
	var firebaseObj = new Firebase('https://anticipateapp.firebaseio.com/');
	var usersList = firebaseObj.child('users');
	var getUsers;

	$scope.authObj = $firebaseAuth(firebaseObj);

	if(currentUser.getUserName()){
		currentUser.setUserName("");
		firebaseObj.unauth();
	}

	usersList.on("value", function(snapshot){
		getUsers = snapshot.val();
	});


	$scope.signUp = {
		'inputVisible':'none',
		'signUpLinkVisible':'visible',
		'btnText':'Login'
	};

	$scope.isNew = function(){
		$('#infoBox').animate({height: "430px"}, 400);
		$('.signUpLink').fadeIn(800).css('display', 'block');
		$('#signInBtn').animate({width: "92px"}, 500);

		$scope.signUp.btnText = 'Sign Up';
		$scope.signUp.signUpLinkVisible = 'hidden';
	}

	$scope.createUser = function(){
		if($scope.signUp.btnText === 'Sign Up'){
			if(!$scope.userName){
				alert("Please set a username.");
			}else if($scope.password !== $scope.cPassword){
				alert("Your password doesn't match the one you've confirmed");
			}else{
				$scope.authObj.$createUser({
					email: $scope.email,
					password: $scope.password
				}).then(function(userData){
					var user_name = $scope.userName;
			
					if(getUsers && getUsers[user_name]){
						$scope.authObj.$removeUser({
							email:$scope.email,
							password: $scope.password
						})
						alert("This user name already exists, please enter a different one.");
					}else{
						usersList.child(user_name).set(
						{
							'userId': userData.uid,
							'email':$scope.email,
							'password':$scope.password,
							'events':[]	
						});


						$scope.authObj.$authWithPassword({
							email: $scope.email,
							password: $scope.password
						}).
						then(function(authData){
							console.log("Logged in as " + authData.uid);
							currentUser.setUserName($scope.userName);
							currentUser.setUserObj(getUsers[$scope.userName]);
							$location.path('/userHomePage');
						}).
						catch(function(error){
							alert(error);
						});
					}
					
				}).catch(function(error){
					alert(error);
				});

			}//else - NavTo Next Page for logged in profile
		}else{
			
			$scope.authObj.$authWithPassword({
				email: getUsers[$scope.userName].email,
				password: $scope.password
			}).
			then(function(authData){
				console.log("Logged in as " + authData.uid);
				currentUser.setUserName($scope.userName);
				currentUser.setUserObj(getUsers[$scope.userName]);
				$location.path('/userHomePage');
			}).
			catch(function(error){
				alert(error);
			});

		}
	}
}]);

anticipateControllers.controller('userPageCntrl', ['$scope', 'currentUser', '$location', function($scope, currentUser, $location){
	var users = currentUser.getUserObj();

	var firebaseObj = new Firebase('https://anticipateapp.firebaseio.com/');
	var fireBaseUsersList = firebaseObj.child('users');
	var thisUser = fireBaseUsersList.child(currentUser.getUserName());
	var userObj = currentUser.getUserObj();
	var eventsList = userObj.events;



	$scope.currentUserName = currentUser.getUserName();
	$scope.currentUserObj = users;
	$scope.eventsArray = !$scope.currentUserObj.events? [] : $scope.currentUserObj.events;

	currentUser.setMode('view');

	$scope.editBtnText = {
		"btnText":"Edit",
		"toDelete":false
	};

	$scope.viewEvent = function(index){
		currentUser.setEventIndex(index);
		currentUser.setMode('view');
		$location.path('/event');
	}

	$scope.editAndDelete = function(){
		if(!$scope.editBtnText.toDelete && $scope.eventsArray){
			$scope.editBtnText.toDelete = true;
			$scope.editBtnText.btnText = "Delete";
			
		}else{
			var eventsUL = $('#eventsList li');
			var adjust = 0;
			eventsUL.each(function(li){
				var currentItem = li;
				if($(this).children().find('.deleteBox').is(':checked')){
					$scope.eventsArray.splice(currentItem + adjust, 1);
					adjust--;
					for(var i = 0; i < $scope.eventsArray.length; i++){
						delete $scope.eventsArray[i].$$hashKey; 
						$scope.eventsArray[i].id = i;
					}
					currentUser.setEvents($scope.eventsArray);
					thisUser.update({
						'events': $scope.eventsArray
					});
				}
			});
		}

	}


	$scope.toEventsPage = function(){
		currentUser.setMode('create');
		$location.path('/event');
	}

	$scope.$on('$destroy', function(){
		if(eventsList){
			for(var i = 0; i < $scope.eventsArray.length; i++){
				delete $scope.eventsArray[i].$$hashKey; 
			}	
		}

	});
}]);

anticipateControllers.controller('eventPageCntrl', ['$scope','currentUser', '$location','$http','$interval',  function($scope, currentUser, $location, $http, $interval){
	$scope.currentUserName = currentUser.getUserName();
	var eventPage = document.getElementById('eventPage');

	//Setting minimum time on date picker to after today
	$('#datePicker').prop("min", function(){
		return new Date().toJSON().split("T")[0];
	});

	//Grab JSON time data from local JSON file.
	$http.get('json/hhmmss.json').success(function(data){
		$scope.timeData = data;
		$scope.hours = $scope.timeData["hh"];
		$scope.min = $scope.timeData["mm"];
		$scope.sec = $scope.timeData["ss"];
	});

	$scope.hoursShow = "hidden";
	$scope.minShow = "hidden";
	$scope.secShow = "hidden";
	$scope.addTime = "none";
	$scope.showPicAdd = "none";
	$scope.profPicUrl = "";

	$scope.addHr = function(){
		$scope.evHr = this.time.split(" -")[0];
		$scope.hideHh();
	}

	$scope.addMn = function(){
		$scope.evMn = this.time;
		$scope.hideMm();
	}

	$scope.addSc = function(){
		$scope.evSc = this.time;
		$scope.hideSs();
	}


	//Sets total event time with user entries.
	$scope.setMainTime = function(){
		var userDate, userHours, userMinutes, userSeconds;
		var defaultDate = new Date();

		userDate = $scope.eventDate;
		userHours = !$('#hours').val()? 0 : parseInt($('#hours').val());
		userMinutes = !$('#minutes').val()? 0 : parseInt($('#minutes').val());
		userSeconds = !$('#seconds').val()? 0 : parseInt($('#seconds').val());

		userDate.setHours(userHours);
		userDate.setMinutes(userMinutes);
		userDate.setSeconds(userSeconds);

		$scope.changeEdit();
		$scope.evtDate = userDate;
		var intervalPromise = $interval(function(){formatTime($scope, userDate)}, 1000);

		$scope.$on('stopInterval', function(){
			$interval.cancel(intervalPromise);
		})


	}




	//Show and hide display and edit divs	
	$scope.isEdit = true;
	$scope.changeEdit = function(){
		$scope.isEdit = false;
	}

	//////////////////////////////////////////////////////////////////////////
	//////////////////////////// EXISTING EVENTS /////////////////////////////
	//////////////////////////////////////////////////////////////////////////

	var itemIndex = currentUser.getEventIndex();
	var eventToView, user, exDate;

	if(itemIndex){
		$scope.changeEdit();
		user = currentUser.getUserObj();
		eventToView = user.events[itemIndex];
		exDate = new Date(eventToView.dateAsString);
		// eventPage.style.backgroundImage = 'url(' + eventToView.backgroundImg + ')';
		// eventPage.style.backgroundRepeat = "no-repeat";
		// eventPage.style.backgroundPosition = "center";

		var intervalPromise = $interval(function(){formatTime($scope, exDate)}, 1000);

		$scope.$on('stopInterval', function(){
			$interval.cancel(intervalPromise);
		});

		$scope.eventName = eventToView.eventName;
	}

	//////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////////

	//ng-click show functions
	$scope.showAddTime = function(){
		if($scope.showPicAdd !== "none"){
			$('#editEvent').animate({height: "373px", "margin-top":"7%"}, 400);
			$scope.addTime = "inline-flex";
		}else{
			$('#editEvent').animate({height: "340px", "margin-top":"7%"}, 400);
			$scope.addTime = "inline-flex";
		}
		
	}

	$scope.showHh = function(){
		$scope.hoursShow = "visible";
	}
	$scope.hideHh = function(){
		$scope.hoursShow = "hidden";
	}

	$scope.showMm = function(){
		$scope.minShow = "visible";
	}
	$scope.hideMm = function(){
		$scope.minShow = "hidden";
	}

	$scope.showSs = function(){
		$scope.secShow = "visible";
	}
	$scope.hideSs = function(){
		$scope.secShow = "hidden";
	}

	$scope.$on('$destroy', function(){

		if(currentUser.getEventIndex()){
			currentUser.setEventIndex("");
		}
		if(currentUser.getMode() === 'create' && !$scope.isEdit){
			createEvent($scope, currentUser);
		}
	});

	// $scope.uploadPic = function(){
	// 	if($scope.addTime === "none"){
	// 		$('#editEvent').animate({height: "300px", "margin-top":"7%"}, 400);
	// 	}else{
	// 		$('#editEvent').animate({height: "373px", "margin-top":"7%"}, 400);
	// 	}

	// 	$scope.showPicAdd = "inline-block";
	// 	var background = new Image();
	// 	var imgInput = document.getElementById('picChoice').files[0];
	// 	var imgSlice = imgInput.slice(12, imgInput.length);
	// 	var reader = new FileReader();
	// 	reader.onload = function(){
	// 		var dataURL = reader.result;
	// 		$scope.profPicUrl = dataURL;
	// 		eventPage.style.backgroundImage = "url("+ dataURL + ")";
	// 		eventPage.style.backgroundRepeat = "no-repeat";
	// 		eventPage.style.backgroundPosition = "center";
	// 	};
	// 	reader.readAsDataURL(imgInput);
	// }
}]);


function formatTime($scope, userDate){
	var today = new Date();

	var dateDiff, nowH, nowM, nowS, days, hours, minutes, seconds, overflow, bgColor;



	dateDiff = userDate - today;

	overflow = dateDiff % (1000 * 60 * 60 * 24);
	days = Math.floor(dateDiff / (1000 * 60 * 60 * 24));
	hours = Math.floor(overflow / (1000 * 60 * 60));

	overflow = dateDiff % (1000 * 60 * 60);
	minutes = Math.floor(overflow / (1000 * 60));

	overflow = dateDiff % (1000 * 60);
	seconds = Math.floor(overflow / 1000);

	$scope.mainTime = days + "  Days  " + hours + "  Hours  " + minutes + "  Minutes  " + seconds + "  Seconds " 


	if(days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0){
		$scope.mainTime = 0 + "  Days  " + 0 + "  Hours  " + 0 + "  Minutes  " + 0 + "  Seconds"
		$scope.$emit('stopInterval');
	}
}



function createEvent($scope, currentUser){
	var event = {
		"id":"",
		"eventName":"",
		"dateAsString":"",
		"date":""
	}

	var currUser = currentUser.getUserObj();
	var eventsLs = !currUser.events? [] : currUser.events;
	var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	var hours = $scope.evtDate.getHours() > 12? ($scope.evtDate.getHours() - 12).toString() : ($scope.evtDate.getHours()).toString();
	if(hours === "0"){
		hours = "12";
	
	}

	var minutes = $scope.evtDate.getMinutes();
	if(minutes < 10){
		minutes = "0" + minutes.toString();
	}

	var amPm = $scope.evtDate.getHours() > 12? "PM" : "AM";

	event.id = eventsLs.length;
	event.eventName = $scope.eventName;
	event.date = months[$scope.evtDate.getMonth()] + " " + $scope.evtDate.getDate() + ", " + $scope.evtDate.getFullYear() + " at " + hours + ":" + minutes + " " + amPm;
	//event.backgroundImg = $scope.profPicUrl;
	event.dateAsString = $scope.evtDate;

	eventsLs.push(event);

	currUser.events = eventsLs;

	currentUser.setUserObj(currUser);
}

