// Switch to patient database
db = db.getSiblingDB('patient');

print("Dropping algo_snappy collection and indexes");
db.algo_snappy.drop();

print("algo_snappy dropped.");
