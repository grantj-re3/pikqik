// Bookmarklet development jig.
// For example, invoke in the html header section with:
//     <script src="bookmarklet-dev-jig.js" defer></script>

(function() {
    function runBookmarklet() {
        "use strict";
        console.log("Executing bookmarklet now!");
        
        // ***********************************************
        // *** START bookmarklet development code here ***
        // ***********************************************


        /* Example bookmarklet: 2 lines below */
        const message = "Hello from bookmarklet!";
        alert(message);


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