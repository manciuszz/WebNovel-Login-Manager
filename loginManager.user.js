// ==UserScript==
// @name         WebNovel.com | Login Manager
// @description  Auto-Login and Check-In Manager for WebNovel.com. Created for the sole purpose of easier management of fake accounts that 'farms' soulstones.
// @author       Manciuszz
// @created      2021-01-17
// @version      0.175
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

    var cookieManager = function() { // copy & paste from webnovel.com libs
        var e = document;
        return {
            set: function(t, r, n, i, o) {
                o && (o = new Date(+new Date + o));
                var u = t + "=" + escape(r) + (o ? "; expires=" + o.toGMTString() : "") + (i ? "; path=" + i : "") + (n ? "; domain=" + n : "");
                return u.length < 4096 && (e.cookie = u),
                this
            },
            get: function(t) {
                var r = e.cookie.match(new RegExp("(^| )" + t + "=([^;]*)(;|$)"));
                return null != r ? unescape(r[2]) : null
            },
            del: function(t, r, n) {
                return this.get(t) && (e.cookie = t + "=" + (n ? "; path=" + n : "") + (r ? "; domain=" + r : "") + ";expires=Thu, 01-Jan-1970 00:00:01 GMT"),
                this
            },
            find: function(t) {
                return e.cookie.match(t)
            }
        }
    };

    var jQueryObjects = {
        submit: "#submit",
        loginBtn: ".login-btn",
        logoutBtn: ".j_logout",
        userBtn: ".j_header_user_trigger",
        inputs: ".m-input > input",
        emailButton: "a.bt.bt-circle._e",
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

        VoteCollector.init();

        var guiSettings = {
            serverTime: 'Checking...',
            powerVoteFavorite: manageVoteFavorite.get(),
            accounts: Object.keys(loginData),
            selectedAccount: [ Object.keys(loginData)[unsafeWindow.top.selectedAccount || 0] ],
            selection: 0
        };

        var controlKit = new ControlKit();
        controlKit.setShortcutEnable('b');
        controlKit.addPanel({label: 'WebNovel.com | Login Manager | ©MMWorks', fixed: true, align: 'right', width: 300})
            .addStringOutput(guiSettings, 'serverTime', { label: "Server Time" })
            .addStringInput(guiSettings, 'powerVoteFavorite', {
                label: "Vote Book ID",
                onChange: function() {
                    manageVoteFavorite.set(guiSettings.powerVoteFavorite);
                }
            })
            .addSelect(guiSettings, 'accounts', {
                label: "Account",
                target: 'selectedAccount',
                onChange: function(index) {
                    guiSettings.selection = index;
                }
            })
		.addButton('Login', function() {
            VoteCollector.reset();

            if (checkIfAlreadyLoggedIn()) {
                sessionStorage.setItem("autoLogin", guiSettings.selection);
                logout();
            } else {
                unsafeWindow.top.selectedAccount = guiSettings.selection;
            }
        })
		.addButton('Logout', function() {
            VoteCollector.reset();
            unsafeWindow.top.selectedAccount = null;
            logout();
        })
		.addButton('Register', function() {
            window.open('https://passport.webnovel.com/register.html?appid=900&areaid=1&returnurl=https%3A%2F%2Fwww.webnovel.com%2FloginSuccess&auto=1&autotime=0&source=&ver=2&fromuid=0&target=iframe&option=', "_blank", "toolbar=yes,top=100,left=600,width=500,height=800");
            window.open('https://www.google.com/search?q=temporary+mail', "_blank", "toolbar=yes,top=100,left=600,width=1080,height=800");
        })
        .addButton(`Collect All Votes (${ VoteCollector.collectVotes ? "Enabled" : "Disabled"})`, function() {
            VoteCollector.collectVotes = !VoteCollector.collectVotes;
            if (checkIfAlreadyLoggedIn()) {
                logout();
            } else {
                unsafeWindow.top.selectedAccount = guiSettings.selection;
            }
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

    var VoteCollector = (function() {
        return {
            get collectVotes() {
                return localStorage.getItem("collectVotes") === "true";
            },
            set collectVotes(state) {
                localStorage.setItem("collectVotes", state === true);
            },
            get allAccountsHasVoted() {
                let result = Object.keys(loginData).length;
                let accountStats = this.votedAccountStats;
                for(let email in accountStats) {
                    if (accountStats[email]) {
                        result--;
                    }
                }
                return result === 0;
            },
            get votedAccountStats() {
                return JSON.parse(localStorage.getItem("votedAccountStats"));
            },
            reset: function() {
                localStorage.removeItem('collectVotes');
                localStorage.removeItem('votedAccountStats');
            },
            markAccountAsVoted: function(accountEmail) {
                let accountStats = this.votedAccountStats;

                if (!this.votedAccountStats) {
                    accountStats = JSON.parse(JSON.stringify(loginData));
                    for(let email in accountStats) {
                        accountStats[email] = false;
                    }
                }

                accountStats[accountEmail] = true;

                localStorage.setItem("votedAccountStats", JSON.stringify(accountStats));
            },
            get stoneStatus() {
                return {
                    "SS": g_data.login.user.SS,
                    "PS": g_data.login.user.PS,
                    "CheckIn": g_data.login.user.isCheckIn
                };
            },
            init: function() {
                if (!this.collectVotes)
                    return;

                let selectNotVotedAccount = () => this.votedAccountStats ? Object.values(this.votedAccountStats).findIndex((status) => status === false) : 0;

                let collectorWatcherId = setInterval(() => {
                    if (checkIfAlreadyLoggedIn()) {
                        if (this.allAccountsHasVoted) {
                            this.collectVotes = false;
                            clearInterval(collectorWatcherId);
                        } else if (this.stoneStatus.SS === 0 && this.stoneStatus.PS == 0 && this.stoneStatus.CheckIn === 1) {
                            let currentAccountEmail = g_data.login.user.email;

                            if (this.votedAccountStats == null || !this.votedAccountStats[currentAccountEmail])
                                this.markAccountAsVoted(currentAccountEmail);

                            sessionStorage.setItem("autoLogin", selectNotVotedAccount());
                            logout();
                        } else if (this.stoneStatus.SS !== 0 || this.stoneStatus.PS !== 0 || this.stoneStatus.CheckIn !== 1) {
                            checkInSS();
                            checkInOtherSS();
                            setTimeout(() => { window.location.reload(); }, 350);
                        }
                    } else {
                        unsafeWindow.top.selectedAccount = selectNotVotedAccount();
                    }
                }, 500);
            }
        };
    })();

    var manageVoteFavorite = (function() {
        return {
            get: function() {
                return localStorage.getItem("powerVoteFavorite") || 'None';
            },
            set: function(favoriteBookId) {
                if (favoriteBookId.length === 0 || favoriteBookId.length === "18799565706217805".length)
                    localStorage.setItem("powerVoteFavorite", favoriteBookId);
            }
        };
    })();

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

    var showLoginForm = function() {
        let loginBtn = $(jQueryObjects.loginBtn);
        if (loginBtn.length)
            loginBtn.click();
    };

    var checkIfAlreadyLoggedIn = function() {
        return typeof g_data !== "undefined" && !g_data.login.user.userId.toString().match(/^$|^0$/g);
    };

    var logout = function() {
        let userBtn = $(jQueryObjects.userBtn);
        if (userBtn.length) {
            userBtn.click();

            setTimeout(function() {
                let logoutBtn = $(jQueryObjects.logoutBtn);
                logoutBtn.click();
            }, 100);
        }
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

    var getTaskList = function(callbackFn) {
        return $.ajax({
            type: "GET",
            url: "/apiajax/task/taskList",
            data: {
                "_csrfToken": cookieManager().get("_csrfToken"),
                taskType: 1
            },
            success: function(t) {
                if (typeof callbackFn === "function")
                    callbackFn(t);
            }
        });
    };

    var checkedInSS = function(callbackFn) {
        if (typeof callbackFn === "function") {
            getTaskList(function(result) {
                callbackFn(result.data);
            });
        }
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
            data: { pageIndex: 1, type: 2 },
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
            data: { bookId: bookId, novelType: 0 },
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

    var claimDailySS = function() {
        return $.ajax({
            type: "POST",
            url: "/apiajax/SpiritStone/addSSAjax",
            data: {
                "_csrfToken": cookieManager().get("_csrfToken"),
                "type": 1
            },
            success: function(msg) {
                console.log(msg);
            }
        });
    };

    var checkInSS = function() {
        if (checkIfAlreadyLoggedIn()) {
            checkedInSS(function(data) {
                if (data.taskList[0].completeStatus !== 3)
                    claimDailySS();
            });
        }
    };

    var stoneManager = (function() {
        let checkBill = function(type, callbackFn) {
            return fetch(`/bill/${type}`).then((res) => {
                return res.text();
            }).then(callbackFn);
        };

        let getStones = function(DOM) {
            let countDown = DOM.find("#countDown").attr('data-time');

            let stone = DOM.find(".currency-area strong[class*='stone'], .currency-area strong[class*='_num']").text();

            return { currency: parseInt(stone), "countDown": parseInt(countDown) };
        };

        let doVote = function(type, callbackFn) {
            if (typeof callbackFn !== "function")
                return;

            checkBill(type, function(htmlText) {
                let dom = $('<html>').html(htmlText);

                let { currency, countDown } = getStones(dom);
                callbackFn(currency, countDown);
            });
        };

        return doVote;
    })();


    var checkInOtherSS = function() {
        stoneManager("energy", function(energyStones, countDownTilRestock) {
            if (energyStones > 0) {
                //let voteFavorite = manageVoteFavorite.get();
                //if (voteFavorite !== 'None') {
                   //postEnergyVote(voteFavorite);
                //} else {
                    getMoreBooks(function(voteBooks) {
                        let items = voteBooks.data.items;
                        postEnergyVote(items[0].bookId);
                    });
                //}
            }
        });

        stoneManager("power", function(powerStones, countDownTilRestock) {
            if (powerStones > 0) {
                let voteFavorite = manageVoteFavorite.get();
                if (voteFavorite !== 'None') {
                    postPowerVote(voteFavorite);
                } else {
                    getPowerStoneRankings(function(rankings) {
                        let items = rankings.data.items;
                        postPowerVote(items[0].bookId);
                    });
                }
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
