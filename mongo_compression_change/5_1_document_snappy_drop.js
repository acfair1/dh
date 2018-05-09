// Switch to patient database
db = db.getSiblingDB('patient');

print("Dropping document_snappy collection and indexes");
db.document_snappy.drop();

print("document_snappy dropped.");
