/*global

G_MAXDATE_COL
MAINTABLE_STATE
RASP_DATA


*/


var SWP_DialogData = {};

 // table On Click for SWAP ---------------
function cellOnClick2swap(event) {
console.log(event.type);
  if (event.target.tagName != 'TD' ||
      event.target.cellIndex < 2   ||                    // не слушаем столбцы с инструкторами и со вчерашней датой
      event.target.cellIndex >= G_MAXDATE_COL ||         // не слушаем столбцы после maxDate
      !event.target.nextElementSibling        ||         // не слушаем последний столбец
      event.target.parentNode.rowIndex == 0) {
  return; }

  if (MAINTABLE_STATE.checkMute) {return;}               // check if table is locked/muted

  var actTD = event.target;
  var actTDiD = actTD.id;

  if (MAINTABLE_STATE.tdChecked[actTDiD]) {
      uncheckTD(actTD);
  } else {
      checkTD(actTD);
      if (event.type == 'contextmenu') {
          SWP_DialogData.checkedTdIds = [];
          swapDialogManual(actTDiD);
          return false;
      }
      if (MAINTABLE_STATE.checkCnt == 2) { swapModule(); }    // function swapModule() is on swapDialog.html file!
  }
}//=================================== END table On Click for SWAP


    function checkTD(actTD) {
          if( actTD.classList.contains('check') ) {return;}

          var actTDiD = actTD.id;
          actTD.classList.add('check');
          MAINTABLE_STATE.tdChecked[actTDiD] = true;
          MAINTABLE_STATE.checkCnt++;

    // STB_showTableState();//debug
        }  // ======================= end check td

    function uncheckTD(actTD) {
          if( !actTD.classList.contains('check') ) {return;}

          var actTDiD = actTD.id;
          actTD.classList.remove('check');
          delete MAINTABLE_STATE.tdChecked[actTDiD];
          MAINTABLE_STATE.checkCnt--;

    //STB_showTableState();//debug
        }  // ===================== end uncheck td

    function parseTdIndex(tdId) {
        var index = tdId.slice(1).split('c').map(Number); //"r_c_" => cut "r" split on "c" and => number
    return index;
    }  //================= end parse TdIndex

    function isTdChanged(tdId) {
        var actTD = document.getElementById(tdId);
        var tdIndex = parseTdIndex(tdId);

        var curShift = actTD.innerHTML;
        var setShift = RASP_DATA[ tdIndex[0] ][ tdIndex[1] ],
            defSetShift = SWP_defineShift(setShift);

        if (curShift == '-' || curShift == 'no') {curShift = '';} // Костыль для срвнения пустых смен таблицы с данными из расписания

    return (curShift !== setShift &&          //проверка полного совпадения имен (для undo change)
          curShift !== defSetShift.Name);   //проверка с приведенным именем из исходного расписания (для change)
    } //===== END isTdChanged  ============================================ isTdChanged

    function shiftCompare(shift1, shift2) {
        var parsedShift = (shift) => {
                return ( /[0vswx-]/i.test(shift) ? '' : shift.replace(/\*+/,'') );
            };
        return ( parsedShift(shift1) === parsedShift(shift2) );
    }//end shiftCompare

function SWP_defineShift(shift) {

    var shiftObj = {};
        shiftObj.Name = (!shift || /[0vswx-]/i.test(shift) ) ? '' : shift.replace(/\*+/,'');
        shiftObj.Part = [];

    if (shiftObj.Name == '') {
        shiftObj.Type = 'no';
        shiftObj.Cost = 0;

        } else if (/[JЖ]/i.test(shiftObj.Name)) {
            shiftObj.Type = 'Ж';
            shiftObj.Cost = 1;

        } else if (/Д/i.test(shiftObj.Name)) {
            if (/Н/i.test(shiftObj.Name)) {
                shiftObj.Type = 'ДН';
                shiftObj.Part = (/(С*Д\d?)(.*)/i).exec(shiftObj.Name).slice(0, 3); // раскладываем ДН смену в массив [смена, Дчасть, Нчасть] и слайсим лишнее (служебные свойства)
                shiftObj.Cost = 2;
            } else {
                shiftObj.Type = 'Д';
                shiftObj.Cost = 1;
            }
        } else if (/Н/i.test(shiftObj.Name)) {
            shiftObj.Type = 'Н';
            shiftObj.Cost = 1;
        } else {
            shiftObj.Type = 'ub'; // неопознанная смена
            shiftObj.Cost = 0;
    }// END all ifs

    return shiftObj;
}//===== End SWP_defineShift ==============================================

//swap Shift ----------------------------------------------------------
function swapShift(s1, s2) {

    if (s1.Name == s2.Name || s2.Type == 'ub' || s1.Type == 'ub') {
        return( [[]] );
    }

  var swSimple = [[s2.Name, s1.Name]]; // simple shift swap

  var swapMatrix = {
    s1_no: {
            s2_no: [[]], // for identical shifts
            s2_Ж:  swSimple, // simple swap (for any J)
            s2_Д:  swSimple, // simple swap
            s2_Н:  swSimple,
            s2_ДН: [ [s2.Name, s1.Name], [s2.Part[1], s2.Part[2]], [s2.Part[2], s2.Part[1]] ]
            },
    s1_Ж:  {    // simple swap (for any J)
            s2_no: swSimple,
            s2_Ж:  swSimple,
            s2_Д:  swSimple,
            s2_Н:  swSimple,
            s2_ДН: swSimple
            },
    s1_Д:  {
            s2_no: swSimple,
            s2_Ж:  swSimple,
            s2_Д:  swSimple,
            s2_Н:  [ [s2.Name, s1.Name], [s1.Name + s2.Name, ''], ['', s1.Name + s2.Name] ], // For D vs N
            s2_ДН: [ [s2.Name, s1.Name], [s1.Name + s2.Part[2], s2.Part[1]], [s2.Part[1], s1.Name + s2.Part[2]] ]
            },
    s1_Н: {
            s2_no: swSimple,
            s2_Ж:  swSimple,
            s2_Д:  [ [s2.Name, s1.Name], [s2.Name + s1.Name, ''], ['', s2.Name + s1.Name] ], // For N vs D
            s2_Н:  swSimple,
            s2_ДН: [ [s2.Name, s1.Name], [s2.Part[1] + s1.Name, s2.Part[2]], [s2.Part[2], s2.Part[1] + s1.Name] ]
            },
    s1_ДН: {
            s2_no: [ [s2.Name, s1.Name], [s1.Part[2], s1.Part[1]], [s1.Part[1], s1.Part[2]] ],
            s2_Ж:  swSimple,
            s2_Д:  [ [s2.Name, s1.Name], [s1.Part[1], s2.Name + s1.Part[2]], [s2.Name + s1.Part[2], s1.Part[1]] ],
            s2_Н:  [ [s2.Name, s1.Name], [s1.Part[2], s1.Part[1] + s2.Name], [s1.Part[1] + s2.Name, s1.Part[2]] ],
            s2_ДН: [ [s2.Name, s1.Name], [s1.Part[1] + s2.Part[2], s2.Part[1] + s1.Part[2]], [s2.Part[1] + s1.Part[2], s1.Part[1] + s2.Part[2]] ]
            }
  }; // end swapMatrix

  //Lets go and Swap))
  var s1Indx = 's1_' + s1.Type;
  var s2Indx = 's2_' + s2.Type;

  var swapList = swapMatrix[s1Indx][s2Indx];

 return swapList;

}  //===== End swapShift ==============================================




///////////////////////////////////////////////////////////////////////
/////         SWAP Code--------------------------------------
///////////////////////////////////////////////////////////////////////
//SWAP Code SWAP Code SWAP Code SWAP Code SWAP Code SWAP Code


// SWAP DIALOG-------------------------------------------------

function swapModule() {
    var swSet = {
          tdId:       [],
          shiftDate:  [],
          instr:      [],
          shiftRasp:  [],
          shiftTable: []
        };

    swSet.tdId = Object.keys( MAINTABLE_STATE.tdChecked );
    swSet.tdId.sort( (a, b) => {
        return ( parseTdIndex(a)[0] - parseTdIndex(b)[0] );
    });

    swSet.tdId.forEach(function(tdId, i) {
        var tdIndex         = parseTdIndex(tdId);
        swSet.shiftDate[i]  = RASP_DATA[ 0 ]          [ tdIndex[1] ];
        swSet.instr[i]      = RASP_DATA[ tdIndex[0] ] [ 0 ];
        swSet.shiftRasp[i]  = RASP_DATA[ tdIndex[0] ] [ tdIndex[1] ];
        swSet.shiftTable[i] = document.getElementById(tdId).innerHTML;
    });

    if (swSet.shiftDate[1] != swSet.shiftDate[0]) {
        alert('Выберите смены на одну дату!');
        uncheckTD( document.getElementById( swSet.tdId[1] ) );
        return;
    }

    swapDialog(swSet);
} //===== END swapModule  =================================END swapModule

function swapDialog(swSet) {
    var shiftsObj1   = SWP_defineShift( swSet.shiftTable[0] ),
        shiftsObj2   = SWP_defineShift( swSet.shiftTable[1] );
    var shiftDate    = new Date( swSet.shiftDate[0][0] );
    var swOptions    = swapShift( shiftsObj1, shiftsObj2 );
    var dialogDiv    = document.getElementById( 'swapDialog' );
    var swHead       = document.createElement( 'h4' );

    let styleStr     = 'style="display: inline-block; min-width: ';
    let instrRow     = `<span ${styleStr} 45%">  ${swSet.instr[0]}  </span>`
                     + `<span ${styleStr} 10%"> vs </span>`
                     + `<span ${styleStr} 45%">  ${swSet.instr[1]}  </span>`;

    swHead.innerHTML = shiftDate.toLocaleDateString('ru', { weekday: 'narrow',
                                                            year:    'numeric',
                                                            month:   'long',
                                                            day:     'numeric' })
                     + '<br>'
                     + instrRow;
    swHead.className = 'swHead';
    dialogDiv.appendChild( swHead );

    swOptions.forEach( function(item) {
        if( !item.length )  return;   //выход если нет вариантов (выбраны пустые ячейки)
        SetSwOptionButton( dialogDiv, {
            innerHTML:      `<div ${styleStr}45%"> ${item[0]} </div>`
                          + `<div ${styleStr}10%"> | </div>`
                          + `<div ${styleStr}45%"> ${item[1]} </div>`,
            swapDataSet: {
                          tdId:       swSet.tdId,
                          newShifts:  item,
                          instr:      swSet.instr,
                          Date:       swSet.shiftDate
                          },
            onclick:      function() { swapDualActionClick(this); }
        });
    }); // end for each swap list element

    SetSwOptionButton( dialogDiv, {
        innerHTML:  'Ввести свой вариант',
        tdId:        swSet.tdId,
        onclick:     function() { manualSwapClick(this); }
    });

    SetSwOptionButton( dialogDiv, {
        innerHTML:  'Отмена',
        onclick:     function() { cancelSwapClick(); }
    });

    dialogDiv.style.display   = 'block';
    MAINTABLE_STATE.checkMute = true;   // mute mainTable
}  //===== END swapDialog  ================================END SWAP DIALOG





// MANUAL SWAP DIALOG-------------------------------------------------
function swapDialogManual(tdId) {
console.log(tdId);
  var tdIndex     = parseTdIndex(tdId);
  var shiftDate   = new Date(RASP_DATA[0][ tdIndex[1] ][0])
                        .toLocaleDateString('ru', { weekday: 'narrow', year: 'numeric', month: 'long', day: 'numeric' });
  var instr       = RASP_DATA[ tdIndex[0] ][0];

  var shiftRasp   = RASP_DATA[ tdIndex[0] ][ tdIndex[1] ],
      shiftTable  = document.getElementById(tdId).innerText;

  var dialogDiv   = document.getElementById('swapDialog');
      dialogDiv.swapData = {
                    tdId:       tdId,
                    tdIndex:    tdIndex,
                    shiftDate:  shiftDate,
                    instr:      instr,
                    shiftRasp:  shiftRasp,
                    shiftTable: shiftTable,
                    newShift:   ''
      };

  var swHead                      = document.createElement('h3');
      swHead.innerHTML            = ( shiftDate + '<br>' +  instr);
      swHead.className            = 'swOption';
      swHead.style['line-height'] = '150%';
      swHead.style.height         = '3em';
  dialogDiv.appendChild(swHead);

  var buttonsSet                  = [['СД','Д1','Д2'],
                                     ['СН','Н1','Н2'],
                                     ['Ж', 'Ж1','Ж2'] ];

  buttonsSet.forEach( function( subset ) {
      var setBlock           = document.createElement('div');
          setBlock.className = ( subset[0] == 'Ж' ) ? 'swSubsetH' : 'swSubsetV';
          subset.forEach( function(shift, j, subset)   {
              SetSwOptionButton( setBlock, {
                  innerHTML:   shift,
                  className:  (subset[0] == 'Ж') ? 'Jbtn' : 'swOption Vmod',
                  sType:      (subset[0] == 'Ж') ? 'Ж' : 'half',
                  onclick:     function() { swapActionClick(this); }
              });
          }); // end for each button
      dialogDiv.appendChild(setBlock);   }
  ); // end for each buttun sub set

  SetSwOptionButton( dialogDiv, {
      id:         'manualSubmit',
      innerHTML:  'Ввод " "',
      onclick:     function() { submitlSwapClick(this); }
  });
  SetSwOptionButton( dialogDiv, {
      id:         'manualRaspShift',
      innerHTML:  'Вернуть из расписания',
      onclick:     function() { manualRaspShift(this); }
  });
  SetSwOptionButton( dialogDiv, {
      id:         'manualCancel',
      innerHTML:  'Отмена',
      onclick:     function() { cancelSwapClick(this); }
  });

  dialogDiv.style.display   = 'block';
  MAINTABLE_STATE.checkMute =  true;
  return dialogDiv.innerHTML;
}  //===== END swapDialog MANUAL  ===============END swapDialog MANUAL


//service function
function SetSwOptionButton( parent, propObj ) {
    let buttonClassName  = 'swOption';
    propObj.className    = buttonClassName;
    setDefButton( parent, propObj );
}//end service function SetSwOptionButton



function manualSwapClick(button) {
  SWP_DialogData.checkedTdIds  = button.tdId.slice();
  var curTdId                  = SWP_DialogData.checkedTdIds.shift();
  closeDialog();
  swapDialogManual( curTdId );
} //===== END manualSwap  ==================================manualSwap




///// Responces to swapButton click------------------------------------------

function swapActionClick(button) {
    var subset      = button.parentElement;
    var subsetBtns  = subset.children;
    var dialogDiv   = document.getElementById('swapDialog');
    var submitBtn   = document.getElementById('manualSubmit');

    var newShift    = '';

    [].forEach.call(subsetBtns, function(elem) {
          if (elem === button) {
              elem.classList.toggle('btnCheck');
          } else {
              elem.classList.remove('btnCheck');
          }
    });

    var checkBtns;
    if (button.sType == 'Ж') {
        checkBtns = [ ...dialogDiv.getElementsByClassName('Vmod btnCheck') ]; // Фиксируем в массиве отмеченные кнопки со сменами Д* и Н* (им назначались соотв CSS clas)
        checkBtns.forEach( function(elem) {
            elem.classList.remove('btnCheck');
        });
    } else {
        checkBtns = dialogDiv.getElementsByClassName('Jbtn btnCheck');        // Выбираем отмеченные кнопки со сменами J (им назначались соотв CSS class)
        if (checkBtns[0]) { checkBtns[0].classList.remove('btnCheck'); }
    } // end if

    checkBtns     = [ ...dialogDiv.getElementsByClassName('btnCheck') ];      // Выбираем в массив все отмеченные в итоге кнопки
    checkBtns.forEach( function(elem) {
        newShift += elem.innerText;
    });

    dialogDiv.swapData.newShift  = newShift;
    submitBtn.innerText          = 'Ввод "' + ( (newShift)? newShift : ' ' ) + '"';
} //===== END swapAction  ============================================ swapAction



function swapDualActionClick(button) {
    var tdIDs = button.swapDataSet.tdId;
    var newShifts = button.swapDataSet.newShifts;

    tdIDs.forEach( function(tdID, i) {
          SWP_changeShift( tdID, newShifts[i] );
    });

    closeDialog();
} //===== END swapDualActionClick  ============================swapDualActionClick



function cancelSwapClick() {
    Object.keys(MAINTABLE_STATE.tdChecked).forEach( (tdId) => {
        var curTD = document.getElementById(tdId);
        uncheckTD(curTD);
    });
    closeDialog();
} //===== END cancelSwap  ============================================ cancelSwap

function submitlSwapClick(button) {
    var dialogDiv  = document.getElementById('swapDialog');
    var newShift   = dialogDiv.swapData.newShift;
    var actTDiD    = dialogDiv.swapData.tdId;

    SWP_changeShift(actTDiD, newShift);

    closeDialog();
    var nextTdId   = SWP_DialogData.checkedTdIds.shift();
    if (nextTdId) { swapDialogManual(nextTdId); }
} //===== END submitlSwapClick  ===================================== submit Swap

function manualRaspShift(button) {
    var dialogDiv = document.getElementById('swapDialog');
    var actTDiD   = dialogDiv.swapData.tdId;
    var newShift  = dialogDiv.swapData.shiftRasp;

    SWP_changeShift(actTDiD, newShift);

    closeDialog();
    var nextTdId  = SWP_DialogData.checkedTdIds.shift();
    if (nextTdId) { swapDialogManual(nextTdId); }
} //===== END manualRaspShift  =================================== manualRaspShift



function SWP_changeShift(tdId, newShift) {
    var actTD       = document.getElementById(tdId);
    var prevShift   = actTD.innerHTML;

    if ( actTD.classList.contains('check') ) { uncheckTD(actTD); }

    if ( shiftCompare(prevShift, newShift) ) return;

    actTD.innerHTML = newShift;

    if ( isTdChanged(tdId) ) {
        actTD.classList.add('changed');
    } else {
        actTD.classList.remove('changed');
    }

    MAINTABLE_STATE.tdChanged.push(
        { tdId: tdId,
          prevShift: prevShift,
          newShift: newShift }
    );

    localStorage.setItem('MAINTABLE_STATE', JSON.stringify(MAINTABLE_STATE) );
} //===== END SWP_changeShift  =========================================== SWP_changeShift

function closeDialog() {
    var dialogDiv             = document.getElementById('swapDialog');
    dialogDiv.innerHTML       = '';
    dialogDiv.style.display   = 'none';
    MAINTABLE_STATE.checkMute = false;
} //===== END closeDialog  =========================================== closeDialog

function undoLastChange() {
    var lastChange = MAINTABLE_STATE.tdChanged.pop();
    if (!lastChange) {return;}

    var tdId  = lastChange.tdId,
        shift = lastChange.prevShift;
    SWP_changeShift(tdId, shift);
    MAINTABLE_STATE.tdChanged.pop(); // удаляем еще раз послднюю запись о заменах (т.к. она добавилась в этой функции)

    localStorage.setItem('MAINTABLE_STATE', JSON.stringify(MAINTABLE_STATE));
} //===== END undoLastChange  ===================================== undoLastChange



//=====END END END END END END END END END  END END ======================================
//===== SWAP Code ============================= SWAP Code ================================
//=====END END END END END END END END END  END END ======================================


