// Topic 1 — Concepts: documents, collections, BSON, _id
//
// Run from mongosh:  load("/exercises/01-concepts.js")
//
// WARNING: this script resets the `cars` collection so it can be replayed.

// `use dealership` is a shell helper and does not work inside a script.
// getSiblingDB() is the JavaScript equivalent.
db = db.getSiblingDB("dealership");
db.cars.drop();

// ---------------------------------------------------------------------------
// 1. A document is a set of field/value pairs (like a JSON object).
//    The database and the collection are created on the first write.
// ---------------------------------------------------------------------------
const corolla = db.cars.insertOne({
  make: "Toyota",
  model: "Corolla",
  trim: "Altis Hybrid",
  year: 2024,
  bodyType: "sedan",
  price: { amount: NumberDecimal("189990.00"), currency: "BRL" }, // embedded document
  specs: {
    engine: { fuel: "hybrid", displacementL: 1.8, horsepower: 122, torqueNm: 142 },
    transmission: "CVT",
    drivetrain: "FWD",
    seats: 5,
  },
  features: ["adaptive cruise control", "lane keeping assist", "wireless CarPlay"], // array
  inStock: true,
  createdAt: new Date(),
});
print("Inserted _id:", corolla.insertedId);

// ---------------------------------------------------------------------------
// 2. _id: every document has one, it is unique in the collection and,
//    when not given, MongoDB generates an ObjectId that embeds a timestamp.
// ---------------------------------------------------------------------------
print("ObjectId created at:", corolla.insertedId.getTimestamp());

// ---------------------------------------------------------------------------
// 3. BSON: documents are stored in a binary format with real types
//    (int, double, decimal, date, objectId, array, object, bool...).
// ---------------------------------------------------------------------------
printjson(
  db.cars
    .aggregate([
      {
        $project: {
          _id: 0,
          _id_type: { $type: "$_id" },
          year: { $type: "$year" },                          // int
          displacementL: { $type: "$specs.engine.displacementL" }, // double
          price: { $type: "$price.amount" },                 // decimal
          features: { $type: "$features" },                  // array
          createdAt: { $type: "$createdAt" },                // date
          sizeInBytes: { $bsonSize: "$$ROOT" },              // max is 16 MB
        },
      },
    ])
    .toArray()
);

// ---------------------------------------------------------------------------
// 4. Flexible schema: documents in the same collection may have different
//    fields. An electric car has a battery and no engine displacement.
// ---------------------------------------------------------------------------
db.cars.insertOne({
  make: "BYD",
  model: "Dolphin",
  year: 2025,
  bodyType: "hatchback",
  price: { amount: NumberDecimal("149990.00"), currency: "BRL" },
  specs: {
    engine: { fuel: "electric", horsepower: 95, torqueNm: 180 },
    batteryKWh: 44.9,
    rangeKm: 291,
    seats: 5,
  },
  inStock: true,
  createdAt: new Date(),
});

// ---------------------------------------------------------------------------
// 5. _id must be unique: a duplicate is rejected with error E11000.
// ---------------------------------------------------------------------------
db.cars.insertOne({ _id: "my-custom-id", make: "Fiat", model: "Uno" });
try {
  db.cars.insertOne({ _id: "my-custom-id", make: "Fiat", model: "Mobi" });
} catch (e) {
  print("Expected error:", e.message);
}
db.cars.deleteOne({ _id: "my-custom-id" });

print("Cars in the collection:", db.cars.countDocuments());
