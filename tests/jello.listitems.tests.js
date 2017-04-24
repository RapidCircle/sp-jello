const jsdom = require("node-jsdom");
var fs = require("fs");
var jelloScript = fs.readFileSync("./bin/jello-1.0.1.min.js", "utf-8");
describe('Jello list items', function() {
    var $, Jello;
    beforeEach(function(done) {
        jsdom.env({
            html: `<html>
             <body>
             </body>
           </html>`,
            scripts: ["https://code.jquery.com/jquery-3.1.1.min.js"],
            src: [jelloScript],
            done: function(errors, window) {
                $ = window.$;
                Jello = window.Jello;
                done();
            }
        });
    });

    it('should not be null', function() {
        expect(Jello).not.toBeUndefined();
    });
});
