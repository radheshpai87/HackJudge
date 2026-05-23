import { MongoClient, Db, ObjectId, Collection, Document, Filter, Sort, WithId } from "mongodb";

function getUri(): string {
  const uri = process.env.DATABASE_URL || "";
  if (!uri) throw new Error("DATABASE_URL not set");
  return uri;
}

let _client: MongoClient | null = null;
let _db: Db | null = null;

function getClient(): MongoClient {
  if (!_client) {
    const uri = getUri();
    _client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  }
  return _client;
}

export async function connect(): Promise<Db> {
  if (_db) return _db;
  const client = getClient();
  await client.connect();
  const uri = getUri();
  const dbName = new URL(uri.replace("mongodb+srv://", "http://")).pathname.slice(1) || "hackjudge";
  _db = client.db(dbName);
  return _db;
}

export function getDb(): Db {
  if (!_db) throw new Error("DB not connected. Call connect() first.");
  return _db;
}

function toObjectId(val: string | ObjectId | undefined): ObjectId | undefined {
  if (!val) return undefined;
  if (val instanceof ObjectId) return val;
  try { return new ObjectId(val); } catch { return undefined; }
}

function buildWhere(filter: Record<string, any>): Filter<Document> {
  const out: Filter<Document> = {};
  for (const [k, v] of Object.entries(filter)) {
    if (k === "id" || k === "_id") {
      const oid = toObjectId(v);
      if (oid) out._id = oid;
      else out._id = v;
    } else if (k.endsWith("_id") || ["userId", "eventId", "trackId", "judgeId", "teamId", "criterionId"].includes(k)) {
      const oid = toObjectId(v);
      out[k] = oid ?? v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function mapDoc(doc: WithId<Document> | null): any {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function mapDocs(docs: WithId<Document>[]): any[] {
  return docs.map(mapDoc);
}

class CollectionProxy {
  constructor(private col: Collection<Document>) {}

  async findUnique(args: { where: Record<string, any>; include?: Record<string, any> }): Promise<any> {
    const doc = await this.col.findOne(buildWhere(args.where));
    if (!doc) return null;
    let result = mapDoc(doc);
    if (args.include) {
      const db = getDb();
      for (const [relName, relConfig] of Object.entries(args.include)) {
        if (relConfig === false) continue;
        if (Array.isArray(relConfig)) {
          // e.g. include: { tracks: true }
          const fk = `${this.col.collectionName.slice(0, -1)}Id`; // events -> eventId
          const relCol = db.collection(relName);
          const relDocs = await relCol.find({ [fk]: new ObjectId(result.id) }).toArray();
          result[relName] = mapDocs(relDocs);
        }
      }
    }
    return result;
  }

  async findFirst(args?: { where?: Record<string, any>; orderBy?: Record<string, any> }): Promise<any> {
    const docs = await this.findMany({ ...args, take: 1 });
    return docs[0] ?? null;
  }

  async findMany(args?: {
    where?: Record<string, any>;
    orderBy?: Record<string, any> | Array<Record<string, any>>;
    take?: number;
    skip?: number;
    include?: Record<string, any>;
  }): Promise<any[]> {
    const filter = args?.where ? buildWhere(args.where) : {};
    let cursor = await this.col.find(filter);
    if (args?.orderBy) {
      const order: Record<string, 1 | -1> = {};
      const list = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
      for (const o of list) {
        for (const [k, v] of Object.entries(o)) {
          order[k] = v === "asc" ? 1 : -1;
        }
      }
      cursor = cursor.sort(order);
    }
    if (args?.skip) cursor = cursor.skip(args.skip);
    if (args?.take) cursor = cursor.limit(args.take);
    const docs = await cursor.toArray();
    return mapDocs(docs);
  }

  async count(args?: { where?: Record<string, any> }): Promise<number> {
    const filter = args?.where ? buildWhere(args.where) : {};
    return this.col.countDocuments(filter);
  }

  async create(args: { data: Record<string, any> }): Promise<any> {
    const data = { ...args.data };
    for (const [k, v] of Object.entries(data)) {
      if (k.endsWith("Id") || ["userId", "eventId", "trackId", "judgeId", "teamId", "criterionId", "actorId"].includes(k)) {
        const oid = toObjectId(v);
        if (oid) data[k] = oid;
      }
      if (k === "id") delete data[k];
    }
    const { insertedId } = await this.col.insertOne(data);
    return mapDoc({ ...data, _id: insertedId } as WithId<Document>);
  }

  async update(args: { where: Record<string, any>; data: Record<string, any> | { set?: Record<string, any> } }): Promise<any> {
    const filter = buildWhere(args.where);
    let updateData = args.data;
    if ("set" in updateData) updateData = updateData.set!;
    const $set: Record<string, any> = {};
    for (const [k, v] of Object.entries(updateData)) {
      if (k === "id") continue;
      if (k.endsWith("Id") || ["userId", "eventId", "trackId", "judgeId", "teamId", "criterionId", "actorId"].includes(k)) {
        const oid = toObjectId(v);
        $set[k] = oid ?? v;
      } else {
        $set[k] = v;
      }
    }
    const doc = await this.col.findOneAndUpdate(filter, { $set }, { returnDocument: "after" });
    return mapDoc(doc);
  }

  async upsert(args: { where: Record<string, any>; update: Record<string, any>; create: Record<string, any> }): Promise<any> {
    const existing = await this.findUnique({ where: args.where });
    if (existing) {
      return this.update({ where: args.where, data: args.update });
    }
    return this.create({ data: args.create });
  }

  async delete(args: { where: Record<string, any> }): Promise<any> {
    const filter = buildWhere(args.where);
    const doc = await this.col.findOneAndDelete(filter);
    return mapDoc(doc);
  }

  async deleteMany(args?: { where?: Record<string, any> }): Promise<{ count: number }> {
    const filter = args?.where ? buildWhere(args.where) : {};
    const result = await this.col.deleteMany(filter);
    return { count: result.deletedCount ?? 0 };
  }

  async aggregateRaw(args: { pipeline: any[] }): Promise<any> {
    return (await this.col.aggregate(args.pipeline)).toArray();
  }
}

export const prisma = new Proxy({} as any, {
  get(_target, collectionName: string) {
    if (collectionName === "$connect") return connect;
    if (collectionName === "$disconnect") return () => getClient().close();
    if (collectionName === "$transaction") return async () => {};
    // Lazy: create proxy without connecting; connection happens on first operation
    return new CollectionProxy({
      get collectionName() { return collectionName; },
      findOne: async (filter: any) => {
        const db = _db ?? await connect();
        return db.collection(collectionName).findOne(filter);
      },
      find: async (filter: any, options?: any) => {
        const db = _db ?? await connect();
        return db.collection(collectionName).find(filter, options);
      },
      countDocuments: async (filter: any) => {
        const db = _db ?? await connect();
        return db.collection(collectionName).countDocuments(filter);
      },
      insertOne: async (doc: any) => {
        const db = _db ?? await connect();
        return db.collection(collectionName).insertOne(doc);
      },
      findOneAndUpdate: async (filter: any, update: any, options: any) => {
        const db = _db ?? await connect();
        return db.collection(collectionName).findOneAndUpdate(filter, update, options);
      },
      findOneAndDelete: async (filter: any) => {
        const db = _db ?? await connect();
        return db.collection(collectionName).findOneAndDelete(filter);
      },
      deleteMany: async (filter: any) => {
        const db = _db ?? await connect();
        return db.collection(collectionName).deleteMany(filter);
      },
      aggregate: async (pipeline: any[]) => {
        const db = _db ?? await connect();
        return db.collection(collectionName).aggregate(pipeline);
      },
    } as any);
  },
});

// Type stubs (kept for compatibility — API routes import these)
export type PrismaClient = any;
