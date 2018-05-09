// Switch to patient database
db = db.getSiblingDB('patient');

print("Dropping grade_snappy collection and indexes");
db.grade_snappy.drop();

print("grade_snappy dropped.");
