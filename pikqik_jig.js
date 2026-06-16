// pikqik_jig.js
// Bookmarklet development jig.
// For example, invoke in the html header section with:
//     <script src="pikqik_jig.js" defer></script>

(function() {
    function runBookmarklet() {
        "use strict";
        console.log("Executing bookmarklet now!");

        // ***********************************************
        // *** START bookmarklet development code here ***
        // ***********************************************



        const cfg ={
            /* User config */
            logLabel:           "pikqik",
            isDryRun:           true,

            freePlacesMin:      1,
            isShow0FreePlaces:  false,
            sTimeMin:           "05:30 pm",
            sTimeMax:           "11:40 pm",

            sScanTimeMin:       "05:00 am",
            sScanTimeMax:       "10:00 pm",
            minutesIntervalWarn: 10,
            labelsToBeware:     ['Watch Out'],

            /* Remaining config */
            get minutesMin() {return convertTimeToMinutes(this.sTimeMin)},
            get minutesMax() {return convertTimeToMinutes(this.sTimeMax)},

            get minutesScanMin() {return convertTimeToMinutes(this.sScanTimeMin)},
            get minutesScanMax() {return convertTimeToMinutes(this.sScanTimeMax)},

            dom: {
                tableName:      'div.table-name',
                tableDate:      'div.table-date',
                tableRows:      'div.table-rows',

                rowTime:        'div.row-time',
                rowFreePlaces:  'div.row-free-places',
                rowLock:        'div.row-lock',
                rowPickBtn:     'button.row-pick-btn',

                rowLabel:       'div.row-label',
                rowTypeRegex:   /^row-type/
            },
            hintsByType: {
                'row-type1':    'Off-peak',
                'row-type2':    'Peak'
            },
            defaultHint:        'NotKnown'
        };
        Object.freeze(cfg);
        Object.freeze(cfg.dom);
        Object.freeze(cfg.hintsByType);

        /* IIFE closure to remember msStart.
           cfg.logLabel must be assigned above! */
        const monolog = (function () {
            const msStart = Date.now();
            return function (msg) {
                const msElapsed = Date.now() - msStart;
                console.log(`${cfg.logLabel}(${msElapsed}ms) ${msg}`);
            }
        })();

        /* Class Row: constructor */
        function Row(rowNode) {
            this.sTimeSlot = rowNode.querySelector(cfg.dom.rowTime).textContent.trim();
            this.minutesTimeSlot = convertTimeToMinutes(this.sTimeSlot);

            if (this.minutesTimeSlot >= cfg.minutesMin && this.minutesTimeSlot <= cfg.minutesMax) {
                this.info = {};
                this.info.numFreePlaces = rowNode.querySelectorAll(cfg.dom.rowFreePlaces).length;
                this.info.hasLock = rowNode.querySelector(cfg.dom.rowLock).textContent.trim().length != 0;
                this.info.willPick = this.info.numFreePlaces >= cfg.freePlacesMin && !this.info.hasLock;
                this.info.button = rowNode.querySelector(cfg.dom.rowPickBtn);

                const tokens = Array.from(rowNode.classList).filter(tok => tok.match(cfg.dom.rowTypeRegex));
                this.info.type = tokens.join();

            } else {
                this.info = null;
            }
        }

        /* Class Row: instance method */
        Row.prototype.isShowRow = function () {
            return cfg.isShow0FreePlaces || this.info.numFreePlaces >= cfg.freePlacesMin;
        };

        /* Class Row: instance method */
        Row.prototype.show = function (wasPicked) {
            if (!this.info) {
                monolog(`${this.sTimeSlot} (${this.minutesTimeSlot})|*** row.info is NULL`)
            }
            const sLocked = this.info.hasLock ? "Lock" : "";
            const sPick = (this.info.willPick && !wasPicked) ? `PICK: ${this.info.button.id}` : "";
            const sPickDryRun = sPick != "" && cfg.isDryRun ? `[${sPick.toLowerCase()}]` : sPick;

            if (this.isShowRow()) {
                monolog(`|${this.sTimeSlot} (${this.minutesTimeSlot})|numFree: ${this.info.numFreePlaces}|${this.info.type}|${sLocked}|${sPickDryRun}`);
            }
        };

        function convertTimeToMinutes(timeStr) {
            /* timeStr "08:10 pm" returns 1210 (minutes) */
            const [time, amPm] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            if (amPm.toLowerCase() === 'pm' && hours !== 12) {
                hours += 12;
            } else if (amPm.toLowerCase() === 'am' && hours === 12) {
                hours = 0;
            }
            return (hours * 60) + minutes;
        }

        function pickRow() {
            const page = {
                name: document.querySelector(cfg.dom.tableName).textContent.trim(),
                date: document.querySelector(cfg.dom.tableDate).textContent.trim()
            };
            monolog(`Page: ${JSON.stringify(page, null, 2)}`);

            let wasPicked = false;
            const rowNodes = document.querySelectorAll(cfg.dom.tableRows);
            for (const rowNode of rowNodes) {
                const row = new Row(rowNode);
                if (row.minutesTimeSlot < cfg.minutesMin) {
                    continue;
                }
                if (row.minutesTimeSlot > cfg.minutesMax) {
                    break;
                }
                row.show(wasPicked);
                if (row.isShowRow()) {
                    if (row.info.willPick && !wasPicked) {
                        row.info.button.scrollIntoView({ behavior: 'instant', block: 'center' });
                    }
                    if (!cfg.isDryRun) {
                        row.info.button.click();
                    }
                }
                wasPicked = row.info.willPick || wasPicked;
            }
        }

        /* Class ScanRow: constructor */
        function ScanRow(rowNode) {
            this.sTimeSlot = rowNode.querySelector(cfg.dom.rowTime).textContent.trim();
            this.minutesTimeSlot = convertTimeToMinutes(this.sTimeSlot);

            this.info = {};
            const tokens = Array.from(rowNode.classList).filter(tok => tok.match(cfg.dom.rowTypeRegex));
            this.info.type = tokens.join();
            this.info.note = "";
        }

        function scanRowTypes() {
            let prevRow = { /* Dummy row to compare the next row against */
                sTimeSlot:          cfg.sScanTimeMin,
                minutesTimeSlot:    cfg.minutesScanMin,
                info: {
                    type:           "DummyType",
                    note:           ""
                }
            };
            const rowTypes = [];
            const timeGaps = [];
            const rowNodes = document.querySelectorAll(cfg.dom.tableRows);
            let isLastRowPushed = false;
            for (const rowNode of rowNodes) {
                const row = new ScanRow(rowNode);
                if (row.minutesTimeSlot < cfg.minutesScanMin) {
                    continue;
                }
                if (row.info.type != prevRow.info.type) {
                    rowTypes.push(row);
                }
                if (row.minutesTimeSlot > (prevRow.minutesTimeSlot + cfg.minutesIntervalWarn) &&
                    prevRow.info.type != "DummyType" ) {
                    timeGaps.push( [prevRow, row] );
                }
                if (row.minutesTimeSlot > cfg.minutesScanMax) {
                    row.info.note = "Next row past scan-time-max";
                    rowTypes.push(row);
                    isLastRowPushed = true;
                    break;
                }
                prevRow = row;
            }
            if (!isLastRowPushed && rowTypes.length > 0 && prevRow !== rowTypes[-1]) {
                    prevRow.info.note = "Last row";
                    rowTypes.push(prevRow);
            }
            showScanResults(rowTypes, timeGaps);
        }

        function showScanResults(rowTypes, timeGaps) {
            monolog("START OF EACH TYPE:");
            const hints = new DefaultDict(cfg.hintsByType, cfg.defaultHint);
            for (const row of rowTypes) {
                const hint = hints.get(row.info.type);
                monolog(`|${row.sTimeSlot} (${row.minutesTimeSlot})|${row.info.type}|${hint}|${row.info.note}`);
            }
            if (timeGaps.length > 0) {
                monolog("TIME GAPS BETWEEN ROWS:");
                for (const rows of timeGaps) {
                    const [prev, row] = rows;
                    const minutesGap = row.minutesTimeSlot - prev.minutesTimeSlot;
                    monolog(`|GAP: ${minutesGap} minutes|${prev.sTimeSlot} (${prev.info.type})|` +
                        `${row.sTimeSlot} (${row.info.type})`);
                }
            }
            showLabelWarning();
        }

        function showLabelWarning() {
            if (cfg.labelsToBeware.length == 0) {
                return;
            }
            const objLabelsTB = cfg.labelsToBeware.map(lbl => ({
                label:  lbl,
                re:     new RegExp('^' + lbl + '\\s.*')
            }));
            const domLabelNodes = document.querySelectorAll(cfg.dom.rowLabel);
            /* monolog(`Number of labels: ${domLabelNodes.length}`); */
            for (const labelNode of domLabelNodes) {
                const nodeText = labelNode.textContent.trim();
                for (const ol of objLabelsTB) {
                    if (ol.re.test( nodeText )) {
                        monolog(`BEWARE: '${ol.label}' found!`);
                    }
                }
            }
        }

        /* Class DefaultDict: constructor */
        function DefaultDict(obj, defaultValue=null) {
            this.obj = obj;
            this.defaultValue = defaultValue;
        }

        /* Class DefaultDict: instance method */
        DefaultDict.prototype.get = function (key) {
            if ( Object.keys(this.obj).includes(key) ) {
                return this.obj[key];
            }
            return this.defaultValue;
        };

        /* Main */
        monolog("START");
        const sectionBreak = '='.repeat(30);
        monolog(`Config: ${JSON.stringify(cfg, null, 2)}`);
        scanRowTypes();

        monolog(sectionBreak);
        pickRow();
        monolog("END");


        // *********************************************
        // *** END bookmarklet development code here ***
        // *********************************************
    }

    // Wait for the user event
    document.addEventListener('click', function handler(e) {
        runBookmarklet();
        document.removeEventListener('click', handler); // Remove listener after first run
    }, { once: false }); // Set to true if you only want it to run once

    console.clear();
    console.log("Script loaded. Waiting for click on web page...");

})();
