/*global
ERROR_LOGGER

G_MAXDATE
G_MAXDATE_COL
MAINTABLE_STATE
RASP_DATA

HDL_Async_getPrevReqData
HDL_Async_getRaspData

SWP_changeShift
*/


function defineMaxDateCol(raspFirstDate, maxDate, maxCols) {
    if ( !raspFirstDate || (!maxDate && !maxCols) ) return false;
    var maxColCorrection = 2; // ИСПРАВИТЬ потом - 2 MAGIC NUMBER (for header and yesterday column)!;

    if (!maxDate)    return ( maxCols + maxColCorrection );
    maxCols        = maxCols || 0;
    var days       = Math.trunc( (maxDate - raspFirstDate) / 86400000 ) +maxColCorrection;
    maxCols        = Math.min( days, maxCols );

    return maxCols;
}


function STB_SetMainTable(raspDataArr) {
    var mainTable           = document.getElementById('mainTable');
        // if (!raspDataArr || !raspDataArr[0] || raspDataArr[0][0] != 'Инструктор' ) {
        //   return;
        // } // TO DO - fix ugly validation condition!
  try {
    // ИСПРАВИТЬ потом - MAGIC NUMBERS!
    G_MAXDATE_COL           = defineMaxDateCol( raspDataArr[0][1][0], G_MAXDATE, G_MAXDATE_COL);
    MAINTABLE_STATE         = {
        checkMute:            false,
        checkCnt:             0,
        tdChecked:            {}, // { tdId:_, ...}
        tdChanged:            []  // [{ tdId:_, prevShift:_, newShift:_}, ...]
    };

    mainTable.innerHTML     = '';
    mainTable.onclick       = cellOnClick2swap;
    mainTable.oncontextmenu = cellOnClick2swap;

    var tbody               = document.createElement('tbody');
    TDconcat(raspDataArr, tbody);
    condFormat(tbody);
    mainTable.appendChild(tbody);
  }
  catch (err) {
    mainTable.innerHTML     = `<tr><td> Сбой загрузки данных! </td></tr>
                               <tr><td> Ошибка: </td></tr>
                               <tr><td> ${err} </td></tr>
                               <tr><td> Данные: </td></tr>
                               <tr><td> ${raspDataArr} </td></tr>`;
    return ERROR_LOGGER(err, 'STB_SetMainTable');
  }//end try/catch

    restoreState();

    STB_getsetPrevZamReq();
    if ( !STB_getsetPrevZamReq.intervalId ) {
          STB_getsetPrevZamReq.intervalId = setInterval( STB_getsetPrevZamReq, 60000*5 );
    }
}//=====STB_SetMainTable================================



function STB_callReset() {
    var actualChanges = document.getElementsByClassName('changed');
    if (actualChanges.length > 0) {
        swal({
            buttons: ['Перезагрузить расписание', 'Вернуться'],
            title:    'Перезагрузка расписания!',
            text:     'Есть не отправленные изменения смен \n они будут потеряны!'
        })
        .then( (choice) => {
            if (!choice) STB_reset();
        });
    } else STB_reset();
}
function STB_reset() {
    localStorage.removeItem('MAINTABLE_STATE');
    HDL_Async_getRaspData()
    .then( raspData => STB_SetMainTable(raspData) )
    .catch( err => swal(err) );
}//End STB_reset


function restoreState() {
    var savedState = localStorage.getItem('MAINTABLE_STATE');
    if (!savedState) { return; }
    savedState     = JSON.parse(savedState);
  console.log(savedState);
    savedState.tdChanged.forEach( function(td) {
        SWP_changeShift(td.tdId, td.newShift);
    });
}//End restoreState

// function STB_showTableState() {

// return; // отключаем функцию

// var stateList = document.getElementById('tableState');
//     stateList.innerHTML = "";
// var stateValues = ["checkCnt: " + MAINTABLE_STATE.checkCnt,
//                    "changedCnt: " + MAINTABLE_STATE.tdChanged.length];

// stateValues.forEach( function(val, i) {
//   var li = document.createElement("li");
//   li.innerHTML = val;
//   stateList.appendChild(li);
// });
//} // end STB_showTableState


//-----TDconcat------------------------------------------------------------------------


function TDconcat(Arr, tbody) {
  tbody.innerHTML = '';

  var rowsN = Arr.length,
      colsN = Arr[0].length;

  for(var i = 0; i < rowsN; i++){
    var tr = document.createElement('tr');
    var rowStr = '';
		rowStr += '<th id="r' +i +'c0">' +
                          Arr[i][0] +
                '</th>';

    for (var j = 1; j < colsN; j++) {
      var tdID = 'r' +i +'c' +j;
      rowStr += '<td id="' +tdID +'">' +
                          Arr[i][j] +
                '</td>';
    }
    tr.innerHTML = rowStr;
    tbody.appendChild(tr);
  }

  // парсим массив свойств даты в первую строку
    var firstRow = tbody.rows[0];
    for (var ri = colsN; --ri >0;) {
      var curDateData = Arr[0][ri];
      var dateStr = curDateData[2] + '/' + ( 1+curDateData[1] ) + '<br>' + curDateData[3]; //curDateData[1]+1 т.к. месяцы с 0 в JS
      firstRow.cells[ri].innerHTML = dateStr;
      firstRow.cells[ri].HDay = curDateData[4];
    }

return(tbody);
}//=====END TDconcat==================

function condFormat(tbody) {

  var rowsCollection = tbody.rows;
  var colsCnt = rowsCollection[0].cells.length;

  // первая строка с датами
  for (let ci = colsCnt; --ci > 0;) {
    let td = rowsCollection[0].cells[ci];
    // if ( ci >= G_MAXDATE_COL ) {
    //   td.classList.add('maxDate');
    // } else
    if (td.HDay) {
      td.classList.add('HDay');
    }
  }//endfor ci

  for (var ri=rowsCollection.length; --ri > 0;) {
    var tr = rowsCollection[ri];
    var groupName;
    switch (true) {
        case (ri > 14):
            groupName = 'group5';
           break;

        case (ri<13 && ri>9):
            groupName = 'group21';
           break;
        case (ri<6 && ri>2):
            groupName = 'group11';
           break;

        case (ri <= 7):
            groupName = 'group1';
           break;

        case (ri <= 14):
            groupName = 'group2';
           break;
     }//end switch


    tr.classList.add(groupName);
    tr.cells[0].classList.add(groupName + '-h');

    let lastCol2Format = colsCnt;
    if ( G_MAXDATE_COL < colsCnt ) {
      lastCol2Format = G_MAXDATE_COL;
      for (let ci = colsCnt; --ci >= G_MAXDATE_COL;) {
        let td = rowsCollection[ri].cells[ci];
        td.classList.add('maxDate');
      }
    } else {
      lastCol2Format = colsCnt;
    }

    for (let ci = lastCol2Format; --ci > 0;) {
      var td = rowsCollection[ri].cells[ci];
        if (/[-vwsx]/i.test(td.innerHTML) ) {
           td.classList.add('zam0');
        } else
          if (/[ДЖ]/i.test(td.innerHTML) ) {
           td.classList.add(groupName + '-day');
        } if ( /[Н]/i.test(td.innerHTML) ) {
           td.classList.add(groupName + '-night');
        } if ( /[Ж]/i.test(td.innerHTML) ) {
           td.classList.add('joker');
        } if ( /[*]/i.test(td.innerHTML) ) {
           td.classList.add('zam1');
        }
    }//endfor ci
  }//endfor ri

//  let targetCell = rowsCollection[0].cells[G_MAXDATE_COL];
//  console.log('targetCell:', targetCell);
//  insertLastDateCurtain( rowsCollection[0].cells[G_MAXDATE_COL] );
}//=====END condFormat===================







//======================================================================================
//===== working with previous requests =================================================
//======================================================================================
function STB_getsetPrevZamReq() {
    HDL_Async_getPrevReqData()
    .then( prevReqData  =>  STB_prevReqHandling(prevReqData));
}

function STB_prevReqHandling(prevReqData) {
  if(!prevReqData) return;
  clearPrevZamReq();

  for (let i = 0, last = prevReqData.length; i < last; i++) {
    // let curAuthorMail = prevReqData[i].authorMail;
    // let curReqStatus = prevReqData[i].status;
    let curReqChanges = prevReqData[i].changes;

    var curTdZamReq = {};
    curTdZamReq.reqN = prevReqData[i].reqN;
    curReqChanges.forEach( showPrevZamReq );
  } // end for

  function showPrevZamReq(zamReq) {
    var curDateIndex = findDateIndex(zamReq.dateT);
    var curInstrIndex = findInstrIndex(zamReq.instr);

    if (curDateIndex && curInstrIndex) {
      curTdZamReq.td = [curInstrIndex, curDateIndex];
      curTdZamReq.shift = zamReq.shift;
      showZam(curTdZamReq);
    }
  } // end subF showPrevZamReq
} // END STB_prevReqHandling


function showZam(curTdZamReq) {
  let {td, shift: zamShift, reqN} = curTdZamReq;

  let tdId = 'r' +td[0] +'c' +td[1];
  let actTD = document.getElementById(tdId);

  let prevZamDiv = actTD.getElementsByClassName('zamDiv')[0];
  if ( prevZamDiv ) {
    if (prevZamDiv.reqN > reqN) { return; }
    else { prevZamDiv.remove(); }
  }

  let zamDiv = document.createElement('div');
  zamDiv.className = 'zamDiv';
  zamDiv.reqN = reqN;

  if(zamShift) {
    zamDiv.innerHTML = zamShift +'*';
  } else {
    zamDiv.innerHTML = '-';
    zamDiv.classList.add('zamDivEmpty');
  }

  zamDiv.addEventListener( 'click', function() {
    let event = new Event( 'click', {bubbles: true} );
    actTD.dispatchEvent(event);
  });

  actTD.appendChild(zamDiv);
  actTD.classList.add('zamReq');
} // END showZam
function clearPrevZamReq() {
  let mainTable = document.getElementById('mainTable');
  let zamDivCollection = mainTable.getElementsByClassName('zamDiv');

  while ( zamDivCollection[0] ) {
    let zamTd = zamDivCollection[0].parentElement;
    zamTd.classList.remove('zamReq');
    zamDivCollection[0].remove();
  }
} // END clearPrevZamReq





//===========================================================
//=====       SERVICE FUNCTIONS        ======================
//===========================================================

function findDateIndex(testDate, DatesArr = RASP_DATA[0]) {
    if (testDate < DatesArr[1][0]) return false;
    for (let i=1; i<= DatesArr.length; i++) {
        if (testDate <= DatesArr[i][0]) return i;
    }
    return false;
} // end findDateIndex return zero based index

function findInstrIndex(instr, raspData = RASP_DATA) {
    for (let i=1; i<= raspData.length; i++) {
        if (instr == raspData[i][0]) return i ;
    }
    return false;
} // end findInstrIndex return zero based index


function insertLastDateCurtain(targetCell) {
  let curtain = document.createElement('div');
  curtain.className = 'curtain';
  targetCell.appendChild(curtain);
}

// function SoftReload(raspData = RASP_DATA) {
//     var mainTable = document.getElementById('mainTable');
//     var tbody = mainTable.tBodies[0];
//     TDconcat(raspData, tbody);
//     condFormat(tbody);
//     localStorage.removeItem('MAINTABLE_STATE');
//     MAINTABLE_STATE = {
//         checkMute: false,
//         checkCnt: 0,
//         tdChecked: {},
//         tdChanged: []
//     };
// }//End SoftReload