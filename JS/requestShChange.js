/*global
RASP_DATA

HDL_Async_uploadChanges
HDL_getUser

STB_reset
STB_getsetPrevZamReq
SWP_defineShift
*/



function SCH_saveChanges() {
    var changeList       = getChangeList();
    if (!changeList.length) return;
    var RecordsPerDate   = getRecordsPerDate(changeList);
    var problemSum       = getProblems(RecordsPerDate);
    var problemMessage   = '';

    if (problemSum.length) {
        problemSum.forEach( (rec) => {
            problemMessage += getMessageForProblem(rec);
        });
        callProblemDialog( RecordsPerDate, problemMessage );
    } else {
        callNoproblemDialog( RecordsPerDate );
    }//end if problems


    function getMessageForProblem( rec ) {
        let message = rec.Date + ':';
        if (rec.nonMatched) {
            if (rec.nonMatched.missed) {
                message += '\n Потеряно: ' + rec.nonMatched.missed.join(', ');
            }
            if (rec.nonMatched.over) {
                message += '\n Лишнее: ' + rec.nonMatched.over.join(', ');
            }
        }
        if (rec.dnViolations) {
            message += '\n Не выспятся: ';
            for (let key in rec.dnViolations) {
                message += ', ' + key;
            }
        }
        if (rec.HDayViolations) {
            message += '\n Устанут в выходной: ';
            for (let key in rec.HDayViolations) {
                message += ', ' + key;
            }
        }
        return message += ' \n\n';
    }// end getMessageForProblem
    function callNoproblemDialog( RecordsPerDate ) {
        swal({
            title: 'Запрос проверен!',
            buttons: {
                back: {
                    text: 'вернуться к заменам',
                    value: 'back',
                },
                comment: {
                    text: 'добавить комментарий',
                    value: 'comment',
                },
                confirm: {
                    text: 'отправить запрос',
                    value: 'confirm'
                }
            }
        })
        .then((choice) => {
            switch (choice) {
                case 'comment':
                    swal('комментарий к запросу', {
                        content: {
                            element: 'input',
                            attributes: {
                                placeholder: 'комментарий'
                            }
                        }
                    })
                    .then((note) => {
                        sendShChangeRequest(RecordsPerDate, true, note);
                    });
                    break;
                case 'confirm':
                    sendShChangeRequest(RecordsPerDate, true);
                    break;
                case 'back':
                    return;
            }
        });
    }// end NO Problem dialog
    function callProblemDialog( RecordsPerDate, problemMessage ) {
        swal({
            buttons: ['Добавить комментарий и отправить', 'Исправить запрос'],
            title:    'Проблемы с запросом!',
            text:      problemMessage
        })
        .then((choice) => {
            if (!choice) {
                swal('введите комментарий / объяснение', {
                    content: 'input'
                })
                .then((ask1) => {
                    if (ask1) {
                        sendShChangeRequest(RecordsPerDate, false, 'bad ' + ask1); //("Запрос с каментом1: " + ask1);
                        //return;
                    }
                    else {
                        swal('комментарий при отправке запроса с проблемами - обязателен!', {
                            timer: 1500
                        });
                    } //end if for 1st ask for comment
                });
            }
            else {
                return;
            }
        });
    }// end Problem dialog
}// END SCH_saveChanges

function getChangeList() {
    var mainTable     = document.getElementById('mainTable');
    var changedTdList = Array.prototype.slice.call( mainTable.getElementsByClassName('changed') );
    var changeList    = [];

    changedTdList.forEach( function(td) {
        var tdIndex   = parseTdIndex(td.id);
        var newShift  = td.innerHTML;
        if (newShift == '-' || newShift == 'no') {newShift = '';} // Костыль для срвнения пустых смен таблицы с данными из расписания

        var shiftDate = RASP_DATA[ 0 ]         [ tdIndex[1] ];
        var instr     = RASP_DATA[ tdIndex[0] ][ 0 ];

        var raspShift = RASP_DATA[ tdIndex[0] ][ tdIndex[1] ];

        changeList.push({
            TD:        td,
            tdIndex:   tdIndex,
            shiftDate: shiftDate,
            instr:     instr,
            newShift:  newShift,
            raspShift: raspShift
        });
    }); //end for each td
return changeList;
} //===== END getChangeList (return changeList) =====

function getRecordsPerDate(changeList) {
    var RecordsPerDate   = [];

    changeList.forEach( function(chRecord, i) {
        var DateIndex         = changeList[i].tdIndex[1];
        var curNewShift       = SWP_defineShift(changeList[i].newShift),
            curRaspShift      = SWP_defineShift(changeList[i].raspShift);

        if (!RecordsPerDate[DateIndex]) {
            RecordsPerDate[DateIndex] =    {
                shiftDate:     changeList[i].shiftDate,
                dateIndex:     DateIndex,
                showDate:      changeList[i].shiftDate[2] + '/'
                             +(1 +changeList[i].shiftDate[1]) + ' ' // +1 т.к. месяца с 0
                             + changeList[i].shiftDate[3],
                TDchanged:     [],
                tdIndexes:     [],
                newShifts:     [],
                raspShifts:    [],
                newShiftsCnt:  {},
                raspShiftsCnt: {}
            };
        }

        var curRec = RecordsPerDate[DateIndex];
            curRec.TDchanged.push(chRecord.TD);
            curRec.tdIndexes.push(chRecord.tdIndex);
            curRec.newShifts.push(curNewShift);
            curRec.raspShifts.push(curRaspShift);

        doShiftsSet(curNewShift,  curRec.newShiftsCnt);
        doShiftsSet(curRaspShift, curRec.raspShiftsCnt);
    });
return RecordsPerDate;
}//end getRecordsPerDate (return RecordsPerDate) ===

    function doShiftsSet(curShift, ShiftsCnt) {// --- sub function for Shifts counter
        if (curShift.Type == 'no') return;
        var tmpShiftSet = (curShift.Type == 'ДН')?
                           curShift.Part.slice(1) :
                          [curShift.Name];

        tmpShiftSet.forEach( (tmpShift) => {
            if (!ShiftsCnt[tmpShift]) {
                ShiftsCnt[tmpShift] = 1;
            } else {
                ShiftsCnt[tmpShift]++ ;
            }
        }); //end for each tmpShift
    } //===== end subfunction (set shifts counter)



function getProblems(RecordsPerDate) {
    var nonMatched     = {};
    var dnViolations   = {};
    var HDayViolations = {};
    var problemSum     = [];

    RecordsPerDate.forEach( function(Record) {
        // Rule 1: missed/over shifts ---
        for (let shift in Record.raspShiftsCnt) {
            if        (!Record.newShiftsCnt[shift]) {
                nonMatchedAdd(nonMatched, Record.showDate, 'missed', shift, Record.raspShiftsCnt[shift]);
            } else if (Record.newShiftsCnt[shift] != Record.raspShiftsCnt[shift]) {
                var shiftDiff = Record.raspShiftsCnt[shift]-Record.newShiftsCnt[shift];
                var diffType  = (shiftDiff > 0) ? 'missed' : 'over';

                nonMatchedAdd(nonMatched, Record.showDate, diffType, shift, Math.abs(shiftDiff) );
            }
        } //end for raspShifts
        for (let shift in Record.newShiftsCnt) {
            if (!Record.raspShiftsCnt[shift]) {
                nonMatchedAdd(nonMatched, Record.showDate, 'over', shift, Record.newShiftsCnt[shift]);
            }
        } //end for newShifts

        // Rules 2,3: (D-N, HDay)
        for (let i=0; i < Record.TDchanged.length; i++) {
            var TD       = Record.TDchanged[i];
            var tdIndex  = parseTdIndex(TD.id);
            var instr    = RASP_DATA[ tdIndex[0] ][0];
            var NewShift = Record.newShifts[i];

            // 2 check for D - N rule ---
            var prevRaspShift = SWP_defineShift(TD.previousElementSibling.innerHTML || '');
            var nextRaspShift = SWP_defineShift(TD.nextElementSibling.innerHTML || '');
            if (    /Н/i.test(NewShift.Type) && /[ДЖ]/i.test(nextRaspShift.Type) ||
                 /[ДЖ]/i.test(NewShift.Type) &&    /Н/i.test(prevRaspShift.Type)   ) {
                violationsAdd(dnViolations, instr, Record.showDate, tdIndex);
            }

            // 3 check for HDay rule ---
            if (NewShift.Type == 'ДН' && Record.shiftDate[4]) {
                violationsAdd(HDayViolations, instr, Record.showDate, tdIndex);
            }
        }//end for shifts in Record

        var cur_problems = {};
        if ( nonMatched[Record.showDate] )     { cur_problems.nonMatched     = (nonMatched[Record.showDate]); }
        if ( dnViolations[Record.showDate] )   { cur_problems.dnViolations   = (dnViolations[Record.showDate]); }
        if ( HDayViolations[Record.showDate] ) { cur_problems.HDayViolations = (HDayViolations[Record.showDate]); }

        if (Object.keys(cur_problems).length) {
            cur_problems.Date = Record.showDate;
            problemSum.push(cur_problems);
        }
    }); //end for each RecordsPerDate
    return problemSum;
} // ===== End getProblems (return problemSum) =====

    function nonMatchedAdd(nonMatchedArr, date, type, shift, shiftCnt) {
      if (!nonMatchedArr[date])       nonMatchedArr[date]       = {};
      if (!nonMatchedArr[date][type]) nonMatchedArr[date][type] = [];
      nonMatchedArr[date][type].push(shiftCnt+'_'+shift);
    }//=== end subfunction (add nonMatched)
    function violationsAdd(violationArr, instr, date, tdIndex) {
      if (!violationArr[date])        violationArr[date]        = {};
      violationArr[date][instr] = tdIndex.slice();
    }//=== end subfunction (add violations)

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//===== Send requests block ======================================
//================================================================

function sendShChangeRequest(Records, valid, notes) {
    var changesForUpload = prepareChangesForUpload(Records, valid, notes);
    HDL_Async_uploadChanges(changesForUpload);
    swal({
            title: 'Запрос отправлен!',
            text:  'данные обновятся через несколько секунд',
            timer: 3000
         });

    STB_reset();

    [5000, 7000, 10000].forEach( (delay) => {
      setTimeout( STB_getsetPrevZamReq, delay );
    });
}//end sendShChangeRequest

function prepareChangesForUpload( Records, valid, notes ) {
    var changesForUppload = {
        'user'  : HDL_getUser(),
        'reqN'  : ~~(Date.now()/1000) - 1500000000,
        'valid' : valid,
        'notes' : notes,
        'shifts': []
    };

    Records.forEach( (rec) => {
        var curChange = {
            date:       ~~(rec.shiftDate[0]/86400000), //выводим в кол дней по JS +отбрасываем дробную часть
            dateShifts: []
        };
        rec.tdIndexes.forEach( (tdIndex, i) => {
            curChange.dateShifts.push({
                 instr: RASP_DATA[ tdIndex[0] ][0],
                 shift: rec.newShifts[i].Name
            });
        }); //end foreach newShifts

        changesForUppload.shifts.push(curChange);
    }); //end foreach record

console.log(changesForUppload);
    return changesForUppload;
}//end prepareChangesForUpload

