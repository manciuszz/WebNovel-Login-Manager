// ==UserScript==
// @name         WebNovel.com | Login Manager
// @description  Auto-Login and Check-In Manager for WebNovel.com. Created for the sole purpose of easier management of fake accounts that 'farms' soulstones.
// @author       Manciuszz
// @created      2019-01-21
// @version      0.1
// @match        *://www.webnovel.com/*
// @match        *://passport.webnovel.com/login.html*
// @match        *://passport.webnovel.com/emaillogin.html*
// @exclude      *://www.webnovel.com/loginSuccess*
// @require      https://cdn.jsdelivr.net/gh/automat/controlkit.js@master/bin/controlKit.min.js
// @grant        unsafeWindow
// ==/UserScript==

(function loginManager() {
    'use strict';

    unsafeWindow.top.selectedAccount = typeof unsafeWindow.top.selectedAccount !== "undefined" ? unsafeWindow.top.selectedAccount : null;

    // Raw, unencrypted and hard-coded login account information goes here...
	var loginData = {
        "example1@example.com": "example1",
		"example2@example.com": "example2",
		"example3@example.com": "example3",
		"example4@example.com": "example4",
    };

    var LBF_Paths = {
        index: 'en/js/common/index.59031.js',
        commonMethod: 'en/js/common/page/commonMethod.d9f85.js'
    };

    var jQueryObjects = {
        submit: "#submit",
        inputs: ".m-input > input",
        emailButton: "a.bt.bt-block._e",
        loginForm: ".g_mod_login.g_mod_wrap._on",
        checkIn: ".g_bt_checkin",
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

    var checkedInSS = function() {
        return $(jQueryObjects.checkIn + '._checked').length;
    };

    var checkInSS = function() {
        if (lbfModuleAvailable() && checkIfAlreadyLoggedIn() && !checkedInSS()) {
            LBF.require(LBF_Paths.commonMethod).addSignInSS($(window));
            $(jQueryObjects.checkIn).addClass("_checked");
        }
    };

    var managerLoop = (function f() {
        var intervalId = setInterval(function() {
            if (typeof $ === "undefined") {
                return;
            } else if (checkIfAlreadyLoggedIn()) {
                checkInSS();
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