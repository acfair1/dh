# MongoDB Compression Change
These scripts change the compression of the collections from snappy to zlib.

The scripts are executed via the mongo shell with the following commands.
The shell should be opened from the same directory as the scripts, or
the path needs to be added to the commands.
```
// Switch 1st colletion
load("1_0_mrn_to_zlib.js")

// Test DH Solution
// Drop snappy collection
load("1_1_mrn_snappy_drop.js")

// Switch 2nd colletion
load("2_0_algo_to_zlib.js")

// Test DH Solution
// Drop snappy collection
load("2_1_algo_snappy_drop.js")

// Switch 3rd colletion
load("3_0_grade_to_zlib.js")

// Test DH Solution
// Drop snappy collection
load("3_1_grade_snappy_drop.js")

// Switch 4th colletion
load("4_0_xml_to_zlib.js")

// Test DH Solution
// Drop snappy collection
load("4_1_xml_snappy_drop.js")

// Switch 5th colletion
load("5_0_document_to_zlib.js")

// Test DH Solution
// Drop snappy collection
load("5_1_document_snappy_drop.js")
```
