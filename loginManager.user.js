// ==UserScript==
// @name         WebNovel.com | Login Manager
// @description  Auto-Login and Check-In Manager for WebNovel.com. Created for the sole purpose of easier management of fake accounts that 'farms' soulstones.
// @author       Manciuszz
// @created      2019-08-20
// @version      0.15
// @match        *://www.webnovel.com/*
// @match        *://passport.webnovel.com/login.html*
// @match        *://passport.webnovel.com/emaillogin.html*
// @exclude      *://www.webnovel.com/loginSuccess*
// @require      https://cdn.jsdelivr.net/gh/automat/controlkit.js@master/bin/controlKit.min.js
// @grant        unsafeWindow
// ==/UserScript==

(function loginManager() {
    'use strict';

    // Prevent them from logging your data with 'Sentry' for safety reasons...
    !function(send){
        XMLHttpRequest.prototype.send = function(data) {
            if ((data || "").indexOf("logger") !== -1) {
                //console.log("Intercepted Sentry!", arguments);
            } else {
                send.call(this, data);
            }
        }
    }(XMLHttpRequest.prototype.send);

    unsafeWindow.top.selectedAccount = typeof unsafeWindow.top.selectedAccount !== "undefined" ? unsafeWindow.top.selectedAccount : null;

    // Raw, unencrypted and hard-coded login account information goes here...
    var loginData = {
        "example1@example.com": "password1",
        "example2@example.com": "password2",
        "example3@example.com": "password3",
        "example4@example.com": "password4",
    };

    var LBF_Paths = {
        matchPath: function(pathRegex) {
            let regex = new RegExp('/' + pathRegex, 'g');
            let matchedPaths = Object.keys(LBF.cache).filter((path, id) => path.match(regex));
            return matchedPaths[0];
        },
        get index() { return this.matchPath('en/js/common/index.*.js'); },
        get commonMethod() { return this.matchPath('en/js/common/page/commonMethod.*.js'); },
    };

    var jQueryObjects = {
        submit: "#submit",
        inputs: ".m-input > input",
        emailButton: "a.bt.bt-block._e",
        loginForm: ".g_mod_login.g_mod_wrap._on",
        checkIn: "._check_in",
        reCaptchaBox: ".recaptcha-checkbox"
    };

    var createGUI = function() {
        if (typeof ControlKit === "undefined")
            return console.log("[WebNovel-Login Manager] Failed to load ControlKit library.");

        if (location.host !== "www.webnovel.com")
            return;

        if (typeof sessionStorage.getItem !== "undefined") {
            var pendingLoginAccount = sessionStorage.getItem("autoLogin");
            if (pendingLoginAccount) {
                unsafeWindow.top.selectedAccount = pendingLoginAccount;
                sessionStorage.removeItem("autoLogin");
            }
        }

        var guiSettings = {
            serverTime: 'Checking...',
            accounts: Object.keys(loginData),
            selection: 0,
        };

        var controlKit = new ControlKit();
        controlKit.setShortcutEnable('b');
        controlKit.addPanel({label: 'WebNovel.com | Login Manager | ©MMWorks', fixed: true, align: 'right', width: 300})
            .addStringOutput(guiSettings, 'serverTime', {label: "Server Time"})
            .addSelect(guiSettings, 'accounts', {
            label: "Account",
            target: unsafeWindow.top.selectedAccount || 0,
            onChange: function(index) {
                guiSettings.selection = index;
            }
        })
		.addButton('Login', function() {
            if (checkIfAlreadyLoggedIn()) {
                sessionStorage.setItem("autoLogin", guiSettings.selection);
                logout();
            } else {
                unsafeWindow.top.selectedAccount = guiSettings.selection;
            }
        })
		.addButton('Logout', function() {
            unsafeWindow.top.selectedAccount = null;
            logout();
        })
		.addButton('Register', function() {
            window.open('https://passport.webnovel.com/register.html?appid=900&areaid=1&returnurl=https%3A%2F%2Fwww.webnovel.com%2FloginSuccess&auto=1&autotime=0&source=&ver=2&fromuid=0&target=iframe&option=', "_blank", "toolbar=yes,top=100,left=600,width=500,height=800");
            window.open('https://www.google.com/search?q=temporary+mail', "_blank", "toolbar=yes,top=100,left=600,width=1080,height=800");
        });
        controlKit._panels[0]._onMenuHideMouseDown(); // Start minimized.
        var controlKit_Element = document.getElementById("controlKit");
        controlKit_Element.style.zIndex = 9999; // Bring to front.

        // Show/Hide menus on hover in/out
        var toggleHide = (function() {
            var panel = controlKit_Element.getElementsByClassName("panel")[0];
            return function(e) {
                panel.style.overflow = e.type == "mouseenter" ? "unset" : "";
                controlKit._panels[0]._onMenuHideMouseDown();
            }
        })();

        controlKit_Element.addEventListener('mouseenter', toggleHide, false);
        controlKit_Element.addEventListener('mouseleave', toggleHide, false);
        createClock();
    };

    var getServerTime = function() {
        return $.ajax({async: false}).getResponseHeader( 'Date' );
    };

    var createClock = function() {
        var serverTimeObject, hours, minutes, seconds;
        var clockId = setInterval(function() {
            if (typeof $ === "undefined")
                return;
            if (!seconds) {
                [hours, minutes, seconds] = getServerTime().split(' ')[4].split(":");
                serverTimeObject = $("#controlKit :contains('Server Time')").find('textarea');
                if (!serverTimeObject.length)
                    return clearInterval(clockId);
            }
            seconds = parseInt(seconds) + 1;
            if (seconds >= 60) minutes = parseInt(minutes) + 1;
            if (minutes >= 60) hours = parseInt(hours) + 1;

            hours = hours % 24;
            minutes = minutes % 60;
            seconds = seconds % 60;

            if (hours   < 10) { hours   = "0" + hours;   }
            if (minutes < 10) { minutes = "0" + minutes; }
            if (seconds < 10) { seconds = "0" + seconds; }

            serverTimeObject.val([hours, minutes, seconds].join(":"));
        }, 1000);
    };

    var lbfModuleAvailable = function() {
        return typeof LBF !== "undefined";
    };

    var showLoginForm = function() {
        if (!$(jQueryObjects.loginForm).length && lbfModuleAvailable())
            LBF.require(LBF_Paths.index).Login.showLoginModal();
    };

    var checkIfAlreadyLoggedIn = function() {
        return typeof g_data !== "undefined" && g_data.login.user.userId;
    };

    var logout = function() {
        if (lbfModuleAvailable() && checkIfAlreadyLoggedIn())
            LBF.require(LBF_Paths.index).Login.logout();
    };

    var clickEmailLoginButton = function() {
        var emailButton = $(jQueryObjects.emailButton);
        if (!emailButton.length)
            return;
        emailButton[0].click();
    };

    var inputLogin = function(user, pass) {
        var inputs = $(jQueryObjects.inputs);
        if (!inputs.length)
            return;

        if (typeof user === "object" && typeof pass !== "string") {
            var loginData = user;
            var loginDataKeys = Object.keys(loginData);
            user = loginDataKeys[pass];
            pass = loginData[user];
        }

        var userInput = inputs.eq(0).val(user);
        var passInput = inputs.eq(1).val(pass);
    };

    var submitForm = function() {
        var submitButton = $(jQueryObjects.submit);
        if (!submitButton.length)
            return;
        submitButton.click();
    };

    /*var checkRecaptchaBox = function() {
        var reCaptchaBox = $(jQueryObjects.reCaptchaBox);
        if (!reCaptchaBox.length)
            return;
        reCaptchaBox.click();
    };*/

    var checkedInSS = function(callbackFn) {
        if (typeof callbackFn === "function")
            LBF.require(LBF_Paths.index).Task.getTaskList(1).then( (result) => callbackFn(result.data) );
    };

    var getSSHistory = function(callbackFn) {
        return $.ajax({
            type: "GET",
            url: "/apiajax/SpiritStone/getSSHistoryAjax",
            data: {
                pageIndex: 1,
                transType: 1
            },
            success: function(t) {
                if (typeof callbackFn === "function")
                    callbackFn(t);
            }
        });
    };

    var getPowerStoneRankings = function(callbackFn) {
        return $.ajax({
            type: "GET",
            url: "/apiajax/powerStone/getListAjax",
            data: {pageIndex: 1, type: 2},
            success: function(a) {
                if (typeof callbackFn === "function")
                    callbackFn(a);
            }
        });
    };

    var getMoreBooks = function(callbackFn) {
        return $.ajax({
            type: "GET",
            url: "/apiajax/translationVote/getAjax",
            data: {
                pageIndex: 1,
                gender: 1
            },
            success: function(e) {
                if (typeof callbackFn === "function")
                    callbackFn(e);
            }
        });
    };

    var postPowerVote = function(bookId) {
        return $.ajax({
            type: "POST",
            url: "/apiajax/powerStone/vote",
            data: { bookId: bookId, novelType: 0 },},
            success: function(o) {
                console.log(o);
            }
        });
    };

    var postEnergyVote = function(bookId) {
        return $.ajax({
            type: "POST",
            url: "/apiajax/translationVote/vote",
            data: { bookId: bookId },
            success: function(msg) {
                console.log(msg);
            }
        });
    };

    var checkInSS = function() {
        if (lbfModuleAvailable() && checkIfAlreadyLoggedIn()) {
            checkedInSS(function(data) {
                if (data.taskList[0].completeStatus !== 3)
                    LBF.require(LBF_Paths.commonMethod).addSignInSS($(window));
            });
        }
    };

    var stoneManager = (function() {
        let checkBill = function(callbackFn) {
            return fetch("/bill/power").then((res) => {
                return res.text();
            }).then(callbackFn);
        };

        let getStones = function(DOM) {
            let countDown = DOM.find("#countDown").attr('data-time');

            let stones = DOM.find(".stone-intro .strong-card").get();

            let [powerStones, energyStones] = stones;
            powerStones = powerStones.textContent.split("\n").map(v => v.trim()).filter(String);
            energyStones = energyStones.textContent.split("\n").map(v => v.trim()).filter(String);

            return { [powerStones[0]]: parseInt(powerStones[1]), [energyStones[0]]: parseInt(energyStones[1]), "countDown": parseInt(countDown) };
        };

        let doVote = function(callbackFn) {
            if (typeof callbackFn !== "function")
                return;

            checkBill(function(htmlText) {
                let dom = $('<html>').html(htmlText);

                let stonesData = getStones(dom);

                let [powerStones, energyStones, countDown] = Object.values(getStones(dom));
                callbackFn(powerStones, energyStones, countDown);
            });
        };

        return doVote;
    })();


    var checkInOtherSS = function() {
        stoneManager(function(powerStones, energyStones, countDownTilRestock) {
            if (energyStones > 0) {
                getMoreBooks(function(voteBooks) {
                    let items = voteBooks.data.items;
                    postEnergyVote(items[0].bookId);
                });
            }

            if (powerStones > 0) {
                getPowerStoneRankings(function(rankings) {
                    let items = rankings.data.items;
                    postPowerVote(items[0].bookId);
                });
            }
        });
    };

    var managerLoop = (function f() {
        var intervalId = setInterval(function() {
            if (typeof $ === "undefined") { // wait for jQuery lib to load.
                return;
            } else if (checkIfAlreadyLoggedIn()) {
                checkInSS();
                checkInOtherSS();
                console.log("[WebNovel-Login Manager] Already logged in as " + g_data.login.user.userName);
                return clearInterval(intervalId);
            } else if (unsafeWindow.top.selectedAccount === null) {
                return;
            }

            showLoginForm();
            clickEmailLoginButton();
            inputLogin(loginData, parseInt(unsafeWindow.top.selectedAccount));
            //checkRecaptchaBox();
            submitForm();
        }, 500);
        return [f, intervalId];
    })();

    createGUI();
})();