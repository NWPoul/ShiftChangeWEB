// all GAS calls

/*global
google
CUR_SHIFTAPI_URL
USER
*/

var GAS = (function() {

    async function Async_logIn() {
      var url     = CUR_SHIFTAPI_URL;
      var reqObj  = {
          command: 'googleAccLogin',
          data:   { mail: '' }
      };
      var response = new Promise( function(resolve, reject) {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .googleAccLoginRequest(url, reqObj);
          });
      return await response;
    }



    async function Async_GAS_FETCH( reqObj ) {
    var url     = CUR_SHIFTAPI_URL;
    var idData  = USER;
    var response = new Promise( function(resolve, reject) {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .fetchRequest(url, reqObj, idData);
        });
    return response;
    }


    return {
      Async_GAS_FETCH: Async_GAS_FETCH,
      Async_logIn: Async_logIn
    };
})();//END GAS MODULE
