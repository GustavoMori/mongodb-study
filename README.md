# MongoDB Study

Hands-on MongoDB study built around a single domain: **a catalog of cars and their specs**.
Every topic in the roadmap uses the same `cars` collection so each new concept builds on the previous one.

See also: [BEST_PRACTICES.md](BEST_PRACTICES.md)

## Running the environment

```bash
docker compose up -d                                      # start MongoDB 8.0 on port 27017
docker exec -it mongo-study mongosh -u root -p root       # open the shell (mongosh)
docker compose down                                       # stop (data is kept in the volume)
docker compose down -v                                    # stop and delete the data
```

Connection string: `mongodb://root:root@localhost:27017`

> `root/root` are local-only credentials for studying. Never use them anywhere else.

## Structure

- `exercises/` — `.js` scripts for each topic, mounted at `/exercises` inside the container.
  Run them from mongosh with `load("/exercises/<file>.js")`.
- `data/` — JSON files to import, mounted at `/data/import` inside the container.

## The `cars` collection

- **Database:** `dealership`
- **Collection:** `cars` (MongoDB's equivalent of a table)

Each document is one car, with its specs embedded. Values below are illustrative:

```js
{
  _id: ObjectId("..."),                 // generated automatically on insert
  make: "Toyota",
  model: "Corolla",
  trim: "Altis Hybrid",
  year: 2024,
  bodyType: "sedan",                    // sedan | hatchback | suv | pickup | coupe ...
  price: { amount: NumberDecimal("189990.00"), currency: "BRL" },
  specs: {
    engine: {
      fuel: "hybrid",                   // gasoline | flex | diesel | hybrid | electric
      displacementL: 1.8,
      horsepower: 122,
      torqueNm: 142
    },
    transmission: "CVT",
    drivetrain: "FWD",                  // FWD | RWD | AWD | 4WD
    topSpeedKmh: 180,
    acceleration0to100s: 11.0,
    fuelEconomyKmL: { city: 17.9, highway: 15.4 },
    dimensions: { lengthMm: 4630, widthMm: 1780, heightMm: 1455, weightKg: 1440 },
    seats: 5,
    trunkL: 470
  },
  features: ["adaptive cruise control", "lane keeping assist", "wireless CarPlay"],
  colors: ["white", "silver", "black"],
  inStock: true,
  createdAt: ISODate("2026-11-20T00:00:00Z")
}
```

## Roadmap

1. [x] **Concepts** — documents, collections, BSON, `_id`: what a car document looks like and why specs are nested
2. [ ] **CRUD on `cars`** — insert cars (`insertOne/Many`), find by make/year (`find`), update prices and specs (`updateOne/Many`), remove discontinued models (`deleteOne/Many`)
3. [ ] **Query operators and projections** — cars with more than 200 hp (`$gt`), body types (`$in`), model names (`$regex`), features (`$all`, `$elemMatch`), returning only some fields
4. [ ] **Data modeling** — embedded `specs` vs. referencing a separate `manufacturers` collection
5. [ ] **Indexes and `explain()`** — index `{ make: 1, year: -1 }`, compare `COLLSCAN` vs. `IXSCAN`
6. [ ] **Aggregation pipeline** — average price per make, count by fuel type, fastest car per body type, `$lookup` into `manufacturers`
7. [ ] **Schema validation** — `$jsonSchema` for `cars` (required fields, valid year range, allowed fuel types)
8. [ ] **Transactions and replica sets** — selling a car: mark it as sold and create a `sales` document atomically
9. [ ] **Using MongoDB from an application** — Ruby/Mongoid or Node
