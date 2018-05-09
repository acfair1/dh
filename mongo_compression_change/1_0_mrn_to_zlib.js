/**
 * addCommas - adds commas to a number
 * @param {Number} value - the number to add commas to
 * @returns {string} - a numeric string with commas added
 */
function addCommas(value) {
    var nStr = String(value);
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

/**
 * precisionRound - rounds a number to a specified degree of precision
 * @param {Number} number - the number to round
 * @param {Number} precision - the degree of precision
 * @returns {Number} - the rounded number
 */
function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

// Switch to patient database
var db = db.getSiblingDB('patient');

// Create zlib collection and indexes
print("Creating mrn_zlib collection and indexes");
db.createCollection("mrn_zlib", { storageEngine: { wiredTiger: { configString: 'block_compressor=zlib,prefix_compression=true,prefix_compression_min=0' } } });
db.mrn_zlib.createIndexes([{ "patient.firstName": "text", "patient.lastName": "text" }, { "patient.DOB.value": 1 }, { "pLast": 1 }, { "patient.IDs.root": 1, "patient.IDs.extension": 1 }]);

// Flip from snappy to zlib
print("Renaming current mrn collection to mrn_snappy");
db.mrn.renameCollection("mrn_snappy");

print("");
print("Copying mrn_snappy to mrn_zlib");
var cursor = db.mrn_snappy.find().noCursorTimeout();
var cCount = cursor.count();
var i = 0;
while (cursor.hasNext()) {
    db.mrn_zlib.insert(cursor.next());
    i++;
    var prct = 0;
    if (i === 1) {
        prct = precisionRound(Number(i) / Number(cCount) * 100, 2);
        print(addCommas(i) + " of " + addCommas(cCount) + " mrn copied. " + prct + "%.");
    }
    if (i % 1000 == 0) {
        prct = precisionRound(Number(i) / Number(cCount) * 100, 2);
        print(addCommas(i) + " of " + addCommas(cCount) + " mrn copied. " + prct + "%.");
    }
}
cursor.close();


// Rename zlibs to regular names
print("");
print("Renaming mrn_zlib to mrn");
db.mrn_zlib.renameCollection("mrn");

print("");
print("Test the DH solution to ensure it's working with the new mrn collection.");
print("If it works correctly, then run the '1_1_mrn_snappy_drop.js' script.");
