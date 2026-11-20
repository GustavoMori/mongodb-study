# MongoDB Best Practices

Examples use the `cars` collection from the [README](README.md).

## 1. Data modeling

- **Model for how the data is read, not for how it looks in a spreadsheet.** Start from the queries the app runs most and shape documents to answer them in one read.
- **Embed what is read together.** A car's `specs` are always shown with the car, so they live inside the car document.
- **Reference what is shared or grows without limit.** Manufacturer details used by many cars, or every sale of a car over the years, belong in their own collections (`manufacturers`, `sales`) and are linked by `_id`.
- **Avoid unbounded arrays.** An array that keeps growing (reviews, price history) eventually hurts performance and can hit the **16 MB document limit**. Move it to a separate collection or use the bucket pattern.
- **Keep one type per field.** If `year` is a number in one document and a string in another, queries and indexes silently miss documents.
- **Version your schema** when the shape changes over time: add a `schemaVersion` field and migrate lazily or in batches.

## 2. Data types

- **Dates as `Date`**, never as strings: `createdAt: new Date()`, not `"2026-11-20"`. Dates sort, compare and work with date operators.
- **Money as `Decimal128`** (`NumberDecimal("189990.00")`) or as integer cents. Never as a floating-point `double`.
- **Let MongoDB generate `_id` (`ObjectId`)** unless there is a real natural key. The `ObjectId` also contains the creation timestamp.
- **Use consistent, readable field names in camelCase** (`horsepower`, `fuelEconomyKmL`) and plural collection names (`cars`, `sales`).

## 3. Schema validation

MongoDB is flexible, not schema-less. Enforce the essentials at the database level:

```js
db.createCollection("cars", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["make", "model", "year", "price"],
      properties: {
        year: { bsonType: "int", minimum: 1886, maximum: 2100 },
        specs: {                       // nested fields are described by nesting,
          bsonType: "object",          // dot notation does not work inside $jsonSchema
          properties: {
            engine: {
              bsonType: "object",
              properties: {
                fuel: { enum: ["gasoline", "flex", "diesel", "hybrid", "electric"] }
              }
            }
          }
        }
      }
    }
  }
})
```

Use `validationAction: "warn"` while migrating old data, then switch to `"error"`.

## 4. Indexes

- **Every frequent query should use an index.** Without one, MongoDB reads every document (`COLLSCAN`).
- **Check with `explain("executionStats")`:**
  - `stage: "IXSCAN"` is good, `stage: "COLLSCAN"` is bad on large collections.
  - `totalDocsExamined` should be close to `nReturned`.
- **Order compound index fields by the ESR rule: Equality → Sort → Range.**
  For `find({ make: "Toyota", year: { $gte: 2020 } }).sort({ "price.amount": 1 })`
  the index is `{ make: 1, "price.amount": 1, year: 1 }`.
- **Don't over-index.** Every index slows down writes and uses RAM. Find unused ones with `db.cars.aggregate([{ $indexStats: {} }])` and drop them.
- **Use specialized indexes when they fit:**
  - `unique` — enforce uniqueness (e.g. a VIN).
  - `partial` — index only a subset (e.g. `{ inStock: true }`).
  - `TTL` — expire documents automatically (sessions, temporary data).
  - `collation` — case-insensitive search without a slow `/i` regex.

## 5. Queries

- **Use projections** to return only the fields you need: `find({}, { make: 1, model: 1, price: 1 })`.
- **Always `limit()`** queries that feed lists and screens.
- **Paginate by range, not by `skip()`.** `skip(100000)` still walks 100,000 documents.
  ```js
  db.cars.find({ _id: { $gt: lastSeenId } }).sort({ _id: 1 }).limit(20)
  ```
- **Avoid `$where` and unanchored regex** (`/corolla/`). Anchored regex (`/^Corolla/`) can use an index.
- **Negations (`$ne`, `$nin`) are not selective** and usually scan most of the index.

## 6. Writes

- **Update with operators instead of replacing the document:** `$set`, `$inc`, `$push`, `$unset`.
  ```js
  db.cars.updateOne({ _id: id }, { $set: { "price.amount": NumberDecimal("179990.00") } })
  ```
- **Batch writes** with `insertMany` or `bulkWrite` instead of one call per document.
- **Writes to a single document are atomic.** Good modeling (embedding) often removes the need for transactions.
- **Keep the default write concern (`w: "majority"`)** for data you cannot lose.
- **Be careful with `upsert: true`.** Without a unique index on the filter fields, concurrent upserts can create duplicates.

## 7. Aggregation

- **Put `$match` (and `$project`) as early as possible** so later stages process fewer documents and `$match` can use an index.
- **`$sort` + `$limit` together** let MongoDB keep only the top N documents in memory.
- **Index the `foreignField` of every `$lookup`**, and prefer embedding when a `$lookup` runs on every request.
- **Use `allowDiskUse: true`** for large pipelines that exceed the memory limit per stage.

## 8. Transactions

- **Use them only when you need to change several documents atomically** (e.g. mark a car as sold and create a `sales` document).
- **They require a replica set or sharded cluster.** A standalone `mongod` (like this repo's default setup) does not support them.
- **Keep them short.** By default, transactions are aborted after 60 seconds, and long transactions hold resources and cause conflicts.
- **Retry on `TransientTransactionError`.** The official drivers' `withTransaction` helper does this for you.

## 9. Security

- **Always enable authentication** and never expose port `27017` to the internet.
- **Least privilege:** the application uses a user with `readWrite` on its own database only, never `root`.
- **Use TLS** for any connection that leaves the machine.
- **Keep credentials out of Git**: use environment variables or a secrets manager.
- **Prevent NoSQL injection.** Never pass raw request input as a filter. A body like `{ "password": { "$ne": null } }` turns an equality check into "match anything". Validate types and cast input to strings or numbers before querying.

## 10. Operations

- **Use replica sets in production** for high availability. A primary plus two secondaries is the usual minimum.
- **Back up regularly and test restores** (`mongodump`/`mongorestore`, or snapshots / Atlas backups).
- **Watch slow queries**: `db.setProfilingLevel(1, { slowms: 100 })`, or the slow query log.
- **Create one `MongoClient` per application and reuse it.** It manages a connection pool. Opening a client per request exhausts connections.
