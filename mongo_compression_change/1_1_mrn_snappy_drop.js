// Switch to patient database
db = db.getSiblingDB('patient');

print("Dropping mrn_snappy collection and indexes");
db.mrn_snappy.drop();

print("mrn_snappy dropped.");
