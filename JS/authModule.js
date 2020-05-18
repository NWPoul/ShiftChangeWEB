// Log in and authorisation module
/*global
USER
ERROR_LOGGER
HDL_start
HDL_Async_ShiftApi_JSONP_Request
HDL_checkApiResponse

*/

var AUTH = (function() {

// Start login process
async function Async_logIn() {
    let user                    = prompt('введите Ваш e-mail или ник в системе', '');
    if (!user) {
        swal('e-mail/ник обязателен!');
        return Promise.reject( 'No e-mail/nick entered' );
    }

    let ps                      = prompt('введите Ваш пароль в системе или "?" для отправки пароля на e-mail', '');
    let reqResult               = await Async_loginRequest(user, ps);

    return loginResponseHandler( reqResult );
} //END AUTH.LOGIN FUNCTION ======================================

function loginResponseHandler(ReqResult) {
    let appUserData      = USER;
    let userObj          = {};
    let loginResponse;

    let clearedResponse  = HDL_checkApiResponse(ReqResult);

    if ( clearedResponse.status === true ) {
        userObj.nick     = clearedResponse.content.nick;
        userObj.ps       = clearedResponse.content.ps;
        userObj.status   = 'checked';

        storeUserToLS(userObj);
        storeUserToAPP_VARS(userObj, appUserData);
        setLoginButtonText(userObj.nick);

        loginResponse    = Promise.resolve(`Пользователь ${userObj.nick}
                           успешно авторизован!`);
    } else {
        loginResponse    = Promise.reject(clearedResponse.content);
    }

    loginResponse
        .then( result => swal(result) )
        .catch( error => swal(error) );

    return loginResponse;
}// end loginResponseHandler


async function Async_loginRequest (user, ps) {
    let reqObj  = {
            command: 'login',
            data:    {
                      nick: '',
                      mail: '',
                      ps:   ps
                     }
    };

    if ( /.+@.+\..+/i.test(user) ) {
        reqObj.data.mail     = user.toLowerCase();
    } else {
        reqObj.data.nick     = user.toUpperCase();
    }

    let reqResult = await HDL_Async_ShiftApi_JSONP_Request(reqObj);
    return reqResult;
}// END loginRequest ==================================








// simple XOR codec
function xorStr(str, key) {
  let xoredStr = Array.from(
    str,
    function(c, i) {
      return String.fromCharCode(c.charCodeAt() ^ key.charCodeAt(i % key.length));
    }
  ).join('');
  return xoredStr;
}
function xorObj(obj, key) {
  let JSONed = JSON.stringify(obj);
  let XORedObj = xorStr(JSONed, key);
  return XORedObj;
}



function getUserFromLS() {
    let userObj  = {};
    let userData = localStorage.getItem('userData');
    if ( userData ) {
        userObj  = JSON.parse(userData);
    }
    return userObj;
}

function storeUserToAPP_VARS(userObj, appUserData) {
    appUserData.nick   = userObj.nick;
    appUserData.ps     = userObj.ps;
 // appUserData.mail   = userObj.mail;
    appUserData.status = userObj.status;
}
function storeUserToLS(userObj) {
    let userDataStr = JSON.stringify(userObj);
    localStorage.setItem('userData', userDataStr);
}


function logOut(appUserData = USER) {
    let LSkeys = Object.keys(localStorage);
    for (let key of LSkeys) {
        if (key.includes('user')) {
            localStorage.removeItem(key);
        }
    }
    for (let key of Object.keys(appUserData) ) {
        appUserData[key]  = null;
    }
    setLoginButtonText('Log in');
}
function setLoginButtonText(text) {
    if (!text)
       return;
    var loginBtnTxt       = document.getElementById('loginBtnTxt');
    loginBtnTxt.innerText = text;
}

function loginButtonClick(button, appUserData = USER) {
    if (!appUserData.status) {
        Async_logIn()
        .then( HDL_start )
        .catch( err => ERROR_LOGGER(err, 'loginButtonClick') );
        return;
    }

    let menuItems = {
        vacation: {
            className: 'swOption',
            innerHTML: 'Запрос отпуска',
            onclick: () => {
                console.log('Запрос отпуска');
                setVacationRequestDiag();
            }
        },
        getLog: {
            className: 'swOption',
            innerHTML: 'Расчёт',
            onclick: () => {
                console.log('Запрос логов');
                HDL_Async_showLogData();
            }
        },
        logout: {
            className: 'swOption',
            innerHTML: 'Разлогиниться',
            onclick: () => {
                swal({
                    title: 'Выйти из системы?',
                    icon: 'warning',
                    buttons: true,
                    dangerMode: true,
                })
                .then( (confirmation) => {
                    if (confirmation) {
                        swal('Вы вышли из системы!', {icon: 'success'} );
                        logOut();
                    }
                });
            }
        },
    };

    let navBtnMenu = document.getElementById('navBtnDialog');
    navBtnMenu.setItems(menuItems);
    navBtnMenu.show();
}



return {
    getUserFromLS:        getUserFromLS,

    loginButtonClick:     loginButtonClick,
    Async_logIn:          Async_logIn,
    logOut:               logOut,
    Async_loginRequest:   Async_loginRequest,
    loginResponseHandler: loginResponseHandler,

    storeUserToAPP_VARS:  storeUserToAPP_VARS,
    storeUserToLS:        storeUserToLS,
    setLoginButtonText:   setLoginButtonText,

    xorStr: xorStr,
    xorObj: xorObj
};
})();//END MODULE
