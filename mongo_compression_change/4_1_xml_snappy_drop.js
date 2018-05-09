// Switch to patient database
db = db.getSiblingDB('patient');

print("Dropping xml_snappy collection");
db.xml_snappy.drop();

print("xml_snappy dropped.");
