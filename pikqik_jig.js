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

            /* Remaining config */
            get minutesMin() {return convertTimeToMinutes(this.sTimeMin)},
            get minutesMax() {return convertTimeToMinutes(this.sTimeMax)},

            dom: {
                tableName:      'div.table-name',
                tableDate:      'div.table-date',
                tableRows:      'div.table-rows',

                rowTime:        'div.row-time',
                rowFreePlaces:  'div.row-free-places',
                rowLock:        'div.row-lock',
                rowPickBtn:     'button.row-pick-btn',

                rowTypeRegex:   /^row-type/
            }
        };
        Object.freeze(cfg);
        Object.freeze(cfg.dom);

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
            monolog(`Config: ${JSON.stringify(cfg, null, 2)}`);
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

        /* Main */
        monolog("START");
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